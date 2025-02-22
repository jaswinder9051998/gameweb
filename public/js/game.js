import { CONFIG } from './config.js';
import { Renderer } from './Renderer.js';
import { InputHandler } from './InputHandler.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { TerritorySystem } from './TerritorySystem.js';
import { UIManager } from './UIManager.js';

export class Game {
    constructor(playerNumber, socket, roomId, gameMode) {
        this.playerNumber = playerNumber;
        this.socket = socket;
        this.roomId = roomId;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize subsystems
        this.renderer = new Renderer(this);
        this.inputHandler = new InputHandler(this);
        this.physics = new PhysicsEngine(this);
        this.territory = new TerritorySystem(this);
        this.ui = new UIManager(this);
        
        // Add animation frame tracking
        this.isGameLoopRunning = false;
        
        this.init(gameMode);
        
        // Listen for game updates from server
        this.socket.on('gameUpdated', (data) => {
            this.handleGameUpdate(data);
        });

        document.body.classList.add('game-active');
    }

    init(gameMode) {
        // Set canvas dimensions
        this.canvas.width = CONFIG.CANVAS.WIDTH;
        this.canvas.height = CONFIG.CANVAS.HEIGHT;
        
        // Initialize game state
        this.gameState = this.createInitialGameState(gameMode);
        
        this.ui.createPlayAgainButton();
        this.ui.createRepelButton();
        this.ui.createGhostButton();
        
        console.log('Game initialized in mode:', gameMode);
        
        // Start game loop if not already running
        if (!this.isGameLoopRunning) {
            this.isGameLoopRunning = true;
            this.gameLoop();
        }
    }

    createInitialGameState(gameMode) {
        return {
            pucks: [],
            activePlayer: 1,
            scores: {
                player1: 0,
                player2: 0
            },
            puckCounts: {
                player1: 0,
                player2: 0
            },
            currentPuck: null,
            isCharging: false,
            chargeStartTime: null,
            rotationCenter: null,
            rotationRadius: 40,
            rotationAngle: 0,
            crossTeamCollisionsOnly: true,
            sparks: [],
            scorePopups: [],
            gameEnded: false,
            winner: null,
            sounds: {
                collision: new Audio('sounds/collision.mp3'),
                launch: new Audio('sounds/launch.mp3'),
                score: new Audio('sounds/score.mp3'),
                win: new Audio('sounds/win.mp3')
            },
            gameMode: gameMode || CONFIG.GAME_MODES.COLLISION,
            territoryGrid: this.territory.createGrid(),
            repelPower: {
                player1: false,
                player2: false,
                activePuck: null
            },
            ghostPower: {
                player1: false,
                player2: false,
                activePuck: null,
                endTime: null
            }
        };
    }

    gameLoop() {
        if (!this.isGameLoopRunning) {
            console.log('=== Game Loop Stopped ===');
            return;
        }
        
        this.update();
        this.renderer.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Only log significant state changes, not every update
        const currentState = {
            puckCount: this.gameState.pucks.length,
            currentPlayer: this.gameState.activePlayer,
            isCharging: this.gameState.isCharging,
            repelPower: this.gameState.repelPower
        };

        // Log only if state changed from last update
        if (JSON.stringify(currentState) !== JSON.stringify(this.lastGameState)) {
            console.log('=== Game State ===', {
                puckCount: currentState.puckCount,
                currentPlayer: currentState.currentPlayer,
                repelState: {
                    player1: this.gameState.repelPower.player1,
                    player2: this.gameState.repelPower.player2
                }
            });
            this.lastGameState = currentState;
        }

        this.physics.update();
        this.territory.updateScores();
        this.ui.update();
        this.checkGameEnd();
    }

    checkGameEnd() {
        // Check if both players have used all their pucks
        const allPucksUsed = Object.values(this.gameState.puckCounts)
            .every(count => count >= CONFIG.PUCK.MAX_PUCKS_PER_PLAYER);
        
        if (!allPucksUsed) return false;

        // Check if any pucks are still moving
        const pucksMoving = this.gameState.pucks.some(puck => 
            (Math.abs(puck.vx) > 0.01 || Math.abs(puck.vy) > 0.01)
        );

        if (pucksMoving) return false;

        if (!this.gameState.gameEnded) {
            this.endGame();
        }
        return true;
    }

    endGame() {
        this.gameState.gameEnded = true;
        
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            this.territory.updateScores();
        }
        
        // Determine winner
        if (this.gameState.scores.player1 > this.gameState.scores.player2) {
            this.gameState.winner = 1;
        } else if (this.gameState.scores.player2 > this.gameState.scores.player1) {
            this.gameState.winner = 2;
        } else {
            this.gameState.winner = 'tie';
        }

        this.ui.showPlayAgainButton();
        
        if (this.gameState.sounds.win) {
            this.gameState.sounds.win.play();
        }
    }

    resetGame(isInitiator = false) {
        console.log('=== Reset Game Start ===', {
            beforeReset: {
                puckCount: this.gameState.pucks.length,
                gameMode: this.gameState.gameMode,
                isLoopRunning: this.isGameLoopRunning,
                playerCounts: this.gameState.puckCounts,
                playerNumber: this.playerNumber,
                isInitiator
            }
        });

        // Stop current game loop
        this.isGameLoopRunning = false;
        
        // Clear any existing timeouts or intervals
        if (this.gameState.sounds) {
            Object.values(this.gameState.sounds).forEach(sound => {
                sound.pause();
                sound.currentTime = 0;
            });
        }
        
        // Only emit reset event if this player initiated the reset
        if (isInitiator) {
            console.log('=== Emitting Reset ===', {
                playerNumber: this.playerNumber
            });
            this.socket.emit('gameMove', {
                roomId: this.roomId,
                type: 'reset',
                initiator: this.playerNumber
            });
        }

        // Reset game state completely
        this.gameState = this.createInitialGameState(this.gameState.gameMode);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Hide play again button
        this.ui.hidePlayAgainButton();
        
        // Reset UI elements
        if (this.ui) {
            this.ui.update();
        }
        
        // Restart game loop
        this.isGameLoopRunning = true;
        this.gameLoop();
        
        console.log('=== Reset Game Complete ===', {
            afterReset: {
                puckCount: this.gameState.pucks.length,
                gameMode: this.gameState.gameMode,
                isLoopRunning: this.isGameLoopRunning,
                playerCounts: this.gameState.puckCounts,
                playerNumber: this.playerNumber,
                isInitiator
            }
        });
    }

    handleGameUpdate(data) {
        if (data.type === 'reset') {
            // Only reset if we didn't initiate this reset
            if (data.initiator !== this.playerNumber) {
                this.resetGame(false);
            }
            return;
        }
        
        // Handle other game updates
        if (data.type === 'launch') {
            const puck = {
                ...data.puck,
                x: data.puck.x,
                y: data.puck.y,
                vx: data.puck.vx,
                vy: data.puck.vy,
                hasRepel: data.puck.hasRepel,
                hasGhost: data.puck.hasGhost
            };

            this.gameState.pucks.push(puck);
            this.gameState.puckCounts[`player${data.puck.player}`]++;
            this.gameState.activePlayer = data.currentTurn === 'player1' ? 1 : 2;
        } 
        else if (data.type === 'collision') {
            this.physics.handleNetworkCollision(data);
        }
        else if (data.type === 'repelActivated') {
            this.gameState.repelPower[`player${data.player}`] = true;
        }
        else if (data.type === 'ghostActivated') {
            this.gameState.ghostPower[`player${data.player}`] = true;
        }
    }
}

// Export the startGame function
window.startGame = function(playerNumber, socket, roomId, gameMode) {
    new Game(playerNumber, socket, roomId, gameMode);
};

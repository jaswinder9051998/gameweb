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
        this.gameState = {
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
            }
        };

        this.ui.createPlayAgainButton();
        this.ui.createRepelButton();
        console.log('Game initialized in mode:', gameMode);
        this.gameLoop();
    }

    gameLoop() {
        this.update();
        this.renderer.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
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

    resetGame() {
        this.socket.emit('gameMove', {
            roomId: this.roomId,
            type: 'reset'
        });

        this.gameState = {
            ...this.gameState,
            pucks: [],
            activePlayer: 1,
            scores: { player1: 0, player2: 0 },
            collisionScores: { player1: 0, player2: 0 },
            puckCounts: { player1: 0, player2: 0 },
            currentPuck: null,
            isCharging: false,
            chargeStartTime: null,
            rotationCenter: null,
            gameEnded: false,
            winner: null
        };
        this.ui.hidePlayAgainButton();
    }

    handleGameUpdate(data) {
        if (data.type === 'launch') {
            const puck = {
                ...data.puck,
                x: data.puck.x,
                y: data.puck.y,
                vx: data.puck.vx,
                vy: data.puck.vy,
                hasRepel: data.puck.hasRepel
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
        else if (data.type === 'reset') {
            this.resetGame();
        }
    }
}

// Export the startGame function
window.startGame = function(playerNumber, socket, roomId, gameMode) {
    new Game(playerNumber, socket, roomId, gameMode);
};

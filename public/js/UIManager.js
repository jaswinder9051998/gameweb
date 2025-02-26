import { CONFIG } from './config.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.createScoreboard();
        this.errorMessages = [];
        this.gameStateMessages = [];
        
        // Log initial viewport metrics
        console.log('=== Initial Viewport ===', {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            visualViewport: {
                width: window.visualViewport?.width,
                scale: window.visualViewport?.scale
            }
        });

        // Monitor orientation changes
        window.addEventListener('orientationchange', () => {
            console.log('=== Orientation Change ===', {
                orientation: window.screen.orientation?.type,
                width: window.innerWidth,
                height: window.innerHeight
            });
        });
    }

    hasFixedUnits() {
        const elements = [this.scoreboardContainer, this.repelButton, this.ghostButton].filter(Boolean);
        return elements.some(el => {
            const style = window.getComputedStyle(el);
            return style.width.includes('px') || 
                   style.height.includes('px') || 
                   style.margin.includes('px') || 
                   style.padding.includes('px');
        });
    }

    createScoreboard() {
        let scoreboardContainer = document.getElementById('scoreboardContainer');
        if (scoreboardContainer) return;

        scoreboardContainer = document.createElement('div');
        scoreboardContainer.id = 'scoreboardContainer';
        
        this.game.canvas.parentElement.style.marginTop = '80px';
        this.game.canvas.parentElement.style.position = 'relative';
        
        scoreboardContainer.style.position = 'absolute';
        scoreboardContainer.style.left = '0';
        scoreboardContainer.style.top = '-80px';
        scoreboardContainer.style.width = '100%';
        scoreboardContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        scoreboardContainer.style.padding = '10px';
        scoreboardContainer.style.borderRadius = '8px';
        scoreboardContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        scoreboardContainer.style.fontFamily = 'Arial, sans-serif';
        scoreboardContainer.style.display = 'flex';
        scoreboardContainer.style.justifyContent = 'space-between';
        scoreboardContainer.style.alignItems = 'center';
        
        this.game.canvas.parentElement.appendChild(scoreboardContainer);
        this.scoreboardContainer = scoreboardContainer;
    }

    createPlayAgainButton() {
        const button = document.createElement('button');
        button.id = 'playAgainButton';
        button.textContent = 'Play Again';
        button.style.position = 'absolute';
        button.style.top = '50%';
        button.style.left = '50%';
        button.style.transform = 'translate(-50%, 100px)';
        button.style.padding = '12px 24px';
        button.style.fontSize = '20px';
        button.style.cursor = 'pointer';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.display = 'none';

        button.addEventListener('click', () => this.game.resetGame());
        this.game.canvas.parentElement.appendChild(button);
        this.playAgainButton = button;
    }

    showPlayAgainButton() {
        if (this.playAgainButton) {
            this.playAgainButton.style.display = 'block';
        }
    }

    hidePlayAgainButton() {
        if (this.playAgainButton) {
            this.playAgainButton.style.display = 'none';
        }
    }

    createButtonContainer() {
        const container = document.createElement('div');
        container.id = 'powerButtonContainer';
        container.style.position = 'absolute';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '-60px';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.gap = '10px';
        container.style.padding = '10px';
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        container.style.borderRadius = '12px';
        
        // Log container creation
        requestAnimationFrame(() => {
            const rect = container.getBoundingClientRect();
            console.log('=== Button Container Metrics ===', {
                width: rect.width,
                height: rect.height,
                bottom: rect.bottom,
                viewportHeight: window.innerHeight,
                spaceBelow: window.innerHeight - rect.bottom
            });
        });

        this.game.canvas.parentElement.appendChild(container);
        return container;
    }

    createRepelButton() {
        // Create button container if it doesn't exist
        if (!this.buttonContainer) {
            this.buttonContainer = this.createButtonContainer();
        }

        const button = document.createElement('button');
        button.id = 'repelButton';
        button.className = 'game-button';
        
        // Create container for icon and text
        const buttonContent = document.createElement('div');
        buttonContent.style.display = 'flex';
        buttonContent.style.alignItems = 'center';
        buttonContent.style.justifyContent = 'center';
        buttonContent.style.gap = '8px';

        // Add magnet icon
        const icon = document.createElement('span');
        icon.innerHTML = '🧲';
        icon.style.fontSize = '20px';

        // Add text
        const text = document.createElement('span');
        text.textContent = 'Repel Power';
        text.style.fontSize = '14px';
        text.style.fontWeight = '600';

        buttonContent.appendChild(icon);
        buttonContent.appendChild(text);
        button.appendChild(buttonContent);
        
        // Modern button styling
        button.style.padding = '8px 16px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        button.style.transition = 'all 0.3s ease';
        button.style.flex = '1';
        button.style.minWidth = '0';
        button.style.maxWidth = '160px';

        // Add click handler and hover effects
        button.addEventListener('click', () => {
            this.handleRepelButtonClick();
        });

        button.addEventListener('mouseover', () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#45a049';
            }
        });

        button.addEventListener('mouseout', () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#4CAF50';
            }
        });

        this.buttonContainer.appendChild(button);
        this.repelButton = button;

        // Log button metrics after render
        requestAnimationFrame(() => {
            if (this.repelButton) {
                const rect = this.repelButton.getBoundingClientRect();
                console.log('=== Repel Button Size ===', {
                    width: rect.width,
                    height: rect.height,
                    fontSize: window.getComputedStyle(text).fontSize,
                    isClickable: !this.repelButton.disabled
                });
            }
        });
    }

    handleRepelButtonClick() {
        console.log('=== Repel Button Click ===', {
            isPlayerTurn: this.game.playerNumber === this.game.gameState.activePlayer,
            playerNumber: this.game.playerNumber,
            activePlayer: this.game.gameState.activePlayer,
            powerUsed: this.game.gameState.repelPower[`player${this.game.playerNumber}`]
        });

        if (this.game.playerNumber !== this.game.gameState.activePlayer) {
            return; // Not this player's turn
        }

        const playerKey = `player${this.game.playerNumber}`;
        if (this.game.gameState.repelPower[playerKey]) {
            return; // Already used repel power this game
        }

        // Set repel power as used for this game
        this.game.gameState.repelPower = {
            ...this.game.gameState.repelPower,
            [playerKey]: true,
            activePuck: null
        };

        this.repelButton.style.backgroundColor = '#ccc';
        this.repelButton.disabled = true;
        this.repelButton.title = 'Repel Power already used this game';

        // Notify other players
        this.game.socket.emit('gameMove', {
            roomId: this.game.roomId,
            type: 'repelActivated',
            player: this.game.playerNumber
        });
    }

    updateRepelButton() {
        if (!this.repelButton) return;
        
        const playerKey = `player${this.game.playerNumber}`;
        const isUsed = this.game.gameState.repelPower[playerKey];
        const isPlayerTurn = this.game.playerNumber === this.game.gameState.activePlayer;
        
        this.repelButton.disabled = isUsed || !isPlayerTurn;
        
        // Update button appearance based on state
        if (isUsed) {
            this.repelButton.style.backgroundColor = '#ccc';
            this.repelButton.style.cursor = 'not-allowed';
            this.repelButton.style.boxShadow = 'none';
            this.repelButton.title = 'Repel Power already used this game';
        } else if (!isPlayerTurn) {
            this.repelButton.style.backgroundColor = '#666';
            this.repelButton.style.cursor = 'not-allowed';
            this.repelButton.style.boxShadow = 'none';
            this.repelButton.title = 'Wait for your turn';
        } else {
            this.repelButton.style.backgroundColor = '#4CAF50';
            this.repelButton.style.cursor = 'pointer';
            this.repelButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            this.repelButton.title = 'Click to use Repel Power (one-time use per game)';
        }
    }

    createGhostButton() {
        const button = document.createElement('button');
        button.id = 'ghostButton';
        button.className = 'game-button';
        
        // Create container for icon and text
        const buttonContent = document.createElement('div');
        buttonContent.style.display = 'flex';
        buttonContent.style.alignItems = 'center';
        buttonContent.style.justifyContent = 'center';
        buttonContent.style.gap = '8px';

        // Add ghost icon
        const icon = document.createElement('span');
        icon.innerHTML = '👻';
        icon.style.fontSize = '20px';

        // Add text
        const text = document.createElement('span');
        text.textContent = 'Ghost Power';
        text.style.fontSize = '14px';
        text.style.fontWeight = '600';

        buttonContent.appendChild(icon);
        buttonContent.appendChild(text);
        button.appendChild(buttonContent);
        
        // Modern button styling
        button.style.padding = '8px 16px';
        button.style.backgroundColor = '#9b59b6';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        button.style.transition = 'all 0.3s ease';
        button.style.flex = '1';
        button.style.minWidth = '0';
        button.style.maxWidth = '160px';

        // Add click handler and hover effects
        button.addEventListener('click', () => {
            this.handleGhostButtonClick();
        });

        button.addEventListener('mouseover', () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#8e44ad';
            }
        });

        button.addEventListener('mouseout', () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#9b59b6';
            }
        });

        this.buttonContainer.appendChild(button);
        this.ghostButton = button;
    }

    handleGhostButtonClick() {
        console.log('=== Ghost Button Click ===', {
            isPlayerTurn: this.game.playerNumber === this.game.gameState.activePlayer,
            playerNumber: this.game.playerNumber,
            activePlayer: this.game.gameState.activePlayer,
            powerUsed: this.game.gameState.ghostPower[`player${this.game.playerNumber}`]
        });

        if (this.game.playerNumber !== this.game.gameState.activePlayer) {
            return; // Not this player's turn
        }

        const playerKey = `player${this.game.playerNumber}`;
        if (this.game.gameState.ghostPower[playerKey]) {
            return; // Already used ghost power this game
        }

        // Set ghost power as used for this game and mark it for next puck only
        this.game.gameState.ghostPower = {
            ...this.game.gameState.ghostPower,
            [playerKey]: true,
            pendingGhost: true, // Flag to indicate the next puck should be ghost
            activePuck: null
        };

        this.ghostButton.style.backgroundColor = '#ccc';
        this.ghostButton.disabled = true;
        this.ghostButton.title = 'Ghost Power already used this game';

        // Notify other players
        this.game.socket.emit('gameMove', {
            roomId: this.game.roomId,
            type: 'ghostActivated',
            player: this.game.playerNumber
        });
    }

    updateGhostButton() {
        if (!this.ghostButton) return;
        
        const playerKey = `player${this.game.playerNumber}`;
        const isUsed = this.game.gameState.ghostPower[playerKey];
        const isPlayerTurn = this.game.playerNumber === this.game.gameState.activePlayer;
        
        this.ghostButton.disabled = isUsed || !isPlayerTurn;
        
        // Update button appearance based on state
        if (isUsed) {
            this.ghostButton.style.backgroundColor = '#ccc';
            this.ghostButton.style.cursor = 'not-allowed';
            this.ghostButton.style.boxShadow = 'none';
            this.ghostButton.title = 'Ghost Power already used this game';
        } else if (!isPlayerTurn) {
            this.ghostButton.style.backgroundColor = '#666';
            this.ghostButton.style.cursor = 'not-allowed';
            this.ghostButton.style.boxShadow = 'none';
            this.ghostButton.title = 'Wait for your turn';
        } else {
            this.ghostButton.style.backgroundColor = '#9b59b6';
            this.ghostButton.style.cursor = 'pointer';
            this.ghostButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            this.ghostButton.title = 'Click to use Ghost Power (one-time use per game)';
        }
    }

    update() {
        // Track significant UI state changes
        const playerKey = `player${this.game.playerNumber}`;
        const currentState = {
            isPlayerTurn: this.game.playerNumber === this.game.gameState.activePlayer,
            repelUsed: this.game.gameState.repelPower[playerKey],
            ghostUsed: this.game.gameState.ghostPower[playerKey],
            pucksLeft: CONFIG.PUCK.MAX_PUCKS_PER_PLAYER - this.game.gameState.puckCounts[playerKey]
        };

        // Only log if state changed
        if (JSON.stringify(currentState) !== JSON.stringify(this.lastState)) {
            console.log('=== Game State Update ===', currentState);
            this.lastState = currentState;
        }

        this.updateScoreboard();
        this.updateRepelButton();
        this.updateGhostButton();
    }

    updateScoreboard() {
        if (!this.scoreboardContainer) return;

        const playerPucks = CONFIG.PUCK.MAX_PUCKS_PER_PLAYER - 
            this.game.gameState.puckCounts[`player${this.game.playerNumber}`];

        let scoreContent = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="font-weight: bold; font-size: 14px;">PUCKS LEFT: ${playerPucks}</div>
            </div>
        `;

        if (this.game.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            scoreContent += this.getTerritoryScoreContent();
        } else {
            scoreContent += this.getCollisionScoreContent();
        }

        this.scoreboardContainer.innerHTML = scoreContent;
    }

    getTerritoryScoreContent() {
        const territoryScore1 = this.game.gameState.scores.player1 - 
            (this.game.gameState.collisionScores?.player1 || 0);
        const territoryScore2 = this.game.gameState.scores.player2 - 
            (this.game.gameState.collisionScores?.player2 || 0);
        const collisionScore1 = this.game.gameState.collisionScores?.player1 || 0;
        const collisionScore2 = this.game.gameState.collisionScores?.player2 || 0;
        const totalScore1 = this.game.gameState.scores.player1;
        const totalScore2 = this.game.gameState.scores.player2;

        return `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="display: flex; gap: 20px;">
                    <div style="color: #ff4444;">
                        <span style="font-weight: bold;">Red: ${totalScore1}</span>
                        <span style="font-size: 12px;">(Area: ${territoryScore1} + Hits: ${collisionScore1})</span>
                    </div>
                    <div style="color: #4444ff;">
                        <span style="font-weight: bold;">Blue: ${totalScore2}</span>
                        <span style="font-size: 12px;">(Area: ${territoryScore2} + Hits: ${collisionScore2})</span>
                    </div>
                </div>
            </div>
            <div style="font-weight: bold; color: ${totalScore1 > totalScore2 ? '#ff4444' : '#4444ff'};">
                ${totalScore1 > totalScore2 ? '🏆 Red Leading!' : 
                  totalScore2 > totalScore1 ? '🏆 Blue Leading!' : 'Tied Game!'}
            </div>
        `;
    }

    getCollisionScoreContent() {
        return `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="font-weight: bold; font-size: 14px;">SCORES:</div>
                <div style="display: flex; gap: 20px;">
                    <span style="color: #ff4444; font-weight: bold;">Red: ${this.game.gameState.scores.player1}</span>
                    <span style="color: #4444ff; font-weight: bold;">Blue: ${this.game.gameState.scores.player2}</span>
                </div>
                <div style="font-weight: bold; color: ${this.game.gameState.scores.player1 > this.game.gameState.scores.player2 ? '#ff4444' : '#4444ff'};">
                    ${this.game.gameState.scores.player1 > this.game.gameState.scores.player2 ? '🏆 Red Leading!' : 
                      this.game.gameState.scores.player2 > this.game.gameState.scores.player1 ? '🏆 Blue Leading!' : 'Tied Game!'}
                </div>
            </div>
        `;
    }
} 
import { CONFIG } from './config.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.createScoreboard();
        this.errorMessages = [];
        this.gameStateMessages = [];

        // Enhanced mobile-specific logging
        this.logMobileMetrics();
        window.addEventListener('resize', () => this.logMobileMetrics());
    }

    logMobileMetrics() {
        const scoreboardRect = this.scoreboardContainer?.getBoundingClientRect();
        const canvasRect = this.game.canvas.getBoundingClientRect();
        const containerRect = this.game.canvas.parentElement.getBoundingClientRect();

        console.log('=== Mobile Responsive Metrics ===', {
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
                orientation: window.screen.orientation?.type || 'N/A'
            },
            canvas: {
                width: this.game.canvas.width,
                height: this.game.canvas.height,
                displayWidth: canvasRect.width,
                displayHeight: canvasRect.height,
                scale: canvasRect.width / this.game.canvas.width,
                viewportPercentage: (canvasRect.width / window.innerWidth) * 100
            },
            scoreboard: scoreboardRect ? {
                width: scoreboardRect.width,
                height: scoreboardRect.height,
                top: scoreboardRect.top,
                viewportPercentage: (scoreboardRect.width / window.innerWidth) * 100,
                computedStyle: window.getComputedStyle(this.scoreboardContainer)
            } : 'Not created yet',
            container: {
                width: containerRect.width,
                height: containerRect.height,
                margins: {
                    top: window.getComputedStyle(this.game.canvas.parentElement).marginTop,
                    bottom: window.getComputedStyle(this.game.canvas.parentElement).marginBottom
                },
                viewportPercentage: (containerRect.width / window.innerWidth) * 100
            },
            textScaling: {
                defaultFontSize: window.getComputedStyle(document.documentElement).fontSize,
                viewportWidth: `${window.innerWidth / 100}px`, // 1vw
                viewportHeight: `${window.innerHeight / 100}px` // 1vh
            }
        });

        // Log potential overflow issues
        if (this.scoreboardContainer) {
            const isOverflowing = this.scoreboardContainer.scrollWidth > this.scoreboardContainer.clientWidth;
            console.log('=== Scoreboard Overflow Check ===', {
                isOverflowing,
                scrollWidth: this.scoreboardContainer.scrollWidth,
                clientWidth: this.scoreboardContainer.clientWidth,
                contentWidth: Array.from(this.scoreboardContainer.children).reduce((total, child) => 
                    total + child.getBoundingClientRect().width, 0)
            });
        }

        // Check button sizing and spacing on mobile
        if (this.repelButton && this.ghostButton) {
            const repelRect = this.repelButton.getBoundingClientRect();
            const ghostRect = this.ghostButton.getBoundingClientRect();
            console.log('=== Mobile Button Metrics ===', {
                repelButton: {
                    width: repelRect.width,
                    height: repelRect.height,
                    viewportWidthPercentage: (repelRect.width / window.innerWidth) * 100,
                    bottom: window.innerHeight - repelRect.bottom
                },
                ghostButton: {
                    width: ghostRect.width,
                    height: ghostRect.height,
                    viewportWidthPercentage: (ghostRect.width / window.innerWidth) * 100,
                    bottom: window.innerHeight - ghostRect.bottom
                },
                spacing: {
                    betweenButtons: ghostRect.left - repelRect.right,
                    viewportPercentage: ((ghostRect.left - repelRect.right) / window.innerWidth) * 100
                },
                totalButtonsWidth: {
                    pixels: repelRect.width + ghostRect.width,
                    viewportPercentage: ((repelRect.width + ghostRect.width) / window.innerWidth) * 100
                }
            });
        }
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

    createRepelButton() {
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
        text.style.fontSize = '16px';
        text.style.fontWeight = '600';

        buttonContent.appendChild(icon);
        buttonContent.appendChild(text);
        button.appendChild(buttonContent);

        // Position button under the canvas
        button.style.position = 'absolute';
        button.style.left = '50%';
        button.style.transform = 'translateX(-50%)';
        button.style.bottom = '-60px';
        button.style.zIndex = '100';
        
        // Modern button styling
        button.style.padding = '12px 24px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        button.style.transition = 'all 0.3s ease';

        // Add click handler and hover effects
        button.addEventListener('click', () => {
            console.log('Repel button clicked');
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

        // Add button to the canvas container
        this.game.canvas.parentElement.appendChild(button);
        this.repelButton = button;

        // Log detailed button metrics
        requestAnimationFrame(() => {
            const buttonRect = button.getBoundingClientRect();
            console.log('=== Repel Button Detailed Metrics ===', {
                dimensions: {
                    width: buttonRect.width,
                    height: buttonRect.height,
                    computedStyle: window.getComputedStyle(button)
                },
                position: {
                    left: buttonRect.left,
                    right: buttonRect.right,
                    centerOffset: buttonRect.left + (buttonRect.width / 2) - (window.innerWidth / 2)
                },
                clickable: {
                    pointerEvents: window.getComputedStyle(button).pointerEvents,
                    zIndex: window.getComputedStyle(button).zIndex,
                    isVisible: buttonRect.width > 0 && buttonRect.height > 0
                }
            });
        });
    }

    handleRepelButtonClick() {
        if (this.game.playerNumber !== this.game.gameState.activePlayer) {
            return; // Not this player's turn
        }

        const playerKey = `player${this.game.playerNumber}`;
        if (this.game.gameState.repelPower[playerKey]) {
            return; // Already used repel power
        }

        this.game.gameState.repelPower[playerKey] = true;
        this.repelButton.style.backgroundColor = '#ccc';
        this.repelButton.disabled = true;

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
        } else if (!isPlayerTurn) {
            this.repelButton.style.backgroundColor = '#666';
            this.repelButton.style.cursor = 'not-allowed';
            this.repelButton.style.boxShadow = 'none';
        } else {
            this.repelButton.style.backgroundColor = '#4CAF50';
            this.repelButton.style.cursor = 'pointer';
            this.repelButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
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
        text.style.fontSize = '16px';
        text.style.fontWeight = '600';

        buttonContent.appendChild(icon);
        buttonContent.appendChild(text);
        button.appendChild(buttonContent);

        // Position button under the canvas next to repel button
        button.style.position = 'absolute';
        button.style.left = 'calc(50% + 200px)'; // Increased offset
        button.style.transform = 'translateX(-50%)';
        button.style.bottom = '-60px';
        button.style.zIndex = '100';
        
        // Modern button styling
        button.style.padding = '12px 24px';
        button.style.backgroundColor = '#9b59b6';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        button.style.transition = 'all 0.3s ease';

        // Add click handler and hover effects
        button.addEventListener('click', () => {
            console.log('Ghost button clicked');
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

        this.game.canvas.parentElement.appendChild(button);
        this.ghostButton = button;

        // Log detailed button metrics
        requestAnimationFrame(() => {
            const buttonRect = button.getBoundingClientRect();
            const repelRect = this.repelButton.getBoundingClientRect();
            console.log('=== Ghost Button Detailed Metrics ===', {
                dimensions: {
                    width: buttonRect.width,
                    height: buttonRect.height,
                    computedStyle: window.getComputedStyle(button)
                },
                position: {
                    left: buttonRect.left,
                    right: buttonRect.right,
                    distanceFromRepel: buttonRect.left - repelRect.right
                },
                clickable: {
                    pointerEvents: window.getComputedStyle(button).pointerEvents,
                    zIndex: window.getComputedStyle(button).zIndex,
                    isVisible: buttonRect.width > 0 && buttonRect.height > 0
                }
            });
        });
    }

    handleGhostButtonClick() {
        if (this.game.playerNumber !== this.game.gameState.activePlayer) {
            return; // Not this player's turn
        }

        const playerKey = `player${this.game.playerNumber}`;
        if (this.game.gameState.ghostPower[playerKey]) {
            return; // Already used ghost power
        }

        this.game.gameState.ghostPower[playerKey] = true;
        this.ghostButton.style.backgroundColor = '#ccc';
        this.ghostButton.disabled = true;

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
        } else if (!isPlayerTurn) {
            this.ghostButton.style.backgroundColor = '#666';
            this.ghostButton.style.cursor = 'not-allowed';
            this.ghostButton.style.boxShadow = 'none';
        } else {
            this.ghostButton.style.backgroundColor = '#9b59b6';
            this.ghostButton.style.cursor = 'pointer';
            this.ghostButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        }
    }

    update() {
        this.updateScoreboard();
        this.updateRepelButton();
        this.updateGhostButton();

        // Log button positions during updates to check for changes
        if (this.repelButton && this.ghostButton) {
            const repelRect = this.repelButton.getBoundingClientRect();
            const ghostRect = this.ghostButton.getBoundingClientRect();
            console.log('=== Button Spacing Update ===', {
                repelLeft: repelRect.left,
                repelRight: repelRect.right,
                ghostLeft: ghostRect.left,
                spacing: ghostRect.left - repelRect.right,
                containerWidth: this.game.canvas.parentElement.offsetWidth
            });
        }

        // Log responsive metrics on window resize
        if (this.lastWindowWidth !== window.innerWidth) {
            this.lastWindowWidth = window.innerWidth;
            this.logMobileMetrics();
        }
    }

    updateScoreboard() {
        if (!this.scoreboardContainer) return;

        const p1Pucks = CONFIG.PUCK.MAX_PUCKS_PER_PLAYER - this.game.gameState.puckCounts.player1;
        const p2Pucks = CONFIG.PUCK.MAX_PUCKS_PER_PLAYER - this.game.gameState.puckCounts.player2;

        let scoreContent = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="font-weight: bold; font-size: 14px;">PUCKS LEFT:</div>
                <div style="display: flex; gap: 20px;">
                    <span style="color: #ff4444; font-weight: bold;">Red: ${p1Pucks}</span>
                    <span style="color: #4444ff; font-weight: bold;">Blue: ${p2Pucks}</span>
                </div>
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
                <div style="font-weight: bold; font-size: 14px;">TERRITORY:</div>
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
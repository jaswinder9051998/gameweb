import { CONFIG } from './config.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.createScoreboard();
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

    update() {
        this.updateScoreboard();
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
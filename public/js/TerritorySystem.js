import { CONFIG } from './config.js';

export class TerritorySystem {
    constructor(game) {
        this.game = game;
    }

    createGrid() {
        const cols = Math.ceil(this.game.canvas.width / CONFIG.TERRITORY.GRID_SIZE);
        const rows = Math.ceil(this.game.canvas.height / CONFIG.TERRITORY.GRID_SIZE);
        return Array(rows).fill().map(() => Array(cols).fill(0));
    }

    calculateGrid() {
        const grid = this.createGrid();
        
        if (this.game.gameState.puckCounts.player1 === 0 || 
            this.game.gameState.puckCounts.player2 === 0) {
            return grid;
        }
        
        const player1Pucks = this.game.gameState.pucks.filter(p => p.player === 1);
        const player2Pucks = this.game.gameState.pucks.filter(p => p.player === 2);

        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                const x = col * CONFIG.TERRITORY.GRID_SIZE + CONFIG.TERRITORY.GRID_SIZE/2;
                const y = row * CONFIG.TERRITORY.GRID_SIZE + CONFIG.TERRITORY.GRID_SIZE/2;
                
                let nearestDist1 = Infinity;
                let nearestDist2 = Infinity;

                player1Pucks.forEach(puck => {
                    const dx = x - puck.x;
                    const dy = y - puck.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    nearestDist1 = Math.min(nearestDist1, dist);
                });

                player2Pucks.forEach(puck => {
                    const dx = x - puck.x;
                    const dy = y - puck.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    nearestDist2 = Math.min(nearestDist2, dist);
                });

                if (nearestDist1 < Infinity || nearestDist2 < Infinity) {
                    if (nearestDist1 < nearestDist2) {
                        grid[row][col] = 1;
                    } else if (nearestDist2 < nearestDist1) {
                        grid[row][col] = 2;
                    }
                }
            }
        }
        
        return grid;
    }

    updateScores() {
        if (this.game.gameState.gameMode !== CONFIG.GAME_MODES.TERRITORY) return;
        
        if (this.game.gameState.puckCounts.player1 === 0 || 
            this.game.gameState.puckCounts.player2 === 0) {
            this.game.gameState.scores.player1 = this.game.gameState.collisionScores?.player1 || 0;
            this.game.gameState.scores.player2 = this.game.gameState.collisionScores?.player2 || 0;
            return;
        }

        const grid = this.calculateGrid();
        let player1Area = 0;
        let player2Area = 0;

        grid.forEach(row => {
            row.forEach(cell => {
                if (cell === 1) player1Area++;
                if (cell === 2) player2Area++;
            });
        });

        const territoryScore1 = Math.floor(player1Area * CONFIG.TERRITORY.SCORE_PER_AREA);
        const territoryScore2 = Math.floor(player2Area * CONFIG.TERRITORY.SCORE_PER_AREA);
        
        this.game.gameState.scores.player1 = territoryScore1 + 
            (this.game.gameState.collisionScores?.player1 || 0);
        this.game.gameState.scores.player2 = territoryScore2 + 
            (this.game.gameState.collisionScores?.player2 || 0);
    }
} 
import { CONFIG } from './config.js';

export class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw territory if in territory mode
        if (this.game.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            this.drawTerritory();
        }
        
        this.drawBoard();
        this.drawRestrictedZones();
        this.drawPowerBar();
        this.drawPucks();
        this.drawScoreboard();
        this.drawScorePopups();
        
        if (this.game.gameState.gameEnded) {
            this.drawGameEndOverlay();
        }
        
        this.drawSparks();
        this.drawErrorMessages();
        this.drawGameStateMessages();
    }

    drawBoard() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawPuck(x, y, player, isPreview = false) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, CONFIG.PUCK.RADIUS, 0, Math.PI * 2);
        
        if (isPreview) {
            this.ctx.globalAlpha = 0.5;
        }
        
        this.ctx.fillStyle = player === 1 ? '#ff4444' : '#4444ff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1;
    }

    drawPucks() {
        // Draw all placed pucks
        this.game.gameState.pucks.forEach(puck => {
            if (!puck.isCharging) {
                this.drawPuck(puck.x, puck.y, puck.player);
            }
        });

        // Draw preview puck
        if (this.game.previewPuckPosition && !this.game.gameState.isCharging) {
            this.drawPuck(
                this.game.previewPuckPosition.x,
                this.game.previewPuckPosition.y,
                this.game.gameState.activePlayer,
                true
            );
        }

        // Draw charging puck and its effects
        if (this.game.gameState.isCharging && this.game.gameState.currentPuck) {
            this.drawChargingPuck();
        }
    }

    drawChargingPuck() {
        const center = this.game.gameState.rotationCenter;
        const puck = this.game.gameState.currentPuck;

        // Draw center point
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#333';
        this.ctx.fill();

        // Draw rope
        this.ctx.beginPath();
        this.ctx.moveTo(center.x, center.y);
        this.ctx.lineTo(puck.x, puck.y);
        this.ctx.strokeStyle = '#666';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw rotation path
        this.ctx.beginPath();
        this.ctx.arc(
            center.x,
            center.y,
            this.game.gameState.rotationRadius,
            0, Math.PI * 2
        );
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.stroke();

        // Draw the puck
        this.drawPuck(puck.x, puck.y, puck.player);
        this.drawLaunchDirectionArrow(puck, center);
    }

    drawLaunchDirectionArrow(puck, center) {
        const ropeVector = {
            x: puck.x - center.x,
            y: puck.y - center.y
        };

        const tangentVector = {
            x: -ropeVector.y,
            y: ropeVector.x
        };

        const length = Math.sqrt(tangentVector.x * tangentVector.x + tangentVector.y * tangentVector.y);
        const normalizedTangent = {
            x: tangentVector.x / length,
            y: tangentVector.y / length
        };

        const currentTime = Date.now();
        const power = Math.min(
            (currentTime - this.game.gameState.chargeStartTime) / CONFIG.PUCK.MAX_CHARGE_TIME,
            1
        );

        const baseArrowLength = CONFIG.PUCK.RADIUS * 4;
        const minArrowLength = baseArrowLength * 0.5;
        const arrowLength = minArrowLength + (baseArrowLength * power);
        const arrowWidth = 12;

        const arrowEnd = {
            x: puck.x + normalizedTangent.x * arrowLength,
            y: puck.y + normalizedTangent.y * arrowLength
        };

        // Draw arrow line
        this.ctx.beginPath();
        this.ctx.moveTo(puck.x, puck.y);
        this.ctx.lineTo(arrowEnd.x, arrowEnd.y);
        this.ctx.strokeStyle = puck.player === 1 ? '#ff0000' : '#0000ff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw arrow head
        const angle = Math.atan2(normalizedTangent.y, normalizedTangent.x);
        this.ctx.beginPath();
        this.ctx.moveTo(arrowEnd.x, arrowEnd.y);
        this.ctx.lineTo(
            arrowEnd.x - arrowWidth * Math.cos(angle - Math.PI / 6),
            arrowEnd.y - arrowWidth * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            arrowEnd.x - arrowWidth * Math.cos(angle + Math.PI / 6),
            arrowEnd.y - arrowWidth * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fillStyle = puck.player === 1 ? '#ff0000' : '#0000ff';
        this.ctx.fill();
    }

    drawRestrictedZones() {
        if (this.game.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY && 
            this.game.gameState.puckCounts.player1 > 0 && 
            this.game.gameState.puckCounts.player2 > 0) {
            
            const grid = this.game.territory.calculateGrid();
            
            for (let row = 0; row < grid.length; row++) {
                for (let col = 0; col < grid[0].length; col++) {
                    if (grid[row][col] !== this.game.gameState.activePlayer && grid[row][col] !== 0) {
                        const x = col * CONFIG.TERRITORY.GRID_SIZE;
                        const y = row * CONFIG.TERRITORY.GRID_SIZE;
                        
                        this.ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
                        this.ctx.fillRect(
                            x, y,
                            CONFIG.TERRITORY.GRID_SIZE,
                            CONFIG.TERRITORY.GRID_SIZE
                        );
                    }
                }
            }
        }

        const opponentPucks = this.game.gameState.pucks.filter(
            puck => puck.player !== this.game.gameState.activePlayer
        );

        opponentPucks.forEach(puck => {
            this.ctx.beginPath();
            this.ctx.arc(puck.x, puck.y, CONFIG.PUCK.RESTRICTED_ZONE_RADIUS, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.stroke();
        });
    }

    drawPowerBar() {
        if (!this.game.gameState.isCharging) return;

        const { WIDTH: barWidth, HEIGHT: barHeight, MARGIN } = CONFIG.UI.POWER_BAR;
        const x = this.canvas.width - MARGIN - barWidth;
        const y = (this.canvas.height - barHeight) / 2;

        // Draw background
        this.ctx.fillStyle = '#eee';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        this.ctx.strokeStyle = '#333';
        this.ctx.strokeRect(x, y, barWidth, barHeight);

        // Calculate and draw power level
        const currentTime = Date.now();
        const power = Math.min(
            (currentTime - this.game.gameState.chargeStartTime) / CONFIG.PUCK.MAX_CHARGE_TIME,
            1
        );

        const powerHeight = power * barHeight;
        this.ctx.fillStyle = this.getPowerBarColor(power);
        this.ctx.fillRect(
            x,
            y + barHeight - powerHeight,
            barWidth,
            powerHeight
        );
    }

    getPowerBarColor(power) {
        if (power < 0.5) {
            const hue = 120 - (power * 2 * 60);
            return `hsl(${hue}, 100%, 40%)`;
        } else {
            const hue = 60 - ((power - 0.5) * 2 * 60);
            return `hsl(${hue}, 100%, 40%)`;
        }
    }

    drawSparks() {
        if (!this.game.gameState.sparks) return;
        
        this.game.gameState.sparks.forEach(spark => {
            console.log('Drawing spark:', {
                position: { x: spark.x, y: spark.y },
                life: spark.life,
                color: spark.color
            });

            this.ctx.save();
            const gradient = this.ctx.createRadialGradient(
                spark.x, spark.y, 0,
                spark.x, spark.y, 5 * spark.life
            );
            
            gradient.addColorStop(0, spark.color || '#fff');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(spark.x, spark.y, 5 * spark.life, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawScorePopups() {
        if (!this.game.gameState.scorePopups) return;

        this.game.gameState.scorePopups.forEach(popup => {
            this.ctx.save();
            
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = popup.player === 1 ? 
                `rgba(255, 68, 68, ${popup.life})` : 
                `rgba(68, 68, 255, ${popup.life})`;
            
            this.ctx.shadowColor = popup.player === 1 ? 
                'rgba(255, 0, 0, 0.5)' : 
                'rgba(0, 0, 255, 0.5)';
            this.ctx.shadowBlur = 10;
            
            const text = `+${popup.points}`;
            const textWidth = this.ctx.measureText(text).width;
            this.ctx.fillText(text, popup.x - textWidth/2, popup.y);
            
            this.ctx.restore();
        });
    }

    drawGameEndOverlay() {
        this.ctx.save();
        
        this.ctx.fillStyle = CONFIG.UI.GAME_END_OVERLAY.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${CONFIG.UI.GAME_END_OVERLAY.FONT_SIZE}px Arial`;
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let message;
        if (this.game.gameState.winner === 'tie') {
            message = "It's a Tie!";
        } else {
            const winnerColor = this.game.gameState.winner === 1 ? 'Red' : 'Blue';
            message = `${winnerColor} Player Wins!`;
        }
        
        this.ctx.fillText(
            message,
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        
        this.drawFinalScores();
        
        this.ctx.restore();
    }

    drawFinalScores() {
        this.ctx.font = '24px Arial';
        if (this.game.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            const territoryScore1 = this.game.gameState.scores.player1 - 
                (this.game.gameState.collisionScores?.player1 || 0);
            const territoryScore2 = this.game.gameState.scores.player2 - 
                (this.game.gameState.collisionScores?.player2 || 0);
            
            this.ctx.fillText(
                `Final Score - Red: ${territoryScore1} + ${this.game.gameState.collisionScores?.player1 || 0} = ${this.game.gameState.scores.player1}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 50
            );
            this.ctx.fillText(
                `Blue: ${territoryScore2} + ${this.game.gameState.collisionScores?.player2 || 0} = ${this.game.gameState.scores.player2}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 80
            );
        } else {
            this.ctx.fillText(
                `Final Score - Red: ${this.game.gameState.scores.player1} | Blue: ${this.game.gameState.scores.player2}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 50
            );
        }
    }

    drawErrorMessages() {
        if (!this.game.gameState.errorMessages) return;

        this.game.gameState.errorMessages.forEach(msg => {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(255, 0, 0, ${msg.life})`;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(msg.message, msg.x, msg.y);
            this.ctx.restore();
        });
    }

    drawGameStateMessages() {
        if (this.game.gameState.isCharging && this.game.gameState.currentPuck) {
            this.drawMessage('Tap anywhere to launch!', this.canvas.height - 30);
        }

        this.drawTerritoryMessage();
        this.drawWaitingMessage();
    }

    drawMessage(text, y) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, CONFIG.CANVAS.WIDTH / 2, y);
        this.ctx.restore();
    }

    drawTerritoryMessage() {
        if (this.game.gameState.gameMode !== CONFIG.GAME_MODES.TERRITORY ||
            this.game.gameState.gameEnded ||
            this.game.gameState.activePlayer !== this.game.playerNumber ||
            this.game.gameState.puckCounts.player1 === 0 ||
            this.game.gameState.puckCounts.player2 === 0) {
            return;
        }

        this.ctx.save();
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        
        const playerColor = this.game.playerNumber === 1 ? 'red' : 'blue';
        const coloredText = this.game.playerNumber === 1 ? '#ff4444' : '#4444ff';
        
        const prefix = 'You can only place pucks in the ';
        const territory = `${playerColor} area`;
        const prefixWidth = this.ctx.measureText(prefix).width;
        
        const startX = (CONFIG.CANVAS.WIDTH - prefixWidth - this.ctx.measureText(territory).width) / 2;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(prefix, startX, 30);
        
        this.ctx.fillStyle = coloredText;
        this.ctx.fillText(territory, startX + prefixWidth, 30);
        
        this.ctx.restore();
    }

    drawWaitingMessage() {
        const opponentPucks = this.game.gameState.pucks.filter(
            puck => puck.player !== this.game.playerNumber
        );
        
        const opponentPucksMoving = opponentPucks.some(puck => 
            (Math.abs(puck.vx) > 0.01 || Math.abs(puck.vy) > 0.01)
        );

        if (opponentPucksMoving && this.game.gameState.activePlayer === this.game.playerNumber) {
            this.drawMessage('Waiting for opponent\'s pucks to stop...', CONFIG.CANVAS.HEIGHT - 30);
        }
    }

    drawTerritory() {
        const grid = this.game.territory.calculateGrid();
        
        // Draw filled areas
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                if (grid[row][col] === 0) continue;

                const x = col * CONFIG.TERRITORY.GRID_SIZE;
                const y = row * CONFIG.TERRITORY.GRID_SIZE;
                
                this.ctx.fillStyle = grid[row][col] === 1 ? 
                    CONFIG.TERRITORY.COLORS.PLAYER1 : 
                    CONFIG.TERRITORY.COLORS.PLAYER2;
                
                this.ctx.fillRect(x, y, CONFIG.TERRITORY.GRID_SIZE, CONFIG.TERRITORY.GRID_SIZE);
            }
        }

        // Draw territory borders
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                if (grid[row][col] === 0) continue;

                const x = col * CONFIG.TERRITORY.GRID_SIZE;
                const y = row * CONFIG.TERRITORY.GRID_SIZE;
                const current = grid[row][col];

                const hasEdge = (
                    (row === 0 || grid[row-1][col] !== current) ||
                    (row === grid.length-1 || grid[row+1][col] !== current) ||
                    (col === 0 || grid[row][col-1] !== current) ||
                    (col === grid[0].length-1 || grid[row][col+1] !== current)
                );

                if (hasEdge) {
                    this.ctx.strokeStyle = current === 1 ? 
                        CONFIG.TERRITORY.COLORS.PLAYER1_BORDER : 
                        CONFIG.TERRITORY.COLORS.PLAYER2_BORDER;
                    this.ctx.strokeRect(x, y, CONFIG.TERRITORY.GRID_SIZE, CONFIG.TERRITORY.GRID_SIZE);
                }
            }
        }
    }

    drawScoreboard() {
        this.game.ui.updateScoreboard();
    }
} 
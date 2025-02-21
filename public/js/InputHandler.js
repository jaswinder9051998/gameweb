import { CONFIG } from './config.js';

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.inputState = {
            isPlacing: false
        };
        this.setupEventListeners();
        this.initializeTouchControls();
        this.updateScalingFactors();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        window.addEventListener('resize', () => {
            this.updateCanvasDisplay();
            this.updateScalingFactors();
        });
    }

    initializeTouchControls() {
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.inputState.isPlacing = false;
            this.game.gameState.isCharging = false;
            this.game.gameState.currentPuck = null;
        }, { passive: false });
    }

    updateCanvasDisplay() {
        const containerWidth = this.canvas.parentElement.clientWidth;
        const containerHeight = this.canvas.parentElement.clientHeight;
        
        const scaleX = containerWidth / CONFIG.CANVAS.WIDTH;
        const scaleY = containerHeight / CONFIG.CANVAS.HEIGHT;
        const scale = Math.min(scaleX, scaleY, 1);

        const displayWidth = CONFIG.CANVAS.WIDTH * scale;
        const displayHeight = CONFIG.CANVAS.HEIGHT * scale;
        
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        
        this.displayScale = scale;
    }

    updateScalingFactors() {
        const rect = this.canvas.getBoundingClientRect();
        
        this.scaleX = CONFIG.CANVAS.BASE_WIDTH / rect.width;
        this.scaleY = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
        this.displayScale = rect.width / CONFIG.CANVAS.BASE_WIDTH;
        
        this.game.ctx.setTransform(
            this.displayScale, 0,
            0, this.displayScale,
            0, 0
        );
    }

    handleInputStart(e) {
        e.preventDefault();
        if (this.game.gameState.gameEnded) return;

        if (!this.game.gameState.isCharging && 
            this.game.gameState.activePlayer !== this.game.playerNumber) {
            return;
        }

        const coords = this.normalizeCoordinates(
            e.clientX || e.touches[0].clientX,
            e.clientY || e.touches[0].clientY
        );

        if (!this.game.gameState.isCharging && !this.game.gameState.currentPuck) {
            this.handlePuckPlacement(coords);
        }
        else if (this.game.gameState.isCharging && !this.inputState.isPlacing) {
            this.game.physics.launchPuck();
        }
    }

    handlePuckPlacement(coords) {
        if (this.game.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY &&
            this.game.gameState.puckCounts.player1 > 0 && 
            this.game.gameState.puckCounts.player2 > 0) {
            
            const grid = this.game.territory.calculateGrid();
            const col = Math.floor(coords.x / CONFIG.TERRITORY.GRID_SIZE);
            const row = Math.floor(coords.y / CONFIG.TERRITORY.GRID_SIZE);
            
            if (grid[row][col] !== this.game.playerNumber) {
                this.showErrorMessage(
                    `You can only place in ${this.game.playerNumber === 1 ? 'red' : 'blue'} territory!`,
                    coords.x,
                    coords.y
                );
                return;
            }
        }

        if (this.isValidPlacement(coords.x, coords.y)) {
            if (this.game.gameState.puckCounts[`player${this.game.playerNumber}`] >= CONFIG.PUCK.MAX_PUCKS_PER_PLAYER) {
                return;
            }

            this.game.gameState.rotationCenter = coords;
            this.game.gameState.isCharging = true;
            this.game.gameState.chargeStartTime = Date.now();
            this.game.gameState.rotationAngle = 0;
            
            this.game.gameState.currentPuck = {
                x: coords.x + Math.cos(this.game.gameState.rotationAngle) * this.game.gameState.rotationRadius,
                y: coords.y + Math.sin(this.game.gameState.rotationAngle) * this.game.gameState.rotationRadius,
                player: this.game.playerNumber,
                isCharging: true
            };
            this.inputState.isPlacing = true;

            setTimeout(() => {
                this.inputState.isPlacing = false;
            }, 100);
        }
    }

    handleMouseMove(e) {
        if (!this.game.gameState.isCharging) {
            const coords = this.normalizeCoordinates(e.clientX, e.clientY);
            this.game.previewPuckPosition = coords;
        }
    }

    isValidPlacement(x, y) {
        if (this.game.gameState.activePlayer !== this.game.playerNumber) {
            return false;
        }

        const opponentPucks = this.game.gameState.pucks.filter(
            puck => puck.player !== this.game.playerNumber
        );
        
        const opponentPucksMoving = opponentPucks.some(puck => 
            (Math.abs(puck.vx) > 0.01 || Math.abs(puck.vy) > 0.01)
        );

        if (opponentPucksMoving) {
            return false;
        }

        if (this.game.gameState.puckCounts.player1 === 0 || 
            this.game.gameState.puckCounts.player2 === 0) {
            return this.isWithinBounds(x, y) && !this.isInRestrictedZone(x, y);
        }

        if (this.game.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            const grid = this.game.territory.calculateGrid();
            const col = Math.floor(x / CONFIG.TERRITORY.GRID_SIZE);
            const row = Math.floor(y / CONFIG.TERRITORY.GRID_SIZE);
            
            if (grid[row][col] !== this.game.gameState.activePlayer) {
                return false;
            }
        }

        return this.isWithinBounds(x, y) && !this.isInRestrictedZone(x, y);
    }

    isWithinBounds(x, y) {
        return !(x < CONFIG.PUCK.RADIUS || 
                x > this.canvas.width - CONFIG.PUCK.RADIUS ||
                y < CONFIG.PUCK.RADIUS || 
                y > this.canvas.height - CONFIG.PUCK.RADIUS);
    }

    isInRestrictedZone(x, y) {
        const opponentPucks = this.game.gameState.pucks.filter(
            puck => puck.player !== this.game.gameState.activePlayer
        );

        return opponentPucks.some(puck => {
            const dx = x - puck.x;
            const dy = y - puck.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < CONFIG.PUCK.RESTRICTED_ZONE_RADIUS;
        });
    }

    normalizeCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (CONFIG.CANVAS.WIDTH / rect.width),
            y: (clientY - rect.top) * (CONFIG.CANVAS.HEIGHT / rect.height)
        };
    }

    showErrorMessage(message, x, y) {
        const errorPopup = {
            message: message,
            x: x,
            y: y - 30,
            life: 1.0,
            vy: -0.5,
            delay: 30
        };

        if (!this.game.gameState.errorMessages) {
            this.game.gameState.errorMessages = [];
        }
        this.game.gameState.errorMessages.push(errorPopup);

        if (this.game.gameState.sounds.error) {
            this.game.gameState.sounds.error.play();
        }
    }
} 
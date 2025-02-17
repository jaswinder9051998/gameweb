import { CONFIG } from './config.js';

class Game {
    constructor(playerNumber, socket, roomId, gameMode) {
        this.playerNumber = playerNumber;
        this.socket = socket;
        this.roomId = roomId;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.init(gameMode);
        this.setupEventListeners();
        
        // Listen for game updates from server
        this.socket.on('gameUpdated', (data) => {
            this.handleGameUpdate(data);
        });

        // Add touch controls initialization
        this.initializeTouchControls();

        // Add this line
        document.body.classList.add('game-active');

        // Add scaling factors
        this.updateScalingFactors();
        
        // Add window resize handler
        window.addEventListener('resize', () => this.updateCanvasDisplay());

        // Add state for two-step input
        this.inputState = {
            isPlacing: false,  // Track if we're in placement phase
        };
    }

    init(gameMode) {
        // Always use fixed dimensions for the canvas
        this.canvas.width = CONFIG.CANVAS.WIDTH;
        this.canvas.height = CONFIG.CANVAS.HEIGHT;
        
        // Calculate and set the CSS size for display
        this.updateCanvasDisplay();
        
        // Initialize scaling
        this.updateScalingFactors();
        
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
            territoryGrid: this.createTerritoryGrid()
        };

        this.createPlayAgainButton();
        
        console.log('Game initialized in mode:', gameMode);
        this.gameLoop();
    }

    updateCanvasDisplay() {
        const containerWidth = this.canvas.parentElement.clientWidth;
        const containerHeight = this.canvas.parentElement.clientHeight;
        
        // Calculate scale to fit container while maintaining aspect ratio
        const scaleX = containerWidth / CONFIG.CANVAS.WIDTH;
        const scaleY = containerHeight / CONFIG.CANVAS.HEIGHT;
        const scale = Math.min(scaleX, scaleY, 1); // Never scale up beyond 1

        // Set CSS dimensions
        const displayWidth = CONFIG.CANVAS.WIDTH * scale;
        const displayHeight = CONFIG.CANVAS.HEIGHT * scale;
        
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        
        // Store scale for input calculations
        this.displayScale = scale;
    }

    setupEventListeners() {
        // Modify mouse event listeners for two-step approach
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        // Remove mouseup listener as we don't need it anymore
        
        window.addEventListener('resize', () => {
            this.updateCanvasDisplay();
        });
    }

    updateScalingFactors() {
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate scale factors based on BASE dimensions
        this.scaleX = CONFIG.CANVAS.BASE_WIDTH / rect.width;
        this.scaleY = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
        
        // Store display scale for rendering
        this.displayScale = rect.width / CONFIG.CANVAS.BASE_WIDTH;
        
        // Update canvas context transform
        this.ctx.setTransform(
            this.displayScale, 0,
            0, this.displayScale,
            0, 0
        );
    }

    handleInputStart(e) {
        e.preventDefault();
        if (this.gameState.gameEnded) return;

        console.log('Input start', {
            activePlayer: this.gameState.activePlayer,
            playerNumber: this.playerNumber,
            isCharging: this.gameState.isCharging,
            isPlacing: this.inputState.isPlacing,
            hasPuck: !!this.gameState.currentPuck,
            puckCounts: this.gameState.puckCounts
        });

        // Only check player turn for the first click (placement)
        // Allow second click (launch) regardless of turn
        if (!this.gameState.isCharging && this.gameState.activePlayer !== this.playerNumber) {
            console.log('Not your turn');
            return;
        }

        const coords = this.normalizeCoordinates(
            e.clientX || e.touches[0].clientX,
            e.clientY || e.touches[0].clientY
        );

        // First click/touch - Place the puck
        if (!this.gameState.isCharging && !this.gameState.currentPuck) {
            if (this.isValidPlacement(coords.x, coords.y)) {
                // Check puck count
                if (this.gameState.puckCounts[`player${this.playerNumber}`] >= CONFIG.PUCK.MAX_PUCKS_PER_PLAYER) {
                    console.log('Max pucks reached');
                    return;
                }

                this.gameState.rotationCenter = coords;
                this.gameState.isCharging = true;
                this.gameState.chargeStartTime = Date.now();
                this.gameState.rotationAngle = 0;
                
                this.gameState.currentPuck = {
                    x: coords.x + Math.cos(this.gameState.rotationAngle) * this.gameState.rotationRadius,
                    y: coords.y + Math.sin(this.gameState.rotationAngle) * this.gameState.rotationRadius,
                    player: this.playerNumber, // Use playerNumber instead of activePlayer
                    isCharging: true
                };
                this.inputState.isPlacing = true;

                // Add small delay before allowing launch
                setTimeout(() => {
                    this.inputState.isPlacing = false;
                    console.log('Ready for launch');
                }, 100);
            }
        }
        // Second click/touch - Launch the puck
        else if (this.gameState.isCharging && !this.inputState.isPlacing) {
            console.log('Launching puck');
            this.launchPuck();
        }
    }

    handleMouseMove(e) {
        if (!this.gameState.isCharging) {
            const coords = this.normalizeCoordinates(e.clientX, e.clientY);
            this.previewPuckPosition = coords;
        }
    }

    isValidPlacement(x, y) {
        if (this.gameState.activePlayer !== this.playerNumber) {
            return false; // Not this player's turn
        }
        // First turn for either player - allow placement anywhere
        if (this.gameState.puckCounts.player1 === 0 || this.gameState.puckCounts.player2 === 0) {
            return this.isWithinBounds(x, y) && !this.isInRestrictedZone(x, y);
        }

        // After first turns, check territory in territory mode
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            const grid = this.calculateTerritory();
            const col = Math.floor(x / CONFIG.TERRITORY.GRID_SIZE);
            const row = Math.floor(y / CONFIG.TERRITORY.GRID_SIZE);
            
            // Must be in your own territory
            if (grid[row][col] !== this.gameState.activePlayer) {
                return false;
            }
        }

        return this.isWithinBounds(x, y) && !this.isInRestrictedZone(x, y);
    }

    // Split out the bounds checking
    isWithinBounds(x, y) {
        return !(x < CONFIG.PUCK.RADIUS || 
                x > this.canvas.width - CONFIG.PUCK.RADIUS ||
                y < CONFIG.PUCK.RADIUS || 
                y > this.canvas.height - CONFIG.PUCK.RADIUS);
    }

    // Split out the restricted zone checking
    isInRestrictedZone(x, y) {
        const opponentPucks = this.gameState.pucks.filter(
            puck => puck.player !== this.gameState.activePlayer
        );

        return opponentPucks.some(puck => {
            const dx = x - puck.x;
            const dy = y - puck.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < CONFIG.PUCK.RESTRICTED_ZONE_RADIUS;
        });
    }

    launchPuck() {
        if (!this.gameState.currentPuck) return;

        // Calculate launch vector using normalized coordinates
        const ropeVector = {
            x: this.gameState.currentPuck.x - this.gameState.rotationCenter.x,
            y: this.gameState.currentPuck.y - this.gameState.rotationCenter.y
        };

        // The launch direction should be perpendicular to the rope
        // Rotate the rope vector 90 degrees to get the tangent direction
        const launchDirection = {
            x: -ropeVector.y,  // Rotate 90 degrees by swapping x/y and negating one
            y: ropeVector.x
        };

        // Normalize the direction vector
        const length = Math.sqrt(launchDirection.x * launchDirection.x + launchDirection.y * launchDirection.y);
        launchDirection.x /= length;
        launchDirection.y /= length;

        // Calculate power based on charge time
        const currentTime = Date.now();
        const power = Math.min(
            (currentTime - this.gameState.chargeStartTime) / CONFIG.PUCK.MAX_CHARGE_TIME,
            1
        );
        
        // Calculate launch speed with a minimum value
        const launchSpeed = CONFIG.PUCK.MIN_LAUNCH_SPEED + 
            (CONFIG.PUCK.MAX_LAUNCH_SPEED - CONFIG.PUCK.MIN_LAUNCH_SPEED) * power;
        
        // Apply speed to the direction
        const velocity = {
            x: launchDirection.x * launchSpeed,
            y: launchDirection.y * launchSpeed
        };

        // Ensure coordinates are normalized before sending
        const launchedPuck = {
            x: this.gameState.currentPuck.x,
            y: this.gameState.currentPuck.y,
            vx: velocity.x,
            vy: velocity.y,
            player: this.gameState.activePlayer
        };

        // Send normalized coordinates to server
        this.socket.emit('gameMove', {
            roomId: this.roomId,
            type: 'launch',
            puck: launchedPuck
        });

        // Update local game state with the launched puck
        this.gameState.pucks.push(launchedPuck);
        this.gameState.puckCounts[`player${this.gameState.activePlayer}`]++;
        
        // Reset charging state
        this.gameState.isCharging = false;
        this.gameState.currentPuck = null;
        this.gameState.chargeStartTime = null;
        this.gameState.rotationCenter = null;
        
        // Switch active player
        this.gameState.activePlayer = this.gameState.activePlayer === 1 ? 2 : 1;

        if (this.gameState.sounds.launch) {
            this.gameState.sounds.launch.play();
        }
    }

    checkGameEnd() {
        // Check if both players have used all their pucks
        const allPucksUsed = Object.values(this.gameState.puckCounts)
            .every(count => count >= CONFIG.PUCK.MAX_PUCKS_PER_PLAYER);
        
        if (!allPucksUsed) {
            return false;
        }

        // Check if any pucks are still moving
        const pucksMoving = this.gameState.pucks.some(puck => 
            (Math.abs(puck.vx) > 0.01 || Math.abs(puck.vy) > 0.01)
        );

        if (pucksMoving) {
            return false;
        }

        // All pucks used and no pucks moving - now we can end
        return true;
    }

    hasValidPlacement() {
        // Sample grid of points to check for valid placement
        const step = CONFIG.PUCK.RADIUS * 2;
        for (let x = CONFIG.PUCK.RADIUS; x < this.canvas.width - CONFIG.PUCK.RADIUS; x += step) {
            for (let y = CONFIG.PUCK.RADIUS; y < this.canvas.height - CONFIG.PUCK.RADIUS; y += step) {
                if (this.isValidPlacement(x, y)) {
                    return true;
                }
            }
        }
        return false;
    }

    endGame() {
        this.gameState.gameEnded = true;
        
        // Update territory scores one final time
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            this.updateTerritoryScores();
        }
        
        // Determine winner based on final scores
        if (this.gameState.scores.player1 > this.gameState.scores.player2) {
            this.gameState.winner = 1;
        } else if (this.gameState.scores.player2 > this.gameState.scores.player1) {
            this.gameState.winner = 2;
        } else {
            this.gameState.winner = 'tie';
        }

        // Show play again button
        this.playAgainButton.style.display = 'block';
        
        // Play win sound
        if (this.gameState.sounds.win) {
            this.gameState.sounds.win.play();
        }
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Update rotating puck position
        if (this.gameState.isCharging) {
            const currentTime = Date.now();
            const elapsedTime = currentTime - this.gameState.chargeStartTime;
            // Complete one rotation every 1500ms (1.5 seconds)
            this.gameState.rotationAngle = (elapsedTime / 1500) * Math.PI * 2;
            
            // Calculate current puck position based on rotation
            const center = this.gameState.rotationCenter;
            if (this.gameState.currentPuck) {
                this.gameState.currentPuck.x = center.x + Math.cos(this.gameState.rotationAngle) * this.gameState.rotationRadius;
                this.gameState.currentPuck.y = center.y + Math.sin(this.gameState.rotationAngle) * this.gameState.rotationRadius;
            }
        }

        // Update moving pucks
        this.gameState.pucks.forEach(puck => {
            if (puck.vx || puck.vy) {
                // Update position
                puck.x += puck.vx;
                puck.y += puck.vy;

                // Wall collisions with speed reduction
                const wallDamping = 0.7; // Reduce speed by 30% on wall hits
                
                // Left and right walls
                if (puck.x - CONFIG.PUCK.RADIUS < 0) {
                    puck.x = CONFIG.PUCK.RADIUS;
                    puck.vx = -puck.vx * wallDamping;
                } else if (puck.x + CONFIG.PUCK.RADIUS > this.canvas.width) {
                    puck.x = this.canvas.width - CONFIG.PUCK.RADIUS;
                    puck.vx = -puck.vx * wallDamping;
                }
                
                // Top and bottom walls
                if (puck.y - CONFIG.PUCK.RADIUS < 0) {
                    puck.y = CONFIG.PUCK.RADIUS;
                    puck.vy = -puck.vy * wallDamping;
                } else if (puck.y + CONFIG.PUCK.RADIUS > this.canvas.height) {
                    puck.y = this.canvas.height - CONFIG.PUCK.RADIUS;
                    puck.vy = -puck.vy * wallDamping;
                }

                // Apply friction
                puck.vx *= CONFIG.PHYSICS.FRICTION;
                puck.vy *= CONFIG.PHYSICS.FRICTION;

                // Stop very slow movement
                if (Math.abs(puck.vx) < 0.01) puck.vx = 0;
                if (Math.abs(puck.vy) < 0.01) puck.vy = 0;

                // Handle collisions with other pucks
                this.handlePuckCollisions(puck);
            }
        });

        // Update sparks
        for (let i = this.gameState.sparks.length - 1; i >= 0; i--) {
            const spark = this.gameState.sparks[i];
            
            // Update position
            spark.x += spark.vx;
            spark.y += spark.vy;
            
            // Decrease life and size
            spark.life -= 0.03; // Slower fade out
            spark.size = spark.initialSize * spark.life;
            spark.rotation += 0.1; // Rotate spark over time
            
            // Remove dead sparks
            if (spark.life <= 0) {
                this.gameState.sparks.splice(i, 1);
            }
        }

        // Update score popups
        if (this.gameState.scorePopups) {
            for (let i = this.gameState.scorePopups.length - 1; i >= 0; i--) {
                const popup = this.gameState.scorePopups[i];
                popup.y += popup.vy;
                popup.life -= 0.02;
                
                if (popup.life <= 0) {
                    this.gameState.scorePopups.splice(i, 1);
                }
            }
        }

        // Update territory scores
        this.updateTerritoryScores();

        // Check for game end only if all pucks are used
        if (Object.values(this.gameState.puckCounts)
            .every(count => count >= CONFIG.PUCK.MAX_PUCKS_PER_PLAYER)) {
            
            // Check if any pucks are still moving
            const pucksMoving = this.gameState.pucks.some(puck => 
                (Math.abs(puck.vx) > 0.01 || Math.abs(puck.vy) > 0.01)
            );

            if (!pucksMoving && !this.gameState.gameEnded) {
                this.endGame();
            }
        }
    }

    handleWallCollisions(puck) {
        let collision = false;
        let collisionPoint = { x: 0, y: 0 };
        let normal = { x: 0, y: 0 };

        // Bounce off walls
        if (puck.x < CONFIG.PUCK.RADIUS) {
            puck.x = CONFIG.PUCK.RADIUS;
            puck.vx = -puck.vx * CONFIG.PHYSICS.COLLISION_ELASTICITY;
            collision = true;
            collisionPoint = { x: 0, y: puck.y };
            normal = { x: 1, y: 0 };
        }
        if (puck.x > this.canvas.width - CONFIG.PUCK.RADIUS) {
            puck.x = this.canvas.width - CONFIG.PUCK.RADIUS;
            puck.vx = -puck.vx * CONFIG.PHYSICS.COLLISION_ELASTICITY;
            collision = true;
            collisionPoint = { x: this.canvas.width, y: puck.y };
            normal = { x: -1, y: 0 };
        }
        if (puck.y < CONFIG.PUCK.RADIUS) {
            puck.y = CONFIG.PUCK.RADIUS;
            puck.vy = -puck.vy * CONFIG.PHYSICS.COLLISION_ELASTICITY;
            collision = true;
            collisionPoint = { x: puck.x, y: 0 };
            normal = { x: 0, y: 1 };
        }
        if (puck.y > this.canvas.height - CONFIG.PUCK.RADIUS) {
            puck.y = this.canvas.height - CONFIG.PUCK.RADIUS;
            puck.vy = -puck.vy * CONFIG.PHYSICS.COLLISION_ELASTICITY;
            collision = true;
            collisionPoint = { x: puck.x, y: this.canvas.height };
            normal = { x: 0, y: -1 };
        }

        // Create sparks if collision occurred
        if (collision) {
            const speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
            this.createSparks(collisionPoint, normal, speed, puck.player);
        }
    }

    createSparks(position, normal, speed, player) {
        // Reduced base number of sparks and speed dependency
        const numSparks = Math.floor(10 + speed / 5);  // Reduced from 25 + speed/3
        const sparkSpeed = speed * 0.7;  // Reduced from 0.9
        
        for (let i = 0; i < numSparks; i++) {
            const baseAngle = Math.atan2(normal.y, normal.x);
            const spreadAngle = Math.PI * 0.8;
            const angle = baseAngle - spreadAngle/2 + Math.random() * spreadAngle;
            
            // Smaller spark size
            const size = 2 + Math.random() * 2;  // Reduced from 3 + random * 4
            
            const spark = {
                x: position.x,
                y: position.y,
                vx: Math.cos(angle) * sparkSpeed * (0.3 + Math.random() * 0.7),
                vy: Math.sin(angle) * sparkSpeed * (0.3 + Math.random() * 0.7),
                life: 1.0,
                size: size,
                initialSize: size,
                rotation: Math.random() * Math.PI * 2
            };
            
            this.gameState.sparks.push(spark);
        }
    }

    handlePuckCollisions(puck) {
        for (let i = 0; i < this.gameState.pucks.length; i++) {
            const otherPuck = this.gameState.pucks[i];
            if (puck === otherPuck) continue;

            const dx = puck.x - otherPuck.x;
            const dy = puck.y - otherPuck.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.PUCK.RADIUS * 2) {
                // Only emit collision if this is the active player
                if (this.gameState.activePlayer === this.playerNumber) {
                    this.socket.emit('gameMove', {
                        roomId: this.roomId,
                        type: 'collision',
                        puck1: {
                            x: puck.x,
                            y: puck.y,
                            vx: puck.vx || 0,
                            vy: puck.vy || 0
                        },
                        puck2: {
                            x: otherPuck.x,
                            y: otherPuck.y,
                            vx: otherPuck.vx || 0,
                            vy: otherPuck.vy || 0
                        }
                    });
                }

                // Calculate relative velocity
                const vx = (puck.vx || 0) - (otherPuck.vx || 0);
                const vy = (puck.vy || 0) - (otherPuck.vy || 0);
                const speed = Math.sqrt(vx * vx + vy * vy);

                // Calculate collision force for scoring
                if (speed > 1) {
                    this.handleCollisionScore(puck, otherPuck, speed);
                }

                // Normalize collision normal
                const nx = dx / distance;
                const ny = dy / distance;

                // Calculate relative velocity in terms of normal direction
                const velocityAlongNormal = vx * nx + vy * ny;

                // Don't resolve collision if pucks are moving apart
                if (velocityAlongNormal > 0) return;

                // Calculate impulse scalar with reduced transfer
                const restitution = CONFIG.PHYSICS.COLLISION_ELASTICITY;
                const impulseMagnitude = -(1 + restitution) * velocityAlongNormal * 0.5; // Added 0.5 factor

                // Apply impulse with momentum conservation
                const totalMass = 2; // Both pucks have mass of 1
                const puck1Ratio = 1 / totalMass;
                const puck2Ratio = 1 / totalMass;

                // Apply impulse with mass ratios
                puck.vx = (puck.vx || 0) - (impulseMagnitude * nx * puck1Ratio);
                puck.vy = (puck.vy || 0) - (impulseMagnitude * ny * puck1Ratio);
                otherPuck.vx = (otherPuck.vx || 0) + (impulseMagnitude * nx * puck2Ratio);
                otherPuck.vy = (otherPuck.vy || 0) + (impulseMagnitude * ny * puck2Ratio);

                // Additional velocity dampening for the receiving puck
                if (!otherPuck.vx && !otherPuck.vy) { // If it was stationary
                    otherPuck.vx *= 0.4; // Reduce transferred velocity by 60%
                    otherPuck.vy *= 0.4;
                }

                // Separate the pucks to prevent sticking
                const overlap = (CONFIG.PUCK.RADIUS * 2) - distance;
                const separationX = (overlap * nx) / 2;
                const separationY = (overlap * ny) / 2;
                
                puck.x -= separationX;
                puck.y -= separationY;
                otherPuck.x += separationX;
                otherPuck.y += separationY;
            }
        }
    }

    handleCollisionScore(puck1, puck2, force) {
        // Consider a puck "stationary" if its speed is very low
        const speed1 = Math.sqrt((puck1.vx || 0) ** 2 + (puck1.vy || 0) ** 2);
        const speed2 = Math.sqrt((puck2.vx || 0) ** 2 + (puck2.vy || 0) ** 2);
        
        const puck1Moving = speed1 > 1;
        const puck2Moving = speed2 > 1;
        
        const basePoints = Math.floor(force);
        let points = 0;
        let scoringPlayer = null;
        let scorePosition = { x: 0, y: 0 };

        if (puck1Moving && !puck2Moving) {
            if (puck1.player !== puck2.player) {
                points = Math.max(basePoints, 1);
                scoringPlayer = puck1.player;
                scorePosition = { x: puck2.x, y: puck2.y };
            }
        } else if (!puck1Moving && puck2Moving) {
            if (puck1.player !== puck2.player) {
                points = Math.max(basePoints, 1);
                scoringPlayer = puck2.player;
                scorePosition = { x: puck1.x, y: puck1.y };
            }
        }

        if (points > 0) {
            // In territory mode, add collision points to territory points
            if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
                this.gameState.collisionScores = this.gameState.collisionScores || { player1: 0, player2: 0 };
                this.gameState.collisionScores[`player${scoringPlayer}`] += points;
            } else {
                this.gameState.scores[`player${scoringPlayer}`] += points;
            }
            this.createScorePopup(scorePosition, points, scoringPlayer);
            if (this.gameState.sounds.score) {
                this.gameState.sounds.score.play();
            }
        }
    }

    createScorePopup(position, points, player) {
        const popup = {
            x: position.x,
            y: position.y,
            points: points,
            player: player,
            life: 1.0,
            vy: -2 // Upward movement speed
        };
        
        if (!this.gameState.scorePopups) {
            this.gameState.scorePopups = [];
        }
        this.gameState.scorePopups.push(popup);
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw territory if in territory mode
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            this.drawTerritory();
            console.log('Drawing territory');
        }
        
        // Draw game board
        this.drawBoard();
        
        // Draw restricted zones
        this.drawRestrictedZones();
        
        // Draw power bar
        this.drawPowerBar();

        // Draw rotation center and rotating puck
        if (this.gameState.isCharging) {
            // Draw center point
            this.ctx.beginPath();
            this.ctx.arc(
                this.gameState.rotationCenter.x,
                this.gameState.rotationCenter.y,
                3, 0, Math.PI * 2
            );
            this.ctx.fillStyle = '#333';
            this.ctx.fill();
            
            // Draw rope connecting center to puck
            if (this.gameState.currentPuck) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.gameState.rotationCenter.x, this.gameState.rotationCenter.y);
                this.ctx.lineTo(this.gameState.currentPuck.x, this.gameState.currentPuck.y);
                this.ctx.strokeStyle = '#666';
                this.ctx.setLineDash([5, 5]); // Create dashed line
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.setLineDash([]); // Reset line style
            }
            
            // Draw rotation path
            this.ctx.beginPath();
            this.ctx.arc(
                this.gameState.rotationCenter.x,
                this.gameState.rotationCenter.y,
                this.gameState.rotationRadius,
                0, Math.PI * 2
            );
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.stroke();
            
            // Draw rotating puck with direction arrow
            if (this.gameState.currentPuck) {
                this.drawPuck(
                    this.gameState.currentPuck.x,
                    this.gameState.currentPuck.y,
                    this.gameState.currentPuck.player
                );
                
                // Draw launch direction arrow
                this.drawLaunchDirectionArrow(
                    this.gameState.currentPuck,
                    this.gameState.rotationCenter
                );
            }
        } else if (this.previewPuckPosition) {
            this.drawPuck(
                this.previewPuckPosition.x,
                this.previewPuckPosition.y,
                this.gameState.activePlayer,
                true
            );
        }
        
        // Draw all pucks (including both players' pucks)
        this.gameState.pucks.forEach(puck => {
            if (!puck.isCharging) {  // Only draw non-charging pucks
                this.drawPuck(puck.x, puck.y, puck.player);
            }
        });

        // Draw the currently charging puck if it exists
        if (this.gameState.isCharging && this.gameState.currentPuck) {
            this.drawPuck(
                this.gameState.currentPuck.x,
                this.gameState.currentPuck.y,
                this.gameState.currentPuck.player
            );
        }

        // Draw scoreboard
        this.drawScoreboard();

        // Draw score popups
        this.drawScorePopups();

        // Draw game end overlay if game has ended
        if (this.gameState.gameEnded) {
            this.drawGameEndOverlay();
        }

        // Draw sparks last (top layer)
        this.drawSparks();

        // Add indicator text when puck is placed and waiting for launch
        if (this.gameState.isCharging && this.gameState.currentPuck) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'Tap anywhere to launch!',
                CONFIG.CANVAS.WIDTH / 2,
                CONFIG.CANVAS.HEIGHT - 30
            );
            this.ctx.restore();
        }
    }

    drawBoard() {
        // Basic board rendering
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

    drawRestrictedZones() {
        // In territory mode, show invalid placement areas (but not during first turns)
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY && 
            this.gameState.puckCounts.player1 > 0 && 
            this.gameState.puckCounts.player2 > 0) {
            
            const grid = this.calculateTerritory();
            
            // Draw semi-transparent overlay on opponent's territory
            for (let row = 0; row < grid.length; row++) {
                for (let col = 0; col < grid[0].length; col++) {
                    if (grid[row][col] !== this.gameState.activePlayer && grid[row][col] !== 0) {
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

        // Draw restricted zones around opponent pucks
        const opponentPucks = this.gameState.pucks.filter(
            puck => puck.player !== this.gameState.activePlayer
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
        const { WIDTH: barWidth, HEIGHT: barHeight, MARGIN } = CONFIG.UI.POWER_BAR;
        const x = this.canvas.width - MARGIN - barWidth;
        const y = (this.canvas.height - barHeight) / 2;

        // Draw background
        this.ctx.fillStyle = '#eee';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        this.ctx.strokeStyle = '#333';
        this.ctx.strokeRect(x, y, barWidth, barHeight);

        if (this.gameState.isCharging) {
            // Calculate power based on charge time
            const currentTime = Date.now();
            const power = Math.min(
                (currentTime - this.gameState.chargeStartTime) / CONFIG.PUCK.MAX_CHARGE_TIME,
                1
            );

            // Draw power level
            const powerHeight = power * barHeight;
            this.ctx.fillStyle = this.getPowerBarColor(power);
            this.ctx.fillRect(
                x,
                y + barHeight - powerHeight,
                barWidth,
                powerHeight
            );
        }
    }

    getPowerBarColor(power) {
        // Color transitions from green to yellow to red as power increases
        if (power < 0.5) {
            // Green to Yellow
            const hue = 120 - (power * 2 * 60);
            return `hsl(${hue}, 100%, 40%)`;
        } else {
            // Yellow to Red
            const hue = 60 - ((power - 0.5) * 2 * 60);
            return `hsl(${hue}, 100%, 40%)`;
        }
    }

    drawScoreboard() {
        this.ctx.save();
        
        // Draw puck count box
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(10, 10, 200, 40);
        this.ctx.strokeStyle = '#333';
        this.ctx.strokeRect(10, 10, 200, 40);

        // Draw puck counts more compactly
        this.ctx.font = '18px Arial';
        
        // P1 puck count on left
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText(`P1: ${CONFIG.PUCK.MAX_PUCKS_PER_PLAYER - this.gameState.puckCounts.player1}`, 20, 35);
        
        // P2 puck count on right
        this.ctx.fillStyle = '#4444ff';
        this.ctx.fillText(`P2: ${CONFIG.PUCK.MAX_PUCKS_PER_PLAYER - this.gameState.puckCounts.player2}`, 110, 35);

        // Draw score box below puck counts
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(10, 60, 200, 80);
        this.ctx.strokeStyle = '#333';
        this.ctx.strokeRect(10, 60, 200, 80);

        // Draw scores
        this.ctx.font = 'bold 24px Arial';
        
        // Player 1 score
        this.ctx.fillStyle = '#ff4444';
        this.ctx.shadowColor = 'rgba(255, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            const territoryScore1 = this.gameState.scores.player1 - (this.gameState.collisionScores?.player1 || 0);
            this.ctx.fillText(`P1: ${territoryScore1} + ${this.gameState.collisionScores?.player1 || 0}`, 20, 85);
        } else {
            this.ctx.fillText(`P1: ${this.gameState.scores.player1}`, 20, 85);
        }
        
        // Player 2 score
        this.ctx.fillStyle = '#4444ff';
        this.ctx.shadowColor = 'rgba(0, 0, 255, 0.3)';
        this.ctx.shadowBlur = 5;
        
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            const territoryScore2 = this.gameState.scores.player2 - (this.gameState.collisionScores?.player2 || 0);
            this.ctx.fillText(`P2: ${territoryScore2} + ${this.gameState.collisionScores?.player2 || 0}`, 20, 115);
        } else {
            this.ctx.fillText(`P2: ${this.gameState.scores.player2}`, 20, 115);
        }
        
        this.ctx.restore();
    }

    drawLaunchDirectionArrow(puck, center) {
        // Calculate the vector from center to puck (the rope)
        const ropeVector = {
            x: puck.x - center.x,
            y: puck.y - center.y
        };

        // Calculate tangential direction (perpendicular to rope)
        const tangentVector = {
            x: -ropeVector.y,
            y: ropeVector.x
        };

        // Normalize the tangent vector
        const length = Math.sqrt(tangentVector.x * tangentVector.x + tangentVector.y * tangentVector.y);
        const normalizedTangent = {
            x: tangentVector.x / length,
            y: tangentVector.y / length
        };

        // Calculate current power level
        const currentTime = Date.now();
        const power = Math.min(
            (currentTime - this.gameState.chargeStartTime) / CONFIG.PUCK.MAX_CHARGE_TIME,
            1
        );

        // Arrow properties
        const baseArrowLength = CONFIG.PUCK.RADIUS * 4; // Made base length longer
        const minArrowLength = baseArrowLength * 0.5;   // Minimum length when uncharged
        const arrowLength = minArrowLength + (baseArrowLength * power); // Length scales with power
        const arrowWidth = 12; // Made arrow head bigger
        
        const arrowStart = {
            x: puck.x,
            y: puck.y
        };
        const arrowEnd = {
            x: puck.x + normalizedTangent.x * arrowLength,
            y: puck.y + normalizedTangent.y * arrowLength
        };

        // Draw arrow line
        this.ctx.beginPath();
        this.ctx.moveTo(arrowStart.x, arrowStart.y);
        this.ctx.lineTo(arrowEnd.x, arrowEnd.y);
        this.ctx.strokeStyle = puck.player === 1 ? '#ff0000' : '#0000ff';
        this.ctx.lineWidth = 3; // Made line thicker
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

    drawSparks() {
        this.gameState.sparks.forEach(spark => {
            this.ctx.save();
            this.ctx.translate(spark.x, spark.y);
            this.ctx.rotate(spark.rotation);
            
            // Reduced glow effect
            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';  // Reduced from 0.8
            this.ctx.shadowBlur = 10;  // Reduced from 15
            
            // Draw spark as a star shape
            this.ctx.beginPath();
            
            // Create intense golden gradient with smaller radius
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, spark.size * 2); // Reduced from size * 3
            gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(0.6, 'rgba(255, 180, 0, 1)');
            gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.strokeStyle = 'rgba(255, 200, 0, 1)';
            this.ctx.lineWidth = spark.size;
            this.ctx.globalAlpha = spark.life;
            
            // Simpler star shape with fewer points
            const outerRadius = spark.size * 2;  // Reduced from size * 3
            const innerRadius = spark.size;      // Reduced from size * 1.5
            const points = 4;
            
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / points;
                if (i === 0) {
                    this.ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                } else {
                    this.ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                }
            }
            this.ctx.closePath();
            
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }

    drawScorePopups() {
        if (!this.gameState.scorePopups) return;

        this.gameState.scorePopups.forEach(popup => {
            this.ctx.save();
            
            // Set font and color
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = popup.player === 1 ? 
                `rgba(255, 68, 68, ${popup.life})` : 
                `rgba(68, 68, 255, ${popup.life})`;
            
            // Add glow effect
            this.ctx.shadowColor = popup.player === 1 ? 
                'rgba(255, 0, 0, 0.5)' : 
                'rgba(0, 0, 255, 0.5)';
            this.ctx.shadowBlur = 10;
            
            // Draw points with + prefix
            const text = `+${popup.points}`;
            const textWidth = this.ctx.measureText(text).width;
            this.ctx.fillText(text, popup.x - textWidth/2, popup.y);
            
            this.ctx.restore();
        });
    }

    drawGameEndOverlay() {
        this.ctx.save();
        
        // Draw semi-transparent background
        this.ctx.fillStyle = CONFIG.UI.GAME_END_OVERLAY.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game end message
        this.ctx.font = `${CONFIG.UI.GAME_END_OVERLAY.FONT_SIZE}px Arial`;
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let message;
        if (this.gameState.winner === 'tie') {
            message = "It's a Tie!";
        } else {
            const winnerColor = this.gameState.winner === 1 ? 'Red' : 'Blue';
            message = `${winnerColor} Player Wins!`;
        }
        
        this.ctx.fillText(
            message,
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        
        // Draw final scores with both components in territory mode
        this.ctx.font = '24px Arial';
        if (this.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
            const territoryScore1 = this.gameState.scores.player1 - (this.gameState.collisionScores?.player1 || 0);
            const territoryScore2 = this.gameState.scores.player2 - (this.gameState.collisionScores?.player2 || 0);
            
            this.ctx.fillText(
                `Final Score - Red: ${territoryScore1} + ${this.gameState.collisionScores?.player1 || 0} = ${this.gameState.scores.player1}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 50
            );
            this.ctx.fillText(
                `Blue: ${territoryScore2} + ${this.gameState.collisionScores?.player2 || 0} = ${this.gameState.scores.player2}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 80
            );
        } else {
            this.ctx.fillText(
                `Final Score - Red: ${this.gameState.scores.player1} | Blue: ${this.gameState.scores.player2}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 50
            );
        }
        
        this.ctx.restore();
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

        button.addEventListener('click', () => this.resetGame());
        this.canvas.parentElement.appendChild(button);
        this.playAgainButton = button;
    }

    resetGame() {
        // Emit reset event to server
        this.socket.emit('gameMove', {
            roomId: this.roomId,
            type: 'reset'
        });

        // Reset local game state
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
        this.playAgainButton.style.display = 'none';
    }

    createTerritoryGrid() {
        const cols = Math.ceil(this.canvas.width / CONFIG.TERRITORY.GRID_SIZE);
        const rows = Math.ceil(this.canvas.height / CONFIG.TERRITORY.GRID_SIZE);
        return Array(rows).fill().map(() => Array(cols).fill(0));
    }

    calculateTerritory() {
        const grid = this.createTerritoryGrid();
        
        // Group pucks by player
        const player1Pucks = this.gameState.pucks.filter(p => p.player === 1);
        const player2Pucks = this.gameState.pucks.filter(p => p.player === 2);

        // For each grid cell
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                const x = col * CONFIG.TERRITORY.GRID_SIZE + CONFIG.TERRITORY.GRID_SIZE/2;
                const y = row * CONFIG.TERRITORY.GRID_SIZE + CONFIG.TERRITORY.GRID_SIZE/2;
                
                // Find nearest puck and its distance for each player
                let nearestDist1 = Infinity;
                let nearestDist2 = Infinity;

                // Check player 1 pucks
                player1Pucks.forEach(puck => {
                    const dx = x - puck.x;
                    const dy = y - puck.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    nearestDist1 = Math.min(nearestDist1, dist);
                });

                // Check player 2 pucks
                player2Pucks.forEach(puck => {
                    const dx = x - puck.x;
                    const dy = y - puck.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    nearestDist2 = Math.min(nearestDist2, dist);
                });

                // Assign cell to player with nearest puck
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

    updateTerritoryScores() {
        if (this.gameState.gameMode !== CONFIG.GAME_MODES.TERRITORY) return;

        const grid = this.calculateTerritory();
        let player1Area = 0;
        let player2Area = 0;

        grid.forEach(row => {
            row.forEach(cell => {
                if (cell === 1) player1Area++;
                if (cell === 2) player2Area++;
            });
        });

        // Combine territory and collision scores
        const territoryScore1 = Math.floor(player1Area * CONFIG.TERRITORY.SCORE_PER_AREA);
        const territoryScore2 = Math.floor(player2Area * CONFIG.TERRITORY.SCORE_PER_AREA);
        
        this.gameState.scores.player1 = territoryScore1 + (this.gameState.collisionScores?.player1 || 0);
        this.gameState.scores.player2 = territoryScore2 + (this.gameState.collisionScores?.player2 || 0);
    }

    drawTerritory() {
        const grid = this.calculateTerritory();
        
        // First pass: draw filled areas
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                if (grid[row][col] === 0) continue;

                const x = col * CONFIG.TERRITORY.GRID_SIZE;
                const y = row * CONFIG.TERRITORY.GRID_SIZE;
                
                this.ctx.fillStyle = grid[row][col] === 1 ? 
                    CONFIG.TERRITORY.COLORS.PLAYER1 : 
                    CONFIG.TERRITORY.COLORS.PLAYER2;
                
                this.ctx.fillRect(
                    x, y, 
                    CONFIG.TERRITORY.GRID_SIZE, 
                    CONFIG.TERRITORY.GRID_SIZE
                );
            }
        }

        // Second pass: draw borders where territory changes
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[0].length; col++) {
                if (grid[row][col] === 0) continue;

                const x = col * CONFIG.TERRITORY.GRID_SIZE;
                const y = row * CONFIG.TERRITORY.GRID_SIZE;
                const current = grid[row][col];

                // Check neighboring cells
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
                    this.ctx.strokeRect(
                        x, y, 
                        CONFIG.TERRITORY.GRID_SIZE, 
                        CONFIG.TERRITORY.GRID_SIZE
                    );
                }
            }
        }

        // Draw pucks on top
        this.gameState.pucks.forEach(puck => {
            this.drawPuck(puck.x, puck.y, puck.player);
        });
    }

    handleGameUpdate(data) {
        if (data.type === 'launch') {
            // Ensure coordinates are in canvas space
            const puck = {
                ...data.puck,
                x: data.puck.x,
                y: data.puck.y,
                vx: data.puck.vx,
                vy: data.puck.vy
            };

            this.gameState.pucks.push(puck);
            this.gameState.puckCounts[`player${data.puck.player}`]++;
            this.gameState.activePlayer = data.currentTurn === 'player1' ? 1 : 2;
        } 
        else if (data.type === 'collision') {
            // Find the corresponding pucks in our game state
            const localPuck1 = this.gameState.pucks.find(p => 
                Math.abs(p.x - data.puck1.x) < 0.1 && 
                Math.abs(p.y - data.puck1.y) < 0.1
            );
            const localPuck2 = this.gameState.pucks.find(p => 
                Math.abs(p.x - data.puck2.x) < 0.1 && 
                Math.abs(p.y - data.puck2.y) < 0.1
            );

            if (localPuck1 && localPuck2) {
                // Update with velocities from collision moment
                localPuck1.vx = data.puck1.vx;
                localPuck1.vy = data.puck1.vy;
                localPuck2.vx = data.puck2.vx;
                localPuck2.vy = data.puck2.vy;
            }
        }
        else if (data.type === 'reset') {
            // Reset local game state when receiving reset from server
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
            this.playAgainButton.style.display = 'none';
        }
    }

    // Add this method to the Game class
    initializeTouchControls() {
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e), { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            // Only reset on cancel
            this.inputState.isPlacing = false;
            this.gameState.isCharging = false;
            this.gameState.currentPuck = null;
        }, { passive: false });
    }

    // Add this method to ensure consistent coordinate handling
    normalizeCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (CONFIG.CANVAS.WIDTH / rect.width),
            y: (clientY - rect.top) * (CONFIG.CANVAS.HEIGHT / rect.height)
        };
    }
}

// Modify the startGame function to accept player info
window.startGame = function(playerNumber, socket, roomId, gameMode) {
    new Game(playerNumber, socket, roomId, gameMode);
}; 
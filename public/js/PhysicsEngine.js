import { CONFIG } from './config.js';

export class PhysicsEngine {
    constructor(game) {
        this.game = game;
    }

    update() {
        this.updateRotatingPuck();
        this.updateMovingPucks();
        this.updateSparks();
        this.updateScorePopups();
        this.updateErrorMessages();
    }

    updateRotatingPuck() {
        if (!this.game.gameState.isCharging) return;

        const currentTime = Date.now();
        const elapsedTime = currentTime - this.game.gameState.chargeStartTime;
        this.game.gameState.rotationAngle = (elapsedTime / 1500) * Math.PI * 2;
        
        const center = this.game.gameState.rotationCenter;
        if (this.game.gameState.currentPuck) {
            this.game.gameState.currentPuck.x = center.x + 
                Math.cos(this.game.gameState.rotationAngle) * this.game.gameState.rotationRadius;
            this.game.gameState.currentPuck.y = center.y + 
                Math.sin(this.game.gameState.rotationAngle) * this.game.gameState.rotationRadius;
        }
    }

    updateMovingPucks() {
        this.game.gameState.pucks.forEach(puck => {
            if (!puck.vx && !puck.vy) return;

            // Update position
            puck.x += puck.vx;
            puck.y += puck.vy;

            // Handle wall collisions
            this.handleWallCollisions(puck);

            // Apply friction
            puck.vx *= CONFIG.PHYSICS.FRICTION;
            puck.vy *= CONFIG.PHYSICS.FRICTION;

            // Stop very slow movement
            if (Math.abs(puck.vx) < 0.01) puck.vx = 0;
            if (Math.abs(puck.vy) < 0.01) puck.vy = 0;

            // Handle collisions with other pucks
            this.handlePuckCollisions(puck);
        });
    }

    updateSparks() {
        for (let i = this.game.gameState.sparks.length - 1; i >= 0; i--) {
            const spark = this.game.gameState.sparks[i];
            
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.life -= 0.03;
            spark.size = spark.initialSize * spark.life;
            spark.rotation += 0.1;
            
            if (spark.life <= 0) {
                this.game.gameState.sparks.splice(i, 1);
            }
        }
    }

    updateScorePopups() {
        if (!this.game.gameState.scorePopups) return;

        for (let i = this.game.gameState.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.game.gameState.scorePopups[i];
            popup.y += popup.vy;
            popup.life -= 0.02;
            
            if (popup.life <= 0) {
                this.game.gameState.scorePopups.splice(i, 1);
            }
        }
    }

    updateErrorMessages() {
        if (!this.game.gameState.errorMessages) return;

        for (let i = this.game.gameState.errorMessages.length - 1; i >= 0; i--) {
            const msg = this.game.gameState.errorMessages[i];
            
            if (msg.delay > 0) {
                msg.delay--;
            } else {
                msg.y += msg.vy;
                msg.life -= 0.01;
            }
            
            if (msg.life <= 0) {
                this.game.gameState.errorMessages.splice(i, 1);
            }
        }
    }

    handleWallCollisions(puck) {
        let collision = false;
        let collisionPoint = { x: 0, y: 0 };
        let normal = { x: 0, y: 0 };

        const speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
        let wallDamping;
        if (speed < 1) {
            wallDamping = 0.3;
        } else if (speed < 2) {
            wallDamping = 0.5;
        } else {
            wallDamping = 0.7;
        }

        // Left wall
        if (puck.x < CONFIG.PUCK.RADIUS) {
            puck.x = CONFIG.PUCK.RADIUS;
            puck.vx = -puck.vx * wallDamping;
            collision = true;
            collisionPoint = { x: 0, y: puck.y };
            normal = { x: 1, y: 0 };
        }
        // Right wall
        else if (puck.x + CONFIG.PUCK.RADIUS > this.game.canvas.width) {
            puck.x = this.game.canvas.width - CONFIG.PUCK.RADIUS;
            puck.vx = -puck.vx * wallDamping;
            collision = true;
            collisionPoint = { x: this.game.canvas.width, y: puck.y };
            normal = { x: -1, y: 0 };
        }
        // Top wall
        if (puck.y < CONFIG.PUCK.RADIUS) {
            puck.y = CONFIG.PUCK.RADIUS;
            puck.vy = -puck.vy * wallDamping;
            collision = true;
            collisionPoint = { x: puck.x, y: 0 };
            normal = { x: 0, y: 1 };
        }
        // Bottom wall
        else if (puck.y + CONFIG.PUCK.RADIUS > this.game.canvas.height) {
            puck.y = this.game.canvas.height - CONFIG.PUCK.RADIUS;
            puck.vy = -puck.vy * wallDamping;
            collision = true;
            collisionPoint = { x: puck.x, y: this.game.canvas.height };
            normal = { x: 0, y: -1 };
        }

        if (collision) {
            this.createSparks(collisionPoint, normal, speed, puck.player);
        }
    }

    handlePuckCollisions(puck) {
        // Skip collision checks if puck has ghost power
        if (puck.hasGhost) {
            // Check if ghost duration has expired
            const currentTime = Date.now();
            if (currentTime - puck.ghostStartTime > CONFIG.PUCK.GHOST_DURATION) {
                puck.hasGhost = false;
                delete puck.ghostStartTime;
            } else {
                return; // Skip collision handling for ghost pucks
            }
        }

        for (let i = 0; i < this.game.gameState.pucks.length; i++) {
            const otherPuck = this.game.gameState.pucks[i];
            if (puck === otherPuck) continue;

            const dx = puck.x - otherPuck.x;
            const dy = puck.y - otherPuck.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Handle repulsion first
            if (puck.hasRepel && distance < CONFIG.PUCK.REPEL_RADIUS) {
                this.applyRepelForce(puck, otherPuck, dx, dy, distance);
                
                // Skip collision handling completely for repelling pucks
                continue;
            }

            // Normal collision handling (only if not repelling or ghost)
            if (distance < CONFIG.PUCK.RADIUS * 2) {
                if (this.game.gameState.activePlayer === this.game.playerNumber) {
                    this.game.socket.emit('gameMove', {
                        roomId: this.game.roomId,
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

                this.resolvePuckCollision(puck, otherPuck, dx, dy, distance);
            }
        }
    }

    applyRepelForce(puck, otherPuck, dx, dy, distance) {
        const dx = otherPuck.x - puck.x;
        const dy = otherPuck.y - puck.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate repel force using inverse square law (like real magnets)
        // Force increases dramatically as distance decreases
        const distanceRatio = distance / CONFIG.PUCK.REPEL_RADIUS;
        // Increased base force for stronger repulsion at 5x radius
        const force = CONFIG.PUCK.REPEL_FORCE * 1.5 * (1 / (distanceRatio * distanceRatio));
        
        // Direction should be away from repelling puck
        const nx = -dx / distance;
        const ny = -dy / distance;

        // Calculate velocity changes with stronger effect at close range
        const dvx = nx * force;
        const dvy = ny * force;
        
        // Apply velocity changes to other puck with increased effect
        otherPuck.vx = (otherPuck.vx || 0) + dvx;
        otherPuck.vy = (otherPuck.vy || 0) + dvy;

        // Create repel effect visual (more intense at closer ranges)
        const intensity = Math.min(1, CONFIG.PUCK.REPEL_RADIUS / distance);
        this.createRepelEffect(puck.x, puck.y, otherPuck.x, otherPuck.y, intensity);
    }

    createRepelEffect(x1, y1, x2, y2, intensity) {
        const sparks = Math.floor(5 * intensity); // More sparks at closer ranges
        const angle = Math.atan2(y2 - y1, x2 - x1);
        
        for (let i = 0; i < sparks; i++) {
            const sparkAngle = angle + (Math.random() - 0.5) * Math.PI / 4;
            const speed = (Math.random() * 2 + 2) * intensity;
            
            const spark = {
                x: (x1 + x2) / 2,
                y: (y1 + y2) / 2,
                vx: Math.cos(sparkAngle) * speed,
                vy: Math.sin(sparkAngle) * speed,
                life: 1,
                color: '#00ff00'
            };
            
            this.game.gameState.sparks.push(spark);
        }
    }

    resolvePuckCollision(puck1, puck2, dx, dy, distance) {
        // Separate pucks
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = (CONFIG.PUCK.RADIUS * 2) - distance;
        const separationX = (overlap * nx) / 2;
        const separationY = (overlap * ny) / 2;
        puck1.x -= separationX;
        puck1.y -= separationY;
        puck2.x += separationX;
        puck2.y += separationY;

        // Calculate collision response
        const relativeVx = (puck1.vx || 0) - (puck2.vx || 0);
        const relativeVy = (puck1.vy || 0) - (puck2.vy || 0);
        const relativeSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

        if (relativeSpeed <= 0.1) return;

        // Score points if applicable
        if (relativeSpeed > 1) {
            this.handleCollisionScore(puck1, puck2, relativeSpeed);
        }

        const velocityAlongNormal = relativeVx * nx + relativeVy * ny;
        if (velocityAlongNormal > 0) return;

        // Calculate collision response
        const baseRestitution = CONFIG.PHYSICS.COLLISION_ELASTICITY;
        let restitution, dampening;

        if (relativeSpeed < 1) {
            restitution = baseRestitution * 0.05;
            dampening = 0.1;
        } else if (relativeSpeed < 2) {
            restitution = baseRestitution * 0.2;
            dampening = 0.3;
        } else if (relativeSpeed < 3) {
            restitution = baseRestitution * 0.4;
            dampening = 0.5;
        } else {
            restitution = baseRestitution * Math.min(relativeSpeed / 5, 1);
            dampening = Math.max(0.7, Math.min(relativeSpeed / 5, 1));
        }

        const impulseMagnitude = -(1 + restitution) * velocityAlongNormal * 0.5;
        const totalMass = 2;
        const puck1Ratio = 1 / totalMass;
        const puck2Ratio = 1 / totalMass;

        // Apply impulse
        const minVelocity = 0.1;
        puck1.vx = this.applyMinVelocity(
            ((puck1.vx || 0) - (impulseMagnitude * nx * puck1Ratio)) * dampening,
            minVelocity
        );
        puck1.vy = this.applyMinVelocity(
            ((puck1.vy || 0) - (impulseMagnitude * ny * puck1Ratio)) * dampening,
            minVelocity
        );
        puck2.vx = this.applyMinVelocity(
            ((puck2.vx || 0) + (impulseMagnitude * nx * puck2Ratio)) * dampening,
            minVelocity
        );
        puck2.vy = this.applyMinVelocity(
            ((puck2.vy || 0) + (impulseMagnitude * ny * puck2Ratio)) * dampening,
            minVelocity
        );
    }

    applyMinVelocity(velocity, minVelocity) {
        return Math.abs(velocity) < minVelocity ? 0 : velocity;
    }

    handleCollisionScore(puck1, puck2, force) {
        const speed1 = Math.sqrt((puck1.vx || 0) ** 2 + (puck1.vy || 0) ** 2);
        const speed2 = Math.sqrt((puck2.vx || 0) ** 2 + (puck2.vy || 0) ** 2);
        
        const puck1Moving = speed1 > 1;
        const puck2Moving = speed2 > 1;
        
        const basePoints = Math.floor(force);
        let points = 0;
        let scoringPlayer = null;
        let scorePosition = { x: 0, y: 0 };

        if (puck1Moving && !puck2Moving && puck1.player !== puck2.player) {
            points = Math.max(basePoints, 1);
            scoringPlayer = puck1.player;
            scorePosition = { x: puck2.x, y: puck2.y };
        } 
        else if (!puck1Moving && puck2Moving && puck1.player !== puck2.player) {
            points = Math.max(basePoints, 1);
            scoringPlayer = puck2.player;
            scorePosition = { x: puck1.x, y: puck1.y };
        }

        if (points > 0) {
            if (this.game.gameState.gameMode === CONFIG.GAME_MODES.TERRITORY) {
                this.game.gameState.collisionScores = this.game.gameState.collisionScores || 
                    { player1: 0, player2: 0 };
                this.game.gameState.collisionScores[`player${scoringPlayer}`] += points;
            } else {
                this.game.gameState.scores[`player${scoringPlayer}`] += points;
            }
            this.createScorePopup(scorePosition, points, scoringPlayer);
            if (this.game.gameState.sounds.score) {
                this.game.gameState.sounds.score.play();
            }
        }
    }

    createSparks(position, normal, speed, player) {
        const numSparks = Math.floor(10 + speed / 5);
        const sparkSpeed = speed * 0.7;
        
        for (let i = 0; i < numSparks; i++) {
            const baseAngle = Math.atan2(normal.y, normal.x);
            const spreadAngle = Math.PI * 0.8;
            const angle = baseAngle - spreadAngle/2 + Math.random() * spreadAngle;
            
            const size = 2 + Math.random() * 2;
            
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
            
            this.game.gameState.sparks.push(spark);
        }
    }

    createScorePopup(position, points, player) {
        const popup = {
            x: position.x,
            y: position.y,
            points: points,
            player: player,
            life: 1.0,
            vy: -2
        };
        
        if (!this.game.gameState.scorePopups) {
            this.game.gameState.scorePopups = [];
        }
        this.game.gameState.scorePopups.push(popup);
    }

    launchPuck() {
        if (!this.game.gameState.currentPuck) return;

        const ropeVector = {
            x: this.game.gameState.currentPuck.x - this.game.gameState.rotationCenter.x,
            y: this.game.gameState.currentPuck.y - this.game.gameState.rotationCenter.y
        };

        const launchDirection = {
            x: -ropeVector.y,
            y: ropeVector.x
        };

        const length = Math.sqrt(launchDirection.x * launchDirection.x + launchDirection.y * launchDirection.y);
        launchDirection.x /= length;
        launchDirection.y /= length;

        const currentTime = Date.now();
        const power = Math.min(
            (currentTime - this.game.gameState.chargeStartTime) / CONFIG.PUCK.MAX_CHARGE_TIME,
            1
        );
        
        const launchSpeed = CONFIG.PUCK.MIN_LAUNCH_SPEED + 
            (CONFIG.PUCK.MAX_LAUNCH_SPEED - CONFIG.PUCK.MIN_LAUNCH_SPEED) * power;
        
        const velocity = {
            x: launchDirection.x * launchSpeed,
            y: launchDirection.y * launchSpeed
        };

        const playerKey = `player${this.game.gameState.activePlayer}`;
        const hasRepel = this.game.gameState.repelPower[playerKey];
        const hasGhost = this.game.gameState.ghostPower[playerKey];

        const launchedPuck = {
            x: this.game.gameState.currentPuck.x,
            y: this.game.gameState.currentPuck.y,
            vx: velocity.x,
            vy: velocity.y,
            player: this.game.gameState.activePlayer,
            hasRepel: hasRepel,
            hasGhost: hasGhost
        };

        if (hasGhost) {
            launchedPuck.ghostStartTime = Date.now();
            this.game.gameState.ghostPower.activePuck = launchedPuck;
        }

        if (hasRepel) {
            this.game.gameState.repelPower.activePuck = launchedPuck;
        }

        this.game.socket.emit('gameMove', {
            roomId: this.game.roomId,
            type: 'launch',
            puck: launchedPuck
        });

        this.game.gameState.pucks.push(launchedPuck);
        this.game.gameState.puckCounts[`player${this.game.gameState.activePlayer}`]++;
        
        this.game.gameState.isCharging = false;
        this.game.gameState.currentPuck = null;
        this.game.gameState.chargeStartTime = null;
        this.game.gameState.rotationCenter = null;
        
        this.game.gameState.activePlayer = this.game.gameState.activePlayer === 1 ? 2 : 1;

        if (this.game.gameState.sounds.launch) {
            this.game.gameState.sounds.launch.play();
        }
    }

    handleNetworkCollision(data) {
        const localPuck1 = this.game.gameState.pucks.find(p => 
            Math.abs(p.x - data.puck1.x) < 0.1 && 
            Math.abs(p.y - data.puck1.y) < 0.1
        );
        const localPuck2 = this.game.gameState.pucks.find(p => 
            Math.abs(p.x - data.puck2.x) < 0.1 && 
            Math.abs(p.y - data.puck2.y) < 0.1
        );

        if (localPuck1 && localPuck2) {
            localPuck1.vx = data.puck1.vx;
            localPuck1.vy = data.puck1.vy;
            localPuck2.vx = data.puck2.vx;
            localPuck2.vy = data.puck2.vy;
        }
    }
} 
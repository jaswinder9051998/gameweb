export const CONFIG = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 600
    },
    PUCK: {
        RADIUS: 20,
        RESTRICTED_ZONE_RADIUS: 60,
        MAX_CHARGE_TIME: 5000,   // Increased from 2000ms to 5000ms (5 seconds)
        MAX_LAUNCH_SPEED: 80,
        MIN_LAUNCH_SPEED: 30,
        MAX_PUCKS_PER_PLAYER: 5  // New: Maximum pucks per player
    },
    PHYSICS: {
        FRICTION: 0.97,         // Increased friction (was 0.98)
        COLLISION_ELASTICITY: 0.8
    },
    UI: {
        POWER_BAR: {
            WIDTH: 20,
            HEIGHT: 200,
            MARGIN: 20           // Distance from right edge
        },
        GAME_END_OVERLAY: {
            FONT_SIZE: 48,
            PADDING: 20,
            BACKGROUND: 'rgba(0, 0, 0, 0.7)'
        },
        TURN_INDICATOR: {
            HEIGHT: 4,
            MARGIN: 5
        }
    },
    SOUNDS: {
        COLLISION: 'collision.mp3',
        LAUNCH: 'launch.mp3',
        SCORE: 'score.mp3',
        WIN: 'win.mp3'
    },
    GAME_MODES: {
        COLLISION: 'collision',
        TERRITORY: 'territory'
    },
    TERRITORY: {
        GRID_SIZE: 5,             // Smaller grid for smoother areas
        SCORE_PER_AREA: 0.1,
        COLORS: {
            PLAYER1: 'rgba(255, 0, 0, 0.3)',
            PLAYER2: 'rgba(0, 0, 255, 0.3)',
            PLAYER1_BORDER: 'rgba(255, 0, 0, 0.8)',
            PLAYER2_BORDER: 'rgba(0, 0, 255, 0.8)'
        }
    }
}; 
export const CONFIG = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 600
    },
    PUCK: {
        RADIUS: 20,
        RESTRICTED_ZONE_RADIUS: 40,
        MAX_CHARGE_TIME: 3000,   // in milliseconds (3 seconds)
        MAX_LAUNCH_SPEED: 20,
        MIN_LAUNCH_SPEED: 5,
        MAX_PUCKS_PER_PLAYER: 5  // New: Maximum pucks per player
    },
    PHYSICS: {
        FRICTION: 0.98,         // Increased friction (was 0.98)
        COLLISION_ELASTICITY: 0.5,  // Reduced from 0.7 to 0.5 for stronger dampening
    },
    UI: {
        POWER_BAR: {
            WIDTH: 20,
            HEIGHT: 200,
            MARGIN: 10           // Distance from right edge
        },
        GAME_END_OVERLAY: {
            FONT_SIZE: 48,
            PADDING: 20,
            BACKGROUND: 'rgba(0, 0, 0, 0.5)'
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
        GRID_SIZE: 10,  // Reduced from 20 to 10 for much smaller squares
        SCORE_PER_AREA: 0.5,
        COLORS: {
            PLAYER1: 'rgba(255, 100, 100, 0.3)',
            PLAYER2: 'rgba(100, 100, 255, 0.3)',
            PLAYER1_BORDER: 'rgba(255, 0, 0, 0.5)',
            PLAYER2_BORDER: 'rgba(0, 0, 255, 0.5)'
        }
    },
    SERVER: {
        URL: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : 'https://gameweb-qqxr.onrender.com'  // Remove the port number
    }
}; 
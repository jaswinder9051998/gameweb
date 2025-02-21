export const CONFIG = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 600,
    },
    PUCK: {
        RADIUS: 20,
        RESTRICTED_ZONE_RADIUS: 40,
        MAX_CHARGE_TIME: 3000,
        MAX_LAUNCH_SPEED: 20,
        MIN_LAUNCH_SPEED: 5,
        MAX_PUCKS_PER_PLAYER: 5,
        REPEL_RADIUS: 60,
        REPEL_FORCE: 5,
    },
    PHYSICS: {
        FRICTION: 0.95,         // Increased friction for faster slowdown
        COLLISION_ELASTICITY: 0.2,  // Further reduced elasticity for stronger dampening
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
        },
        REPEL_BUTTON: {
            WIDTH: 100,
            HEIGHT: 40,
            MARGIN: 10
        },
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
            : window.location.origin  // Use the current origin instead of hardcoded URL
    }
};

window.SOCKET_CONFIG = {
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    withCredentials: false
};

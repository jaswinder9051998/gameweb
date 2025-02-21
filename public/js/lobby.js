// This script handles the lobby functionality for room creation and joining.

import { CONFIG } from './config.js';

// Initialize socket with error handling
let socket;
try {
    socket = io(CONFIG.SERVER.URL, {
        transports: ['polling'],  // Start with polling only
        upgrade: false,           // Disable transport upgrade for now
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 60000,
        forceNew: true,
        path: '/socket.io',
        withCredentials: false,
        rejectUnauthorized: false,
        query: {
            "transport": "polling"
        }
    });

    socket.on('connect', () => {
        updateConnectionStatus('Connected');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        console.log('Attempting to connect to:', CONFIG.SERVER.URL);
        lobbyMessage.textContent = `Connection error: ${error.message}. Retrying...`;
        enableButtons(false);
    });

    socket.on('disconnect', (reason) => {
        updateConnectionStatus('Disconnected');
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        lobbyMessage.textContent = `Socket error: ${error.message}`;
    });

} catch (error) {
    console.error('Socket initialization error:', error);
    lobbyMessage.textContent = 'Unable to connect to game server.';
}

function enableButtons(enabled) {
    createRoomBtn.disabled = !enabled;
    joinRoomBtn.disabled = !enabled;
    collisionModeBtn.disabled = !enabled;
    territoryModeBtn.disabled = !enabled;
    showRulesButton.disabled = !enabled;
}

// Get DOM elements for lobby UI
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomKeyInput = document.getElementById('room-key-input');
const lobbyMessage = document.getElementById('lobby-message');
const lobbyOverlay = document.getElementById('lobby-overlay');
const gameContainer = document.getElementById('game-container');

let currentRoomKey = null;
let playerNumber = null;  // Track which player number we are

// Add these constants at the top
const GAME_MODES = {
    COLLISION: 'collision',
    TERRITORY: 'territory'
};

// Get additional DOM elements
const collisionModeBtn = document.getElementById('collision-mode');
const territoryModeBtn = document.getElementById('territory-mode');

// Track selected mode
let selectedMode = GAME_MODES.TERRITORY;

// Update the initial button states
collisionModeBtn.classList.remove('selected');  // Remove selection from collision mode
territoryModeBtn.classList.add('selected');     // Add selection to territory mode

// Add mode selection handlers
collisionModeBtn.addEventListener('click', () => {
    selectedMode = GAME_MODES.COLLISION;
    updateModeSelection();
});

territoryModeBtn.addEventListener('click', () => {
    selectedMode = GAME_MODES.TERRITORY;
    territoryModeBtn.classList.add('selected');
    collisionModeBtn.classList.remove('selected');
});

// When "Create Room" is clicked
createRoomBtn.addEventListener('click', () => {
    if (!socket.connected) {
        showError('Not connected to server');
        return;
    }
    
    socket.emit('createRoom', { gameMode: selectedMode });
});

// When "Join Room" is clicked
joinRoomBtn.addEventListener('click', () => {
    const roomKey = roomKeyInput.value.trim();
    if (!roomKey) {
        lobbyMessage.textContent = 'Please enter a room key to join.';
        return;
    }
    socket.emit('joinRoom', roomKey);
});

// Show rules when room is created or joined
function showRulesIfNeeded() {
    if (!localStorage.getItem('hasSeenRules')) {
        rulesOverlay.style.display = 'flex';
        // Store current room info
        localStorage.setItem('pendingRoom', JSON.stringify({
            roomId: currentRoomKey,
            playerNumber: playerNumber
        }));
        // Prevent game start until rules are acknowledged
        socket.disconnect();
    } else {
        // If rules already seen, proceed normally
        socket.connect();
    }
}

// Listen for room creation confirmation
socket.on('roomCreated', (data) => {
    currentRoomKey = data.roomId;
    playerNumber = data.playerNumber;
    lobbyMessage.textContent = `Room created. You are Player ${playerNumber}. Share this room key with your friend: ${data.roomId}`;
    showRulesIfNeeded();
});

// Listen for successful join
socket.on('roomJoined', (data) => {
    currentRoomKey = data.roomId;
    playerNumber = data.playerNumber;
    lobbyMessage.textContent = `Joined room ${data.roomId}. You are Player ${playerNumber}. Waiting for game to start...`;
    showRulesIfNeeded();
});

// When both players have connected
socket.on('startGame', (data) => {
    lobbyMessage.textContent = 'Game starting...';
    lobbyOverlay.style.display = 'none';
    gameContainer.style.display = 'block';
    
    // Start the game with player information
    if (window.startGame) {
        window.startGame(playerNumber, socket, currentRoomKey, data.gameMode);
    }
});

// Handle error messages
socket.on('errorMessage', (message) => {
    lobbyMessage.textContent = `Error: ${message}`;
});

// Add at the top with other DOM elements
const rulesOverlay = document.getElementById('rules-overlay');
const rulesUnderstood = document.getElementById('rules-understood');

// Update rules understood handler
rulesUnderstood.addEventListener('click', () => {
    rulesOverlay.style.display = 'none';
    localStorage.setItem('hasSeenRules', 'true');
    
    // Reconnect and restore room state
    const pendingRoom = JSON.parse(localStorage.getItem('pendingRoom'));
    if (pendingRoom) {
        socket.connect();
        localStorage.removeItem('pendingRoom'); // Clean up
    }
});

// Move show rules button to bottom of lobby controls
const showRulesButton = document.createElement('button');
showRulesButton.className = 'lobby-button';
showRulesButton.textContent = 'Show Rules';
showRulesButton.addEventListener('click', () => {
    rulesOverlay.style.display = 'flex';
});

// Add the show rules button as the last element
const lobbyControls = document.querySelector('.lobby-controls');
lobbyControls.appendChild(showRulesButton);

// Hide rules overlay initially
rulesOverlay.style.display = 'none';

function updateConnectionStatus(status) {
    lobbyMessage.textContent = status;
}

function updateModeSelection() {
    collisionModeBtn.classList.toggle('selected', selectedMode === GAME_MODES.COLLISION);
    territoryModeBtn.classList.toggle('selected', selectedMode === GAME_MODES.TERRITORY);
}

function showError(message) {
    lobbyMessage.textContent = message;
}

function handleCreateRoom() {
    if (!socket.connected) {
        showError('Not connected to server');
        return;
    }
    socket.emit('createRoom', { gameMode: selectedMode });
}

function handleCollisionModeClick() {
    selectedMode = CONFIG.GAME_MODES.COLLISION;
    updateModeSelection();
} 
// This script handles the lobby functionality for room creation and joining.

import { CONFIG } from './config.js';

// Initialize socket with error handling
let socket;
try {
    socket = io(CONFIG.SERVER.URL, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        enableButtons(true);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        lobbyMessage.textContent = 'Connection error. Please try again.';
        enableButtons(false);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        lobbyMessage.textContent = 'Disconnected from server. Trying to reconnect...';
        enableButtons(false);
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
let selectedMode = GAME_MODES.COLLISION;

// Add mode selection handlers
collisionModeBtn.addEventListener('click', () => {
    console.log('Collision mode clicked');
    selectedMode = GAME_MODES.COLLISION;
    collisionModeBtn.classList.add('selected');
    territoryModeBtn.classList.remove('selected');
});

territoryModeBtn.addEventListener('click', () => {
    selectedMode = GAME_MODES.TERRITORY;
    territoryModeBtn.classList.add('selected');
    collisionModeBtn.classList.remove('selected');
    console.log('Selected mode:', selectedMode); // Debug log
});

// When "Create Room" is clicked
createRoomBtn.addEventListener('click', () => {
    console.log('Create room clicked');
    console.log('Selected mode:', selectedMode);
    console.log('Socket connected:', socket.connected);
    
    if (!socket.connected) {
        lobbyMessage.textContent = 'Not connected to server. Please wait...';
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

// Listen for room creation confirmation
socket.on('roomCreated', (data) => {
    currentRoomKey = data.roomId;
    playerNumber = data.playerNumber;
    lobbyMessage.textContent = `Room created. You are Player ${playerNumber}. Share this room key with your friend: ${data.roomId}`;
});

// Listen for successful join
socket.on('roomJoined', (data) => {
    currentRoomKey = data.roomId;
    playerNumber = data.playerNumber;
    lobbyMessage.textContent = `Joined room ${data.roomId}. You are Player ${playerNumber}. Waiting for game to start...`;
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
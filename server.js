const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

// Configure Socket.IO with more permissive CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    path: '/socket.io'  // Make sure path matches client
});

const PORT = process.env.PORT || 3000;

// Enable CORS for all routes with more permissive settings
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve static files from the "public" folder
app.use(express.static('public'));

// Basic route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// In-memory storage for game rooms
const rooms = {};

// Handle WebSocket connections.
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Create a new game room
    socket.on('createRoom', (data) => {
        const roomId = generateRoomId();
        console.log('Creating room with mode:', data.gameMode); // Debug log
        
        rooms[roomId] = {
            host: socket.id,
            players: {
                player1: socket.id,
                player2: null
            },
            currentTurn: 'player1',
            gameMode: data.gameMode, // Store the game mode
            gameState: {
                pucks: [],
                scores: { player1: 0, player2: 0 },
                puckCounts: { player1: 0, player2: 0 }
            }
        };
        
        socket.join(roomId);
        socket.emit('roomCreated', {
            roomId: roomId,
            playerNumber: 1,
            gameMode: data.gameMode // Send back the game mode
        });
        
        console.log(`Room ${roomId} created by ${socket.id} (Player 1) in ${data.gameMode} mode`);
    });

    // Join an existing game room
    socket.on('joinRoom', (roomId) => {
        console.log(`Join room attempt for room: ${roomId}`);
        const room = rooms[roomId];
        
        if (!room) {
            socket.emit('errorMessage', 'Room not found.');
            return;
        }
        
        if (room.players.player2) {
            socket.emit('errorMessage', 'Room is full.');
            return;
        }

        room.players.player2 = socket.id;
        socket.join(roomId);
        
        // Tell the joiner they are player2
        socket.emit('roomJoined', {
            roomId: roomId,
            playerNumber: 2,
            gameMode: room.gameMode // Include the game mode
        });
        
        // Start the game with the correct mode
        io.to(roomId).emit('startGame', {
            roomId: roomId,
            currentTurn: room.currentTurn,
            gameState: room.gameState,
            gameMode: room.gameMode // Include the game mode
        });
        
        console.log(`Socket ${socket.id} joined room ${roomId} as Player 2 in ${room.gameMode} mode`);
    });

    // Handle game moves
    socket.on('gameMove', (data) => {
        const room = rooms[data.roomId];
        if (room) {
            if (data.type === 'reset') {
                // Reset room state
                room.gameState = {
                    pucks: [],
                    scores: { player1: 0, player2: 0 },
                    puckCounts: { player1: 0, player2: 0 }
                };
                room.currentTurn = 'player1';

                // Broadcast reset to all players in the room
                io.to(data.roomId).emit('gameUpdated', {
                    type: 'reset',
                    currentTurn: room.currentTurn
                });
            }
            else if (data.type === 'launch') {
                room.gameState.pucks.push(data.puck);
                room.gameState.puckCounts[data.playerNumber - 1]++;
            }
            else if (data.type === 'collision') {
                // Just relay collision data to other player
                socket.to(data.roomId).emit('gameUpdated', {
                    type: 'collision',
                    puck1: data.puck1,
                    puck2: data.puck2
                });
            }

            // Switch turns only after launch
            if (data.type === 'launch') {
                room.currentTurn = room.currentTurn === 'player1' ? 'player2' : 'player1';
            }
            
            // Broadcast the move to all players in the room
            socket.to(data.roomId).emit('gameUpdated', {
                ...data,
                currentTurn: room.currentTurn
            });
        }
    });

    // Handle puck launches
    socket.on('launchPuck', (data) => {
        const room = rooms[data.roomId];
        if (room) {
            // Broadcast the puck launch to other players in the room
            socket.to(data.roomId).emit('puckLaunched', data);
            console.log(`Puck launched in room ${data.roomId}`);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        // Clean up any rooms this socket was in
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.players.player1 === socket.id || room.players.player2 === socket.id) {
                // Notify other player about disconnect
                io.to(roomId).emit('playerDisconnected');
                // Remove the room
                delete rooms[roomId];
                console.log(`Room ${roomId} closed due to player disconnect`);
            }
        }
    });
});

// Utility function to generate a unique room ID
function generateRoomId(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Start server with logging
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server is ready`);
}); 
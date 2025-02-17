// Initialize socket connection with more aggressive reconnection
const socket = io(window.location.origin, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 20000,
    autoConnect: true,
    transports: ['polling', 'websocket'], // Changed order to match server
    upgrade: true,
    rememberUpgrade: true,
    path: '/socket.io/',
    withCredentials: false,
    forceNew: true,
    rejectUnauthorized: false
});

let reconnectAttempts = 0;

socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    reconnectAttempts = 0; // Reset counter on successful connection
});

socket.on('connect_error', (error) => {
    reconnectAttempts++;
    console.error('Connection error details:', {
        attempt: reconnectAttempts,
        type: error.type,
        message: error.message,
        description: error.description,
        transport: socket.io?.engine?.transport?.name || 'unknown'
    });
    
    // Force transport change after multiple failures
    if (reconnectAttempts > 3) {
        const currentTransport = socket.io.engine.transport.name;
        if (currentTransport === 'websocket') {
            console.log('Falling back to polling...');
            socket.io.opts.transports = ['polling'];
        } else {
            console.log('Trying websocket...');
            socket.io.opts.transports = ['websocket'];
        }
    }
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('Attempting reconnection...');
        socket.connect();
    }
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Attempting reconnection:', attemptNumber);
});

socket.on('reconnect_failed', () => {
    console.log('Reconnection failed, trying alternative transport...');
    // Toggle transport method
    const currentTransport = socket.io.engine.transport.name;
    socket.io.opts.transports = [currentTransport === 'websocket' ? 'polling' : 'websocket'];
    socket.connect();
});

// Monitor connection state
setInterval(() => {
    console.log('Connection state:', {
        connected: socket.connected,
        disconnected: socket.disconnected,
        transport: socket.io?.engine?.transport?.name
    });
}, 5000); 
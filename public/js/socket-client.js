// Initialize socket connection with more aggressive reconnection
const socket = io(window.location.origin, {
    ...window.SOCKET_CONFIG,
    forceNew: true,
    rejectUnauthorized: false,
    secure: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5
});

let reconnectAttempts = 0;

socket.on('connect', () => {
    // Handle connection silently
});

socket.on('connect_error', (error) => {
    reconnectAttempts++;
    // Handle connection error silently
});

socket.on('disconnect', (reason) => {
    // Handle disconnection silently
    if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('Attempting reconnection...');
        socket.connect();
    }
});

socket.on('reconnect_attempt', (attemptNumber) => {
    // Handle reconnection attempt silently
});

socket.on('reconnect_failed', () => {
    // Handle reconnection failure silently
    // Toggle transport method
    const currentTransport = socket.io.engine.transport.name;
    socket.io.opts.transports = [currentTransport === 'websocket' ? 'polling' : 'websocket'];
    socket.connect();
});

// Monitor connection state
setInterval(() => {
    // Handle connection state monitoring silently
}, 5000); 
// Initialize socket connection with better error handling and reconnection logic
const socket = io(window.location.origin, {
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true,
  timeout: 20000,
  path: '/socket.io/',
  autoConnect: true
});

// Connection event handlers with more detailed logging
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error details:', {
    type: error.type,
    message: error.message,
    description: error.description,
    transport: socket.io.engine.transport.name
  });
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Reconnect if server disconnected
    socket.connect();
  }
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Attempting reconnection:', attemptNumber);
}); 
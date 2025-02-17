// Initialize socket connection
const socket = io(window.location.origin, {
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling']
});

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
}); 
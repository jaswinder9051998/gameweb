module.exports = {
  production: {
    port: process.env.PORT || 3000,
    socketOptions: {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    }
  },
  development: {
    port: 3000,
    socketOptions: {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    }
  }
}; 
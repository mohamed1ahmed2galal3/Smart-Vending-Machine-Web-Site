const app = require('./app');
const connectDB = require('./config/db');

// Load env vars
require('dotenv').config();

// Add colors to console (optional but helpful)
require('colors');

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🥤 SmartVend Backend Server                             ║
║                                                           ║
║   Server running in ${process.env.NODE_ENV || 'development'} mode                    ║
║   Port: ${PORT}                                              ║
║                                                           ║
║   API Base URL: http://localhost:${PORT}/api/v1              ║
║   Health Check: http://localhost:${PORT}/health              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `.cyan);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully'.yellow);
  server.close(() => {
    console.log('Process terminated'.yellow);
  });
});

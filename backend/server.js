const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: { 
    origin: '*', // NOTE: For development only. Restrict this in production!
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New real-time client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Application Routes Integration
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/accidents', require('./routes/accidentRoutes'));
app.use('/api/citizen', require('./routes/citizenRoutes'));
app.use('/api/parking', require('./routes/parkingRoutes'));
app.use('/api/violations', require('./routes/violationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic testing route
app.get('/', (req, res) => {
  res.send('MargDarshak AI API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

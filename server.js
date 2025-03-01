const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { DEFAULT_PORT } = require('./config/constants');
const roomService = require('./services/roomService');
const { 
    handleMessage, 
    handlePrivateMessage, 
    handleTyping 
} = require('./handlers/messageHandler');
const {
    handleJoinRoom,
    handleCreateRoom,
    handleSwitchRoom,
    handleDisconnect
} = require('./handlers/roomHandler');

// Middleware to serve static files if needed
app.use(express.static('public'));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send available rooms to user
    socket.emit('room_list', roomService.getRooms());

    // Room events
    socket.on('join_room', (data) => handleJoinRoom(io, socket, data));
    socket.on('create_room', (roomName) => handleCreateRoom(io, roomName));
    socket.on('switch_room', (data) => handleSwitchRoom(io, socket, data));
    
    // Message events
    socket.on('send_message', (message) => handleMessage(io, socket, message));
    socket.on('private_message', (data) => handlePrivateMessage(io, socket, data));
    socket.on('typing', (isTyping) => handleTyping(io, socket, isTyping));
    
    // Disconnect event
    socket.on('disconnect', () => handleDisconnect(io, socket));
});

const PORT = process.env.PORT || DEFAULT_PORT;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = { app };
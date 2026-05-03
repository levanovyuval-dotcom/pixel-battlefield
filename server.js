const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// State stored on the server
const worldData = new Map(); 
const users = {}; 

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join', (username) => {
        socket.username = username;
        if (!users[username]) users[username] = { credits: 100, points: 0 };
        
        // Send the current world and user stats to the person joining
        socket.emit('init', {
            world: Array.from(worldData.entries()),
            credits: users[username].credits
        });
    });

    socket.on('paint', ({ x, y, color }) => {
        const username = socket.username;
        if (!username) return;

        const key = `${x},${y}`;
        const existing = worldData.get(key);
        const isOwner = existing && existing.user === username;

        if (!isOwner) {
            if (users[username].credits <= 0) return;
            users[username].credits--;
        }

        const pixelUpdate = { color, user: username, time: new Date().toLocaleTimeString() };
        worldData.set(key, pixelUpdate);

        // Broadcast the change to EVERYONE online
        io.emit('pixelUpdated', { x, y, data: pixelUpdate, credits: users[username].credits, user: username });
    });

    socket.on('recharge', () => {
        const username = socket.username;
        if (username) {
            users[username].credits += 50;
            socket.emit('creditsUpdated', users[username].credits);
        }
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));
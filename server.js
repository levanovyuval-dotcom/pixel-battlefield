const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // Added this to help locate files

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- THE FIX ---
// This tells Express to serve your index.html and other files automatically
app.use(express.static(__dirname));

// This ensures that if you visit the main URL, it sends your index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// ----------------

const worldData = new Map(); 
const users = {}; 

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join', (username) => {
        socket.username = username;
        if (!users[username]) users[username] = { credits: 100, points: 0 };
        
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

        const pixelUpdate = { 
            color, 
            user: username, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
        worldData.set(key, pixelUpdate);

        io.emit('pixelUpdated', { x, y, data: pixelUpdate, credits: users[username].credits, user: username });
    });

    socket.on('recharge', () => {
        const username = socket.username;
        if (username) {
            users[username].credits += 50;
            socket.emit('creditsUpdated', users[username].credits);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- RENDER FIX ---
// process.env.PORT is required for Render/Railway to work online
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

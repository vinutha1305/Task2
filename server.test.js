const io = require('socket.io-client');
const http = require('http');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { app } = require('./server');

describe('Chat Server', () => {
    let clientSocket1;
    let clientSocket2;
    let httpServer;
    let ioServer;
    let port;

    beforeAll((done) => {
        httpServer = createServer(app);
        ioServer = new Server(httpServer);
        port = 3001;
        httpServer.listen(port);
        done();
    });

    afterAll((done) => {
        ioServer.close();
        httpServer.close();
        done();
    });

    beforeEach((done) => {
        clientSocket1 = io(`http://localhost:${port}`);
        clientSocket2 = io(`http://localhost:${port}`);
        clientSocket1.on('connect', () => {
            clientSocket2.on('connect', done);
        });
    });

    afterEach(() => {
        clientSocket1.close();
        clientSocket2.close();
    });

    test('should receive room list upon connection', (done) => {
        clientSocket1.on('room_list', (rooms) => {
            expect(Array.isArray(rooms)).toBe(true);
            expect(rooms).toContain('general');
            expect(rooms).toContain('random');
            expect(rooms).toContain('tech');
            done();
        });
    });

    test('should handle joining a room', (done) => {
        const testData = { username: 'testUser', room: 'general' };
        
        clientSocket1.on('user_joined', (data) => {
            expect(data.username).toBe(testData.username);
            expect(data.message).toBe(`${testData.username} has joined the room`);
            done();
        });

        clientSocket1.emit('join_room', testData);
    });

    test('should handle sending and receiving messages', (done) => {
        const testUser = { username: 'testUser', room: 'general' };
        const testMessage = 'Hello, world!';

        clientSocket1.emit('join_room', testUser);

        clientSocket1.on('receive_message', (data) => {
            expect(data.username).toBe(testUser.username);
            expect(data.message).toBe(testMessage);
            expect(data.time).toBeDefined();
            done();
        });

        setTimeout(() => {
            clientSocket1.emit('send_message', testMessage);
        }, 100);
    });

    test('should handle private messages', (done) => {
        const user1 = { username: 'user1', room: 'general' };
        const user2 = { username: 'user2', room: 'general' };
        const privateMessage = 'Private message test';

        clientSocket1.emit('join_room', user1);
        clientSocket2.emit('join_room', user2);

        clientSocket2.on('private_message', (data) => {
            expect(data.from).toBe(user1.username);
            expect(data.message).toBe(privateMessage);
            expect(data.time).toBeDefined();
            done();
        });

        setTimeout(() => {
            clientSocket1.emit('private_message', {
                targetUsername: user2.username,
                message: privateMessage
            });
        }, 100);
    });

    test('should handle typing indicators', (done) => {
        const user = { username: 'testUser', room: 'general' };
        
        clientSocket1.emit('join_room', user);
        clientSocket2.emit('join_room', { username: 'user2', room: 'general' });

        clientSocket2.on('user_typing', (data) => {
            expect(data.username).toBe(user.username);
            expect(data.isTyping).toBe(true);
            done();
        });

        setTimeout(() => {
            clientSocket1.emit('typing', true);
        }, 100);
    });

    test('should handle creating new room', (done) => {
        const newRoom = 'test-room';

        clientSocket1.on('room_list', (rooms) => {
            if (rooms.includes(newRoom)) {
                expect(Array.isArray(rooms)).toBe(true);
                expect(rooms).toContain(newRoom);
                done();
            }
        });

        clientSocket1.emit('create_room', newRoom);
    });

    test('should handle room switching', (done) => {
        const user = { username: 'switchUser', room: 'general' };
        const newRoom = 'random';

        clientSocket1.emit('join_room', user);

        clientSocket1.on('user_joined', (data) => {
            if (data.username === user.username) {
                expect(data.message).toBe(`${user.username} has joined the room`);
                done();
            }
        });

        setTimeout(() => {
            clientSocket1.emit('switch_room', { newRoom });
        }, 100);
    });

    test('should handle user disconnection', (done) => {
        const user = { username: 'disconnectUser', room: 'general' };

        clientSocket2.on('user_left', (data) => {
            expect(data.username).toBe(user.username);
            expect(data.message).toBe(`${user.username} has left the room`);
            done();
        });

        clientSocket1.emit('join_room', user);
        setTimeout(() => {
            clientSocket1.disconnect();
        }, 100);
    });
});
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

export const getSocket = () => socket;

/**
 * @param {string} roomId - identification for game room
 * @param {string} moveSan - move in SAN notation
 * @param {string} sourcePlayerId - unique player id
 */
export const emitMove = (roomId, moveSan, sourcePlayerId) => {
    if (socket.connected) {
        socket.emit('move', {
            roomId,
            moveSan,
            sourcePlayerId
        });
    }
}

export const emitJoinRoom = (roomId) => {
    if (socket.connected) {
        socket.emit('joinRoom', roomId);
    }
}
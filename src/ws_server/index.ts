import { WebSocket, WebSocketServer } from 'ws';
import { requestHandler } from './requestHandler';
import * as types from '../interfaces';

const WS_PORT = 3000;

export const wsServer = new WebSocketServer({ port: WS_PORT }, () => {
    console.log(`Start new WebSocket on ws://localhost:${WS_PORT}!`);
});


wsServer.on('connection', (socket: WebSocket) => {
    console.log('WebSocket connected');

    socket.on('message', async (message) => {
        const req: types.reqInputInt = JSON.parse(message.toString());
        requestHandler(req, socket)
    });
    
    socket.on('close', function () {
        console.log('WebSocket connection closed');
    });
});

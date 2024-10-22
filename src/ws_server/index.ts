import { WebSocket, WebSocketServer } from 'ws';
import { requestHandler } from './requestHandler';
import * as types from '../interfaces';

const WS_PORT = 3000;

class MyWSServer extends WebSocketServer {
    broadcast(msg) {
         this.clients.forEach(client => {
            client.send(msg);
         });
     };
  }

export const wsServer = new MyWSServer({ port: WS_PORT }, () => {
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
wsServer.broadcast = function broadcast(msg) {
    wsServer.clients.forEach(function each(client) {
        client.send(msg);
     });
 };
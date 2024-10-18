import { httpServer } from "./src/http_server/index.js";
import { WebSocket, WebSocketServer } from 'ws';
import { requestHandler } from "./src/ws_server/index.js";

const HTTP_PORT = 8181;
const WS_PORT = 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

export const wsServer = new WebSocketServer({ port: WS_PORT }, () => {
    console.log(`Start new WebSocket on ws://localhost:${WS_PORT}!`);
});


wsServer.on('connection', (socket: WebSocket) => {
    console.log('WebSocket connected');

    socket.on('message', async (message) => {
        const req = JSON.parse(message.toString());
        requestHandler(req, socket)
    });
    
    socket.on('close', function () {
        console.log('WebSocket connection closed');
    });
});





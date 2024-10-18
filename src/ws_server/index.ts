import { WebSocket, WebSocketServer } from 'ws';

export const requestHandler = (req: JSON, socket: WebSocket) => {

        switch (req['type']) {
            case 'reg':
                console.log(req)
                break;
        
            default:
                break;
        }
}
import { WebSocket } from 'ws';
import * as types from '../interfaces';


export const requestHandler = (req: types.reqInputInt, socket: WebSocket) => {

    switch (req.type) {
        case 'reg':
            let data = JSON.parse(req.data)
            console.log(data);
            let responseData = new types.regOutputData(data.name, 666)
            let response: types.reqOutputInt = new types.reponse ('reg', JSON.stringify(responseData));
            console.log(response)
            socket.send(JSON.stringify(response))
            break;
    
        default:
            break;
    }
}
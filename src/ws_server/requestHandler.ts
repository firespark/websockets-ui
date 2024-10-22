import { WebSocket } from 'ws';
import * as types from '../interfaces';

import { User, findUserByName, validatePassword, updateWinners, updateSocket, registeredUsers } from './player'

export const rooms: Room[] = [];

export class Room {
  roomID: number | string;
  roomUsers: User[];

  constructor(user: User) {
    this.roomID = rooms.length;
    this.roomUsers = [user];
  }
}

export const requestHandler = (req: types.reqInputInt, socket: WebSocket) => {
  let data = (req.data) ? JSON.parse(req.data) : '';
  let responseData;
    switch (req.type) {
        case 'reg':
            if (validatePassword(data.name, data.password)) {
                let loggedInUser = findUserByName(data.name) as User;
                updateSocket(loggedInUser.id, socket);
                responseData = new types.RegOutputData(loggedInUser.name, loggedInUser.id);
            }
            else {
                responseData = new types.RegOutputData(data.name, 0, "Wrong Password");
            }
            let response: types.reqOutputInt = new types.Reponse('reg', JSON.stringify(responseData));

            socket.send(JSON.stringify(response))
            updateWinners()
            break;

        case 'create_room':
          const plaerToAddId: User | undefined  = registeredUsers.find(user => user.socket === socket);
          rooms.push(new Room(plaerToAddId as User));
          console.log(rooms)
          break;
    
        default:
            break;
    }
}

  
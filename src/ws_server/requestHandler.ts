import { WebSocket } from 'ws';
import * as types from '../interfaces';
import { wsServer } from '.';
import { User, findUserByName, validatePassword, updateWinners, updateSocket, registeredUsers } from './player'
import { userInfo } from 'os';

export const rooms: Room[] = [];

export class Room {
  roomID: number | string;
  roomUsers: User[];
  constructor(user: User) {
    this.roomID = rooms.length;
    this.roomUsers = [user];
  }
}

export function update_room() {
    let exportRooms = rooms;
    exportRooms.forEach(room => {
      room.roomUsers.forEach(player => {
        delete player.password;
        delete player.socket;
      });
    });
    let response: types.reqOutputInt = new types.Reponse('update_room', JSON.stringify(exportRooms));
    wsServer.broadcast(JSON.stringify(response))
}

export const requestHandler = (req: types.reqInputInt, socket: WebSocket) => {
  let data = (req.data) ? JSON.parse(req.data) : '';
  let responseData;
    switch (req.type) {
        case 'reg':
            if (validatePassword(data.name, data.password)) {
                let loggedInUser = findUserByName(data.name) as User;
                updateSocket(loggedInUser.index, socket);
                responseData = new types.RegOutputData(loggedInUser.name, loggedInUser.index);
            }
            else {
                responseData = new types.RegOutputData(data.name, 0, "Wrong Password");
            }
            let response: types.reqOutputInt = new types.Reponse('reg', JSON.stringify(responseData));

            socket.send(JSON.stringify(response))
            updateWinners()
            update_room()
            break;

        case 'create_room':
          const plaerToAddId: User | undefined  = registeredUsers.find(user => user.socket === socket);
          rooms.push(new Room(plaerToAddId as User));
          //console.log(rooms)
          update_room()
          break;
    
        default:
            break;
    }
}

  
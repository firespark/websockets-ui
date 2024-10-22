import { WebSocket } from 'ws';
import * as types from '../interfaces';
import { wsServer } from '.';
import { User, findUserByName, validatePassword, updateWinners, updateSocket, registeredUsers, cleanUser, currentUser } from './player'

export const rooms: Room[] = [];

export class Room {
  roomId: number | string;
  roomUsers: {index:number|string, name: string}[];
  constructor(user: User) {
    this.roomId = rooms.length;
    this.roomUsers = [cleanUser(user)];
  }

  addUser(user:User){
    this.roomUsers.push(cleanUser(user));
  }

  isUserInRoom(user:User): boolean{
    for (const roomie of this.roomUsers) {
      if (roomie.index === user.index) {
        return true;
      }
    }
    return false;
  }
}

export function update_room() {
    let exportRooms: Room[] = [];
    rooms.forEach(room => {
      if (room.roomUsers.length < 2)
        exportRooms.push(room)
    });
    let response: types.reqOutputInt = new types.Reponse('update_room', JSON.stringify(exportRooms));
    wsServer.broadcast(JSON.stringify(response))
}

export const requestHandler = (req: types.reqInputInt, socket: WebSocket) => {
  let data = (req.data) ? JSON.parse(req.data) : '';
  let responseData;
  console.log(req)
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
            
            rooms.push(new Room(currentUser(socket) as User));
            update_room();
            break;

        case 'add_user_to_room':
            let userToAdd = currentUser(socket) as User;
            const isUserInside = rooms[data.indexRoom].isUserInRoom(userToAdd);
            if (isUserInside == false) {
              rooms[data.indexRoom].addUser(userToAdd);
            }
            
            update_room();
            break;
        default:
            break;
    }
}

  
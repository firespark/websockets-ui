import { wsServer } from '.';
import { User, cleanUser } from './player'
import * as types from '../interfaces';

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

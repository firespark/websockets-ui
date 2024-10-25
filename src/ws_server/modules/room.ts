import { wsServer } from '..';
import { Player, cleanUser } from './player'
import * as types from '../../interfaces';

export const rooms: Room[] = [];

export class Room {
  roomId: number;
  roomUsers: {index:number|string, name: string}[];
  constructor(user: Player) {
    this.roomId = rooms.length;
    this.roomUsers = [cleanUser(user)];
  }

  addUser(user:Player){
    this.roomUsers.push(cleanUser(user));
  }

  isUserInRoom(user:Player): boolean{
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

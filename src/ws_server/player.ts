import * as types from '../interfaces';
import { wsServer } from '.';
import { WebSocket } from 'ws';
export let registeredUsers: User[] = []; 

export class User {
    id: number;
    name: string;
    password: string;
    wins: number;
    losses: number;
    socket: WebSocket;

    constructor(name: string, password: string) {
      this.id = registeredUsers.length;
      this.name = name;
      this.password = password;
      this.wins = 0;
      this.losses = 0;
    }

    addWin() {
        this.wins++;
    }

    addLoss() {
        this.losses++;
    }
  }

export function updateSocket(id:number, socket: WebSocket){
    registeredUsers[id].socket = socket;
    //console.log(registeredUsers[id])
}

export function findUserByName(name: string): User | undefined {
    return registeredUsers.find(user => user.name === name);
  }
  

export function validatePassword(name: string, password: string): boolean {
    const user = findUserByName(name);
    if (!user) {
      registeredUsers.push(new User(name, password))
      return true;
    }
    const isValid = user.password === password;
    return isValid;
  }

export function updateWinners() {
    let scoreTable: unknown[] = [];
    registeredUsers.forEach(user => {
        let scoreEntry = {'name': user.name, 'wins': user.wins};
        scoreTable.push(scoreEntry)       
    });
    let response: types.reqOutputInt = new types.Reponse('update_winners', JSON.stringify(scoreTable));
    wsServer.broadcast(JSON.stringify(response))
}

import * as types from '../interfaces';
import { wsServer } from '.';
import { WebSocket } from 'ws';
export let registeredUsers: User[] = []; 

const activeSockets: Map<number, WebSocket> = new Map();

export class User {
    index: number;
    name: string;
    password: string;
    wins: number;
    losses: number;
    constructor(name: string, password: string) {
      this.index = registeredUsers.length;
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

  export function updateSocket(userId: number, socket: WebSocket) {
    // Если уже есть активное соединение, закрываем его.
    if (activeSockets.has(userId)) {
      const oldSocket = activeSockets.get(userId);
      oldSocket?.close();  // Закрываем старое соединение.
    }
  
    // Сохраняем новое соединение.
    activeSockets.set(userId, socket);
    console.log(`WebSocket обновлён для пользователя ${userId}`);
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

export function cleanUser(user:User){
    let cleanUser = {name: user.name, index:user.index};
    return cleanUser;
}

export function currentUser(socket: WebSocket): User | undefined {

    const userId = [...activeSockets.entries()].find(([_, s]) => s === socket)?.[0];
    if (userId !== undefined) {
      return registeredUsers[userId]; 
    }
    return undefined;
  }
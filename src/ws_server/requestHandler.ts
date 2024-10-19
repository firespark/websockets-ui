import { WebSocket } from 'ws';
import * as types from '../interfaces';

let registeredUsers: User[] = []; 
class User {
    id: number;
    name: string;
    password: string;

    constructor(name: string, password: string) {
      this.id = registeredUsers.length;
      this.name = name;
      this.password = password;
    }
  }

  function findUserByName(name: string): User | undefined {
    return registeredUsers.find(user => user.name === name);
  }
  

  function validatePassword(name: string, password: string): boolean {
    const user = findUserByName(name);
    if (!user) {
      registeredUsers.push(new User(name, password))
      return true;
    }
    const isValid = user.password === password;
    return isValid;
  }

export const requestHandler = (req: types.reqInputInt, socket: WebSocket) => {

    switch (req.type) {
        case 'reg':
            let data = JSON.parse(req.data);
            let responseData;
            if (validatePassword(data.name, data.password)) {
                let loggedInUser = findUserByName(data.name) as User;
                responseData = new types.RegOutputData(loggedInUser.name, loggedInUser.id);
            }
            else {
                responseData = new types.RegOutputData(data.name, 0, "Wrong Password");
            }
            let response: types.reqOutputInt = new types.Reponse('reg', JSON.stringify(responseData));
            console.log(response)
            socket.send(JSON.stringify(response))
            break;
    
        default:
            break;
    }
}

  
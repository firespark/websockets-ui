import { WebSocket } from 'ws';
import * as types from '../interfaces';
import { update_room, rooms, Room } from './room';
import { User, findUserByName, validatePassword, updateWinners, updateSocket, currentUser } from './player'

import { activeSockets } from '.';
const gameHistory: Game[] = [];

export class Game {
    idGame: number | string;
    idPlayer: number | string;
    ships: Ship[];
    constructor(gameIndex: number | string, idPlayer: number | string)
    {
        this.idGame = gameIndex;
        this.idPlayer = idPlayer;
        this.ships = [];
    }
}

export type Ship = {
    position: {x:number, y:number};
    direction: boolean;
    type: string;
    length: number;
}

export function create_game(roomId: number){
    const gameIndex = gameHistory.length;
    rooms[roomId].roomUsers.forEach(player => {
        const socket = activeSockets.get(player.index)
        if (socket != undefined){
            const currentGame = new Game(gameIndex, player.index);
            gameHistory.push(currentGame);
            let response: types.reqOutputInt = new types.Reponse('create_game', JSON.stringify(currentGame));
            socket.send(JSON.stringify(response))
        }
    });
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
            if (rooms[data.indexRoom].roomUsers.length == 2)
            {
                create_game(data.indexRoom)
            }
            break;

        case 'add_ships':
            let playerReadyCount = 0;
            let sessions = gameHistory.filter((game) => {
               return game.idGame == data.gameId;
            });
            sessions.forEach(game => {
                if (game.idPlayer == data.indexPlayer) {
                    game.ships = data.ships;
                }
                console.log(game.ships)
                if (game.ships.length > 0)
                    playerReadyCount++;
            });
            if (playerReadyCount == 2)
                sessions.forEach((session) => {
                    const socketPlayer = activeSockets.get(session.idPlayer);
                    if (socketPlayer != undefined){
                    const currentGame = {ships: session.ships, currentPlayerIndex: session.idPlayer};
                    let response: types.reqOutputInt = new types.Reponse('start_game', JSON.stringify(currentGame));
                    socketPlayer.send(JSON.stringify(response))}
                })
            break;
        

        default:
            break;
    }
}

  
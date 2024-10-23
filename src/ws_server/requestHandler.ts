import { WebSocket } from 'ws';
import * as types from '../interfaces';
import { update_room, rooms, Room } from './room';
import { User, findUserByName, validatePassword, updateWinners, updateSocket, currentUser } from './player'

import { activeSockets } from '.';
const gameHistory: Game[] = [];
let runningGames = new Map<number | string, RunningGame>();


export class RunningGame {
    gameID: number | string;
    roomID: number | string;
    player1: number | string;
    player2: number | string;
    turn: number | string;
    damagedCellsP1: types.coordinate[];
    damagedCellsP2: types.coordinate[];
    shipsP1: GameShip[];
    shipsP2: GameShip[];

    constructor(sessions: Game[]){
        this.gameID = sessions[0].idGame;
        this.roomID = sessions[0].roomID;
        this.player1 = sessions[0].idPlayer;
        this.player2 = sessions[1].idPlayer;
        this.turn = (Math.random() < 0.5) ? sessions[0].idPlayer : sessions[1].idPlayer;
        this.damagedCellsP1 = [];
        this.damagedCellsP2 = [];
        this.shipsP1 = [];
        this.shipsP2 = [];

        sessions[0].ships.forEach( (ship) => {
            this.shipsP1.push(new GameShip(ship))
        });

        sessions[1].ships.forEach( (ship) => {
            this.shipsP2.push(new GameShip(ship))
        });
        
    }
}

export class GameShip {
    cells: types.coordinate[];
    state: number;

    constructor(ship: Ship){
        this.cells = [];
        this.state = 0;
        for (let i = 1; i <= ship.length; i++){
            this.cells.push(ship.position);
            if (ship.direction) {
                ship.position.y++;
            }
            else {
                ship.position.x++;
            }
        }
    }
}

export class Game {
    idGame: number | string;
    idPlayer: number | string;
    ships: Ship[];
    roomID: number | string;
    constructor(gameIndex: number | string, idPlayer: number | string, roomID: number | string)
    {
        this.idGame = gameIndex;
        this.idPlayer = idPlayer;
        this.ships = [];
        this.roomID = roomID;
    }
}

export type Ship = {
    position: types.coordinate;
    direction: boolean; //horizontal - 0, vertical - 1
    type: string;
    length: number;
}

export function startGame(sessions: Game[]) {
    runningGames.set(sessions[0].idGame, new RunningGame(sessions));
    sessions.forEach((session) => {
        const socketPlayer = activeSockets.get(session.idPlayer);
        if (socketPlayer != undefined){
            const currentGame = {ships: session.ships, currentPlayerIndex: session.idPlayer};
            let response: types.reqOutputInt = new types.Reponse('start_game', JSON.stringify(currentGame));
            socketPlayer.send(JSON.stringify(response))
        }
    })
}

export function create_game(roomId: number){
    const gameIndex = gameHistory.length;
    rooms[roomId].roomUsers.forEach(player => {
        const socket = activeSockets.get(player.index)
        if (socket != undefined){
            const currentGame = new Game(gameIndex, player.index, roomId);
            gameHistory.push(currentGame);
            let response: types.reqOutputInt = new types.Reponse('create_game', JSON.stringify(currentGame));
            socket.send(JSON.stringify(response))
        }
    });
}

export function updateTurn(gameID: number | string){
    const currentGame = runningGames.get(gameID);
    if (currentGame){
    rooms[currentGame.roomID].roomUsers.forEach(player => {
        const socket = activeSockets.get(player.index)
        if (socket != undefined){
            const currentTurn = {currentPlayer: currentGame.turn}
            let response: types.reqOutputInt = new types.Reponse('turn', JSON.stringify(currentTurn));
            socket.send(JSON.stringify(response))
        }
    });}
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
                if (game.ships.length > 0)
                    playerReadyCount++;
            });
            if (playerReadyCount == 2){
                startGame(sessions);
                updateTurn(data.gameId);
            }
            break;
        
        case '':
            break;

        default:
            break;
    }
}

  
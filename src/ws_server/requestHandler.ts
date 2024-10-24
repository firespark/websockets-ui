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
    players: (number | string)[];
    turn: number;
    damagedCells: types.coordinate[][];
    ships: GameShip[][];

    constructor(sessions: Game[]) {
        this.gameID = sessions[0].idGame;
        this.roomID = sessions[0].roomID;
        this.players = [];
        this.turn = Math.round(Math.random());
        this.damagedCells = [];
        this.ships = [];

        this.players.push(sessions[0].idPlayer)
        this.players.push(sessions[1].idPlayer)

        let damagedCellsP1: types.coordinate[] = [];
        let damagedCellsP2: types.coordinate[] = [];

        this.damagedCells.push(damagedCellsP1);
        this.damagedCells.push(damagedCellsP2);

        let shipsP1: GameShip[] = [];
        let shipsP2: GameShip[] = [];
        sessions[0].ships.forEach((ship) => {
            shipsP1.push(new GameShip(ship))
        });
        this.ships.push(shipsP1);

        sessions[1].ships.forEach((ship) => {
            shipsP2.push(new GameShip(ship))
        });
        this.ships.push(shipsP2);
    }

    attack(coordinate: types.coordinate, attackerID: number | string): attackReport {
        let attackerIndex = this.players.indexOf(attackerID);
        let victimIndex = attackerIndex ? 0 : 1;
        this.damagedCells[victimIndex].push(coordinate);
        let damageReport: attackReport = {
            position: coordinate,
            currentPlayer: attackerID,
            status: 'miss'
        }
        for (let i = 0; i < this.ships[victimIndex].length; i++) {

            const victimDamageReport = this.ships[victimIndex][i].damageCheck(coordinate)
            if (victimDamageReport != 'miss') {
                console.log(victimDamageReport)
                damageReport.status = victimDamageReport;
            }
        }

        console.log(damageReport)
        return damageReport;

    }

    isValidShot(coordinate: types.coordinate, attackerID: number | string): boolean {
        let attackerIndex = this.players.indexOf(attackerID);
        let victimIndex = attackerIndex ? 0 : 1;

        for (let i = 0; i < this.damagedCells[victimIndex].length; i++) {
            if (this.damagedCells[victimIndex][i].x == coordinate.x && this.damagedCells[victimIndex][i].y == coordinate.y) {
                return false;
            }

        }
        return true;
    }

    getRandomCoordinate(attackerID: number | string): types.coordinate {
        let attackerIndex = this.players.indexOf(attackerID);
        let victimIndex = attackerIndex ? 0 : 1;

        const allCoordinates: types.coordinate[] = [];
        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++) {
                allCoordinates.push({ x, y });
            }
        }
        const availableCoordinates = allCoordinates.filter(
            coord => !coordinateExists(this.damagedCells[victimIndex], coord)
        );
        if (availableCoordinates.length === 0) {
            return { x: 666, y: 666 }
        }
        const randomIndex = Math.floor(Math.random() * availableCoordinates.length);
        return availableCoordinates[randomIndex];
    }

    checkWinner(): number | string | null{
        const player1Ships = 10 - this.ships[0].filter(ship => ship.status === 'killed').length;
        const player2Ships = 10 - this.ships[1].filter(ship => ship.status === 'killed').length;
        if (player1Ships == 0)
            return this.players[1];
        else if (player2Ships == 0)
            return this.players[0];
        else return null;
    }
}

export type attackReport = {
    position: types.coordinate;
    currentPlayer: number | string;
    status: string;
}

export class GameShip {
    cells: types.coordinate[];
    hp: number;
    maxHP: number;
    status: string;

    constructor(ship: Ship) {
        this.cells = [];
        this.hp = ship.length;
        this.maxHP = ship.length;
        this.status = 'healthy';
        for (let i = 0; i < ship.length; i++) {
            let coordinate = { x: ship.position.x, y: ship.position.y };

            if (ship.direction) {
                coordinate.y += i;
            }
            else {
                coordinate.x += i;
            }

            this.cells.push(coordinate);
        }
    }

    damageCheck(cell: types.coordinate): string {
        let hitReport = 'miss';
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i].x == cell.x && this.cells[i].y == cell.y) {
                console.log(this.cells)
                this.hp--;
                if (this.hp <= 0) {
                    this.status = 'killed';
                }
                else
                    this.status = 'shot';
                hitReport = this.status;
                return hitReport;
            }

        }

        return hitReport;
    }
}

export class Game {
    idGame: number | string;
    idPlayer: number | string;
    ships: Ship[];
    roomID: number | string;
    constructor(gameIndex: number | string, idPlayer: number | string, roomID: number | string) {
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
        if (socketPlayer != undefined) {
            const currentGame = { ships: session.ships, currentPlayerIndex: session.idPlayer };
            let response: types.reqOutputInt = new types.Reponse('start_game', JSON.stringify(currentGame));
            socketPlayer.send(JSON.stringify(response))
        }
    })
}

export function create_game(roomId: number) {
    const gameIndex = gameHistory.length;
    rooms[roomId].roomUsers.forEach(player => {
        const socket = activeSockets.get(player.index)
        if (socket != undefined) {
            const currentGame = new Game(gameIndex, player.index, roomId);
            gameHistory.push(currentGame);
            let response: types.reqOutputInt = new types.Reponse('create_game', JSON.stringify(currentGame));
            socket.send(JSON.stringify(response))
        }
    });
}

export function updateTurn(gameID: number | string) {
    const currentGame: RunningGame | undefined = runningGames.get(gameID);
    if (currentGame) {
        rooms[currentGame.roomID].roomUsers.forEach(player => {
            const socket = activeSockets.get(player.index)
            if (socket != undefined) {
                const currentTurn = { currentPlayer: currentGame.players[currentGame.turn] }
                let response: types.reqOutputInt = new types.Reponse('turn', JSON.stringify(currentTurn));
                socket.send(JSON.stringify(response))
            }
        });
    }
}

export function attackFeedback(attackFeedback: attackReport, gameID: number | string) {
    const currentGame: RunningGame | undefined = runningGames.get(gameID);
    if (currentGame) {
        rooms[currentGame.roomID].roomUsers.forEach(player => {
            const socket = activeSockets.get(player.index)
            if (socket != undefined) {
                let response: types.reqOutputInt = new types.Reponse('attack', JSON.stringify(attackFeedback));
                socket.send(JSON.stringify(response))
            }
        });
    }

}

export function surroundingCellsWipe(currentGame: RunningGame, attackerID: number | string, killCell: types.coordinate) {
    let attackerIndex = currentGame.players.indexOf(attackerID);
    let victimIndex = attackerIndex ? 0 : 1;

    let deadShipID;
    for (let i = 0; i < currentGame.ships[victimIndex].length; i++) {
        let ship = currentGame.ships[victimIndex][i];
        if (ship.status == 'killed') {
            for (let n = 0; n < ship.cells.length; n++) {
                if (ship.cells[n].x == killCell.x && ship.cells[n].y == killCell.y) {
                    deadShipID = i;
                }
            }
        }
    }
    if (currentGame.ships[victimIndex][deadShipID]) {
        for (let i = 0; i < currentGame.ships[victimIndex][deadShipID].cells.length; i++) {
            const currentShipCell = currentGame.ships[victimIndex][deadShipID].cells[i];
            for (let wx = -1; wx <= 1; wx++)
                for (let wy = -1; wy <= 1; wy++) {
                    const wipedCell: types.coordinate = {
                        x: currentShipCell.x + wx,
                        y: currentShipCell.y + wy
                    }
                    if (currentGame.isValidShot(wipedCell, attackerID)) {
                        currentGame.damagedCells[victimIndex].push(wipedCell);
                        console.log(`wiping coord ${wipedCell}`)
                        attackFeedback(currentGame.attack(wipedCell, attackerID), currentGame.gameID);
                    }
                }

        }
    }
    else console.log(`it broke\n ${currentGame.ships[victimIndex]} \n ${deadShipID} \n `)
}

export function finish(winnerId: number | string, currentGame: RunningGame) {
        rooms[currentGame.roomID].roomUsers.forEach(player => {
            const socket = activeSockets.get(player.index)
            if (socket != undefined) {
                const winner = { winPlayer: winnerId }
                let response: types.reqOutputInt = new types.Reponse('finish', JSON.stringify(winner));
                socket.send(JSON.stringify(response))
            }
        });
}
export function attack(data) {
    const attackedCell: types.coordinate = { x: data.x, y: data.y };
    const currentGame: RunningGame | undefined = runningGames.get(data.gameId);
    if (currentGame && currentGame.players[currentGame.turn] == data.indexPlayer && currentGame.isValidShot(attackedCell, data.indexPlayer)) {
        const attackReport = currentGame.attack(attackedCell, data.indexPlayer);
        attackFeedback(attackReport, data.gameId);
        if (attackReport.status == 'killed') {
            surroundingCellsWipe(currentGame, data.indexPlayer, attackedCell);
            const winnerId = currentGame.checkWinner();
            if (winnerId != null)
                finish(winnerId, currentGame)

        }
        if (attackReport.status == 'miss') {
            currentGame.turn = 1 - currentGame.turn;
            updateTurn(currentGame.gameID)
        }
    }
}


export function random_attack(data) {
    const currentGame: RunningGame | undefined = runningGames.get(data.gameId);
    if (currentGame && currentGame.players[currentGame.turn] == data.indexPlayer) {
        4
        const attackedCell: types.coordinate = currentGame.getRandomCoordinate(data.indexPlayer);
        const attackReport = currentGame.attack(attackedCell, data.indexPlayer);
        attackFeedback(attackReport, data.gameId);
        if (attackReport.status == 'killed') {
            surroundingCellsWipe(currentGame, data.indexPlayer, attackedCell);
            const winnerId = currentGame.checkWinner();
            if (winnerId != null)
                finish(winnerId, currentGame)
        }
        if (attackReport.status == 'miss') {
            currentGame.turn = 1 - currentGame.turn;
            updateTurn(currentGame.gameID)
        }
    }
}
function coordinateExists(arr: types.coordinate[], coord: types.coordinate): boolean {
    return arr.some(c => c.x === coord.x && c.y === coord.y);
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
            if (rooms[data.indexRoom].roomUsers.length == 2) {
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
            if (playerReadyCount == 2) {
                startGame(sessions);
                updateTurn(data.gameId);
            }
            break;

        case 'attack':
            attack(data);
            break;

        case 'randomAttack':
            random_attack(data);
            break;
        default:
            break;
    }
}


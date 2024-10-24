import { WebSocket } from 'ws';
import * as types from '../interfaces';
import { update_room, rooms, Room } from './room';
import { User, Player, findUserByName, validatePassword, updateWinners, updateSocket, currentUser } from './player'
import { attack, create_game, gameHistory, random_attack, Ship, startGame, updateTurn } from './game';

const bots: Bot[] = []

export class Bot implements Player {
    index: string | number;
    name: string;

    constructor() {
        this.index = `bot-${bots.length}`
        this.name = `HAL-9000 mk.${bots.length}`
    }
}

function prepareTheMachine(meatbag: User) {
    const machine = new Bot();
    bots.push(machine);
    console.log(`${meatbag.name} is lonely. Release the ${machine.name} (${machine.index})`)
    const beatingsRoom = new Room(meatbag)
    rooms.push(beatingsRoom);
    const isUserInside = beatingsRoom.isUserInRoom(machine);
    if (isUserInside == false) {
        beatingsRoom.addUser(machine);
    }
    const gameID = create_game(beatingsRoom.roomId);
    if (gameID) {
        const AIGame = gameHistory[gameID];
        AIGame.ships = placeAIShips();
    }

}

const shipTypes = [
    { type: "small", size: 1, count: 4 },
    { type: "medium", size: 2, count: 3 },
    { type: "large", size: 3, count: 2 },
    { type: "huge", size: 4, count: 1 }
];

function placeAIShips(): Ship[] {
    const grid: (Ship | null)[][] = Array.from({ length: 10 }, () =>
        Array(10).fill(null)
    );

    function canPlaceShip(
        x: number,
        y: number,
        size: number,
        vertical: boolean
    ): boolean {
        for (let i = 0; i < size; i++) {
            const nx = vertical ? x : x + i;
            const ny = vertical ? y + i : y;

            if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) return false;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const checkX = nx + dx;
                    const checkY = ny + dy;
                    if (
                        checkX >= 0 &&
                        checkX < 10 &&
                        checkY >= 0 &&
                        checkY < 10 &&
                        grid[checkY][checkX] !== null
                    ) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function placeShip(type: string, size: number): Ship | null {
        let attempts = 100;

        while (attempts-- > 0) {
            const x = getRandomInt(0, 10);
            const y = getRandomInt(0, 10);
            const vertical = Math.random() < 0.5;

            if (canPlaceShip(x, y, size, vertical)) {
                for (let i = 0; i < size; i++) {
                    const nx = vertical ? x : x + i;
                    const ny = vertical ? y + i : y;
                    grid[ny][nx] = { position: { x, y }, direction: vertical, type, length };
                }

                return { position: { x, y }, direction: vertical, type, length };
            }
        }
        return null;
    }

    const placedShips: Ship[] = [];

    for (const { type, size, count } of shipTypes) {
        for (let i = 0; i < count; i++) {
            const ship = placeShip(type, size);
            if (ship) {
                placedShips.push(ship);
            } else {
                console.error(`Failed to place ship: ${type}`);
                return []; 
            }
        }
    }

    return placedShips;
}



function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
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

        case 'single_play':
            prepareTheMachine(currentUser(socket) as User);

            break;
        default:
            break;
    }
}


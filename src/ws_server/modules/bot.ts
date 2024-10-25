import * as types from '../../interfaces';
import { RunningGame, runningGames, attack, create_game, Ship } from "./game";
import { coordinateExists, getRandomElement, getRandomInt } from "./helpers";
import { Player, User } from "./player";
import { Room, rooms } from './room';

let bots = new Map<string, Bot>();

export class attackLog {
    coordinate: types.coordinate;
    result: string;
    constructor(coordinate: types.coordinate, result: string) {
        this.coordinate = coordinate;
        this.result = result;
    }
}

export class Bot implements Player {
    index: string;
    name: string;
    gameID: number;
    attackLogs: attackLog[];

    constructor() {
        this.index = `bot-${bots.size}`
        this.name = `HAL-9000 mk.${bots.size}`
        this.attackLogs = []
    }

    async attack() {
        await new Promise(f => setTimeout(f, 1000));
        const currentGame: RunningGame | undefined = runningGames.get(this.gameID);
        if (currentGame) {
            let coordinate = currentGame.getRandomCoordinate(this.index)
            const latestShot = this.attackLogs[this.attackLogs.length - 1];
            if (latestShot) {
                if (latestShot.result == 'shot') {
                    let adjacentCells = getValidAdjacentCell(latestShot.coordinate, this.index, currentGame, this.attackLogs)

                    if (adjacentCells && adjacentCells.length > 0) {
                        let randomCell = getRandomElement(adjacentCells)
                        if (randomCell) {
                            coordinate = randomCell;
                            //console.log(`Bot found a coordinate near latest shot`);
                        }
                    }
                }
                else {
                    let adjacentCells = getCellsAroundWounds(latestShot.coordinate, this.index, currentGame, this.attackLogs)
                    if (adjacentCells && adjacentCells.length > 0) {
                        let randomCell = getRandomElement(adjacentCells)
                        if (randomCell) {
                            coordinate = randomCell;
                            //console.log(`Bot found a coordinate near older shot`);
                        }
                    }
                }
            }
            const status = attack({ x: coordinate.x, y: coordinate.y, gameId: this.gameID, indexPlayer: this.index });
            this.attackLogs.push(new attackLog(coordinate, status as string));
        }
    }
}

function getAllValidAdjustedCells(coord: types.coordinate, attackerID: string, game: RunningGame): types.coordinate[] {
    const adjacentCells: types.coordinate[] = [
        { x: coord.x - 1, y: coord.y }, // Left
        { x: coord.x + 1, y: coord.y }, // Right
        { x: coord.x, y: coord.y - 1 }, // Up
        { x: coord.x, y: coord.y + 1 }  // Down
    ];

    const validCells: types.coordinate[] = []

    adjacentCells.forEach(cell => {
        if (game.isValidShot(cell, attackerID))
            validCells.push(cell)
    });

    return validCells;
}

function getValidAdjacentCell(coord: types.coordinate, attackerID: string, game: RunningGame, logs: attackLog[]) {
    const adjacentCells: types.coordinate[] = [
        { x: coord.x - 1, y: coord.y }, // Left
        { x: coord.x + 1, y: coord.y }, // Right
        { x: coord.x, y: coord.y - 1 }, // Up
        { x: coord.x, y: coord.y + 1 }  // Down
    ];

    const validCells: types.coordinate[] = getAllValidAdjustedCells(coord, attackerID, game);

    let foundCell = false;
    let probableCell = { x: coord.x, y: coord.y };

    for (let index = 0; index < adjacentCells.length; index++) {
        const cell = adjacentCells[index];
        if (!foundCell) {
            for (let n = 0; n < logs.length; n++) {
                const log = logs[n];
                if (cell.x == log.coordinate.x && cell.y == log.coordinate.y && log.result == 'shot') {
                    switch (index) {
                        case 0:
                            probableCell.x + 1;
                            break;

                        case 1:
                            probableCell.x - 1;
                            break;

                        case 2:
                            probableCell.y + 1;
                            break;

                        case 3:
                            probableCell.y - 1;
                            break;

                        default:
                            break;
                    }
                    foundCell = true;
                    break;
                }
            }
        }

    }

    if (coordinateExists(validCells, probableCell))
        return [probableCell];
    else if (validCells.length > 0)
        return validCells;
}

export function getCellsAroundWounds(coord: types.coordinate, attackerID: string, game: RunningGame, logs: attackLog[]) {
    const resultCells: types.coordinate[] = []
    for (let n = 0; n < logs.length; n++) {
        const log = logs[n];
        if (log.result == 'shot') {
            let cellsAroundWound = getValidAdjacentCell(log.coordinate, attackerID, game, logs);
            if (cellsAroundWound)
                resultCells.push(...cellsAroundWound)
        }
    }
    return resultCells;
}

export function prepareTheMachine(meatbag: User) {
    const machine = new Bot();
    bots.set(machine.index, machine);
    //console.log(`${meatbag.name} is lonely. Release the ${machine.name} (${machine.index})`)
    const beatingsRoom = new Room(meatbag)
    rooms.push(beatingsRoom);
    const isUserInside = beatingsRoom.isUserInRoom(machine);
    if (isUserInside == false) {
        beatingsRoom.addUser(machine);
    }
    const gameID = create_game(beatingsRoom.roomId);
    machine.gameID = gameID;

}

const shipTypes = [
    { type: "small", length: 1, count: 4 },
    { type: "medium", length: 2, count: 3 },
    { type: "large", length: 3, count: 2 },
    { type: "huge", length: 4, count: 1 }
];

export function placeAIShips(): Ship[] {
    //console.log('Creating ship grid for bot')
    const grid: (Ship | null)[][] = Array.from({ length: 10 }, () =>
        Array(10).fill(null)
    );

    function canPlaceShip(
        x: number,
        y: number,
        length: number,
        direction: boolean
    ): boolean {
        for (let i = 0; i < length; i++) {
            const nx = direction ? x : x + i;
            const ny = direction ? y + i : y;

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

    function placeShip(type: string, length: number): Ship | null {
        let attempts = 100;

        while (attempts-- > 0) {
            const x = getRandomInt(0, 10);
            const y = getRandomInt(0, 10);
            const vertical = Math.random() < 0.5;

            if (canPlaceShip(x, y, length, vertical)) {
                for (let i = 0; i < length; i++) {
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

    for (const { type, length, count } of shipTypes) {
        for (let i = 0; i < count; i++) {
            const ship = placeShip(type, length);
            if (ship) {
                placedShips.push(ship);
            } else {
                //console.error(`Failed to place ship: ${type}`);
                return placeAIShips();
            }
        }
    }

    return placedShips;
}

export function passTurnToAI(botID: string) {
    //console.log(`Turn passed to bot ${botID}`)
    const bot = bots.get(botID);
    bot?.attack()
}



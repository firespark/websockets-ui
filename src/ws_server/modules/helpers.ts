import * as types from '../../interfaces';

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function getRandomElement<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

export function coordinateExists(arr: types.coordinate[], coord: types.coordinate): boolean {
    return arr.some(c => c.x === coord.x && c.y === coord.y);
}

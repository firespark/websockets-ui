import { WebSocket } from 'ws';
import * as types from '../../interfaces';
import { update_room, rooms, Room } from './room';
import { User, findUserByName, validatePassword, updateWinners, updateSocket, currentUser } from './player'
import { attack, create_game, gameHistory, random_attack, startGame, updateTurn } from './game';
import { placeAIShips, prepareTheMachine } from './bot';



export const requestHandler = (req: types.reqInputInt, socket: WebSocket) => {
    let data = (req.data) ? JSON.parse(req.data) : '';
    let responseData;
    //console.log(req)
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
                if (typeof game.idPlayer == 'string') {
                    game.ships = placeAIShips();
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


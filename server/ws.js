import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import LobbyManager from './lobby.js';
import run from '../headless.js';
import fs from 'fs';

const lobbyManager = new LobbyManager();
let wss;

export function createWebSocketServer(server) {
    wss = new WebSocketServer({ server });
    wss.on('connection', (ws, req) => {
        if (req.url !== '/') return;

        const userId = Math.floor(Math.random() * 100000000).toString(20).toUpperCase(); // Assign a unique ID to each connected user

        ws.userId = userId; // Store userId in the WebSocket instance

        // Send userId to the client
        ws.send(JSON.stringify({ type: 'assignId', userId }));

        ws.on('message', (message) => {
            const data = JSON.parse(message);

            switch (data.type) {
                // Request to join a lobby
                case 'requestJoinLobby':
                    const hostId = data.lobbyName;
                    if (hostId) {
                        const hostWs = [...wss.clients].find(client => client.userId === hostId);
                        if (hostWs) {
                            hostWs.send(JSON.stringify({ type: 'joinRequest', userId, lobbyName: data.lobbyName }));
                        }
                    } else {
                        ws.send(JSON.stringify({ type: 'errorMsg', msg: 'Lobby does not exist.' }));
                    }
                    break;

                // Accept a join request
                case 'acceptJoinRequest':
                    lobbyManager.addUserToLobby(data.lobbyName, data.userId);
                    [...wss.clients].forEach(client => {
                        if (client.userId === data.userId) {
                            client.lobbyName = data.lobbyName;
                            client.send(JSON.stringify({ type: 'joinAccepted', lobbyName: data.lobbyName }));
                        }
                    });
                    break;

                default:
                    break;
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            const closedLobby = lobbyManager.handleDisconnect(userId);
            if (closedLobby) {
                [...wss.clients].forEach(client => {
                    if (client.lobbyName === closedLobby) {
                        client.send(JSON.stringify({ type: 'lobbyClosed' }));
                    }
                });
            }
        });
    });

    const lobbies = {};

    wss.on('connection', async (ws, req) => {
        if (req.url == '/') return;

        const lobbyId = req.url.split('/')[2];
        const pid = req.url.split('/')[3];

        ws.lobbyId = lobbyId;
        ws.pid = pid;

        if (!lobbies[lobbyId]) {
            lobbies[lobbyId] = true;

            createLobby(lobbyId);
        }
    });
}

async function createLobby(lobbyId) {
    const browser = await run();

    const twoPlayers = new Promise((resolve) => {
        const interval = setInterval(() => {
            const clients = [...wss.clients].filter(client => client.lobbyId === lobbyId);
            if (clients.length === 2) {
                clearInterval(interval);
                resolve();
            }
        }, 500);
    });

    await twoPlayers;

    console.log(`Starting game in lobby: ${lobbyId}`);

    await browser.page.evaluate(() => {
        return new Promise((resolve) => {
            const originalLog = console.log;
            console.log = (...args) => {
                if (args[0] === 'start game called') {
                    setTimeout(() => {
                        resolve();
                    }, 3000);
                }
                originalLog(...args);
            };
        });
    }).then(() => {
        console.log(`Game loaded in lobby: ${lobbyId}`);
    });

    await browser.page.evaluate(() => {
        Object.defineProperties(window, {
            "ball": {
                get: () => window.c3_runtimeInterface._localRuntime._iRuntime.objects.balls.getAllInstances()[0],
            },
            "players": {
                get: () => [
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.body.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.body2.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.body3.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.body4.getAllInstances()[0],
                ],
            },
            "heads": {
                get: () => [
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.head.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.head2.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.head3.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.head4.getAllInstances()[0],
                ],
            },
            "arms": {
                get: () => [
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.arm.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.arm2.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.arm3.getAllInstances()[0],
                    window.c3_runtimeInterface._localRuntime._iRuntime.objects.arm4.getAllInstances()[0],
                ],
            },
            "globalVars": {
                get: () => window.c3_runtimeInterface._localRuntime._iRuntime.globalVars,
            }
        });

        window.soundsPlayed = [];
        window.AudioDOMHandler.prototype._Play = new Proxy(window.AudioDOMHandler.prototype._Play, {
            apply: (target, thisArg, argumentsList) => {
                window.soundsPlayed.push(argumentsList[0].originalUrl);

                if (argumentsList[0].originalUrl === "file") {
                    window.globalVars.p1Score = 0;
                    window.globalVars.p2Score = 0;
                }

                return target.apply(thisArg, argumentsList);
            }
        });
    });

    const { width, height } = browser.page.viewport();

    await browser.page.mouse.move(width / 2, height / 2);
    await browser.page.mouse.click(width / 2, height / 2);

    await browser.page.evaluate(() => {
        return new Promise((resolve) => {
            setInterval(() => {
                if (window.soundsPlayed.includes('menu')) {
                    setTimeout(() => {
                        resolve();
                    }, 1500);
                }
            }, 500);
        });
    });

    console.log(`Menu: ${lobbyId}`);

    await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 2000);
    });

    await browser.page.mouse.move((width / 2) + 100, height / 2);
    await browser.page.mouse.click((width / 2) + 100, height / 2);

    console.log(`Game started in lobby: ${lobbyId}`);

    setInterval(async () => {
        await browser.page.screenshot({
            path: 'screenshot.png',
            type: 'png',
            optimizeForSpeed: true,
        })

        const data = fs.readFileSync('screenshot.png').toString('base64');

        fs.writeFileSync('screenshot.txt', `data:image/png;base64,${data}`);
    }, 1500);

    let gamers = [];

    [...wss.clients].forEach(client => {
        if (client.lobbyId === lobbyId) {
            client.send('start');

            client.on('message', async (message) => {
                const data = JSON.parse(message.toString());

                if (data.type === 'key') {
                    if (data.event === 'keydown') {
                        await browser.page.keyboard.down(data.key);
                    }

                    if (data.event === 'keyup') {
                        await browser.page.keyboard.up(data.key);
                    }
                }
            });

            gamers.push(client);
        }
    });
    
    let i = 0;

    function sendData(d) {
        i ++;
        gamers.forEach(gamer => {
            gamer.send(d);
        });
    }   

    console.log(`Starting transmission: ${lobbyId}`);

    browser.page.on('console', async (msg) => {
        const data = msg.text();

        if (data.startsWith('data:')) {
            try {
                const d = JSON.parse(atob(data.slice(5)));

                d.id = i;

                sendData(JSON.stringify(d));
            } catch {};
        }
    });

    await browser.page.evaluate(() => {
        setInterval(() => {
            console.log('data:' + btoa(JSON.stringify({
                type: "event",
                event: "update",
                players: window.players.map((player) => ({ x: player.x, y: player.y, angle: player.angle, instVars: player.instVars })),
                heads: window.heads.map((head) => ({ x: head.x, y: head.y, angle: head.angle, instVars: head.instVars })),
                arms: window.arms.map((arm) => ({ x: arm.x, y: arm.y, angle: arm.angle, instVars: arm.instVars })),
                ball: { x: window.ball.x, y: window.ball.y, instVars: {hold: window.ball.instVars.hold, who: window.ball.instVars.who} },
            })));
        }, 1000 / 25);

        return true;
    });
}
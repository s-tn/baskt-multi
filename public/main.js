const ws = new WebSocket(`ws://${location.host}`);

let myId = null;

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'assignId':
            myId = data.userId;
            document.getElementById('userIdDisplay').textContent = myId;
            break;

        case 'lobbyCreated':
            document.getElementById('lobbyStatus').textContent = `Lobby "${data.lobbyName}" created.`;
            break;

        case 'errorMsg':
            document.getElementById('lobbyStatus').textContent = data.msg;
            break;

        case 'joinAccepted':
            document.getElementById('joinStatus').textContent = `You have joined lobby "${data.lobbyName}".`;

            startGame(data.lobbyName);
            break;

        case 'joinRequest':
            const accept = confirm(`User ${data.userId} wants to join your lobby "${data.lobbyName}". Accept?`);
            if (accept) {
                ws.send(JSON.stringify({ type: 'acceptJoinRequest', userId: data.userId, lobbyName: data.lobbyName }));
                startGame(myId);
            }
            break;

        case 'lobbyClosed':
            alert('The lobby you were in has been closed.');
            break;

        default:
            break;
    }
};

// Handle requesting to join a lobby
document.getElementById('joinLobbyBtn').addEventListener('click', () => {
    const lobbyName = document.getElementById('joinLobbyInput').value;
    ws.send(JSON.stringify({ type: 'requestJoinLobby', lobbyName }));
});

async function startGame(id) {
    const ws = new WebSocket(`ws://${location.host}/game/${id}/${myId}`);

    window.addEventListener('basket-key', (event) => {
        ws.send(JSON.stringify({ type: 'key', event: event.detail.type, key: event.detail.key }));
    });

    let currentId = 0;

    ws.addEventListener('message', (event) => {
        if (event.data === 'start') {

            setInterval(() => {
                for (const head of document.querySelector('iframe').contentWindow.heads) {
                    head.x = head.savedX;
                    head.y = head.savedY;
                    head.angle = head.savedAngle;
                }

                for (const player of document.querySelector('iframe').contentWindow.players) {
                    player.x = player.savedX;
                    player.y = player.savedY;
                    player.angle = player.savedAngle;
                }

                for (const arm of document.querySelector('iframe').contentWindow.arms) {
                    arm.x = arm.savedX;
                    arm.y = arm.savedY;
                    arm.angle = arm.savedAngle;
                }

                document.querySelector('iframe').contentWindow.ball.x = document.querySelector('iframe').contentWindow.ball.savedX;
                document.querySelector('iframe').contentWindow.ball.y = document.querySelector('iframe').contentWindow.ball.savedY;
            }, 1);

            ws.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                if (data.id < currentId) {
                    return;
                }

                currentId = data.id;

                if (data.event === 'update') {
                    (function(window) {
                        for (let [index, player] of enumerate(data.players)) {
                            const playerInstance = window.players.find((p, i) => index === i);
                            if (!playerInstance) {
                                continue;
                            }

                            ['x', 'y', 'angle'].forEach((key) => {
                                const delta = Math.abs(player[key] - playerInstance[key]);

                                if (key === 'x' && delta > 0) {
                                    playerInstance.x = player.x;
                                    playerInstance.savedX = player.x;
                                }

                                if (key === 'y' && delta > 0) {
                                    playerInstance.y = player.y;
                                    playerInstance.savedY = player.y;
                                }

                                if (key === 'angle' && delta > (Math.PI / 90, 0)) {
                                    playerInstance.angle = player.angle;
                                    playerInstance.savedAngle = player.angle;
                                }
                            });

                            for (let [key, value] of Object.entries(player.instVars)) {
                                playerInstance.instVars[key] = value;
                            }
                        }
            
                        for (let [index, head] of enumerate(data.heads)) {
                            const headInstance = window.heads.find((p, i) => index === i);
                            if (!headInstance) {
                                continue;
                            }

                            ['x', 'y', 'angle'].forEach((key) => {
                                const delta = Math.abs(head[key] - headInstance[key]);

                                if (key === 'y' && delta > 0) {
                                    headInstance.y = head.y;
                                    headInstance.savedY = head.y;
                                }

                                if (key === 'angle' && delta > (Math.PI / 180, 0)) {
                                    headInstance.angle = head.angle;
                                    headInstance.savedAngle = head.angle;
                                }

                                if (key === 'x' && delta > 0) {
                                    headInstance.x = head.x;
                                    headInstance.savedX = head.x;
                                }
                            });

                            for (let [key, value] of Object.entries(head.instVars)) {
                                headInstance.instVars[key] = value;
                            }
                        }

                        for (let [index, arm] of enumerate(data.arms)) {
                            const armInstance = window.arms.find((p, i) => index === i);
                            if (!armInstance) {
                                continue;
                            }
                            
                            ['x', 'y', 'angle'].forEach((key) => {
                                const delta = Math.abs(arm[key] - armInstance[key]);

                                if (key === 'x' && delta > 0) {
                                    armInstance.x = arm.x;
                                    armInstance.savedX = arm.x;
                                }

                                if (key === 'y' && delta > 0) {
                                    armInstance.y = arm.y;
                                    armInstance.savedY = arm.y;
                                }

                                if (key === 'angle' && delta > (Math.PI / 180, 0)) {
                                    armInstance.angle = arm.angle;
                                    armInstance.savedAngle = arm.angle;
                                }
                            });

                            for (let [key, value] of Object.entries(arm.instVars)) {
                                armInstance.instVars[key] = value;
                            }
                        }
            
                        const ballInstance = window.ball;
                        ballInstance.x = data.ball.x;
                        ballInstance.y = data.ball.y;
                        ballInstance.savedX = data.ball.x;
                        ballInstance.savedY = data.ball.y;
                        for (let [key, value] of Object.entries(data.ball.instVars)) {
                            ballInstance.instVars[key] = value;
                        }
                    })(document.querySelector('iframe').contentWindow);
                }
            });
            ws.send(JSON.stringify({ type: 'ready' }));
        } else return false;
    });
}

function enumerate(iterable) {
    let i = 0;
    let e = [];
    for (let item of iterable) {
        e.push([i, item]);
        i++;
    }
    return e;
}
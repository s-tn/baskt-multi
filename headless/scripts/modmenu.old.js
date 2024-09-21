import { guess } from "https://cdn.jsdelivr.net/npm/web-audio-beat-detector/+esm";

window.guess = guess;

EventTarget.prototype._nativeEventListener = EventTarget.prototype._nativeEventListener || EventTarget.prototype.addEventListener;

for (let Obj of [ Window, Document, HTMLIFrameElement ]) {
    Obj.prototype.addEventListener = new Proxy(Obj.prototype.addEventListener, {
        apply: (target, thisArg, argumentsList) => {
            if (argumentsList[1]) {
                argumentsList[1] = new Proxy(argumentsList[1], {
                    apply: (target, thisArg, argumentsList) => {
                        try {
                            if (document.querySelector("#modMenu")?.contains(argumentsList[0].target)) {
                                return false;
                            }
                        } catch {};
                        
                        return target.apply(thisArg, argumentsList);
                    }
                });
            }
            return target.apply(thisArg, argumentsList);
        }
    });
}

const WS_ENDPOINT = "wss://73a59210-8993-4b29-8c5b-b0d9f2edf0f5-00-33hnin010jlp8.janeway.replit.dev";
const WS = new WebSocket(WS_ENDPOINT);

window._mod_WS = WS;

WS.onopen = () => {
    console.log("Connected to server");
}

WS.onmessage = (event) => {
    console.log(event.data);
    if (event.data.startsWith('connect-req:')) {
        const id = event.data.split(':')[1];
        if (confirm(`Player ${id} wants to connect to you. Accept?`)) {
            sendRequest(`connect-accept:${id}`);
            connecting = true;
            window.opponent = id;
        } else {
            sendRequest(`connect-reject:${id}`);
        }
    }
    if (event.data.startsWith('connect-accepted')) {
        const id = event.data.split(':')[1];
        window.opponent = id;

        window.basketLoading.then(() => setInterval(() => {
            if (multiplayer === true) {
                sendRequest(`data-json:${JSON.stringify({
                    type: "event",
                    event: "update",
                    target: opponent,
                    players: window.players.map((player) => ({ x: player.x, y: player.y, instVars: player.instVars })),
                    heads: window.heads.map((head) => ({ x: head.x, y: head.y, instVars: head.instVars })),
                    ball: { x: window.ball.x, y: window.ball.y, instVars: {hold: window.ball.instVars.hold, who: window.ball.instVars.who} },
                })}`);
            }
        }, 10));
    }
    if (event.data.startsWith('ids-available')) {
        const ids = event.data.split(':')[1].split(',').filter(e => !!e);
        if (ids.find((id) => id === multiplayerId)) {
            ids.splice(ids.indexOf(multiplayerId), 1);
        }
        if (ids.length >= 1) {
            if (JSON.stringify(ids) === JSON.stringify([
                ...[...document.querySelectorAll('.player + span')].map((player) => player.textContent),
            ])) {
                return;
            }

            document.getElementById('connect-button').disabled = false;

            const availablePlayers = document.getElementById('available-players');
            availablePlayers.innerHTML = '';

            for (let id of ids) {
                if (id !== multiplayerId) {
                    const player = document.createElement('input');
                    player.type = "radio";
                    player.name = "player";
                    player.className = 'player';
                    player.value = id;

                    availablePlayers.appendChild(player);
                    availablePlayers.innerHTML += `<span>${id}</span><br />`;
                }
            }
        }
    }

    if (event.data.startsWith('data-json:')) {
        const data = JSON.parse(event.data.split('data-json:')[1]);
        runJsonData(data);
    }
}

WS.onclose = () => {
    console.log("Disconnected from server");
}

function sendRequest(request) {
    WS.send(request);
}

function runJsonData(data = {}) {   
    if (data.target !== multiplayerId) {
        return false;
    }

    if (data.type === "event") {
        if (data.event === "keydown") {
            for (let [index, player] of enumerate(data.players)) {
                const playerInstance = window.players.find((p, i) => index === i);
                if (!playerInstance) {
                    continue;
                }
                playerInstance.x = player.x;
                playerInstance.y = player.y;
                for (let [key, value] of Object.entries(player.instVars)) {
                    playerInstance.instVars[key] = value;
                }
            }

            for (let [index, head] of enumerate(data.heads)) {
                const headInstance = window.heads.find((p, i) => index === i);
                if (!headInstance) {
                    continue;
                }
                headInstance.x = head.x;
                headInstance.y = head.y;
                for (let [key, value] of Object.entries(head.instVars)) {
                    headInstance.instVars[key] = value;
                }
            }

            const ballInstance = window.ball;
            ballInstance.x = data.ball.x;
            ballInstance.y = data.ball.y;
            for (let [key, value] of Object.entries(data.ball.instVars)) {
                ballInstance.instVars[key] = value;
            }

            const event = new KeyboardEvent('keydown', {
                key: data.key,
                which: data.which,
                keyCode: data.keyCode,
                code: data.code,
            });

            window.dispatchEvent(event);
        } else if (data.event === "keyup") {
            const event = new KeyboardEvent('keyup', {
                key: data.key,
                which: data.which,
                keyCode: data.keyCode,
                code: data.code,
            });

            window.dispatchEvent(event);
        } else if (data.event === "update") {
            if (keys['w'] || keys['W'] || keys['ArrowUp']) {
                return false;
            }
            for (let [index, player] of enumerate(data.players)) {
                const playerInstance = window.players.find((p, i) => index === i);
                if (!playerInstance) {
                    continue;
                }
                playerInstance.x = player.x;
                playerInstance.y = player.y;
                for (let [key, value] of Object.entries(player.instVars)) {
                    playerInstance.instVars[key] = value;
                }
            }

            for (let [index, head] of enumerate(data.heads)) {
                const headInstance = window.heads.find((p, i) => index === i);
                if (!headInstance) {
                    continue;
                }
                headInstance.x = head.x;
                headInstance.y = head.y;
                for (let [key, value] of Object.entries(head.instVars)) {
                    headInstance.instVars[key] = value;
                }
            }

            const ballInstance = window.ball;
            ballInstance.x = data.ball.x;
            ballInstance.y = data.ball.y;
            for (let [key, value] of Object.entries(data.ball.instVars)) {
                ballInstance.instVars[key] = value;
            }
        }
    }
}   

class TabRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.chunks = [];
        this.isRecording = false;
    }

    async startRecording() {
        if (this.isRecording) {
            console.warn("Recording is already in progress.");
            return;
        }

        try {
            const stream = document.querySelector('canvas').captureStream(45);
            this.chunks = [];
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' }); // Adjust mimeType as per compatibility

            this.mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    this.chunks.push(event.data);
                }
            };

            this.mediaRecorder.start(1000); // Experiment with different timeslice values
            this.isRecording = true;
            console.log("Recording started.");
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    }

    stopRecording() {
        if (!this.isRecording) {
            console.warn("No recording in progress to stop.");
            return;
        }

        this.mediaRecorder.stop();
        this.isRecording = false;
        console.log("Recording stopped.");
    }

    saveRecording() {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recording.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Recording saved.");
    }
}

class TabClipper {
    constructor() {
        this.recorders = [];
    }

    startCapturing() {
        this.recorders = [];
        this.recorders.push(new TabRecorder());
        this.recorders[0].startRecording();

        setInterval(() => {
            this.addRecorder();
        }, 10000);
    }

    addRecorder() {
        let index = this.recorders.push(new TabRecorder()) - 1;
        this.recorders.at(index).startRecording();

        setTimeout(() => {
            this.recorders.at(index).stopRecording();
            this.recorders.splice(index, 1);
        }, 30000);
    }

    stopCapturing() {
        for (let recorder of this.recorders) {
            recorder.stopRecording();
        }
    }

    saveClip() {
        this.recorders.at(0).saveRecording();
    }
}

const clipper = new TabClipper();

window._nativeEventListener('keydown', (event) => {
    if (!event.isTrusted) {
        return false;
    }
    if (multiplayer === true) {
        if (event.key === "w") {
            sendRequest(`data-json:${JSON.stringify({
                type: "event",
                event: "keydown",
                key: "w",
                which: 87,
                keyCode: 87,
                code: "KeyW",
                target: opponent,
                players: window.players.map((player) => ({ x: player.x, y: player.y, instVars: player.instVars })),
                heads: window.heads.map((head) => ({ x: head.x, y: head.y, instVars: head.instVars })),
                ball: { x: window.ball.x, y: window.ball.y, instVars: window.ball.instVars },
            })}`);
        } else if (event.key === "ArrowUp") {
            sendRequest(`data-json:${JSON.stringify({
                type: "event",
                event: "keydown",
                key: "ArrowUp",
                which: 38,
                keyCode: 38,
                code: "ArrowUp",
                target: opponent,
                players: window.players.map((player) => ({ x: player.x, y: player.y, instVars: player.instVars })),
                heads: window.heads.map((head) => ({ x: head.x, y: head.y, instVars: head.instVars })),
                ball: { x: window.ball.x, y: window.ball.y, instVars: window.ball.instVars },
            })}`);
        }
    }
});

window._nativeEventListener('keyup', (event) => {
    if (!event.isTrusted) {
        return false;
    }
    if (multiplayer === true) {
        if (event.key === "w") {
            sendRequest(`data-json:${JSON.stringify({
                type: "event",
                event: "keyup",
                key: "w",
                which: 87,
                keyCode: 87,
                code: "KeyW",
                target: opponent,
            })}`);
        } else if (event.key === "ArrowUp") {
            sendRequest(`data-json:${JSON.stringify({
                type: "event",
                event: "keyup",
                key: "ArrowUp",
                which: 38,
                keyCode: 38,
                code: "ArrowUp",
                target: opponent,
            })}`);
        }
    }
});

Object.defineProperties(window, {
    "ball": {
        get: () => c3_runtimeInterface._localRuntime._iRuntime.objects.balls.getAllInstances()[0],
    },
    "players": {
        get: () => [
            c3_runtimeInterface._localRuntime._iRuntime.objects.body.getAllInstances()[0],
            c3_runtimeInterface._localRuntime._iRuntime.objects.body2.getAllInstances()[0],
            c3_runtimeInterface._localRuntime._iRuntime.objects.body3.getAllInstances()[0],
            c3_runtimeInterface._localRuntime._iRuntime.objects.body4.getAllInstances()[0],
        ],
    },
    "heads": {
        get: () => [
            c3_runtimeInterface._localRuntime._iRuntime.objects.head.getAllInstances()[0],
            c3_runtimeInterface._localRuntime._iRuntime.objects.head2.getAllInstances()[0],
            c3_runtimeInterface._localRuntime._iRuntime.objects.head3.getAllInstances()[0],
            c3_runtimeInterface._localRuntime._iRuntime.objects.head4.getAllInstances()[0],
        ],
    },
    "globalVars": {
        get: () => c3_runtimeInterface._localRuntime._iRuntime.globalVars,
    }
});

function resetPractice() {
    var player = c3_runtimeInterface._localRuntime._iRuntime.objects["body" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0];
    var head = c3_runtimeInterface._localRuntime._iRuntime.objects["head" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0];

    player.x = resetX();
    player.y = 136;
    player.instVars.angular = 0;
    player.instVars.angle = 0;
    player.instVars.degreeAngle = 0;

    head.x = resetX();
    head.y = 136;
    head.instVars.angular = 0;
    head.instVars.angle = 0;
    head.instVars.degreeAngle = 0;

    giveBall(practicePlayer);
}

let multiplayer = false;
let multiplayerId = null;
let connecting = false;
window.opponent = null;

function enableMultiplayer() {
    multiplayer = true;

    if (multiplayerId === null) {
        multiplayerId = Math.random().toString(36).substring(7);

        document.getElementById('multi-id').textContent = multiplayerId;
    }

    sendRequest(`open-connect:${multiplayerId}`);
}

function disableMultiplayer() {
    multiplayer = false;

    document.getElementById('connect-button').disabled = true;

    const availablePlayers = document.getElementById('available-players');
    availablePlayers.innerHTML = '';
}

async function crazyMode() {
    await window.basketLoading;

    setInterval(() => {
        c3_runtimeInterface._localRuntime._iRuntime.layout.angle += (1) * (Math.PI / 180)
    for (var instance of [...c3_runtimeInterface._localRuntime._iRuntime.objects.body.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body2.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body3.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body4.getAllInstances()]) {
    var localAngle = (2 * Math.PI) % c3_runtimeInterface._localRuntime._iRuntime.layout.angle
    console.log(localAngle)
    instance.instVars.angular = 180 - (180 / Math.PI) * localAngle;
    
}
}, 10);
}

let singlePlayer = false;
let practicing = false;

async function singlePlayers() {
    await window.basketLoading;

    dropBall();
    singlePlayer = true;

    for (var [i1, i2, i3, i4] of [
        [...c3_runtimeInterface._localRuntime._iRuntime.objects.body.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body2.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body3.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body4.getAllInstances()], 
        [...c3_runtimeInterface._localRuntime._iRuntime.objects.head.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head2.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head3.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head4.getAllInstances()
    ]]) {
        i1.instVars._x = i1.x;
        i1.instVars._y = i1.y;
        i1.instVars._angle = i1.angle;
        i1.instVars._angular = i1.instVars.angular;

        i3.instVars._x = i3.x;
        i3.instVars._y = i3.y;
        i3.instVars._angle = i3.angle;
        i3.instVars._angular = i3.instVars.angular;

        i1.x = 1000;
        i3.x = 1000;
    }
}

let practicePlayer = 4;

async function practiceMode() {
    await window.basketLoading;

    dropBall();
    if (practicing === false) {
        //c3_runtimeInterface._localRuntime._iRuntime.objects.balls.getAllInstances()[0]?.destroy();
    }
    practicing = true;

    var bodies = [
        c3_runtimeInterface._localRuntime._iRuntime.objects.body.getAllInstances()[0],
        c3_runtimeInterface._localRuntime._iRuntime.objects.body2.getAllInstances()[0],
        c3_runtimeInterface._localRuntime._iRuntime.objects.body3.getAllInstances()[0],
        c3_runtimeInterface._localRuntime._iRuntime.objects.body4.getAllInstances()[0],
    ].filter(body => body !== c3_runtimeInterface._localRuntime._iRuntime.objects["body" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0]);

    var heads = [
        c3_runtimeInterface._localRuntime._iRuntime.objects.head.getAllInstances()[0],
        c3_runtimeInterface._localRuntime._iRuntime.objects.head2.getAllInstances()[0],
        c3_runtimeInterface._localRuntime._iRuntime.objects.head3.getAllInstances()[0],
        c3_runtimeInterface._localRuntime._iRuntime.objects.head4.getAllInstances()[0],
    ].filter(head => head !== c3_runtimeInterface._localRuntime._iRuntime.objects["head" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0]);

    for (var [i1, i2, i3, i4] of [bodies, heads]) {
        i1.instVars._x = i1.x;
        i1.instVars._y = i1.y;
        i1.instVars._angle = i1.angle;
        i1.instVars._angular = i1.instVars.angular;
    
        i2.instVars._x = i2.x;
        i2.instVars._y = i2.y;
        i2.instVars._angle = i2.angle;
        i2.instVars._angular = i2.instVars.angular;

        i3.instVars._x = i3.x;
        i3.instVars._y = i3.y;
        i3.instVars._angle = i3.angle;
        i3.instVars._angular = i3.instVars.angular;

        i1.x = 1000;
        i2.x = 1000;
        i3.x = 1000;
    }

    var player = c3_runtimeInterface._localRuntime._iRuntime.objects["body" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0];
    // var head = c3_runtimeInterface._localRuntime._iRuntime.objects["head" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0];

    player.instVars._x = player.x;
    player.instVars._y = player.y;
    player.instVars._angle = player.angle;
    player.instVars._angular = player.instVars.angular;

    giveBall(practicePlayer);
}

var resetX = () => {
    switch(practicePlayer) {
        case 1:
            return 125;
        case 2:
            return 210;
        case 3:
            return 175;
        case 4:
            return 100;
    }
}

_nativeEventListener('keypress', (event) => {
    if (!practicing) {
        return;
    }

    if (event.key === "b") {
        giveBall(practicePlayer);
    }

    if (event.key === "r") {
        giveBall(practicePlayer);
        var player = c3_runtimeInterface._localRuntime._iRuntime.objects["body" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0];
        var head = c3_runtimeInterface._localRuntime._iRuntime.objects["head" + (practicePlayer === 1 ? "" : practicePlayer)].getAllInstances()[0];

        player.x = resetX();
        player.y = 136;
        player.instVars.angular = 0;
        player.instVars.angle = 0;
        player.instVars.degreeAngle = 0;

        head.x = resetX();
        head.y = 136;
        head.instVars.angular = 0;
        head.instVars.angle = 0;
        head.instVars.degreeAngle = 0;
    }
});

function giveBall(body) {
    var ball = c3_runtimeInterface._localRuntime._iRuntime.objects.balls.getAllInstances()[0];

    ball.instVars.hold = 1;
    ball.instVars.who = body;
}

function dropBall() {
    var ball = c3_runtimeInterface._localRuntime._iRuntime.objects.balls.getAllInstances()[0];

    ball.instVars.hold = 0;
    ball.instVars.who = -1;
}

document.head.insertAdjacentHTML('beforeend', `
<style>
    .mod-menu {
        width: 350px;
        background: #000;
        border: 1px solid #ccc;
        position: fixed;
        top: 50px;
        left: 50px;
        z-index: 1000;
    }

    #gravity-value {
        width: 15px;
        display: inline-block;
        padding-left: 3px;
    }

    .mod-menu.minimized {
        display: none;
    }
    
    .title-bar {
        background: #333;
        color: white;
        padding: 5px;
        cursor: move;
    }
    
    .content {
        padding: 10px;
    }
    
    .minimize-button {
        float: right;
        cursor: pointer;
        color: white;
        background: none;
        border: none;
    }
</style>
`);

// Create mod menu element
const modMenu = document.createElement('div');
modMenu.id = 'modMenu';
modMenu.className = 'mod-menu';

// Create title bar
const titleBar = document.createElement('div');
titleBar.className = 'title-bar';

// Create content area
const content = document.createElement('div');
content.className = 'content';
// Add your mod menu content here

content.innerHTML = `
    <h1>Random Mods</h1>
    <label for="modSlider">Gravity (4 default)</label>
    <span id="gravity-value">4</span>
    <input type="range" id="gravity-changer" min="0" max="30" value="4">
    <label for="activate-oneone">Activate 1v1 Game</label>
    <button id="activate-oneone">Activate</button>
    <br />
    <label for="activate-practice">Activate Practice</label>
    <button id="activate-practice">Activate</button>
    <form class="practice-form">
        <input type="radio" id="player1-practice" name="practice" value="1">
        <label for="player1-practice">Player 1</label><br>

        <input type="radio" id="player2-practice" name="practice" value="2">
        <label for="player2-practice">Player 2</label><br>

        <input type="radio" id="player3-practice" name="practice" value="3">
        <label for="player3-practice">Player 3</label><br>

        <input type="radio" id="player4-practice" name="practice" value="4" checked>
        <label for="player4-practice">Player 4</label><br>
    </form>
    <hr />
    <h2>Multiplayer</h2>
    <label for="enable-multi">Enable</label>
    <input type="checkbox" id="enable-multi" name="enable multiplayer" value="Enable">
    <br />
    <h3 style="margin-bottom: 5px;">Available Players:</h3>
    <h5 style="margin-top: 0px; margin-bottom: 5px;">Your ID: <span id="multi-id">${multiplayerId || ''}</span></h5>
    <form id="available-players" style="margin-bottom: 5px;"></form>
    <button id="connect-button" disabled="true">Connect</button>
    <hr />
    <h2>Clipping</h2>
    <label for="enable-clip">Enable</label>
    <input type="checkbox" id="enable-clip" name="enable clipping" value="Enable">
    <span id="clip-time">00:00</span>
    <br />
    <button id="capture-30s" disabled="true">Record Last 30 seconds</button>
    <hr />
    <h2>Custom Score</h2>
    <h5 style="margin-top: 0px; margin-bottom: 5px;">Current: <span id="score-value">5</span></h5>
    <label for="score">Score</label>
    <span id="score-current" style="width: 16px; display: inline-block; text-align: center;">5</span>
    <input type="range" id="score" min="0" max="20" value="5">
    <button id="score-submit">Save</button>
`;

let clippingTime = 0;

setInterval(() => {
    if (clipper.mediaRecorder && clipper.mediaRecorder.state === 'recording') {
        clippingTime += 100;
        document.getElementById('clip-time').textContent = new Date(clippingTime).toISOString().substr(14, 5);
    } else {
        clippingTime = 0;
    }
}, 100);

content.querySelector('.practice-form')._nativeEventListener('change', (event) => {
    const form = document.querySelector('.practice-form');
    const data = new FormData(form);
    const selectedPlayer = data.get('practice');

    practicePlayer = parseInt(selectedPlayer);
});

// Append elements
modMenu.appendChild(titleBar);
modMenu.appendChild(content);
document.body.appendChild(modMenu);

content.querySelector('#gravity-changer')._nativeEventListener('input', (event) => {
    content.querySelector('#gravity-value').textContent = event.target.value;

    c3_runtimeInterface._localRuntime._pluginManager._allBehaviors[0].SetGravity(parseInt(event.target.value));
    //sendRequest(`gravity:${event.target.value}`);
});

content.querySelector('#enable-multi')._nativeEventListener('input', () => {
    if (content.querySelector('#enable-multi').checked) {
        enableMultiplayer();
    } else {
        disableMultiplayer();
    }
});

let scoreTarget = 5;
let scores = [0, 0];

content.querySelector('#score-submit')._nativeEventListener('click', () => {
    const score = content.querySelector('#score').value;
    content.querySelector('#score-value').textContent = score;

    scoreTarget = score;
});

content.querySelector('#score')._nativeEventListener('input', (event) => {
    content.querySelector('#score-current').textContent = event.target.value;
});

content.querySelector('#enable-clip')._nativeEventListener('input', () => {
    if (content.querySelector('#enable-clip').checked) {
        document.getElementById(`capture-30s`).disabled = false;
        clipper.startCapturing();
    } else {
        document.getElementById(`capture-30s`).disabled = true;
        clipper.stopCapturing();
    }
});

content.querySelector('#activate-practice')._nativeEventListener('click', () => {
    if (practicing === true) {
        for (var [i1, i2, i3, i4] of [
            [...c3_runtimeInterface._localRuntime._iRuntime.objects.body.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body2.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body3.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body4.getAllInstances()], 
            [...c3_runtimeInterface._localRuntime._iRuntime.objects.head.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head2.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head3.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head4.getAllInstances()
        ]]) {
            i1.x = i1.instVars._x;
            i1.y = i1.instVars._y;
            i1.angle = i1.instVars._angle;
            i1.instVars.angular = i1.instVars._angular;

            i2.x = i2.instVars._x;
            i2.y = i2.instVars._y;  
            i2.angle = i2.instVars._angle;
            i2.instVars.angular = i2.instVars._angular;

            i3.x = i3.instVars._x;
            i3.y = i3.instVars._y;  
            i3.angle = i3.instVars._angle;
            i3.instVars.angular = i3.instVars._angular;

            i4.x = i4.instVars._x;
            i4.y = i4.instVars._y;  
            i4.angle = i4.instVars._angle;
            i4.instVars.angular = i4.instVars._angular;
        }

        return practicing = false;
    }

    practiceMode();
});

content.querySelector('#activate-oneone')._nativeEventListener('click', () => {
    if (singlePlayer === true) {
        for (var [i1, i2, i3, i4] of [
            [...c3_runtimeInterface._localRuntime._iRuntime.objects.body.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body2.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body3.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.body4.getAllInstances()], 
            [...c3_runtimeInterface._localRuntime._iRuntime.objects.head.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head2.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head3.getAllInstances(), ...c3_runtimeInterface._localRuntime._iRuntime.objects.head4.getAllInstances()
        ]]) {
            i1.x = i1.instVars._x;
            i1.y = i1.instVars._y;
            i1.angle = i1.instVars._angle;
            i1.instVars.angular = i1.instVars._angular;

            i3.x = i3.instVars._x;
            i3.y = i3.instVars._y;  
            i3.angle = i3.instVars._angle;
            i3.instVars.angular = i3.instVars._angular;
        }

        return singlePlayer = false;
    }
    singlePlayers();
});

document.getElementById('available-players')._nativeEventListener(
    "submit",
    (event) => {
        const data = new FormData(form);
        const selectedPlayer = data.get('player');
        event.preventDefault();
    },
    false,
);

document.getElementById('connect-button')._nativeEventListener('click', () => {
    if (connecting === true) {
        return false;
    }
    connecting = true;

    const form = document.getElementById('available-players');
    const data = new FormData(form);
    const selectedPlayer = data.get('player');

    if (selectedPlayer === null) {
        connecting = false;
        return false;
    }

    sendRequest(`connect:${selectedPlayer}`);
});

// Make mod menu draggable
dragElement(modMenu);

// Function to make the element draggable
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.querySelector(elmnt.id + " .title-bar")) {
        // if present, the header is where you move the DIV from:
        document.querySelector(elmnt.id + " .title-bar").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.querySelector('.title-bar').onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.querySelector('.title-bar').onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        elmnt.querySelector('.title-bar').onmouseup = null;
        document.onmousemove = null;
    }
}

_nativeEventListener('keydown', (event) => {
    if (event.key === 'm') {
        document.getElementById('modMenu').classList.toggle('minimized');
    }
});

let resolveReady;

window.basketLoading = new Promise((resolve) => {
    resolveReady = resolve;
});

function newGame() {
    console.log('starting')
    newRound();
}

function newRound() {
    c3_runtimeInterface._localRuntime._pluginManager._allBehaviors[0].SetGravity(parseInt(content.querySelector('#gravity-changer').value));

    if (singlePlayer === true) {
        singlePlayers();
    }

    if (practicing === true) {
        practiceMode();
    }
}

_nativeEventListener('basket-ready', () => {
    window.AudioDOMHandler.prototype._Play = new Proxy(window.AudioDOMHandler.prototype._Play, {
        apply: (target, thisArg, argumentsList) => {
            console.log(argumentsList[0])
            if (argumentsList[0].originalUrl === "file") {
                if (ball.x > 225 && ball.y > 75 && ball.y < 80 && ball.instVars.hold === 0) {
                    scores[0] ++;

                    c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game')._layersByName.get('ui')._instances[2]._sdkInst._SetText(String(scores[0]));
                    c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game')._layersByName.get('ui')._instances[3]._sdkInst._SetText(String(scores[1]));
            
                    if (scores[0] >= scoreTarget) {
                        scores = [0, 0];
                        return globalVars.p1Score = scoreTarget;
                    }
                
                    if (scores[1] >= scoreTarget) {
                        scores = [0, 0];
                        return globalVars.p2Score = scoreTarget;
                    }
            
                    globalVars.p1Score = 0;
                    globalVars.p2Score = 0;
                }
            
                if (ball.x < 80 && ball.y > 75 && ball.y < 80 && ball.instVars.hold === 0) {
                    scores[1] ++;

                    c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game')._layersByName.get('ui')._instances[2]._sdkInst._SetText(String(scores[0]));
                    c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game')._layersByName.get('ui')._instances[3]._sdkInst._SetText(String(scores[1]));
            
                    if (scores[0] >= scoreTarget) {
                        scores = [0, 0];
                        return globalVars.p1Score = scoreTarget;
                    }
                
                    if (scores[1] >= scoreTarget) {
                        scores = [0, 0];
                        return globalVars.p2Score = scoreTarget;
                    }
            
                    globalVars.p1Score = 0;
                    globalVars.p2Score = 0;
                }

                setTimeout(() => {
                    c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game')._layersByName.get('ui')._instances[2]._sdkInst._SetText(String(scores[0]));
                    c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game')._layersByName.get('ui')._instances[3]._sdkInst._SetText(String(scores[1]));
                }, 2450);
            }
            if (argumentsList[0].originalUrl === "start") {
                Promise.allSettled([
                    C3Audio_DOMInterface._Play({vol: 1, url: 'media/remix0.webm', originalUrl: 'remix0', tags: ['music'], loop: true}).then(() => {
                        return C3Audio_DOMInterface._Stop({url: 'media/remix0.webm', originalUrl: 'remix0', tags: ['music']})
                    }),
                    C3Audio_DOMInterface._Play({vol: 1, url: 'media/remix1.webm', originalUrl: 'remix1', tags: ['music'], loop: true}).then(() => {
                        return C3Audio_DOMInterface._Stop({url: 'media/remix1.webm', originalUrl: 'remix1', tags: ['music']})
                    }),         
                    C3Audio_DOMInterface._Play({vol: 1, url: 'media/remix2.webm', originalUrl: 'remix2', tags: ['music'], loop: true}).then(() => {
                        return C3Audio_DOMInterface._Stop({url: 'media/remix2.webm', originalUrl: 'remix2', tags: ['music']})
                    })           
                ]).then(resolveReady);
            }
            if (argumentsList[0].originalUrl === "music") {
                newGame();

                /*if (!C3Audio_DOMInterface._audioInstances.find(inst => inst._buffer._originalUrl === "remix0")) {
                    return (
                        C3Audio_DOMInterface._Play({vol: 1, url: `media/remix0.webm`, originalUrl: 'remix0', tags: ['music'], loop: true}).then(() => {
                            return C3Audio_DOMInterface._Stop({url: `media/remix0.webm`, originalUrl: 'remix0', tags: ['music']})
                        }).then(() => {
                            C3Audio_DOMInterface._audioInstances.find(inst => inst._buffer._originalUrl === "remix0").Play(true, 0.15, 0, 0);
                        }),
                        null
                    )
                }

                return;*/
            }
            if (argumentsList[0].originalUrl === "refsoc") {
                console.timeEnd();
                newRound();
            }
            return target.apply(thisArg, argumentsList);
        }
    });
});

window.bopMusic = async function bopMusic(name) {
    window.ball.instVars.hold = 0;
    window.ball.instVars.who = -1;
    window.ball.x = 1000;
    window.ball.y = 1000;

    let intervals = [];

    setTimeout(async () => {
        const res = await fetch("./media/" + name + ".webm")
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => {
                return new OfflineAudioContext(1, 1, 44100).decodeAudioData(arrayBuffer);
            });

        const { tempo, bpm, offset} = await guess(res);
        const time = (60 / bpm) * 1000;
        const audioData = {
            vol: 1,
            originalUrl: name,
            url: window.C3Audio_DOMInterface._audioBuffers.find((audio) => audio._originalUrl === name)._url,
            tags: ["music"],
            isLooping: true,
            isMusic: false,
            off: 0,
            pos: 0,
            stereoPan: 0,
            trueClock: true,
        }

        intervals.push(setInterval(() => {
            c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game').SetScale(1.16);
            setTimeout(() => {
                c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game').SetScale(1);
            }, time);
        }, time * 2));

        intervals.push(setInterval(() => {
            c3_runtimeInterface._localRuntime._layoutManager._layoutsByName.get('game')._layersByName.get('bg').SetAngle((Math.random() * 6 - 3) * (Math.PI / 180));
        }, time));

        intervals.push(setInterval(() => {
            if (window.heads[0].angleDegrees < 50) {
                window.heads[0].angleDegrees = 359
            }

            if (window.heads[1].angleDegrees < 50) {
                window.heads[1].angleDegrees = 359
            }

            if (window.heads[2].angleDegrees < 50) {
                window.heads[2].angleDegrees = 359
            }

            if (window.heads[3].angleDegrees < 50) {
                window.heads[3].angleDegrees = 359
            }
        }));

        let currentTilt = -15
        let currentChange = 0.06;

        intervals.push(setInterval(() => {
            currentTilt += currentChange;

            if (currentTilt >= 15) {
                currentChange = -0.06;
            } else if (currentTilt <= -15) {
                currentChange = 0.06;
            }

            for (var player of window.players) {
                player.instVars.angular = currentTilt
            }
        }, 1));

        C3Audio_DOMInterface._StopAll();
        window.C3Audio_DOMInterface._Play(audioData);

        window._stopBop = true;
    }, 1450);

    window._stopBop = false;

    window.stopBop = async function stopBop() {
        if (!window._stopBop) {
            while (!window._stopBop) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        for (var interval of intervals) {
            clearInterval(interval);
        }

        window.C3Audio_DOMInterface._Stop({url: `media/${name}.webm`, originalUrl: name, tags: ["music"]});

        window.ball.instVars.hold = 0;
        window.ball.instVars.who = -1;
        window.ball.x = 1000;
        window.ball.y = 1000;
    }

    return true;
}

window.WebGLRenderingContext.prototype.drawElements = null;
window.WebGL2RenderingContext = null;

window.basketLoading.then(() => setInterval(() => {
    const ball = window.ball;

    if (practicing === true) {
        if (ball.x > 225 && ball.y > 75 && ball.y < 80) {
            resetPractice();
        }

        if (ball.x < 80 && ball.y > 75 && ball.y < 80) {
            resetPractice();
        }
    }

    let dunkingX = 0;
    let dunkingY = 0;
    let headX = 0;
    let headY = 0;

    function dunk(index) {
        var player = c3_runtimeInterface._localRuntime._iRuntime.objects["body" + (index === 0 ? "" : index)].getAllInstances()[0];
        var head = c3_runtimeInterface._localRuntime._iRuntime.objects["head" + (index === 0 ? "" : index)].getAllInstances()[0];
        var arm = c3_runtimeInterface._localRuntime._iRuntime.objects["arm" + (index === 0 ? "" : index)].getAllInstances()[0];
        dunkingX = player.x;
        dunkingY = player.y;
        headX = head.x;
        headY = head.y

        let intervals = 0;

        let int = setInterval(() => {
            intervals ++;

            player.x = dunkingX;
            player.y = dunkingY;
            head.x = headX;
            head.y = headY;

            if (intervals >= 3000000) {
                clearInterval(int);
            }
        });
    }

    for (var [i, head] of enumerate(window.heads)) {
        if (i === 0 || i === 1) {
            if (ball.instVars.who === i + 1) {
                if (head.x < 80 && head.y > 75 && head.y < 80 && head.x > 60) {
                    dunk(i);
                }
            }
        }

        if (i === 2 || i === 3) {
            if (ball.instVars.who === i + 1) {
                if (head.x > 225 && head.y > 75 && head.y < 80 && head.x < 245) {
                    dunk(i);
                }
            }
        }
    }
}, 0));

[
    30
].forEach((time, index) => {
    document.getElementById(`capture-${time}s`)._nativeEventListener('click', async () => {
        clipper.saveClip();
    });
});
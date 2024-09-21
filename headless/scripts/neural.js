const net = new brain.NeuralNetwork();

function enumerate(iterable) {
    let i = 0;
    let e = [];
    for (let item of iterable) {
        e.push([i, item]);
        i++;
    }
    return e;
}

let trainingData = [];

function getNetData() {
    return trainingData;
}

let keys = {};

addEventListener('keydown', function (e) {
    keys[e.key] = true;
});

addEventListener('keyup', function (e) {
    keys[e.key] = false;
});

function getTrainingPoint() {
    let data = {};

    let ball = window.ball;
    let players = window.players;
    for (let [i, player] of enumerate(players)) {
        data['player' + (i + 1) + 'x'] = player.x;
        data['player' + (i + 1) + 'y'] = player.y;
    }

    data['ballx'] = ball.x;
    data['bally'] = ball.y;

    data['ballholder'] = ball.instVars.who === -1 ? 0 : ball.instVars.who;

    return {
        input: data,
        output: {
            p1jump: (keys['w'] || keys['W']) ? 1 : 0,
            p2jump: (keys['ArrowUp']) ? 1 : 0
        }
    };
}

addEventListener('load', function () {
    this.addEventListener('keydown', function (e) {
        let int;
        if (e.key === 'y') {
            
        }

        if (e.key === 't') {
            clearInterval(int);
            trainNet();
        }

        if (e.key === 's') {
            let data = getTrainingPoint();
            console.log(net.run(data.input));
        }

        if (e.key === 'd') {
            let data = getTrainingPoint();
            console.log(data);
        }

        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            let data = getTrainingPoint();
            addNetData(data);
        }
    });
});

function addNetData(data) {
    trainingData.push(data);
}

function trainNet() {
    net.train(trainingData, {
        iterations: 20000,
        errorThresh: 0.005,
        log: true,
        logPeriod: 100
    });
}
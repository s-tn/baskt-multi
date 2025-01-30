/* headless browser */

import puppeteer from 'puppeteer';
import { platform } from 'os';

const run = async () => {
    let chromiumExec = '';

    if (platform() === 'linux') {
        chromiumExec = '/usr/bin/chromium-browser';
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: chromiumExec
    });
    const page = await browser.newPage({
        visualViewport: {
            innerWidth: 640,
            innerHeight: 360
        }
    });
    page.setViewport({ width: 640, height: 360 });
    await page.goto('http://localhost:7600/');

    return { browser, page };
}

import http from 'http';
import nodeStatic from 'node-static';

const file = new nodeStatic.Server('./headless');

const server = http.createServer((req, res) => {
    req.addListener('end', () => {
        file.serve(req, res);
    }).resume();
});

server.listen(7600, () => {
    console.log('Headless client running at http://localhost:7600/');
});

export default run;
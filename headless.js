/* headless browser */

import puppeteer from 'puppeteer';

const run = async () => {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage({
        visualViewport: {
            innerWidth: 1280,
            innerHeight: 720
        }
    });
    page.setViewport({ width: 1280, height: 720 });
    await page.goto('http://localhost:8080/');

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

server.listen(8080, () => {
    console.log('Headless client running at http://localhost:8080/');
});

export default run;
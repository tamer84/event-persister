
const fs = require('fs');
const path = require('path');

const handler = require('../../src');

const awsEvent = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/event_01.json'),'utf-8'));

handler.handler(awsEvent, null)
    .then(data => {
        console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
        console.error(err);
    })

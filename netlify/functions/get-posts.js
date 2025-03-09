const EventEmitter = require('events');
const postEmitter = new EventEmitter();
let posts = [];

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };
    return { statusCode: 200, body: JSON.stringify(posts) };
};

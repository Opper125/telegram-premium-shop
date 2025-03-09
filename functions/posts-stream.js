const EventEmitter = require('events');
const postEmitter = new EventEmitter();
let posts = [];

exports.handler = (event, context) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    };
    context.callbackWaitsForEmptyEventLoop = false;
    let responseBody = `data: ${JSON.stringify(posts)}\n\n`;
    const stream = {
        write: data => responseBody += data,
        end: () => responseBody += ': stream ended\n\n'
    };
    postEmitter.on('postUpdate', updatedPosts => {
        stream.write(`data: ${JSON.stringify(updatedPosts)}\n\n`);
    });
    const keepAlive = setInterval(() => stream.write(': keep-alive\n\n'), 3000);
    context.on('close', () => {
        clearInterval(keepAlive);
        stream.end();
    });
    return { statusCode: 200, headers, body: responseBody, isStream: true };
};

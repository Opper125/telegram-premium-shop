const EventEmitter = require('events');
const postEmitter = new EventEmitter();
let posts = [];

exports.handler = async (event, context) => {
    // Set headers for Server-Sent Events
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    };

    // Prevent Netlify from closing the connection prematurely
    context.callbackWaitsForEmptyEventLoop = false;

    // Create a readable stream for SSE
    const stream = new (require('stream').Readable)({
        read() {}
    });

    // Initial data push
    stream.push(`data: ${JSON.stringify(posts)}\n\n`);

    // Listen for post updates and push to the stream
    const postListener = (updatedPosts) => {
        stream.push(`data: ${JSON.stringify(updatedPosts)}\n\n`);
    };
    postEmitter.on('postUpdate', postListener);

    // Keep the connection alive with a heartbeat
    const keepAlive = setInterval(() => {
        stream.push(': keep-alive\n\n');
    }, 3000);

    // Clean up when the function is about to terminate
    // Netlify Functions don't provide direct access to rawReq, so we rely on function timeout
    // We can use a maximum timeout to clean up
    const timeout = setTimeout(() => {
        clearInterval(keepAlive);
        postEmitter.removeListener('postUpdate', postListener);
        stream.push(null); // End the stream
    }, 1000 * 60 * 5); // 5 minutes timeout (adjust as needed)

    return {
        statusCode: 200,
        headers,
        body: stream,
        isBase64Encoded: false
    };
};

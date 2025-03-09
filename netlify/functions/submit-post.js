const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const postEmitter = new EventEmitter();
let posts = [];

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

    const formData = event.body ? await new Promise((resolve) => {
        const chunks = [];
        event.on('data', chunk => chunks.push(chunk));
        event.on('end', () => resolve(Buffer.concat(chunks).toString()));
    }) : null;

    if (!formData) return { statusCode: 400, body: JSON.stringify({ error: 'No data provided' }) };

    const data = await new Promise((resolve, reject) => {
        const form = new URLSearchParams(formData);
        const result = {
            userId: form.get('userId'),
            content: form.get('content'),
            timestamp: form.get('timestamp')
        };
        resolve(result);
    });

    const files = event.files || {};
    const photo = files.photo ? await uploadToNetlify(files.photo) : null;
    const video = files.video ? await uploadToNetlify(files.video) : null;
    const audio = files.audio ? await uploadToNetlify(files.audio) : null;

    const post = {
        id: uuidv4(),
        userId: data.userId,
        content: data.content || '',
        photo,
        video,
        audio,
        timestamp: data.timestamp
    };

    posts.push(post);
    postEmitter.emit('postUpdate', posts);
    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Post submitted' }) };

    async function uploadToNetlify(file) {
        const fileName = `${Date.now()}-${file.name}`;
        return `/uploads/${fileName}`; // Mock URL
    }
};

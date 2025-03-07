exports.handler = async (event, context) => {
    const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || '127.0.0.1';
    return {
        statusCode: 200,
        body: JSON.stringify({ ip })
    };
};

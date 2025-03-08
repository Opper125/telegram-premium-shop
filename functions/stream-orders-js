const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // Set headers for Server-Sent Events (SSE)
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  // Initialize the response for SSE
  context.callbackWaitsForEmptyEventLoop = false;
  const response = {
    statusCode: 200,
    headers,
    body: '',
  };

  // Subscribe to Supabase real-time changes
  supabase
    .channel('orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      response.body += `data: ${JSON.stringify(payload)}\n\n`;
    })
    .subscribe();

  // Keep the connection alive
  setInterval(() => {
    response.body += ': keep-alive\n\n';
  }, 25000);

  return response;
};

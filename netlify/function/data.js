const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  if (event.httpMethod === 'POST') {
    const order = JSON.parse(event.body);
    try {
      const { error } = await supabase.from('orders').insert([order]);
      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Order saved successfully' }),
      };
    } catch (error) {
      console.error('Error saving order:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save order' }),
      };
    }
  } else if (event.httpMethod === 'GET') {
    try {
      const { data: orders, error } = await supabase.from('orders').select('*');
      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify(orders),
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch orders' }),
      };
    }
  } else if (event.httpMethod === 'PUT') {
    const { id, status } = JSON.parse(event.body);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Order updated successfully' }),
      };
    } catch (error) {
      console.error('Error updating order:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to update order' }),
      };
    }
  } else if (event.httpMethod === 'DELETE') {
    try {
      const { error } = await supabase.from('orders').delete().neq('id', 0);
      if (error) throw error;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Orders cleared successfully' }),
      };
    } catch (error) {
      console.error('Error clearing orders:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to clear orders' }),
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};

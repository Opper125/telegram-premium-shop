const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
  databaseURL: 'https://telegram-premium-shop-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

exports.handler = async (event, context) => {
  try {
    const db = admin.database();
    const ordersRef = db.ref('orders');
    const snapshot = await ordersRef.once('value');
    return {
      statusCode: 200,
      body: JSON.stringify(snapshot.val())
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

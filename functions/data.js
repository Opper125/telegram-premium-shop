let posts = [];
let orders = [];

function savePost(post) {
    posts.push(post);
    localStorage.setItem('posts', JSON.stringify(posts));
    // Simulate server update and broadcast to all users
    console.log('Post saved and broadcasted to all users:', post);
}

function getPosts() {
    posts = JSON.parse(localStorage.getItem('posts')) || [];
    return posts;
}

function saveOrder(order) {
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
}

function getOrders() {
    orders = JSON.parse(localStorage.getItem('orders')) || [];
    return orders;
}

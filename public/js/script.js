// Funkcja dodająca produkt do koszyka
function addToCart(productName) {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) {
        alert('Musisz być zalogowany, aby dodać coś do koszyka.');
        return;
    }

    const cartKey = `cart_${currentUser}`;
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

    const existingProduct = cart.find(item => item.name === productName);

    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({ name: productName, quantity: 1 });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));

    updateCartCount();
    updateCartWidgetCount();
    displayCart();
    showNotification();
}

// Funkcja aktualizująca licznik koszyka
function updateCartCount() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) {
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = 0;
        }
        return;
    }

    const cartKey = `cart_${currentUser}`;
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
    }
}

// Funkcja wyświetlająca zawartość koszyka
function displayCart() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) {
        alert('Musisz być zalogowany, aby zobaczyć swój koszyk.');
        return;
    }

    const cartKey = `cart_${currentUser}`;
    const cartItems = document.getElementById('cart-items');
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

    if (cartItems) {
        cartItems.innerHTML = '';

        if (cart.length === 0) {
            cartItems.innerHTML = '<li>Twój koszyk jest pusty.</li>';
        } else {
            cart.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.name} x ${item.quantity}`;
                cartItems.appendChild(li);
            });
        }
    }
}

// Funkcja wysyłająca zamówienie
function sendOrder() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) {
        alert('Musisz być zalogowany, aby wysłać zamówienie.');
        return;
    }

    const cartKey = `cart_${currentUser}`;
    const cartItems = JSON.parse(localStorage.getItem(cartKey)) || [];
    if (cartItems.length === 0) {
        alert('Koszyk jest pusty!');
        return;
    }

    const ordersKey = 'orders';
    const orders = JSON.parse(localStorage.getItem(ordersKey)) || [];

    // Dodajemy zamówienie wraz z nazwą użytkownika
    const order = {
        user: currentUser,
        items: cartItems
    };
    
    orders.push(order);

    localStorage.setItem(ordersKey, JSON.stringify(orders));

    localStorage.removeItem(cartKey);

    updateCartCount();
    updateCartWidgetCount();
    alert('Zamówienie zostało złożone.');
    displayCart();
}

// Funkcja do wyświetlania powiadomienia
function showNotification() {
    const notification = document.getElementById('floating-notification');
    if (notification) {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Funkcja aktualizująca licznik w stałym widgetcie
function updateCartWidgetCount() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) return;

    const cartKey = `cart_${currentUser}`;
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartWidgetCount = document.getElementById('cart-widget-count');
    if (cartWidgetCount) {
        cartWidgetCount.textContent = cartCount;
    }
}

// Inicjalizacja koszyka na stronie
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    
    // Sprawdzenie, czy widget koszyka istnieje przed aktualizacją
    if (document.getElementById('cart-widget-count')) {
        updateCartWidgetCount();
    }

    displayCart();
});

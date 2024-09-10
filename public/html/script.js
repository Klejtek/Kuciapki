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

// Nowa funkcja obsługująca dodawanie produktu z ilością do koszyka
async function addToCart(productId) {
    const userId = localStorage.getItem('userId');
    const quantity = document.getElementById(`quantity-${productId}`).value; // Pobieramy ilość

    if (!userId || !productId || !quantity) {
        alert('Brak ID użytkownika, produktu lub ilości');
        return;
    }

    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                productId: productId,
                quantity: parseInt(quantity) // Wysyłamy ilość jako liczba
            })
        });

        const data = await response.json();
        console.log('Dodano do koszyka:', data);
        updateCart(); // Aktualizacja koszyka po dodaniu produktu
    } catch (error) {
        console.error('Błąd przy dodawaniu do koszyka:', error);
    }
}

// Funkcja aktualizująca koszyk i wyświetlająca ilości
function updateCart() {
    const userId = localStorage.getItem('userId');

    fetch(`/api/cart/${userId}`)
    .then(response => response.json())
    .then(cartItems => {
        const cartList = document.getElementById('cart-items');
        cartList.innerHTML = ''; // Wyczyść aktualny widok koszyka

        let totalQuantity = 0;
        cartItems.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `${item.productId.name} - Ilość: ${item.quantity}`;
            cartList.appendChild(listItem);

            totalQuantity += item.quantity; // Sumowanie ilości produktów
        });

        // Aktualizacja liczby produktów w koszyku
        document.getElementById('cart-count').textContent = totalQuantity;
    })
    .catch(error => {
        console.error('Błąd przy pobieraniu koszyka:', error);
    });
}

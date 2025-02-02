/*************************************************
 * 1. FUNKCJE OPARTE NA localStorage (stare)      *
 *************************************************/

// Funkcja dodająca produkt do koszyka w localStorage (nieużywana przy bazie)
function addToCartLocalStorage(productName) {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) {
        alert('Musisz być zalogowany, aby dodać coś do koszyka (localStorage).');
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

    updateCartCountLocal();
    updateCartWidgetCountLocal();
    displayCartLocal();
    showNotification('Dodano do koszyka (localStorage)!');
}

// Aktualizacja licznika (localStorage)
function updateCartCountLocal() {
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

// Wyświetlanie zawartości koszyka (localStorage)
function displayCartLocal() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) {
        alert('Musisz być zalogowany, aby zobaczyć swój koszyk (localStorage).');
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

// Wysyłanie zamówienia (localStorage)
function sendOrderLocal() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser) {
        alert('Musisz być zalogowany, aby wysłać zamówienie (localStorage).');
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
    const order = {
        user: currentUser,
        items: cartItems
    };
    orders.push(order);
    localStorage.setItem(ordersKey, JSON.stringify(orders));
    localStorage.removeItem(cartKey);
    updateCartCountLocal();
    updateCartWidgetCountLocal();
    alert('Zamówienie zostało złożone (LOCAL).');
    displayCartLocal();
}

// Powiadomienie (pływające)
function showNotification(message) {
    const notification = document.getElementById('floating-notification');
    if (notification) {
        notification.textContent = message || 'Dodano do koszyka!';
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Widget count (localStorage) – stary
function updateCartWidgetCountLocal() {
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

// Inicjalizacja (localStorage)
document.addEventListener('DOMContentLoaded', () => {
    updateCartCountLocal();
    if (document.getElementById('cart-widget-count')) {
        updateCartWidgetCountLocal();
    }
    displayCartLocal();
});


/*************************************************
 * 2. FUNKCJE OBSŁUGUJĄCE DODAWANIE DO KOSZYKA (API)
 *************************************************/

// Funkcja dodająca produkt do koszyka (API)
async function addToCart(productId) {
    const userId = localStorage.getItem('userId');
    const quantity = 1;
    if (!userId) {
        alert('Musisz być zalogowany, aby dodać do koszyka.');
        return;
    }
    if (!productId) {
        alert('Brak ID produktu');
        return;
    }
    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, productId, quantity })
        });
        if (!response.ok) {
            const err = await response.json();
            alert(err.message || 'Błąd przy dodawaniu do koszyka');
            return;
        }
        const data = await response.json();
        console.log('Odpowiedź z API:', data);
        if (!data.updatedProduct) {
            console.warn("Brak pola updatedProduct w odpowiedzi z API");
            return;
        }
        // Zamiast aktualizować tylko pojedynczy element, wykonaj ponowne renderowanie listy produktów
        refreshProductList();
        updateCartWidgetCount();
        showNotification('Dodano do koszyka!');
    } catch (error) {
        console.error('Błąd przy dodawaniu do koszyka (API):', error);
    }
}

// Funkcja, która pobiera z API listę produktów i renderuje je ponownie
async function refreshProductList() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const products = await response.json();
        const productList = document.getElementById('product-list');
        productList.innerHTML = ''; // Czyścimy listę
        products.forEach(product => {
            if (product.available) {
                const productItem = document.createElement('div');
                productItem.className = 'product-item';
                productItem.setAttribute('data-id', product._id.toString());
                productItem.innerHTML = `
                    <h3>${product.name}</h3>
                    <p class="product-quantity">Ilość dostępna: ${product.quantity}</p>
                    <img src="/images/${product.image}.webp" alt="${product.name}">
                    <button class="add-to-cart-btn" onclick="addToCart('${product._id}')">
                        Dodaj do koszyka
                    </button>
                `;
                productList.appendChild(productItem);
            }
        });
        console.log("Lista produktów została odświeżona");
    } catch (error) {
        console.error('Błąd przy odświeżaniu listy produktów:', error);
    }
}

// Funkcja aktualizująca koszyk z bazy (aktualizacja licznika)
function updateCart() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    fetch(`/api/cart/${userId}`)
        .then(response => response.json())
        .then(cartItems => {
            const cartCountElem = document.getElementById('cart-count');
            if (cartCountElem) {
                const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
                cartCountElem.textContent = totalQuantity;
            }
        })
        .catch(error => {
            console.error('Błąd przy aktualizacji koszyka:', error);
        });
}

// Funkcja wywoływana przez addToCart, aby zaktualizować widżet koszyka
function updateCartWidgetCount() {
    updateCart();
}

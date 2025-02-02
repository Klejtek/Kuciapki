/*************************************************
 * 1. STARE FUNKCJE oparte na localStorage        *
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
    showNotification();
}

// Funkcja lokalna do aktualizacji licznika (localStorage)
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

// Funkcja lokalna do wyświetlania zawartości koszyka (localStorage)
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

// Funkcja lokalna do wysyłania zamówienia (localStorage)
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

    // Dodajemy zamówienie wraz z nazwą użytkownika
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

// Inicjalizacja koszyka (LOCAL)
document.addEventListener('DOMContentLoaded', () => {
    updateCartCountLocal();
    if (document.getElementById('cart-widget-count')) {
        updateCartWidgetCountLocal();
    }
    displayCartLocal();
});

/*************************************************
 * 2. NOWA FUNKCJA – obsługa dodania do koszyka   *
 *    z BAZY (API) i od razu zmniejszanie ilości  *
 *************************************************/

// Nowa funkcja dodawania produktu do koszyka (API)
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

        const { updatedProduct } = await response.json();
        console.log('Dodano do koszyka (API):', updatedProduct);

        // Aktualizacja widoku produktu
        updateProductDOM(updatedProduct);
        // Aktualizacja licznika koszyka
        updateCartWidgetCount();

        // Opcjonalnie: jeśli ilość produktu spadnie do 0, usuń element z DOM
        if (updatedProduct.quantity <= 0) {
            const elem = document.querySelector(`.product-item[data-id="${updatedProduct._id}"]`);
            if (elem) elem.remove();
        }

        showNotification('Dodano do koszyka!');
    } catch (error) {
        console.error('Błąd przy dodawaniu do koszyka (API):', error);
    }
}

// Funkcja do aktualizacji widocznej ilości produktu w DOM (API)
function updateProductDOM(updatedProduct) {
    // Konwertuj _id do stringa, aby mieć pewność, że typ jest zgodny
    const productId = updatedProduct._id.toString();
    // Używamy selektora opartego na atrybucie data-id
    const productElement = document.querySelector(`.product-item[data-id="${productId}"]`);
    if (productElement) {
        const quantityElement = productElement.querySelector('.product-quantity');
        if (quantityElement) {
            quantityElement.textContent = `Ilość dostępna: ${updatedProduct.quantity}`;
            console.log("Zaktualizowano ilość produktu w DOM dla id", productId, "na:", updatedProduct.quantity);
        } else {
            console.warn("Nie znaleziono elementu .product-quantity dla produktu", productId);
        }
        // Jeśli ilość produktu spadnie do 0, zablokuj przycisk
        if (updatedProduct.quantity <= 0) {
            const btn = productElement.querySelector('.add-to-cart-btn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Niedostępne';
            }
        }
    } else {
        console.warn("Nie znaleziono elementu .product-item dla data-id:", productId);
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

// Funkcja wywoływana przez addToCart w celu aktualizacji widżetu koszyka
function updateCartWidgetCount() {
    // Używamy funkcji updateCart, która aktualizuje licznik
    updateCart();
}

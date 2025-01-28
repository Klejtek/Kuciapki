//--------------------------------------------------------
// script.js
//--------------------------------------------------------

// Sprawdzamy, czy użytkownik jest zalogowany (localStorage -> userId)
function getLoggedUserId() {
    return localStorage.getItem('userId');
}

// ---------------- Logowanie ----------------
async function login(username, password) {
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json();
            alert(err.message || 'Błąd logowania');
            return;
        }
        const data = await res.json();
        localStorage.setItem('userId', data.userId);   // zapamiętujemy identyfikator użytkownika
        localStorage.setItem('username', data.username);
        alert('Zalogowano!');
        // Przekierowanie albo odświeżenie strony
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Błąd logowania:', error);
    }
}

// ---------------- Wylogowanie ----------------
function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    alert('Wylogowano!');
    window.location.href = '/login.html';
}

// ---------------- Pobranie listy produktów ----------------
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        // Wyświetlamy je np. w <div id="products">
        const productsDiv = document.getElementById('products');
        if (!productsDiv) return;

        productsDiv.innerHTML = '';
        products.forEach(prod => {
            // Każdy produkt: nazwa, ilość w magazynie, przycisk "Dodaj do koszyka"
            const div = document.createElement('div');
            div.innerHTML = `
                <h3>${prod.name}</h3>
                <p>Ilość w magazynie: ${prod.quantity}</p>
                <button onclick="addToCart('${prod._id}')">Dodaj do koszyka</button>
            `;
            productsDiv.appendChild(div);
        });
    } catch (error) {
        console.error('Błąd przy wczytywaniu produktów:', error);
    }
}

// ---------------- Dodawanie do koszyka ----------------
async function addToCart(productId) {
    const userId = getLoggedUserId();
    if (!userId) {
        alert('Musisz być zalogowany, aby dodać do koszyka.');
        return;
    }

    // Możemy ustawić "na sztywno" quantity = 1 lub pobierać z inputa
    const quantity = 1;

    try {
        const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, productId, quantity })
        });
        if (!res.ok) {
            const err = await res.json();
            alert(err.message || 'Błąd podczas dodawania do koszyka');
            return;
        }
        alert('Dodano do koszyka!');
        updateCartCount(); // odśwież widoczny licznik koszyka, jeśli masz
    } catch (error) {
        console.error('Błąd podczas dodawania do koszyka:', error);
    }
}

// ---------------- Wyświetlanie koszyka ----------------
async function displayCart() {
    const userId = getLoggedUserId();
    if (!userId) {
        alert('Musisz być zalogowany, aby zobaczyć koszyk!');
        return;
    }

    try {
        const res = await fetch(`/api/cart/${userId}`);
        if (!res.ok) {
            const err = await res.json();
            alert(err.message || 'Błąd przy pobieraniu koszyka');
            return;
        }
        const cartItems = await res.json();

        const cartList = document.getElementById('cart-items');
        if (!cartList) return;
        cartList.innerHTML = '';

        if (cartItems.length === 0) {
            cartList.innerHTML = '<li>Koszyk jest pusty</li>';
            return;
        }

        cartItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.productId.name} (x${item.quantity})`;
            cartList.appendChild(li);
        });
    } catch (error) {
        console.error('Błąd przy wyświetlaniu koszyka:', error);
    }
}

// ---------------- Składanie zamówienia ----------------
async function sendOrder() {
    const userId = getLoggedUserId();
    if (!userId) {
        alert('Musisz być zalogowany, aby złożyć zamówienie.');
        return;
    }

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();

        if (!res.ok) {
            // np. brak towaru w magazynie
            alert(data.message || 'Błąd przy składaniu zamówienia');
            return;
        }
        alert('Zamówienie zostało złożone!');
        displayCart(); // odśwież koszyk (teraz powinien być pusty)
    } catch (error) {
        console.error('Błąd przy składaniu zamówienia:', error);
    }
}

// ---------------- (Opcjonalnie) Licznik produktów w koszyku ----------------
async function updateCartCount() {
    const userId = getLoggedUserId();
    if (!userId) {
        document.getElementById('cart-count').textContent = '0';
        return;
    }

    try {
        const res = await fetch(`/api/cart/${userId}`);
        if (!res.ok) return;
        const cartItems = await res.json();
        const total = cartItems.reduce((acc, item) => acc + item.quantity, 0);
        document.getElementById('cart-count').textContent = total;
    } catch (error) {
        console.error('Błąd przy updateCartCount:', error);
    }
}

// Wywołania początkowe po załadowaniu strony, np.:
document.addEventListener('DOMContentLoaded', () => {
    // Jeśli to index.html, możesz wczytać listę produktów
    if (document.getElementById('products')) {
        loadProducts();
    }
    // Jeśli to cart.html, możesz wczytać koszyk
    if (document.getElementById('cart-items')) {
        displayCart();
    }
    // itp.
    updateCartCount();
});

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

// Funkcja lokalna do aktualizacji licznika
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

// Funkcja lokalna do wyświetlania zawartości koszyka
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

// Funkcja lokalna do wysyłania zamówienia
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
function showNotification() {
    const notification = document.getElementById('floating-notification');
    if (notification) {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Widget count (local) – stary
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

// Nowa funkcja dodawania produktu do koszyka (z bazy, od razu odejmujemy quantity)
async function addToCart(productId) {
    const userId = localStorage.getItem('userId');
    const quantityInput = document.getElementById(`quantity-${productId}`);
    let quantity = 1; // domyślnie 1

    if (quantityInput) {
        quantity = parseInt(quantityInput.value);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Nieprawidłowa ilość');
            return;
        }
    }

    if (!userId) {
        alert('Musisz być zalogowany, aby dodać do koszyka (API).');
        return;
    }
    if (!productId) {
        alert('Brak ID produktu');
        return;
    }

    try {
        // Wysyłamy żądanie do /api/cart, które (w nowej wersji server.js)
        // od razu odejmuje ilość z product.quantity
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

        // Otrzymamy obiekt np. { cartItem, updatedProduct }
        const data = await response.json();
        console.log('Dodano do koszyka (API):', data);

        // Możesz zaktualizować koszyk w DOM (np. updateCart())
        updateCart(); 

        // Zaktualizuj stan produktu w DOM – np. odejmij od "Ilość dostępna"
        // JEŚLI endpoint /api/cart zwraca updatedProduct,
        // musimy najpierw server.js tak zmienić, by to zwracał.
        // O ile w tym momencie jeszcze tego nie ma, to w kodzie poniżej
        // zaprezentuję, jak by to wyglądało:
        // if (data.updatedProduct) {
        //     updateProductDOM(data.updatedProduct);
        // }

    } catch (error) {
        console.error('Błąd przy dodawaniu do koszyka (API):', error);
    }
}

// Funkcja do aktualizacji koszyka z bazy
function updateCart() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`/api/cart/${userId}`)
        .then(response => response.json())
        .then(cartItems => {
            // Wstaw do elementu HTML z ID "cart-items" (o ile jesteś na cart.html)
            const cartList = document.getElementById('cart-items');
            if (!cartList) return; // nie każda strona ma #cart-items

            cartList.innerHTML = ''; // Wyczyść aktualny widok koszyka

            let totalQuantity = 0;
            cartItems.forEach(item => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `${item.productId.name} - Ilość: ${item.quantity}`;
                cartList.appendChild(listItem);

                totalQuantity += item.quantity; 
            });

            // Aktualizacja licznika koszyka w nagłówku
            const cartCountElem = document.getElementById('cart-count');
            if (cartCountElem) {
                cartCountElem.textContent = totalQuantity;
            }
        })
        .catch(error => {
            console.error('Błąd przy pobieraniu koszyka (API):', error);
        });
}

// Przykładowa funkcja do aktualizacji wyświetlanej ilości na liście produktów
// (JEŚLI endpoint zwraca updatedProduct)
function updateProductDOM(updatedProduct) {
    // Szukamy elementu z data-id="..."
    const productElem = document.querySelector(`.product-item[data-id="${updatedProduct._id}"]`);
    if (!productElem) return;

    // Jeśli masz w HTML np. <p class="product-quantity">Ilość dostępna: X</p>
    const qtyElem = productElem.querySelector('.product-quantity');
    if (qtyElem) {
        qtyElem.textContent = `Ilość dostępna: ${updatedProduct.quantity}`;
    }

    // Jeśli spadło do 0 -> blokujemy przycisk lub usuwamy produkt
    if (updatedProduct.quantity <= 0) {
        const addBtn = productElem.querySelector('.add-to-cart-btn');
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.textContent = 'Niedostępne';
        }
        // productElem.remove(); // ewentualnie usuwamy z listy
    }
}

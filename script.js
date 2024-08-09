document.addEventListener('DOMContentLoaded', function() {
    // Ustawienie globalnych funkcji dostępnych na stronie
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.displayCart = displayCart;
    window.updateCartCount = updateCartCount;
    window.clearCart = clearCart;

    function getCartKey() {
        const username = localStorage.getItem('username');
        console.log(`Cart key for user ${username}: cart_${username}`);
        return `cart_${username}`;
    }

    function displayUserGreeting() {
        const username = localStorage.getItem('username');
        if (username) {
            const userGreetingElement = document.getElementById('user-greeting');
            if (userGreetingElement) {
                userGreetingElement.textContent = `Zalogowany jako: ${username}`;
            }
        }
    }

    function logout() {
        localStorage.removeItem('username');
        window.location.href = 'login.html'; // Przekierowanie na stronę logowania
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (username && password) {
                let users = JSON.parse(localStorage.getItem('users')) || [];
                const user = users.find(user => user.username === username && user.password === password);

                if (user) {
                    localStorage.setItem('username', username);
                    alert('Zalogowano jako ' + username);
                    window.location.href = 'index.html'; // Przekierowanie na stronę główną
                } else {
                    alert('Nieprawidłowy login lub hasło!');
                }
            }
        });
    }

    window.addEventListener('load', function() {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const defaultUsers = [
            { username: 'MKL', password: '12345' },
            { username: 'MKL2', password: '12345' }
        ];

        defaultUsers.forEach(defaultUser => {
            if (!users.some(user => user.username === defaultUser.username)) {
                users.push(defaultUser);
            }
        });

        localStorage.setItem('users', JSON.stringify(users));
    });

    function addToCart(productName) {
        const cartKey = getCartKey();
        let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        console.log('Adding product:', productName);

        let product = cart.find(item => item.name === productName);
        if (product) {
            product.quantity++;
            console.log(`Increased quantity for ${productName} to ${product.quantity}`);
        } else {
            cart.push({ name: productName, quantity: 1 });
            console.log(`Added new product to cart: ${productName}`);
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));
        console.log('Updated cart:', cart);
        updateCartCount();
    }

    function updateCartCount() {
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = count;
        }
        console.log('Updated cart count:', count);
    }

    function displayCart() {
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        console.log('Display Cart - Current cart content:', cart);

        const cartItemsContainer = document.getElementById('cart-items');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';

            cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.classList.add('cart-item');
                cartItem.innerHTML = `
                    <p>${item.name} - ilość: ${item.quantity}</p>
                    <button onclick="window.removeFromCart(${index})">Usuń</button>
                `;
                cartItemsContainer.appendChild(cartItem);
            });

            const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
            const totalQuantityElement = document.getElementById('total-quantity');
            if (totalQuantityElement) {
                totalQuantityElement.textContent = totalQuantity;
            }
            console.log('Displayed cart with total quantity:', totalQuantity);
        }
    }

    function removeFromCart(index) {
        const cartKey = getCartKey();
        let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        console.log(`Removing product at index ${index} from cart`);

        cart.splice(index, 1);
        localStorage.setItem(cartKey, JSON.stringify(cart));
        console.log('Updated cart after removal:', cart);

        displayCart();
        updateCartCount();
    }

    function clearCart() {
        const cartKey = getCartKey();
        console.log('Clearing cart for key:', cartKey);

        localStorage.removeItem(cartKey);
        displayCart();
        updateCartCount();
    }

    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', function(event) {
            const cartKey = getCartKey();
            const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
            const products = cart.map(item => `${item.name} (ilość: ${item.quantity})`).join(', ');
            const total = cart.reduce((sum, item) => sum + item.quantity, 0);

            document.getElementById('form-products').value = products;
            document.getElementById('form-total').value = total;

            // Wypełnienie ukrytego pola loginem użytkownika jako fikcyjny email
            const username = localStorage.getItem('username');
            const fakeEmail = `${username}@example.com`;  // Fikcyjny email
            document.getElementById('user-email').value = fakeEmail;

            console.log('Order submitted with products:', products);
            console.log('Total products:', total);
            console.log('User:', username);

            // Wyczyść koszyk po wysłaniu zamówienia
            clearCart();
        });
    }

    // Obsługa przycisku wylogowania
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Wywołanie funkcji po załadowaniu strony
    displayUserGreeting();
    displayCart();
    updateCartCount();
});

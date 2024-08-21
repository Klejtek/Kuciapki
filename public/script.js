document.addEventListener('DOMContentLoaded', function() {
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.displayCart = displayCart;
    window.updateCartCount = updateCartCount;
    window.clearCart = clearCart;

    function getCartKey() {
        const username = localStorage.getItem('username');
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
        window.location.href = 'login.html';
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

                    if (username === 'MKL') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    alert('Nieprawidłowy login lub hasło!');
                }
            }
        });
    }

    window.addEventListener('load', function() {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const defaultUsers = [
            { username: 'ASZ', password: 'wPo3lN2m' },
            { username: 'DAD', password: 'k8Aq7P4r' },
            { username: 'MKL', password: '12345' }
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

        let product = cart.find(item => item.name === productName);
        if (product) {
            product.quantity++;
        } else {
            cart.push({ name: productName, quantity: 1 });
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateCartCount();
        showNotification('Dodano do koszyka');
    }

    function updateCartCount() {
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountElement = document.getElementById('cart-count');
        const floatingCartCountElement = document.getElementById('floating-cart-count');

        if (cartCountElement) {
            cartCountElement.textContent = count;
        }
        if (floatingCartCountElement) {
            floatingCartCountElement.textContent = count;
        }

        checkCartVisibility();
    }

    function displayCart() {
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

        const cartItemsContainer = document.getElementById('cart-items');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';

            cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.classList.add('cart-item');
                cartItem.style.display = 'flex';
                cartItem.style.alignItems = 'center';

                let imageName = item.name.toLowerCase().replace(/ /g, '-').replace(/&/g, 'and');

                const productImage = document.createElement('img');
                productImage.src = `images/${imageName}.webp`;
                productImage.alt = item.name;
                productImage.style.width = '50px';
                productImage.style.height = '50px';
                productImage.style.marginRight = '10px';

                const productInfo = document.createElement('p');
                productInfo.textContent = `${item.name} - ilość: ${item.quantity}`;

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Usuń';
                removeButton.onclick = () => removeFromCart(index);

                cartItem.appendChild(productImage);
                cartItem.appendChild(productInfo);
                cartItem.appendChild(removeButton);
                cartItemsContainer.appendChild(cartItem);
            });

            const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
            const totalQuantityElement = document.getElementById('total-quantity');
            if (totalQuantityElement) {
                totalQuantityElement.textContent = totalQuantity;
            }
        }
    }

    function removeFromCart(index) {
        const cartKey = getCartKey();
        let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

        cart.splice(index, 1);
        localStorage.setItem(cartKey, JSON.stringify(cart));

        displayCart();
        updateCartCount();
    }

    function clearCart() {
        const cartKey = getCartKey();
        localStorage.removeItem(cartKey);
        displayCart();
        updateCartCount();
    }

    // Zaktualizowana funkcja submitOrder do wysyłania zamówień na serwer
    function submitOrder() {
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

        const username = localStorage.getItem('username') || 'Anonimowy użytkownik';
        const orderData = {
            customerName: username,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity
            }))
        };

        // Wyślij zamówienie do serwera za pomocą fetch
      fetch('https://kuciapki.onrender.com/orders', {  // Zamień na właściwy URL twojego API na Renderze
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
})

        .then(response => {
            if (!response.ok) {
                throw new Error('Błąd sieci');
            }
            return response.json();
        })
        .then(data => {
            console.log('Zamówienie zostało złożone!', data);
            clearCart(); // Opróżnij koszyk po złożeniu zamówienia
            alert('Zamówienie zostało złożone!');
        })
        .catch(error => {
            console.error('Błąd podczas składania zamówienia:', error);
            alert('Wystąpił błąd podczas składania zamówienia.');
        });
    }

    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Zablokowanie domyślnego zachowania formularza
            submitOrder(); // Wysłanie zamówienia do serwera
        });
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    displayUserGreeting();
    displayCart();
    updateCartCount();

    function logoutUser() {
        alert('Twoja sesja wygasła. Zostaniesz teraz wylogowany.');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    }

    let logoutTimer;
    let remainingTime = 15 * 60;

    function resetLogoutTimer() {
        clearTimeout(logoutTimer);
        remainingTime = 15 * 60;
        updateTimerDisplay();
        logoutTimer = setTimeout(logoutUser, remainingTime * 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const timeDisplay = document.getElementById('time-remaining');
        if (timeDisplay) {
            timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    setInterval(function() {
        if (remainingTime > 0) {
            remainingTime--;
            updateTimerDisplay();
        }
    }, 1000);

    window.addEventListener('mousemove', resetLogoutTimer);
    window.addEventListener('keydown', resetLogoutTimer);
    window.addEventListener('scroll', resetLogoutTimer);
    window.addEventListener('click', resetLogoutTimer);

    resetLogoutTimer();

    function showNotification(message) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');

        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.style.display = 'flex';
            notification.style.opacity = '1';

            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 500);
            }, 3000);
        }
    }

    function checkCartVisibility() {
        const cartCountElement = document.getElementById('cart-count');
        const floatingCart = document.getElementById('floating-cart');

        if (!cartCountElement || !floatingCart) {
            return;
        }

        const rect = cartCountElement.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > window.innerHeight) {
            floatingCart.style.display = 'block';
        } else {
            floatingCart.style.display = 'none';
        }
    }

    window.addEventListener('scroll', function() {
        checkCartVisibility();
    });
});

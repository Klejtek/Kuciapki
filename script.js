document.addEventListener('DOMContentLoaded', function() {
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.displayCart = displayCart;
    window.updateCartCount = updateCartCount;
    window.clearCart = clearCart;

    async function getSessionUsername() {
        try {
            const response = await fetch('https://twoj-serwer.onrender.com/session-username');  // Zamień na właściwy URL twojego API na Renderze
            if (response.ok) {
                const { username } = await response.json();
                return username;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Błąd podczas pobierania nazwy użytkownika:', error);
            return null;
        }
    }

    async function displayUserGreeting() {
        const username = await getSessionUsername();
        const userGreetingElement = document.getElementById('user-greeting');
        if (username && userGreetingElement) {
            userGreetingElement.textContent = `Zalogowany jako: ${username}`;
        }
    }

    async function logout() {
        try {
            await fetch('https://twoj-serwer.onrender.com/logout', { method: 'POST' });
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Błąd podczas wylogowywania:', error);
        }
    }

    async function addToCart(productName) {
        const username = await getSessionUsername();
        if (!username) {
            alert('Zaloguj się przed dodaniem do koszyka!');
            return;
        }

        const cartKey = `cart_${username}`;
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

    async function updateCartCount() {
        const username = await getSessionUsername();
        const cartKey = `cart_${username}`;
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

    async function displayCart() {
        const username = await getSessionUsername();
        const cartKey = `cart_${username}`;
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

    async function removeFromCart(index) {
        const username = await getSessionUsername();
        const cartKey = `cart_${username}`;
        let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

        cart.splice(index, 1);
        localStorage.setItem(cartKey, JSON.stringify(cart));

        displayCart();
        updateCartCount();
    }

    async function clearCart() {
        const username = await getSessionUsername();
        const cartKey = `cart_${username}`;
        localStorage.removeItem(cartKey);
        displayCart();
        updateCartCount();
    }

    async function submitOrder() {
        const username = await getSessionUsername();
        if (!username) {
            alert('Zaloguj się przed złożeniem zamówienia!');
            return;
        }

        const cartKey = `cart_${username}`;
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        const orderData = {
            customerName: username,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity
            }))
        };

        fetch('https://twoj-serwer.onrender.com/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        })
        .then(response => response.json())
        .then(data => {
            clearCart();
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
            event.preventDefault();
            submitOrder();
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
        logout();
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

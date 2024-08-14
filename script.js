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
            { username: 'ASZ', password: 'wPo3lN2m' },
            { username: 'DAD', password: 'k8Aq7P4r' },
            { username: 'BAN', password: 'L6r9Gq5T' },
            { username: 'GWK', password: 'yZ1p3O6a' },
            { username: 'WPT', password: 'J8w6Lr4U' },
            { username: 'GAK', password: 't3A9kQ2M' },
            { username: 'IZKA', password: 'M5s7Yp4R' },
            { username: 'KBU', password: 'P4k8Tq3W' },
            { username: 'DAF', password: 'Z6j2p7VQ' },
            { username: 'SMA', password: 'R8m1p5Tq' },
            { username: 'LUC', password: 'W7t9Q2mK' },
            { username: 'KMC', password: 'X3v6Pq7A' },
            { username: 'MBR', password: 'H9t2L8wQ' },
            { username: 'RSY', password: 'G6m8R4kP' },
            { username: 'MML', password: 'J5w9K7pT' },
            { username: 'OBR', password: 'T8k3Yq2L' },
            { username: 'DIMA', password: 'K4p7M9rQ' },
            { username: 'DAGA', password: 'Q2m6J8tP' },
            { username: 'KAD', password: 'N5r9L4tQ' },
            { username: 'JBL', password: 'V7q3P6kM' },
            { username: 'JBL 2', password: 'L8t2Q5wK' },
            { username: 'JBL 3', password: 'Y9m4P7rT' },
            { username: 'CHM', password: 'Q6p1L8kM' },
            { username: 'MAL', password: 'R5t9K3wQ' },
            { username: 'NAD', password: 'Z7m2P4qT' },
            { username: 'PVI', password: 'X8t6Q2mK' },
            { username: 'VLR', password: 'K9p5L7rT' },
            { username: 'KBL', password: 'T3w8Q6pM' },
            { username: 'PMA', password: 'W4m9P2kT' },
            { username: 'CCA', password: 'Q7k3T5pL' },
            { username: 'JGO', password: 'P6m4L8rQ' }
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

        // Pokaż powiadomienie
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

        console.log('Updated cart count:', count);
        checkCartVisibility(); // Sprawdzenie widoczności licznika
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
                cartItem.style.display = 'flex';
                cartItem.style.alignItems = 'center';

                let imageName = item.name.toLowerCase().replace(/ /g, '-').replace(/&/g, 'and');

                // Dodanie miniaturki zdjęcia
                const productImage = document.createElement('img');
                productImage.src = `images/${imageName}.webp`; // Nazwa obrazka na podstawie zmodyfikowanej nazwy produktu
                productImage.alt = item.name;
                productImage.style.width = '50px';
                productImage.style.height = '50px';
                productImage.style.marginRight = '10px';

                // Dodanie tekstu z nazwą i ilością
                const productInfo = document.createElement('p');
                productInfo.textContent = `${item.name} - ilość: ${item.quantity}`;

                // Dodanie przycisku usuwania
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
            event.preventDefault(); // Zapobiega domyślnemu wysłaniu formularza

            const cartKey = getCartKey();
            const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
            const products = cart.map(item => `${item.name} (ilość: ${item.quantity})`).join(', ');
            const total = cart.reduce((sum, item) => sum + item.quantity, 0);

            document.getElementById('form-products').value = products;
            document.getElementById('form-total').value = total;

            const username = localStorage.getItem('username');
            const fakeEmail = `${username}@example.com`;  // Fikcyjny email
            document.getElementById('user-email').value = fakeEmail;

            console.log('Order submitted with products:', products);
            console.log('Total products:', total);
            console.log('User:', username);

            // Wyczyść koszyk po wysłaniu zamówienia
            clearCart();

            // Wysyłanie zamówienia do API
            sendOrderToAPI(username, cart);
        });
    }

    function sendOrderToAPI(username, cart) {
        fetch('http://192.168.55.124:3000/api/orders', {  // Zastąp 'YOUR_SERVER_IP' rzeczywistym IP serwera
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerName: username,
                items: cart
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Order sent to API:', data);
            showNotification('Zamówienie zostało wysłane!');
        })
        .catch(error => {
            console.error('Error sending order to API:', error);
            showNotification('Błąd podczas wysyłania zamówienia.');
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

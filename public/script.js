document.addEventListener('DOMContentLoaded', function() {
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.displayCart = displayCart;
    window.updateCartCount = updateCartCount;
    window.clearCart = clearCart;

    async function getCart() {
        const token = localStorage.getItem('token');
        const response = await fetch('https://kuciapki.onrender.com/api/cart', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    }

    async function addToCart(productName) {
        const token = localStorage.getItem('token');
        const response = await fetch('https://kuciapki.onrender.com/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productName })
        });

        const result = await response.json();
        if (response.ok) {
            updateCartCount(result.cart);
            showNotification('Dodano do koszyka');
        } else {
            alert(result.message || 'Wystąpił problem z dodaniem produktu do koszyka.');
        }
    }

    async function removeFromCart(index) {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://kuciapki.onrender.com/api/cart/${index}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            displayCart();
            updateCartCount([]);
        } else {
            alert('Nie udało się usunąć produktu z koszyka.');
        }
    }

    function updateCartCount(cart) {
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
        const cart = await getCart();
        const cartItemsContainer = document.getElementById('cart-items');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';

            cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.classList.add('cart-item');
                cartItem.style.display = 'flex';
                cartItem.style.alignItems = 'center';

                let imageName = item.productName.toLowerCase().replace(/ /g, '-').replace(/&/g, 'and');

                const productImage = document.createElement('img');
                productImage.src = `images/${imageName}.webp`;
                productImage.alt = item.productName;
                productImage.style.width = '50px';
                productImage.style.height = '50px';
                productImage.style.marginRight = '10px';

                const productInfo = document.createElement('p');
                productInfo.textContent = `${item.productName} - ilość: ${item.quantity}`;

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

    async function clearCart() {
        const token = localStorage.getItem('token');
        await fetch('https://kuciapki.onrender.com/api/cart', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        displayCart();
        updateCartCount([]);
    }

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

    displayCart();
});

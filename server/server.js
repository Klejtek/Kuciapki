//--------------------------------------------------------
// server.js
//--------------------------------------------------------
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// -- Połączenie z MongoDB
// UWAGA: Dane połączenia (wraz z użytkownikiem/hasłem) najlepiej umieszczać w zmiennych środowiskowych
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://michalklejnocki:Madafaka%2C123@cluster0.rvmfx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Ustawienie katalogu na pliki statyczne (CSS, JS, images)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware do ustawienia Content-Type dla plików CSS (opcjonalne, express.static zwykle to robi)
app.get('*.css', (req, res, next) => {
    res.set('Content-Type', 'text/css');
    next();
});


//--------------------------------------------------------
// MODELE MONGOOSE
//--------------------------------------------------------

// Model Produktu (tylko jeden w całym projekcie!)
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    available: { type: Boolean, default: true },
    quantity: { type: Number, default: 0 },
    // Dodatkowe pola, np. price, description, image, można dodać później.
});
const Product = mongoose.model('Product', productSchema);

// Model Użytkownika
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', userSchema);

// Model Koszyka
const cartItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 }
});
const Cart = mongoose.model('Cart', cartItemSchema);

// Model Zamówienia
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true }
        }
    ],
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);


//--------------------------------------------------------
// ENDPOINTY API (Produkty, Koszyk, Zamówienia, Użytkownicy)
//--------------------------------------------------------

// ------ Produkty ------

// Pobieranie wszystkich produktów
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching products', error });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, available, quantity } = req.body;
    try {
        const newProduct = new Product({ name, available, quantity });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error adding product', error });
    }
});

// Admin – aktualizacja pola available i quantity
app.put('/api/products/:id', async (req, res) => {
    console.log('REQUEST BODY:', req.body); // Debug
    const { id } = req.params;
    const { available, quantity } = req.body;
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { available, quantity },
            { new: true }  // zwraca zaktualizowany dokument
        );
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error updating product', error });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Product.findByIdAndDelete(id);
        res.status(200).json({ message: 'Product deleted' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting product', error });
    }
});

// ------ Koszyk ------

/*
  POST /api/cart:
  - Sprawdza dostępność produktu,
  - Odejmuje ilość z magazynu,
  - Dodaje lub aktualizuje element w koszyku,
  - Zwraca zaktualizowany produkt (do natychmiastowej aktualizacji DOM).
*/
app.post('/api/cart', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    try {
        // 1. Znajdź produkt
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Nie znaleziono produktu' });
        }

        // 2. Sprawdź stan magazynu
        if (product.quantity < quantity) {
            return res.status(400).json({
                message: `Brak wystarczającej ilości produktu: ${product.name}`
            });
        }

        // 3. Odejmij ilość z magazynu
        product.quantity -= quantity;
        await product.save();

        // 4. Dodaj/aktualizuj item w koszyku
        let cartItem = await Cart.findOne({ userId, productId });
        if (cartItem) {
            cartItem.quantity += quantity;
        } else {
            cartItem = new Cart({ userId, productId, quantity });
        }
        await cartItem.save();

        // 5. Zwróć element koszyka oraz zaktualizowany produkt
        res.status(200).json({
            cartItem,
            updatedProduct: product
        });
    } catch (error) {
        console.error('Błąd w POST /api/cart:', error);
        res.status(500).json({ message: 'Error adding product to cart', error });
    }
});

// Pobieranie koszyka dla danego użytkownika
app.get('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const cartItems = await Cart.find({ userId }).populate('productId');
        return res.status(200).json(cartItems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart', error });
    }
});

/*
  DELETE /api/cart/:userId/:productId:
  - Znajduje element w koszyku,
  - Przywraca usuniętą ilość do stanu magazynowego,
  - Usuwa element z koszyka,
  - Zwraca zaktualizowany produkt, aby natychmiast zaktualizować widok.
*/
app.delete('/api/cart/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    try {
        // Znajdź pozycję w koszyku
        const cartItem = await Cart.findOne({ userId, productId });
        if (!cartItem) {
            return res.status(404).json({ message: 'Produkt nie został znaleziony w koszyku' });
        }

        // Przywróć ilość produktu w magazynie
        const product = await Product.findById(productId);
        if (product) {
            product.quantity += cartItem.quantity;
            await product.save();
        }

        // Usuń element z koszyka
        await Cart.findOneAndDelete({ userId, productId });
        res.status(200).json({ message: 'Produkt został usunięty z koszyka', updatedProduct: product });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas usuwania produktu z koszyka', error });
    }
});

// Czyszczenie koszyka – dla każdego elementu przywracamy ilość
app.delete('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const cartItems = await Cart.find({ userId });
        for (const item of cartItems) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.quantity += item.quantity;
                await product.save();
            }
        }
        await Cart.deleteMany({ userId });
        res.status(200).json({ message: 'Koszyk został wyczyszczony' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas czyszczenia koszyka', error });
    }
});

// ------ Użytkownicy ------

app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const newUser = new User({ username, password, role });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ message: 'Error adding user', error });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching users', error });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User deleted' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting user', error });
    }
});

// Logowanie
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło' });
        }
        // Zwracamy userId, username i role – front może to zapisać (np. w localStorage)
        res.status(200).json({ userId: user._id, username: user.username, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas logowania', error });
    }
});

// ------ Zamówienia (Order) ------

app.post('/api/orders', async (req, res) => {
    const { userId } = req.body;
    try {
        // 1. Pobierz pozycje koszyka
        const cartItems = await Cart.find({ userId });
        if (cartItems.length === 0) {
            return res.status(400).json({ message: 'Koszyk jest pusty' });
        }

        // 2. Sprawdź, czy produkty w koszyku mają wystarczającą ilość w magazynie
        for (const cartItem of cartItems) {
            const product = await Product.findById(cartItem.productId);
            if (!product) {
                return res.status(404).json({ message: 'Nie znaleziono produktu w bazie' });
            }
            if (product.quantity < cartItem.quantity) {
                return res.status(400).json({ message: `Brak wystarczającej ilości produktu: ${product.name}` });
            }
        }

        // 3. Tworzymy zamówienie
        const order = new Order({
            userId,
            products: cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity
            }))
        });
        await order.save();

        // 4. Zmniejszamy ilości w magazynie (dla każdego elementu w koszyku)
        for (const cartItem of cartItems) {
            const product = await Product.findById(cartItem.productId);
            product.quantity -= cartItem.quantity;
            await product.save();
        }

        // 5. Czyścimy koszyk
        await Cart.deleteMany({ userId });
        res.status(200).json({ message: 'Zamówienie zostało złożone', order });
    } catch (error) {
        res.status(500).json({ message: 'Wystąpił błąd podczas składania zamówienia', error });
    }
});

// Pobieranie zamówień o statusie "pending"
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find({ status: 'pending' })
            .populate('products.productId')
            .populate('userId');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error });
    }
});

// Przeniesienie zamówienia do "completed"
app.post('/api/orders/:id/complete', async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Zamówienie nie znalezione' });
        }
        order.status = 'completed';
        await order.save();
        res.status(200).json({ message: 'Zamówienie przeniesione do zrealizowanych' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas przenoszenia zamówienia', error });
    }
});

// Pobieranie zamówień "completed"
app.get('/api/orders/completed', async (req, res) => {
    try {
        const completedOrders = await Order.find({ status: 'completed' })
            .populate('products.productId')
            .populate('userId');
        res.status(200).json(completedOrders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching completed orders', error });
    }
});

// Przeniesienie zamówienia do "paid"
app.post('/api/orders/:id/pay', async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Zamówienie nie znalezione' });
        }
        order.status = 'paid';
        await order.save();
        res.status(200).json({ message: 'Zamówienie przeniesione do opłaconych' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas przenoszenia zamówienia do opłaconych', error });
    }
});

// Pobieranie zamówień "paid"
app.get('/api/orders/paid', async (req, res) => {
    try {
        const paidOrders = await Order.find({ status: 'paid' })
            .populate('products.productId')
            .populate('userId');
        res.status(200).json(paidOrders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching paid orders', error });
    }
});

// Usuwanie zamówienia
app.delete('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Zamówienie nie znalezione' });
        }
        await Order.deleteOne({ _id: id });
        console.log(`Zamówienie o ID ${id} zostało usunięte`);
        res.status(200).json({ message: 'Zamówienie zostało usunięte' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas usuwania zamówienia', error });
    }
});

// Podsumowanie zamówień wg użytkownika
app.get('/api/summary', async (req, res) => {
    try {
        const orders = await Order.find({ status: 'completed' })
            .populate('products.productId')
            .populate('userId');

        const summary = {};

        orders.forEach(order => {
            const userName = order.userId.username;
            if (!summary[userName]) {
                summary[userName] = {};
            }
            order.products.forEach(product => {
                const productName = product.productId.name;
                if (!summary[userName][productName]) {
                    summary[userName][productName] = 0;
                }
                summary[userName][productName] += product.quantity;
            });
        });

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ message: 'Error generating summary', error });
    }
});

// Czyszczenie wszystkich zamówień
app.delete('/api/clear-summary', async (req, res) => {
    try {
        await Order.deleteMany({});
        res.status(200).json({ message: 'Dane zamówień zostały wyczyszczone.' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas czyszczenia danych zamówień.', error });
    }
});


// ------ Obsługa plików HTML ------

app.get('/', (req, res) => {
    res.redirect('/login.html'); // lub inna strona startowa
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'login.html'));
});

app.get('/cart.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'cart.html'));
});

app.get('/completed-orders.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'completed-orders.html'));
});

app.get('/orders.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'orders.html'));
});

app.get('/paid-orders.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'paid-orders.html'));
});

app.get('/admin-products.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'admin-products.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'admin.html'));
});

app.get('/summary.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'summary.html'));
});

app.get('/user-orders.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'user-orders.html'));
});

// Pobieranie zamówień użytkownika
app.get('/api/orders/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const orders = await Order.find({ userId }).populate('products.productId');
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono zamówień dla tego użytkownika' });
        }
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Błąd przy pobieraniu zamówień użytkownika', error });
    }
});

// Usuwanie zamówień na podstawie daty
app.delete('/api/orders/:userId/by-date/:date', async (req, res) => {
    const { userId, date } = req.params;
    try {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const deletedOrders = await Order.deleteMany({
            userId,
            date: { $gte: startDate, $lt: endDate }
        });

        if (deletedOrders.deletedCount === 0) {
            return res.status(404).json({ message: 'Nie znaleziono zamówień do usunięcia' });
        }
        res.status(200).json({ message: `Zamówienia z dnia ${date} zostały usunięte` });
    } catch (error) {
        res.status(500).json({ message: 'Błąd przy usuwaniu zamówienia', error });
    }
});

// Start serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});


/*************************************************
 * 1. STARE FUNKCJE oparte na localStorage        *
 *************************************************/

// Funkcje obsługujące koszyk przy użyciu localStorage (dla porównania lub trybu offline)
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

// Funkcja dodająca produkt do koszyka (API)
// Po kliknięciu przycisku "Dodaj do koszyka" wywoływana jest ta funkcja,
// która wysyła żądanie do endpointu /api/cart, a po otrzymaniu zaktualizowanego produktu
// aktualizuje widok (DOM) bez potrzeby odświeżania strony.
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

        // Aktualizacja widoku produktu (np. aktualizacja etykiety "Ilość dostępna")
        updateProductDOM(updatedProduct);

        // Aktualizacja widżetu koszyka (licznik)
        updateCartWidgetCount();

        // Jeśli ilość dostępna spadnie do 0, możesz usunąć produkt z listy
        if (updatedProduct.quantity <= 0) {
            document.querySelector(`#product-${updatedProduct._id}`).remove();
        }

        showNotification('Dodano do koszyka!');
    } catch (error) {
        console.error('Błąd przy dodawaniu do koszyka (API):', error);
    }
}

// Funkcja aktualizująca wyświetlaną ilość produktu w DOM
function updateProductDOM(updatedProduct) {
    const productElement = document.querySelector(`#product-${updatedProduct._id}`);
    if (productElement) {
        const quantityElement = productElement.querySelector('.product-quantity');
        if (quantityElement) {
            quantityElement.textContent = `Ilość dostępna: ${updatedProduct.quantity}`;
        }
    }
}

// Funkcja aktualizująca widżet koszyka korzystając z API
function updateCartWidgetCount() {
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

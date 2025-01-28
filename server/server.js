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
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://michalklejnocki:Madafaka%2C123@cluster0.rvmfx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Ustawienie katalogu na pliki statyczne (CSS, JS, images)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware do ustawienia Content-Type dla plików CSS
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
    // Ewentualnie inne pola:
    // price: { type: Number, default: 0 },
    // description: { type: String, default: '' },
    // image: { type: String, default: '' }
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

// Admin może zmienić "available" i "quantity" produktu
app.put('/api/products/:id', async (req, res) => {
    // LOGUJEMY TUTAJ CO PRZYCHODZI W CIELE:
    console.log('REQUEST BODY:', req.body);

    const { id } = req.params;
    const { available, quantity } = req.body;

    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { available, quantity },
            { new: true }  // zwróci nam zaktualizowany dokument
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
app.post('/api/cart', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    try {
        let cartItem = await Cart.findOne({ userId, productId });
        if (cartItem) {
            cartItem.quantity += quantity;
        } else {
            cartItem = new Cart({ userId, productId, quantity });
        }
        await cartItem.save();
        res.status(200).json(cartItem);
    } catch (error) {
        res.status(500).json({ message: 'Error adding product to cart', error });
    }
});

app.get('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const cartItems = await Cart.find({ userId }).populate('productId');
        return res.status(200).json(cartItems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cart', error });
    }
});

// Usuwanie 1 produktu z koszyka
app.delete('/api/cart/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    try {
        const deletedItem = await Cart.findOneAndDelete({ userId, productId });
        if (!deletedItem) {
            return res.status(404).json({ message: 'Produkt nie został znaleziony w koszyku' });
        }
        res.status(200).json({ message: 'Produkt został usunięty z koszyka' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas usuwania produktu z koszyka', error });
    }
});

// Czyszczenie koszyka
app.delete('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
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
        // Zwracamy userId i role – front może to sobie zapisać w localStorage
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

        // 3. Skoro wystarczy ilości, tworzymy zamówienie
        const order = new Order({
            userId,
            products: cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity
            }))
        });
        await order.save();

        // 4. Zmniejszamy ilości w magazynie
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

// Pobieranie wszystkich zamówień (tylko 'pending')
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

// Przenoszenie zamówienia do zrealizowanych (completed)
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

// Pobieranie zrealizowanych
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

// Przenoszenie zamówienia do opłaconych (paid)
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

// Pobieranie opłaconych
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

// Podsumowanie zamówień (wg użytkownika)
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

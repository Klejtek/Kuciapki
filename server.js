const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Połączenie z MongoDB
mongoose.connect('your-mongodb-atlas-uri')
  .then(() => console.log('Połączono z MongoDB'))
  .catch(err => console.log(err));

// Model Produktu
const ProductSchema = new mongoose.Schema({
    name: String,
    description: String,
    imageUrl: String
});

const Product = mongoose.model('Product', ProductSchema);

// Model Koszyka
const CartSchema = new mongoose.Schema({
    userId: String, // Identyfikator użytkownika, aby śledzić koszyk użytkownika
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

const Cart = mongoose.model('Cart', CartSchema);

// Route - pobieranie produktów
app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Route - dodanie produktu do koszyka
// Route - dodanie produktu do koszyka
app.post('/cart', async (req, res) => {
    const { userId, productId } = req.body;
    console.log('Otrzymano żądanie:', userId, productId); // Debugowanie

    let cart = await Cart.findOne({ userId });  // Znajdź koszyk użytkownika
    if (!cart) {
        cart = new Cart({ userId, items: [] });
    }
    cart.items.push(productId);  // Dodaj produkt do koszyka
    await cart.save();
    res.json(cart);
});


// Route - pobranie zawartości koszyka dla konkretnego użytkownika
app.get('/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId }).populate('items');
    res.json(cart);
});

// Start serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

//--------------------------------------------------------
// server.js
//--------------------------------------------------------
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// (Opcjonalnie: załaduj zmienne środowiskowe, np. z pliku .env)
// require('dotenv').config();

// -- Połączenie z MongoDB
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://michalklejnocki:Madafaka%2C123@cluster0.rvmfx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.log('Error connecting to MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Ustawienie katalogu na pliki statyczne (CSS, JS, images)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware do ustawienia Content-Type dla plików CSS (opcjonalne)
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
  image: { type: String } // Dodane pole image, jeśli chcesz wyświetlać obrazki
});
const Product = mongoose.model('Product', productSchema);

// Model Użytkownika
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
});
const User = mongoose.model('User', userSchema);

// Model Koszyka (z dodanym polem createdAt)
const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }  // Data dodania pozycji do koszyka
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
  const { name, available, quantity, image } = req.body;
  try {
    const newProduct = new Product({ name, available, quantity, image });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error adding product', error });
  }
});

// Admin – aktualizacja pola available i quantity
app.put('/api/products/:id', async (req, res) => {
  console.log('REQUEST BODY:', req.body);
  const { id } = req.params;
  const { available, quantity } = req.body;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { available, quantity },
      { new: true }
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
    Endpoint POST /api/cart:
    - Sprawdza, czy produkt istnieje i czy jest wystarczająca ilość.
    - Odejmuje ilość z magazynu (rezerwacja produktu).
    - Dodaje lub aktualizuje element w koszyku.
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

    // 3. Odejmij ilość z magazynu (rezerwacja produktu)
    product.quantity -= quantity;
    await product.save();

    // 4. Dodaj lub aktualizuj element w koszyku
    let cartItem = await Cart.findOne({ userId, productId });
    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.createdAt = Date.now(); // aktualizujemy datę dodania, aby przedłużyć czas rezerwacji
    } else {
      cartItem = new Cart({ userId, productId, quantity });
    }
    await cartItem.save();

    // 5. Zwróć dane (koszyk i aktualny stan produktu)
    res.status(200).json({
      cartItem,
      updatedProduct: product
    });
  } catch (error) {
    console.error('Błąd w POST /api/cart:', error);
    res.status(500).json({ message: 'Error adding product to cart', error });
  }
});

app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const cartItems = await Cart.find({ userId }).populate('productId');
    res.status(200).json(cartItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error });
  }
});

/*
    Endpoint DELETE /api/cart/:userId/:productId:
    - Znajduje element koszyka.
    - Przywraca usuniętą ilość produktu do magazynu.
    - Usuwa element z koszyka.
*/
app.delete('/api/cart/:userId/:productId', async (req, res) => {
  const { userId, productId } = req.params;
  try {
    // Znajdź pozycję w koszyku
    const cartItem = await Cart.findOne({ userId, productId });
    if (!cartItem) {
      return res.status(404).json({ message: 'Produkt nie został znaleziony w koszyku' });
    }

    // Przywróć ilość do magazynu
    const product = await Product.findById(productId);
    if (product) {
      product.quantity += cartItem.quantity;
      await product.save();
    }

    // Usuń element z koszyka
    await Cart.findOneAndDelete({ userId, productId });
    res.status(200).json({
      message: 'Produkt został usunięty z koszyka',
      updatedProduct: product
    });
  } catch (error) {
    res.status(500).json({ message: 'Błąd podczas usuwania produktu z koszyka', error });
  }
});

// Czyszczenie koszyka
app.delete('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // Przywracamy ilość dla każdego elementu w koszyku
    const cartItems = await Cart.find({ userId });
    for (const cartItem of cartItems) {
      const product = await Product.findById(cartItem.productId);
      if (product) {
        product.quantity += cartItem.quantity;
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
    res.status(200).json({ userId: user._id, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Błąd podczas logowania', error });
  }
});

// ------ Zamówienia (Order) ------

/*
    Endpoint POST /api/orders:
    - Pobiera pozycje z koszyka.
    - Tworzy zamówienie na podstawie zawartości koszyka.
    - UWAGA: Stan magazynowy nie jest już modyfikowany, bo produkty zostały już "zarezerwowane"
      przy dodaniu do koszyka.
    - Po złożeniu zamówienia koszyk jest czyszczony.
*/
app.post('/api/orders', async (req, res) => {
  const { userId } = req.body;
  try {
    // 1. Pobierz pozycje koszyka
    const cartItems = await Cart.find({ userId });
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Koszyk jest pusty' });
    }

    // 2. (Opcjonalnie) Sprawdzenie, czy produkty nadal istnieją
    for (const cartItem of cartItems) {
      const product = await Product.findById(cartItem.productId);
      if (!product) {
        return res.status(404).json({ message: 'Nie znaleziono produktu w bazie' });
      }
    }

    // 3. Utwórz zamówienie
    const order = new Order({
      userId,
      products: cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    });
    await order.save();

    // 4. Wyczyść koszyk
    await Cart.deleteMany({ userId });
    res.status(200).json({ message: 'Zamówienie zostało złożone', order });
  } catch (error) {
    res.status(500).json({ message: 'Wystąpił błąd podczas składania zamówienia', error });
  }
});

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


//--------------------------------------------------------
// Mechanizm automatycznego przywracania pozycji koszyka
//--------------------------------------------------------
setInterval(async () => {
  try {
    // Obliczamy datę, przed którą pozycje uznajemy za przeterminowane (15 minut temu)
    const expirationTime = new Date(Date.now() - 15 * 60 * 1000);

    // Znajdujemy wszystkie pozycje koszyka, które zostały dodane przed tą datą
    const expiredCartItems = await Cart.find({ createdAt: { $lt: expirationTime } });

    for (const cartItem of expiredCartItems) {
      // Znajdź produkt, którego dotyczy pozycja koszyka
      const product = await Product.findById(cartItem.productId);
      if (product) {
        // Przywracamy zarezerwowaną ilość produktu do magazynu
        product.quantity += cartItem.quantity;
        await product.save();
      }
      // Usuwamy przeterminowaną pozycję z koszyka
      await Cart.findByIdAndDelete(cartItem._id);
    }
    if (expiredCartItems.length > 0) {
      console.log(`Przywrócono ${expiredCartItems.length} przeterminowanych pozycji koszyka.`);
    }
  } catch (error) {
    console.error("Błąd podczas przywracania przeterminowanych pozycji koszyka:", error);
  }
}, 60 * 1000);  // Uruchamiamy co 60 sekund

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});

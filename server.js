const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI || "mongodb+srv://michalklejnocki:Madafaka%2C123@cluster0.rvmfx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Obsługa statycznych plików
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint dla strony głównej (GET /)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint: Pobieranie wszystkich zamówień
app.get('/orders', async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('zamowienia');
        const orders = await collection.find({}).toArray();
        res.status(200).json(orders);
    } catch (error) {
        console.error('Błąd podczas pobierania zamówień:', error);
        res.status(500).json({ error: 'Błąd podczas pobierania zamówień' });
    } finally {
        await client.close();
    }
});

// Endpoint: Dodawanie nowego zamówienia (z sumowaniem)
app.post('/orders', async (req, res) => {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('zamowienia');

        const { customerName, items } = req.body;

        const existingOrder = await collection.findOne({ customerName });

        if (existingOrder) {
            items.forEach(newItem => {
                const existingItem = existingOrder.items.find(item => item.name === newItem.name);
                if (existingItem) {
                    existingItem.quantity += newItem.quantity;
                } else {
                    existingOrder.items.push(newItem);
                }
            });

            await collection.updateOne(
                { _id: existingOrder._id },
                { $set: { items: existingOrder.items } }
            );
            res.status(200).json({ message: 'Zamówienie zostało zaktualizowane' });
        } else {
            const result = await collection.insertOne(req.body);
            res.status(201).json({ insertedId: result.insertedId });
        }
    } catch (error) {
        console.error('Błąd podczas dodawania zamówienia:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas dodawania zamówienia' });
    } finally {
        await client.close();
    }
});

// Endpoint do dodawania użytkownika z hashowaniem hasła
app.post('/add-user', async (req, res) => {
    const client = new MongoClient(uri);
    const { username, password } = req.body;

    try {
        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('users');

        const existingUser = await collection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Użytkownik już istnieje.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await collection.insertOne({ username, password: hashedPassword });

        res.status(201).json({ message: 'Użytkownik został dodany.' });
    } catch (error) {
        console.error('Błąd podczas dodawania użytkownika:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas dodawania użytkownika' });
    } finally {
        await client.close();
    }
});

// Endpoint do logowania użytkownika z weryfikacją hasła
app.post('/login', async (req, res) => {
    const client = new MongoClient(uri);
    const { username, password } = req.body;

    try {
        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('users');

        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
        }

        res.status(200).json({ message: 'Zalogowano pomyślnie' });
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas logowania' });
    } finally {
        await client.close();
    }
});

// Endpoint: Pobieranie wszystkich użytkowników
app.get('/users', async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('users');
        const users = await collection.find({}).toArray();
        res.status(200).json(users);
    } catch (error) {
        console.error('Błąd podczas pobierania użytkowników:', error);
        res.status(500).json({ error: 'Błąd podczas pobierania użytkowników' });
    } finally {
        await client.close();
    }
});

// Endpoint: Oznaczanie zamówienia jako zrealizowane i przenoszenie do realizedOrders (z sumowaniem)
app.post('/orders/:id/realize', async (req, res) => {
    const client = new MongoClient(uri);
    const orderId = req.params.id;

    try {
        await client.connect();
        const database = client.db('sklep');
        const ordersCollection = database.collection('zamowienia');
        const realizedOrdersCollection = database.collection('realizedOrders');

        const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        if (order) {
            const existingOrder = await realizedOrdersCollection.findOne({ customerName: order.customerName });

            if (existingOrder) {
                order.items.forEach(newItem => {
                    const existingItem = existingOrder.items.find(item => item.name === newItem.name);
                    if (existingItem) {
                        existingItem.quantity += newItem.quantity;
                    } else {
                        existingOrder.items.push(newItem);
                    }
                });

                await realizedOrdersCollection.updateOne(
                    { _id: existingOrder._id },
                    { $set: { items: existingOrder.items } }
                );
            } else {
                await realizedOrdersCollection.insertOne(order);
            }

            await ordersCollection.deleteOne({ _id: new ObjectId(orderId) });

            res.status(200).json({ message: 'Zamówienie zostało zrealizowane i przeniesione do zamówień zrealizowanych.' });
        } else {
            res.status(404).json({ error: 'Zamówienie nie zostało znalezione.' });
        }
    } catch (error) {
        console.error('Błąd podczas realizacji zamówienia:', error);
        res.status(500).json({ error: 'Błąd podczas realizacji zamówienia.' });
    } finally {
        await client.close();
    }
});

// Endpoint: Pobieranie zrealizowanych zamówień
app.get('/realized-orders', async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('realizedOrders');
        const realizedOrders = await collection.find({}).toArray();
        res.status(200).json(realizedOrders);
    } catch (error) {
        console.error('Błąd podczas pobierania zrealizowanych zamówień:', error);
        res.status(500).json({ error: 'Błąd podczas pobierania zrealizowanych zamówień' });
    } finally {
        await client.close();
    }
});

// Endpoint: Oznaczanie zamówienia jako opłacone i przenoszenie do paidOrders (z sumowaniem)
app.post('/orders/:id/pay', async (req, res) => {
    const client = new MongoClient(uri);
    const orderId = req.params.id;

    try {
        await client.connect();
        const database = client.db('sklep');
        const realizedOrdersCollection = database.collection('realizedOrders');
        const paidOrdersCollection = database.collection('paidOrders');

        const order = await realizedOrdersCollection.findOne({ _id: new ObjectId(orderId) });

        if (order) {
            const existingOrder = await paidOrdersCollection.findOne({ customerName: order.customerName });

            if (existingOrder) {
                order.items.forEach(newItem => {
                    const existingItem = existingOrder.items.find(item => item.name === newItem.name);
                    if (existingItem) {
                        existingItem.quantity += newItem.quantity;
                    } else {
                        existingOrder.items.push(newItem);
                    }
                });

                await paidOrdersCollection.updateOne(
                    { _id: existingOrder._id },
                    { $set: { items: existingOrder.items } }
                );
            } else {
                await paidOrdersCollection.insertOne(order);
            }

            await realizedOrdersCollection.deleteOne({ _id: new ObjectId(orderId) });

            res.status(200).json({ message: 'Zamówienie zostało oznaczone jako opłacone.' });
        } else {
            res.status(404).json({ error: 'Zamówienie nie zostało znalezione.' });
        }
    } catch (error) {
        console.error('Błąd podczas oznaczania zamówienia jako opłacone:', error);
        res.status(500).json({ error: 'Błąd podczas oznaczania zamówienia jako opłacone.' });
    } finally {
        await client.close();
    }
});

// Endpoint: Pobieranie opłaconych zamówień
app.get('/paid-orders', async (req, res) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('paidOrders');
        const paidOrders = await collection.find({}).toArray();
        res.status(200).json(paidOrders);
    } catch (error) {
        console.error('Błąd podczas pobierania opłaconych zamówień:', error);
        res.status(500).json({ error: 'Błąd podczas pobierania opłaconych zamówień' });
    } finally {
        await client.close();
    }
});

// Endpoint: Usuwanie zamówienia z paidOrders po ID
app.delete('/paid-orders/:id', async (req, res) => {
    const client = new MongoClient(uri);
    const orderId = req.params.id;

    try {
        await client.connect();
        const database = client.db('sklep');
        const paidOrdersCollection = database.collection('paidOrders');

        const result = await paidOrdersCollection.deleteOne({ _id: new ObjectId(orderId) });

        if (result.deletedCount === 1) {
            res.status(200).json({ message: 'Zamówienie zostało usunięte.' });
        } else {
            res.status(404).json({ error: 'Zamówienie nie zostało znalezione.' });
        }
    } catch (error) {
        console.error('Błąd podczas usuwania zamówienia:', error);
        res.status(500).json({ error: 'Błąd podczas usuwania zamówienia.' });
    } finally {
        await client.close();
    }
});

// Uruchomienie serwera na porcie 3000 lub innym dostępnym porcie
app.listen(process.env.PORT || 3000, () => {
    console.log('Serwer działa na porcie 3000');
});

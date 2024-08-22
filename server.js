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
        console.log("Dodawanie użytkownika:", req.body);

        if (!username || !password) {
            return res.status(400).json({ error: 'Wymagane jest podanie nazwy użytkownika i hasła.' });
        }

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
        // Logowanie danych przychodzących
        console.log("Logowanie:", req.body);

        // Sprawdzanie, czy dane są obecne i mają poprawny format
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            console.log("Nieprawidłowe dane JSON:", req.body);
            return res.status(400).json({ error: 'Wymagane jest podanie poprawnych danych JSON.' });
        }

        await client.connect();
        const database = client.db('sklep');
        const collection = database.collection('users');

        const user = await collection.findOne({ username });
        
        if (!user) {
            console.log("Użytkownik nie znaleziony:", username);
            return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
        }

        // Dodanie logów dla porównania haseł
        console.log("Wprowadzone hasło:", password);
        console.log("Hash w bazie danych:", user.password);

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("Czy hasło jest poprawne:", isPasswordValid);

        if (!isPasswordValid) {
            console.log("Nieprawidłowe hasło dla użytkownika:", username);
            return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
        }

        console.log("Logowanie pomyślne:", username);
        res.status(200).json({ message: 'Zalogowano pomyślnie' });
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas logowania' });
    } finally {
        await client.close();
    }
});


// Reszta kodu jest bez zmian...

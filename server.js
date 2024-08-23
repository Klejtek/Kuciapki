const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI || "mongodb+srv://michalklejnocki:Madafaka%2C123@cluster0.rvmfx.mongodb.net/sklep?retryWrites=true&w=majority";
const secret = 'your_jwt_secret';  // Ustaw sekretny klucz dla JWT

// Stałe połączenie z MongoDB
let db;

async function connectToDB() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        db = client.db('sklep');
        console.log("Połączono z bazą danych MongoDB Atlas");
    } catch (err) {
        console.error('Błąd połączenia z MongoDB Atlas:', err);
        process.exit(1);  // Zakończ serwer, jeśli nie można połączyć się z bazą danych
    }
}

connectToDB();

// Middleware do weryfikacji tokena JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Brak tokena, autoryzacja nieudana' });

    jwt.verify(token, secret, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token nieprawidłowy' });
        req.user = user;
        next();
    });
}

// Obsługa statycznych plików
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint dla strony głównej
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint do dodawania użytkownika z hashowaniem hasła
app.post('/add-user', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Użytkownik już istnieje.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.collection('users').insertOne({ username, password: hashedPassword });

        res.status(201).json({ message: 'Użytkownik został dodany.' });
    } catch (error) {
        console.error('Błąd podczas dodawania użytkownika:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas dodawania użytkownika' });
    }
});

// Endpoint do logowania użytkownika z generowaniem tokena JWT
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Nieprawidłowy login lub hasło' });
        }

        const token = jwt.sign({ username: user.username }, secret, { expiresIn: '1h' });
        res.status(200).json({ message: 'Zalogowano pomyślnie', token });
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas logowania' });
    }
});

// Endpoint: Pobieranie wszystkich zamówień
app.get('/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await db.collection('zamowienia').find({}).toArray();
        res.status(200).json(orders);
    } catch (error) {
        console.error('Błąd podczas pobierania zamówień:', error);
        res.status(500).json({ error: 'Błąd podczas pobierania zamówień' });
    }
});

// Endpoint: Dodawanie nowego zamówienia
app.post('/orders', authenticateToken, async (req, res) => {
    const { customerName, items } = req.body;

    try {
        const existingOrder = await db.collection('zamowienia').findOne({ customerName });

        if (existingOrder) {
            items.forEach(newItem => {
                const existingItem = existingOrder.items.find(item => item.name === newItem.name);
                if (existingItem) {
                    existingItem.quantity += newItem.quantity;
                } else {
                    existingOrder.items.push(newItem);
                }
            });

            await db.collection('zamowienia').updateOne(
                { _id: existingOrder._id },
                { $set: { items: existingOrder.items } }
            );
            res.status(200).json({ message: 'Zamówienie zostało zaktualizowane' });
        } else {
            const result = await db.collection('zamowienia').insertOne({ customerName, items });
            res.status(201).json({ insertedId: result.insertedId });
        }
    } catch (error) {
        console.error('Błąd podczas dodawania zamówienia:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas dodawania zamówienia' });
    }
});

// Więcej endpointów dla realized-orders, paid-orders, itd., można również zoptymalizować podobnie.

// Uruchomienie serwera na porcie 3000
app.listen(process.env.PORT || 3000, () => {
    console.log('Serwer działa na porcie 3000');
});

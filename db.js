const { MongoClient } = require('mongodb');

// String połączenia do MongoDB Atlas
const uri = "mongodb+srv://michalklejnocki:Madafaka%2C123@cluster0.rvmfx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Funkcja testowa do połączenia z MongoDB i dodania zamówienia
async function connectToDatabase() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Połączono z MongoDB Atlas!");

        // Dostęp do bazy danych
        const database = client.db('sklep');
        const collection = database.collection('zamowienia');

        // Przykładowe zamówienie
        const result = await collection.insertOne({
            customerName: 'Jan Kowalski',
            items: [{ name: 'Produkt A', quantity: 2 }]
        });

        console.log(`Dodano zamówienie o ID: ${result.insertedId}`);

    } catch (error) {
        console.error('Błąd podczas połączenia:', error);
    } finally {
        await client.close();
    }
}

// Uruchom funkcję
connectToDatabase();

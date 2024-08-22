const bcrypt = require('bcrypt');

const plainPassword = 'your_password'; // Zamień 'your_password' na rzeczywiste hasło
bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) throw err;
    console.log('Zahashowane hasło:', hash);
});

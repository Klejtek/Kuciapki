// Funkcja do logowania użytkownika
document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(user => user.username === username && user.password === password);

        if (user) {
            localStorage.setItem('username', username);
            alert('Zalogowano jako ' + username);
            window.location.href = 'index.html'; // Przekierowanie na stronę główną
        } else {
            alert('Nieprawidłowy login lub hasło!');
        }
    }
});

// Dodanie domyślnych użytkowników, jeśli nie istnieją
window.addEventListener('load', function() {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Lista domyślnych użytkowników
    const defaultUsers = [
        { username: 'MKL', password: '12345' },
        { username: 'MKL2', password: '12345' }
    ];

    defaultUsers.forEach(defaultUser => {
        if (!users.some(user => user.username === defaultUser.username)) {
            users.push(defaultUser);
        }
    });

    localStorage.setItem('users', JSON.stringify(users));
});

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

            // Sprawdzenie, czy użytkownik to MKL
            if (username === 'MKL') {
                window.location.href = 'admin.html';  // Przekierowanie do widoku administratora
            } else {
                window.location.href = 'index.html';  // Przekierowanie do strony głównej
            }
        } else {
            alert('Nieprawidłowy login lub hasło!');
        }
    }
});

// Funkcja do logowania użytkownika
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        try {
            // Wysłanie danych logowania do serwera
            const response = await fetch('https://kuciapki.onrender.com/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),  // Przekazanie danych logowania
            });

            const result = await response.json();

            if (response.ok) {
                // Pomyślne logowanie
                alert('Zalogowano jako ' + username);
                localStorage.setItem('username', username);

                // Sprawdzenie, czy użytkownik to MKL
                if (username === 'MKL') {
                    window.location.href = 'admin.html';  // Przekierowanie do panelu administratora
                } else {
                    window.location.href = 'index.html';  // Przekierowanie do strony głównej
                }
            } else {
                // Obsługa błędu logowania
                alert(result.error || 'Nieprawidłowy login lub hasło!');
            }
        } catch (error) {
            console.error('Błąd podczas logowania:', error);
            alert('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
        }
    } else {
        alert('Proszę podać nazwę użytkownika i hasło.');
    }
});

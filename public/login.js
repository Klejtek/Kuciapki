// Funkcja do logowania użytkownika z serwera (MongoDB)
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        try {
            // Wysłanie danych logowania do serwera
            const response = await fetch('https://kuciapki.onrender.com/login', { // Zmodyfikuj URL na Twój aktualny
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),  // Przekazanie danych logowania
            });

            const result = await response.json();

            if (response.ok) {
                // Zalogowano pomyślnie
                alert('Zalogowano jako ' + username);
                localStorage.setItem('username', username);

                // Sprawdzenie, czy użytkownik to MKL
                if (username === 'MKL') {
                    window.location.href = 'admin.html';  // Przekierowanie do widoku administratora
                } else {
                    window.location.href = 'index.html';  // Przekierowanie do strony głównej
                }
            } else {
                // W przypadku błędu logowania
                alert(result.message || 'Nieprawidłowy login lub hasło!');
            }
        } catch (error) {
            console.error('Błąd podczas logowania:', error);
            alert('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
        }
    } else {
        alert('Proszę podać nazwę użytkownika i hasło.');
    }
});

// Funkcja do logowania użytkownika
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Dodanie logowania danych wejściowych do konsoli
    console.log('Wysyłanie danych logowania:', { username, password });

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

            // Dodanie logowania odpowiedzi serwera do konsoli
            console.log('Otrzymana odpowiedź z serwera:', result);

            if (response.ok && result.token) {
                // Pomyślne logowanie
                alert('Zalogowano jako ' + username);

                // Przechowywanie tokena JWT w sessionStorage lub localStorage
                sessionStorage.setItem('token', result.token);  // Możesz także użyć localStorage, w zależności od preferencji

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

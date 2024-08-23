document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        try {
            const response = await fetch(https://kuciapki.onrender.com/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            if (response.ok && result.token) {
                localStorage.setItem('token', result.token);
                alert('Zalogowano jako ' + username);
                window.location.href = username === 'MKL' ? 'admin.html' : 'index.html';
            } else {
                alert(result.message || 'Nieprawidłowy login lub hasło!');
            }
        } catch (error) {
            console.error('Błąd podczas logowania:', error);
            alert('Wystąpił błąd podczas logowania.');
        }
    }
});

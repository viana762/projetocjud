document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMessage.style.display = 'none';

    try {
      const response = await fetch(
        'https://projeto-cjud-backend.onrender.com/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        errorMessage.textContent = data.message;
        errorMessage.style.display = 'block';
      } else {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        window.location.href = 'index.html';
      }
    } catch (error) {
      errorMessage.textContent =
        'Erro ao conectar com o servidor. Tente novamente.';
      errorMessage.style.display = 'block';
    }
  });
});

document.addEventListener('DOMContentLoaded', function () {
  console.log(
    "DIAGNÓSTICO: Página de login carregada, script 'login.js' executando."
  );

  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  if (!loginForm) {
    console.error(
      "DIAGNÓSTICO CRÍTICO: Não foi possível encontrar o formulário com id='login-form'. O botão não funcionará."
    );
    return;
  }

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    console.log("DIAGNÓSTICO: Botão 'Entrar' clicado, formulário submetido.");

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMessage.style.display = 'none';

    try {
      console.log(
        'DIAGNÓSTICO: Tentando enviar dados para https://projeto-cjud-backend.onrender.com/login'
      );
      const response = await fetch(
        'https://projeto-cjud-backend.onrender.com/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      console.log(
        'DIAGNÓSTICO: Servidor respondeu com status:',
        response.status
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
      console.error(
        'DIAGNÓSTICO: Ocorreu um erro CRÍTICO na comunicação com o servidor.',
        error
      );
      errorMessage.textContent =
        'Erro CRÍTICO ao conectar. Veja o console (F12).';
      errorMessage.style.display = 'block';
    }
  });
});

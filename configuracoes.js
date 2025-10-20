document.addEventListener('DOMContentLoaded', function () {
  const RENDER_URL = 'https://projeto-cjud-backend.onrender.com';

  function customAlert(message, isSuccess = true) {
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert ${isSuccess ? 'success' : 'error'}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);
    setTimeout(() => {
      alertBox.remove();
    }, 3000);
  }

  const currentUserJSON = localStorage.getItem('currentUser');
  if (!currentUserJSON) {
    window.location.href = 'login.html';
    return;
  }
  const currentUser = JSON.parse(currentUserJSON);
  const userRole = currentUser.role;
  const currentUserName = currentUser.name;

  document.querySelector('.profile-name').textContent = currentUserName;
  document.querySelector('.profile-role').textContent = userRole;

  if (userRole === 'SUPERVISOR') {
    const minhasTarefasLink = document.querySelector(
      'a[href="minhas-tarefas.html"]'
    );
    if (minhasTarefasLink) {
      minhasTarefasLink.parentElement.style.display = 'none';
    }

    const equipeLink = document.querySelector('a[href="equipe.html"]');
    if (equipeLink) {
      equipeLink.innerHTML = '<i class="fas fa-users"></i> Minha Equipe';
    }
  }

  const logoutButton = document.querySelector('.logout-link a');
  logoutButton.addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  });

  const changeNameForm = document.getElementById('change-name-form');
  const userNameInput = document.getElementById('user-name');
  const nameSuccessMessage = document.getElementById('name-success-message');

  userNameInput.value = currentUserName;

  if (changeNameForm) {
    changeNameForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      nameSuccessMessage.style.display = 'none';
      const newName = userNameInput.value.trim();

      if (newName === currentUserName) return;

      try {
        const response = await fetch(`${RENDER_URL}/users/change-name`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            newName: newName,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        currentUser.name = data.newName;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.querySelector('.profile-name').textContent = data.newName;

        nameSuccessMessage.textContent = data.message;
        nameSuccessMessage.style.display = 'block';
      } catch (error) {
        customAlert(`Erro: ${error.message}`, false);
      }
    });
  }

  const changePasswordForm = document.getElementById('change-password-form');
  const passwordErrorMessage = document.getElementById(
    'password-error-message'
  );

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      passwordErrorMessage.style.display = 'none';

      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (newPassword !== confirmPassword) {
        passwordErrorMessage.textContent =
          'A nova senha e a confirmação não coincidem.';
        passwordErrorMessage.style.display = 'block';
        return;
      }

      try {
        const response = await fetch(`${RENDER_URL}/users/change-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            currentPassword,
            newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          passwordErrorMessage.textContent = data.message;
          passwordErrorMessage.style.display = 'block';
        } else {
          customAlert(data.message);
          setTimeout(() => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
          }, 1500);
        }
      } catch (error) {
        passwordErrorMessage.textContent =
          'Erro ao se conectar com o servidor.';
        passwordErrorMessage.style.display = 'block';
      }
    });
  }
});

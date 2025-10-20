document.addEventListener('DOMContentLoaded', function () {
  const RENDER_URL = 'https://projeto-cjud-backend.onrender.com';
  const currentUserJSON = localStorage.getItem('currentUser');
  const currentUser = JSON.parse(currentUserJSON);
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const userRole = currentUser.role;
  const currentUserName = currentUser.name;

  const supervisorsList = document.getElementById('supervisors-list');
  const internsList = document.getElementById('interns-list');
  const addUserBtn = document.getElementById('add-user-btn');
  const addUserModal = document.getElementById('add-user-modal');
  const modalCloseBtn = addUserModal.querySelector('.modal-close-btn');
  const addUserForm = document.getElementById('add-user-form');

  function exibirDataAtual() {
    const hoje = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    let dataFormatada = hoje.toLocaleDateString('pt-BR', options);
    dataFormatada =
      dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    document.getElementById('current-date').textContent = dataFormatada;
  }

  function setupSidebar() {
    document.querySelector('.profile-name').textContent = currentUserName;
    document.querySelector('.profile-role').textContent = userRole;

    const equipeLink = document.querySelector('a[href="equipe.html"]');
    if (equipeLink && userRole === 'SUPERVISOR') {
      document.getElementById('team-title').textContent = 'Minha Equipe';
    }
    if (userRole === 'SUPERVISOR') {
      const minhasTarefasLink = document.querySelector(
        'a[href="minhas-tarefas.html"]'
      );
      if (minhasTarefasLink) {
        minhasTarefasLink.parentElement.style.display = 'none';
      }
    }

    const logoutButton = document.querySelector('.logout-link a');
    logoutButton.addEventListener('click', function (event) {
      event.preventDefault();
      localStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    });
  }

  async function carregarEquipe() {
    try {
      const response = await fetch(`${RENDER_URL}/equipe`);
      const equipe = await response.json();

      supervisorsList.innerHTML = '';
      internsList.innerHTML = '';

      equipe.forEach((user) => {
        const userCardHTML = `
                      <div class="user-card">
                          <i class="fas ${
                            user.role === 'SUPERVISOR'
                              ? 'fa-user-tie'
                              : 'fa-user-graduate'
                          }"></i>
                          <div class="user-info">
                              <span class="user-name">${user.name}</span>
                              <span class="user-email">${user.email}</span>
                          </div>
                      </div>
                  `;
        if (user.role === 'SUPERVISOR') {
          supervisorsList.innerHTML += userCardHTML;
        } else {
          internsList.innerHTML += userCardHTML;
        }
      });
    } catch (error) {
      // não faz nada
    }
  }

  function setupSupervisorFeatures() {
    if (userRole !== 'SUPERVISOR') return;

    addUserBtn.style.display = 'block';
    addUserBtn.addEventListener('click', () => {
      addUserModal.style.display = 'flex';
    });

    modalCloseBtn.addEventListener('click', () => {
      addUserModal.style.display = 'none';
    });
    addUserModal.addEventListener('click', (event) => {
      if (event.target === addUserModal) {
        addUserModal.style.display = 'none';
      }
    });

    addUserForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const newUser = {
        name: document.getElementById('new-user-name').value,
        email: document.getElementById('new-user-email').value,
        role: document.getElementById('new-user-role').value,
      };

      try {
        const response = await fetch(`${RENDER_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser),
        });

        if (response.ok) {
          addUserModal.style.display = 'none';
          addUserForm.reset();
          await carregarEquipe();
        }
      } catch (error) {
        // não faz nada
      }
    });
  }

  exibirDataAtual();
  setupSidebar();
  carregarEquipe();
  setupSupervisorFeatures();
});

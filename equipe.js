document.addEventListener('DOMContentLoaded', function () {
  const RENDER_URL = 'https://projeto-cjud-backend.onrender.com';
  const currentUserJSON = localStorage.getItem('currentUser');
  const currentUser = JSON.parse(currentUserJSON);

  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const userRole = currentUser.role;
  const currentUserEmail = currentUser.email;
  const currentUserName = currentUser.name;

  if (
    userRole !== 'SUPERVISOR' &&
    userRole !== 'ESTAGIARIO' &&
    userRole !== 'GESTOR_DE_CURSO'
  ) {
    window.location.href = 'index.html';
    return;
  }

  const supervisorsList = document.getElementById('supervisors-list');
  const otherRolesContainer = document.getElementById('other-roles-container');
  const addUserBtn = document.getElementById('add-user-btn');
  const addUserModal = document.getElementById('add-user-modal');
  const modalCloseBtn = addUserModal.querySelector('.modal-close-btn');
  const addUserForm = document.getElementById('add-user-form');

  function customAlert(message, isSuccess = true) {
    document
      .querySelectorAll('.custom-alert')
      .forEach((alert) => alert.remove());
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert ${isSuccess ? 'success' : 'error'}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);
    setTimeout(() => {
      alertBox.remove();
    }, 3000);
  }

  function customConfirm(message) {
    return new Promise((resolve) => {
      document
        .querySelectorAll('.custom-confirm-overlay')
        .forEach((overlay) => overlay.remove());
      const confirmOverlay = document.createElement('div');
      confirmOverlay.className = 'custom-confirm-overlay';
      const confirmBox = document.createElement('div');
      confirmBox.className = 'custom-confirm-box';
      const messageP = document.createElement('p');
      messageP.textContent = message;
      confirmBox.appendChild(messageP);
      const btnContainer = document.createElement('div');
      btnContainer.className = 'custom-confirm-buttons';
      const yesButton = document.createElement('button');
      yesButton.textContent = 'Sim';
      yesButton.className = 'confirm-yes';
      yesButton.onclick = () => {
        confirmOverlay.remove();
        resolve(true);
      };
      const noButton = document.createElement('button');
      noButton.textContent = 'Não';
      noButton.className = 'confirm-no';
      noButton.onclick = () => {
        confirmOverlay.remove();
        resolve(false);
      };
      btnContainer.appendChild(noButton);
      btnContainer.appendChild(yesButton);
      confirmBox.appendChild(btnContainer);
      confirmOverlay.appendChild(confirmBox);
      document.body.appendChild(confirmOverlay);
    });
  }

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
    document.querySelector('.profile-role').textContent = userRole.replace(
      '_',
      ' '
    );

    const equipeLink = document.querySelector('a[href="equipe.html"]');
    if (equipeLink && userRole === 'SUPERVISOR') {
      document.getElementById('team-title').textContent = 'Minha Equipe';
    }

    if (userRole !== 'ESTAGIARIO') {
      const minhasTarefasLink = document.querySelector(
        'a[href="minhas-tarefas.html"]'
      );
      if (minhasTarefasLink) {
        minhasTarefasLink.parentElement.style.display = 'none';
      }
    }
  }

  function formatRole(role) {
    const roleMap = {
      SUPERVISOR: 'Supervisor',
      ESTAGIARIO: 'Estagiário',
      GESTOR_DE_CURSO: 'Gestor de Curso',
    };
    return roleMap[role] || role;
  }

  async function carregarEquipe() {
    try {
      const response = await fetch(`${RENDER_URL}/equipe`);
      if (!response.ok) throw new Error('Falha ao buscar equipe');

      const equipe = await response.json();

      supervisorsList.innerHTML = '';
      otherRolesContainer.innerHTML = '';

      const supervisores = equipe.filter((u) => u.role === 'SUPERVISOR');
      const estagiarios = equipe.filter((u) => u.role === 'ESTAGIARIO');
      const gestores = equipe.filter((u) => u.role === 'GESTOR_DE_CURSO');

      const renderUser = (user) => {
        let roleIcon = '';
        if (user.role === 'SUPERVISOR') {
          roleIcon = 'fa-user-tie';
        } else if (user.role === 'ESTAGIARIO') {
          roleIcon = 'fa-user-graduate';
        } else if (user.role === 'GESTOR_DE_CURSO') {
          roleIcon = 'fa-user-cog';
        }

        const deleteBtnHTML =
          userRole === 'SUPERVISOR' && user.email !== currentUserEmail
            ? `<button class="delete-user-btn" data-email="${user.email}" title="Excluir Perfil"><i class="fas fa-trash-alt"></i></button>`
            : '';

        return `
            <div class="user-card">
              <i class="fas ${roleIcon} user-card-icon"></i>
              <div class="user-info">
                <span class="user-name">${user.name}</span>
                <span class="user-role-badge">${formatRole(user.role)}</span>
                <span class="user-email"><i class="fas fa-envelope"></i> ${
                  user.email
                }</span>
              </div>
              <div class="user-actions">
                 ${deleteBtnHTML}
              </div>
            </div>
          `;
      };

      supervisores.forEach((user) => {
        supervisorsList.innerHTML += renderUser(user);
      });

      if (gestores.length > 0) {
        otherRolesContainer.insertAdjacentHTML(
          'beforeend',
          '<div class="team-section"><h3 class="gestor-title"><i class="fas fa-user-cog"></i> Gestores de Curso</h3><div id="gestores-grid" class="user-grid"></div></div>'
        );
        const gestoresGrid = document.getElementById('gestores-grid');
        gestores.forEach((user) => {
          gestoresGrid.innerHTML += renderUser(user);
        });
      }

      if (estagiarios.length > 0) {
        otherRolesContainer.insertAdjacentHTML(
          'beforeend',
          '<div class="team-section"><h3 class="estagiario-title"><i class="fas fa-user-graduate"></i> Estagiários</h3><div id="estagiarios-grid" class="user-grid"></div></div>'
        );
        const estagiariosGrid = document.getElementById('estagiarios-grid');
        estagiarios.forEach((user) => {
          estagiariosGrid.innerHTML += renderUser(user);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      supervisorsList.innerHTML =
        '<p style="color: red;">Não foi possível carregar a lista de usuários.</p>';
    }
  }

  async function deleteUser(email) {
    if (email === currentUserEmail) {
      customAlert('Você não pode excluir seu próprio perfil!', false);
      return;
    }

    const confirmDelete = await customConfirm(
      `Tem certeza que deseja excluir o usuário: ${email}?`
    );

    if (confirmDelete) {
      try {
        const response = await fetch(`${RENDER_URL}/users/${email}`, {
          method: 'DELETE',
        });
        const data = await response.json();

        customAlert(data.message, response.ok);

        if (response.ok) {
          await carregarEquipe();
        }
      } catch (error) {
        customAlert('Erro na conexão ao tentar excluir o usuário.', false);
      }
    }
  }

  function setupSupervisorFeatures() {
    if (userRole !== 'SUPERVISOR') return;

    if (addUserBtn) addUserBtn.style.display = 'block';
    if (addUserBtn)
      addUserBtn.addEventListener('click', () => {
        addUserModal.style.display = 'flex';
      });

    if (modalCloseBtn)
      modalCloseBtn.addEventListener('click', () => {
        addUserModal.style.display = 'none';
      });
    if (addUserModal)
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
        const data = await response.json();

        customAlert(data.message, response.ok);

        if (response.ok) {
          addUserModal.style.display = 'none';
          addUserForm.reset();
          await carregarEquipe();
        }
      } catch (error) {
        customAlert('Erro ao conectar ou criar usuário.', false);
      }
    });

    document
      .querySelector('.main-content')
      .addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.delete-user-btn');
        if (deleteButton) {
          const emailToDelete = deleteButton.dataset.email;
          deleteUser(emailToDelete);
        }
      });
  }

  exibirDataAtual();
  setupSidebar();
  carregarEquipe();
  setupSupervisorFeatures();
});

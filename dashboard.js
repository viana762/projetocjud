document.addEventListener('DOMContentLoaded', function () {
  const RENDER_URL = 'https://projeto-cjud-backend.onrender.com';

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

  const currentUserJSON = localStorage.getItem('currentUser');
  if (!currentUserJSON) {
    window.location.href = 'login.html';
    return;
  }
  const currentUser = JSON.parse(currentUserJSON);
  const userRole = currentUser.role;
  const currentUserName = currentUser.name;
  const currentUserEmail = currentUser.email;

  const dashboardContainer = document.querySelector('.events-container');
  const prioritizedList = document.getElementById('prioritized-events-list');
  const miniCalendar = document.querySelector('.mini-calendar');
  const assignModal = document.getElementById('assign-modal');
  const rightPanel = document.querySelector('.right-panel');

  if (!dashboardContainer || !assignModal) {
    console.error('Erro crítico: Elementos essenciais não encontrados.');
    return;
  }

  const modalInternList = document.getElementById('modal-intern-list');

  function formatarData(dataISO) {
    if (!dataISO) return '';
    try {
      const [ano, mes, dia] = dataISO.split('-');
      return `${dia}/${mes}/${ano}`;
    } catch (e) {
      return dataISO;
    }
  }

  function formatarIntervaloDatas(startDate, endDate) {
    if (!startDate || !endDate) return '';
    try {
      const [startDia, startMes] = startDate.split('-').reverse().slice(0, 2);
      const [endDia, endMes] = endDate.split('-').reverse().slice(0, 2);
      if (startDate === endDate) {
        return `${startDia}/${startMes}`;
      }
      return `${startDia}/${startMes} a ${endDia}/${endMes}`;
    } catch (e) {
      return `${startDate} a ${endDate}`;
    }
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
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
      dateElement.textContent =
        dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    }
  }

  function setupSidebar() {
    const profileNameEl = document.querySelector('.profile-name');
    const profileRoleEl = document.querySelector('.profile-role');
    if (profileNameEl) profileNameEl.textContent = currentUserName;
    if (profileRoleEl) {
      const roleMap = {
        SUPERVISOR: 'Supervisor',
        ESTAGIARIO: 'Estagiário',
        GESTOR_DE_CURSO: 'Gestor de Curso',
      };
      profileRoleEl.textContent = roleMap[userRole] || userRole;
    }

    const allNavItems = document.querySelectorAll('.nav-list li');
    allNavItems.forEach((item) => {
      const link = item.querySelector('a');
      if (!link) return;

      const href = link.getAttribute('href');

      if (userRole === 'GESTOR_DE_CURSO') {
        if (
          href === 'minhas-tarefas.html' ||
          href === 'equipe.html' ||
          href === 'configuracoes.html'
        ) {
          item.style.display = 'none';
        }
      }

      if (userRole === 'SUPERVISOR') {
        if (href === 'minhas-tarefas.html') {
          item.style.display = 'none';
        }
        const equipeLink = document.querySelector('a[href="equipe.html"]');
        if (equipeLink) {
          equipeLink.innerHTML = '<i class="fas fa-users"></i> Minha Equipe';
        }
      }
    });

    if (userRole === 'GESTOR_DE_CURSO') {
      if (rightPanel) {
        rightPanel.style.display = 'block';
      }
      const upcomingEventsDiv = document.querySelector('.upcoming-events');
      if (upcomingEventsDiv) {
        const titleElement = upcomingEventsDiv.querySelector('h3');
        if (titleElement) {
          titleElement.innerHTML =
            '<i class="fas fa-bell" style="color: #5a32b3"></i> NOTIFICAÇÕES';
        }
      }
    }

    const logoutLink = document.querySelector('.logout-link a');
    if (logoutLink) {
      logoutLink.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
      });
    }
  }

  async function carregarNotificacoesGestor() {
    if (userRole !== 'GESTOR_DE_CURSO' || !prioritizedList) return;

    try {
      const response = await fetch(
        `${RENDER_URL}/gestor-notifications?gestorEmail=${encodeURIComponent(
          currentUserEmail
        )}`
      );
      if (!response.ok) {
        console.error('Erro ao buscar notificações:', response.status);
        prioritizedList.innerHTML =
          '<p style="font-size: 13px; color: #888;">Erro ao carregar notificações.</p>';
        return;
      }

      const notifications = await response.json();
      prioritizedList.innerHTML = '';

      if (notifications.length === 0) {
        prioritizedList.innerHTML =
          '<p style="font-size: 13px; color: #888;">Nenhuma notificação no momento.</p>';
      } else {
        notifications.forEach((notif) => {
          const iconMap = {
            created: 'fa-check-circle',
            intern_assigned: 'fa-user-plus',
            equipment_check: 'fa-check-square',
            edited: 'fa-edit',
            prioritized: 'fa-star',
            deleted: 'fa-trash-alt',
          };
          const icon = iconMap[notif.type] || 'fa-bell';

          const notifHTML = `
            <div class="gestor-notification-item" data-id="${notif.id}">
              <button class="notification-close-btn" data-notif-id="${notif.id}">&times;</button>
              <i class="fas ${icon}"></i>
              <span>${notif.message}</span>
            </div>
          `;
          prioritizedList.insertAdjacentHTML('beforeend', notifHTML);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }

  async function marcarNotificacaoComoLida(notifId) {
    try {
      await fetch(`${RENDER_URL}/gestor-notifications/${notifId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
    }
  }

  async function carregarAgendamentos(
    dataSelecionada = null,
    view = 'upcoming'
  ) {
    try {
      let url = `${RENDER_URL}/agendamentos`;
      const params = new URLSearchParams();
      if (dataSelecionada) params.append('date', dataSelecionada);
      else if (view === 'past') params.append('view', 'past');

      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao buscar dados');

      const agendamentos = await response.json();
      renderizarDashboard(agendamentos, dataSelecionada, view);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      dashboardContainer.innerHTML =
        '<h2 class="main-title">AGENDAMENTOS</h2><p style="color: red;">Erro ao carregar agendamentos.</p>';
    }
  }

  function renderizarDashboard(agendamentos, dataSelecionada, view) {
    const mainTitle = dashboardContainer.querySelector('.main-title');
    if (!mainTitle) return;

    if (dataSelecionada)
      mainTitle.textContent = `AGENDAMENTOS PARA ${formatarData(
        dataSelecionada
      )}`;
    else if (view === 'past')
      mainTitle.textContent = 'HISTÓRICO DE AGENDAMENTOS';
    else mainTitle.textContent = 'PRÓXIMOS AGENDAMENTOS';

    document
      .querySelectorAll('.event-card, .event-group-title')
      .forEach((el) => el.remove());

    if (userRole === 'SUPERVISOR' && prioritizedList) {
      prioritizedList.innerHTML = '';
    }

    if (!agendamentos || agendamentos.length === 0) {
      dashboardContainer.insertAdjacentHTML(
        'beforeend',
        '<p class="no-events-message">Nenhum agendamento encontrado.</p>'
      );
    } else {
      const groupedEvents = {};
      const ungroupedEvents = [];

      agendamentos.forEach((ag) => {
        if (ag.grupo_evento && ag.grupo_evento.trim() !== '') {
          if (!groupedEvents[ag.grupo_evento]) {
            groupedEvents[ag.grupo_evento] = [];
          }
          groupedEvents[ag.grupo_evento].push(ag);
        } else {
          ungroupedEvents.push(ag);
        }
      });

      for (const groupName in groupedEvents) {
        dashboardContainer.insertAdjacentHTML(
          'beforeend',
          `<h3 class="event-group-title"><span class="group-icon">📚</span>${groupName}</h3>`
        );
        groupedEvents[groupName].forEach((ag) => {
          const cardHTML = criarCardHTML(ag);
          dashboardContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
      }

      if (ungroupedEvents.length > 0) {
        dashboardContainer.insertAdjacentHTML(
          'beforeend',
          '<h3 class="event-group-title ungrouped-title"><span class="group-icon">📂</span>OUTROS AGENDAMENTOS</h3>'
        );
        ungroupedEvents.forEach((ag) => {
          const cardHTML = criarCardHTML(ag);
          dashboardContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
      }
    }
  }

  function criarCardHTML(ag) {
    const equipments = JSON.parse(ag.equipments || '[]');
    const checkedEquipments = JSON.parse(ag.equipments_checked || '[]');
    const interns = JSON.parse(ag.responsible_interns || '[]');

    let equipmentsHTML = '';
    const equipmentItemsHTML = equipments
      .map((eq) => {
        const equipName = typeof eq === 'string' ? eq : eq.name;
        const quantidade =
          typeof eq === 'object' && eq.quantity ? eq.quantity : 1;
        const exibicao =
          quantidade > 1 ? `${equipName} (${quantidade}x)` : equipName;
        const safeEq = String(equipName);
        const isChecked = checkedEquipments.includes(safeEq);

        if (userRole === 'ESTAGIARIO') {
          return `<span class="equip-check-item ${
            isChecked ? 'checked' : ''
          }" data-equip="${safeEq}" data-agendamento-id="${ag.id}">
                  <i class="fas ${
                    isChecked ? 'fa-check-square' : 'fa-square'
                  }"></i> ${exibicao}
                </span>`;
        } else {
          return `<span class="equip-item ${
            isChecked ? 'checked' : ''
          }">${exibicao}</span>`;
        }
      })
      .join('');

    if (equipments.length > 0) {
      const containerClass =
        userRole === 'ESTAGIARIO'
          ? 'equipment-checklist-container'
          : 'event-equipments';
      equipmentsHTML = `<div class="${containerClass}" data-id="${ag.id}">${equipmentItemsHTML}</div>`;
    }

    let topRightActionsHTML = '';

    if (userRole === 'SUPERVISOR') {
      let internListHTML =
        interns.length > 0
          ? interns.map((name) => `<li>${String(name)}</li>`).join('')
          : '<span class="none">Nenhum</span>';
      const assignBlock = `
          <div class="responsible-list">
            <h4><span>Responsáveis:</span><button class="add-responsible-btn" data-id="${ag.id}" title="Designar">+</button></h4>
            <ul>${internListHTML}</ul>
          </div>`;

      const supervisorButtons = `
          <div class="supervisor-actions">
            <div class="icon-button-group">
              <button class="delete-btn" data-id="${
                ag.id
              }" title="Excluir"><i class="fas fa-trash-alt"></i></button>
              <a href="form.html?id=${
                ag.id
              }" target="_blank" rel="noopener noreferrer" class="edit-btn" title="Editar"><i class="fas fa-pencil-alt"></i></a>
              <button class="duplicate-btn" data-id="${
                ag.id
              }" title="Duplicar"><i class="fas fa-copy"></i></button>
            </div>
            <button class="priority-btn ${
              ag.is_prioritized ? 'active' : ''
            }" data-id="${ag.id}" title="Priorizar">Prioridade</button>
          </div>`;

      topRightActionsHTML = assignBlock + supervisorButtons;
    } else if (userRole === 'ESTAGIARIO') {
      const isCandidato = interns.includes(currentUserName);
      topRightActionsHTML = `
          <div class="assign-container">
            <button class="candidate-btn ${
              isCandidato ? 'active' : ''
            }" data-id="${ag.id}">
              ${isCandidato ? 'Candidatado(a)' : 'Candidatar-se'}
            </button>
          </div>`;
    }

    let descriptionBlockHTML = '';
    if ((ag.notes && String(ag.notes).trim() !== '') || ag.presence) {
      const presenceMap = {
        inicio: 'Apenas no início',
        integral: 'Tempo integral',
        'nao-necessario': 'Não necessária',
      };
      const presenceText = presenceMap[ag.presence] || 'Não especificado';
      let notesContent = ag.notes
        ? `<div class="notes-section"><strong>Observações:</strong><p>${String(
            ag.notes
          )}</p></div>`
        : '';
      const descriptionId = `desc-${ag.id}`;
      descriptionBlockHTML = `
          <div class="description-content" id="${descriptionId}">
            <div class="description-box">
              <div class="presence-info"><strong>Presença de Estagiário:</strong> ${presenceText}</div> 
              ${notesContent}
            </div>
          </div>
          <button class="description-btn" data-target="${descriptionId}">DESCRIÇÃO</button>
        `;
    }

    const location = ag.location || 'Local não definido';
    const title = ag.title || 'Título não definido';
    const startTime = ag.startTime || '--:--';
    const endTime = ag.endTime || '--:--';
    const grupoEventoTag = ag.grupo_evento
      ? `<span class="event-group-tag">${ag.grupo_evento}</span>`
      : '';

    const createdByName =
      ag.created_by_full_name ||
      (ag.created_by ? ag.created_by.split('@')[0] : 'Desconhecido');
    const createdByTag = ag.created_by
      ? `<span class="creator-badge-improved"><i class="fas fa-user-tie"></i><span class="creator-name">${createdByName}</span></span>`
      : '';

    return `
      <div class="event-card" data-id="${ag.id}">
        <div class="event-header">
          <div class="event-time">
            <span class="event-date-short">${formatarIntervaloDatas(
              ag.startDate,
              ag.endDate
            )}</span>
            <span>${startTime}</span><span>${endTime}</span>
          </div>
          <div class="event-status-bar"></div>
          <div class="event-details">
            <div class="location-title-wrapper">
              <div class="location-icon">
                <i class="fas fa-door-open"></i>
              </div>
              <div class="location-title-content">
                <div class="location-name">${location}</div>
                <div class="title-name">${title}</div>
              </div>
            </div>
            ${createdByTag}
            ${grupoEventoTag}
          </div>
          ${equipmentsHTML} 
          <div class="event-top-right-actions">
             ${topRightActionsHTML}
          </div>
        </div>
        ${descriptionBlockHTML} 
      </div>`;
  }

  async function handleBodyClick(event) {
    const targetElement = event.target;

    const notificationCloseBtn = targetElement.closest(
      '.notification-close-btn'
    );
    if (notificationCloseBtn) {
      const notifId = notificationCloseBtn.dataset.notifId;
      await marcarNotificacaoComoLida(notifId);
      notificationCloseBtn.parentElement.remove();
      return;
    }

    const checkItem = targetElement.closest('.equip-check-item');
    if (checkItem && userRole === 'ESTAGIARIO')
      return await toggleChecklistItem(checkItem);

    const priorityButton = targetElement.closest('.priority-btn');
    if (priorityButton) return await togglePriority(priorityButton.dataset.id);

    const candidateButton = targetElement.closest('.candidate-btn');
    if (candidateButton)
      return await toggleCandidacy(candidateButton.dataset.id);

    const deleteButton = targetElement.closest('.delete-btn');
    if (deleteButton) return await deleteAgendamento(deleteButton.dataset.id);

    const duplicateButton = targetElement.closest('.duplicate-btn');
    if (duplicateButton) {
      window.open(
        `form.html?duplicateId=${duplicateButton.dataset.id}`,
        '_blank'
      );
      return;
    }

    const descriptionToggle = targetElement.closest('.description-btn');
    if (descriptionToggle) {
      const targetId = descriptionToggle.dataset.target;
      const content = document.getElementById(targetId);
      if (content) content.classList.toggle('show');
      return;
    }

    const addResponsibleBtn = targetElement.closest('.add-responsible-btn');
    if (addResponsibleBtn)
      return await openAssignModal(addResponsibleBtn.dataset.id);
  }

  async function toggleChecklistItem(item) {
    if (!item) return;
    const agendamentoId = item.dataset.agendamentoId;
    const equipName = item.dataset.equip;
    if (!agendamentoId || !equipName) return;

    try {
      const response = await fetch(
        `${RENDER_URL}/agendamentos/${agendamentoId}`
      );
      if (!response.ok) throw new Error('Agendamento não encontrado');
      const ag = await response.json();
      let checkedEquipments = JSON.parse(ag.equipments_checked || '[]');

      if (checkedEquipments.includes(equipName)) {
        checkedEquipments = checkedEquipments.filter((e) => e !== equipName);
      } else {
        checkedEquipments.push(equipName);
      }

      await fetch(
        `${RENDER_URL}/agendamentos/${agendamentoId}/check-equipamentos`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipmentsChecked: checkedEquipments,
            internName: currentUserName,
            equipmentName: equipName,
          }),
        }
      );

      item.classList.toggle('checked');
      const icon = item.querySelector('i');
      if (icon)
        icon.className = `fas ${
          item.classList.contains('checked') ? 'fa-check-square' : 'fa-square'
        }`;

      carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao alternar checklist:', error);
      customAlert('Erro ao atualizar equipamento.', false);
    }
  }

  async function togglePriority(id) {
    if (!id) return;
    try {
      await fetch(`${RENDER_URL}/agendamentos/${id}/prioritize`, {
        method: 'PUT',
      });
      await carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao priorizar:', error);
    }
  }

  async function toggleCandidacy(id) {
    if (!id) return;
    try {
      await fetch(`${RENDER_URL}/agendamentos/${id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internName: currentUserName }),
      });
      await carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao se candidatar:', error);
    }
  }

  async function deleteAgendamento(id) {
    if (!id) return;
    const querExcluir = await customConfirm('Deseja excluir este agendamento?');
    if (querExcluir) {
      try {
        await fetch(
          `${RENDER_URL}/agendamentos/${id}?deleterEmail=${encodeURIComponent(
            currentUserEmail
          )}`,
          { method: 'DELETE' }
        );
        await carregarAgendamentos();
        customAlert('Agendamento excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir:', error);
        customAlert('Erro ao excluir agendamento.', false);
      }
    }
  }

  async function openAssignModal(agendamentoId) {
    if (!agendamentoId || !assignModal || !modalInternList) return;

    assignModal.dataset.agendamentoId = agendamentoId;
    try {
      const [internsResponse, agendamentoResponse] = await Promise.all([
        fetch(`${RENDER_URL}/estagiarios`),
        fetch(`${RENDER_URL}/agendamentos/${agendamentoId}`),
      ]);

      if (!internsResponse.ok || !agendamentoResponse.ok) {
        throw new Error('Falha ao buscar dados');
      }

      const allInternsResult = await internsResponse.json();
      const agendamento = await agendamentoResponse.json();
      const internNames = Array.isArray(allInternsResult)
        ? allInternsResult.map((intern) => intern.name)
        : [];
      const responsibleInterns = JSON.parse(
        agendamento.responsible_interns || '[]'
      );

      renderizarListaModal(responsibleInterns, internNames);
      assignModal.style.display = 'flex';
    } catch (error) {
      console.error('Erro ao abrir modal:', error);
      customAlert('Erro ao carregar estagiários.', false);
    }
  }

  function renderizarListaModal(responsibleInterns, allInterns) {
    if (!modalInternList) return;
    modalInternList.innerHTML = '';
    if (!Array.isArray(allInterns)) return;

    allInterns.forEach((internName) => {
      const safeInternName = String(internName);
      const isAssigned = responsibleInterns.includes(safeInternName);
      modalInternList.innerHTML += `<li data-name="${safeInternName}">${safeInternName} <i class="fas ${
        isAssigned ? 'fa-user-minus' : 'fa-user-plus'
      }"></i></li>`;
    });
  }

  async function handleModalListClick(event) {
    const internListItem = event.target.closest('li');
    if (!internListItem || !assignModal) return;

    const internName = internListItem.dataset.name;
    const agendamentoId = assignModal.dataset.agendamentoId;

    if (!internName || !agendamentoId) return;

    try {
      await fetch(`${RENDER_URL}/agendamentos/${agendamentoId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internName, supervisorName: currentUserName }),
      });

      const updatedResponse = await fetch(
        `${RENDER_URL}/agendamentos/${agendamentoId}`
      );
      if (!updatedResponse.ok) throw new Error('Falha ao buscar atualização');
      const updatedAgendamento = await updatedResponse.json();
      const updatedInterns = JSON.parse(
        updatedAgendamento.responsible_interns || '[]'
      );

      const allInternsInModal = Array.from(modalInternList.children).map(
        (li) => li.dataset.name
      );

      renderizarListaModal(updatedInterns, allInternsInModal);
      carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao designar:', error);
      customAlert('Erro ao atualizar responsáveis.', false);
    }
  }

  function setupEventListeners() {
    document.body.addEventListener('click', handleBodyClick);

    const viewUpcomingBtn = document.getElementById('view-upcoming-btn');
    const viewPastBtn = document.getElementById('view-past-btn');

    if (viewUpcomingBtn && viewPastBtn) {
      viewUpcomingBtn.addEventListener('click', () => {
        carregarAgendamentos(null, 'upcoming');
        viewUpcomingBtn.classList.add('active');
        viewPastBtn.classList.remove('active');
      });

      viewPastBtn.addEventListener('click', () => {
        carregarAgendamentos(null, 'past');
        viewPastBtn.classList.add('active');
        viewUpcomingBtn.classList.remove('active');
      });
    }

    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
      searchBar.addEventListener('input', () => {
        const searchTerm = searchBar.value.toLowerCase();
        document.querySelectorAll('.event-card').forEach((el) => {
          el.style.display = el.textContent.toLowerCase().includes(searchTerm)
            ? 'flex'
            : 'none';
        });
      });
    }

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn && searchBar) {
      searchBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        searchBar.classList.toggle('active');
        if (searchBar.classList.contains('active')) searchBar.focus();
      });
    }

    if (assignModal) {
      assignModal.addEventListener('click', (event) => {
        if (
          event.target === assignModal ||
          event.target.closest('.modal-close-btn')
        ) {
          assignModal.style.display = 'none';
        }
      });
    }

    if (modalInternList) {
      modalInternList.addEventListener('click', handleModalListClick);
    }

    window.addEventListener('storage', (event) => {
      if (event.key === 'agendamentoAtualizado') carregarAgendamentos();
    });

    if (miniCalendar) {
      let dataAtual = new Date();
      const calendarMonthYear = document.getElementById('calendar-month-year');
      const calendarDaysGrid = document.getElementById('calendar-days-grid');
      const prevMonthBtn = document.getElementById('prev-month-btn');
      const nextMonthBtn = document.getElementById('next-month-btn');

      if (
        calendarMonthYear &&
        calendarDaysGrid &&
        prevMonthBtn &&
        nextMonthBtn
      ) {
        const renderizarCalendario = (ano, mes) => {
          const nomeDoMes = new Date(ano, mes).toLocaleString('pt-BR', {
            month: 'long',
          });
          calendarMonthYear.textContent = `${
            nomeDoMes.charAt(0).toUpperCase() + nomeDoMes.slice(1)
          } ${ano}`;
          calendarDaysGrid.innerHTML = '';
          const primeiroDiaDoMes = new Date(ano, mes, 1).getDay();
          const diasNoMes = new Date(ano, mes + 1, 0).getDate();
          for (let i = 0; i < primeiroDiaDoMes; i++) {
            calendarDaysGrid.insertAdjacentHTML('beforeend', '<li></li>');
          }
          for (let dia = 1; dia <= diasNoMes; dia++) {
            const hoje = new Date();
            const classeHoje =
              dia === hoje.getDate() &&
              mes === hoje.getMonth() &&
              ano === hoje.getFullYear()
                ? 'today'
                : '';
            calendarDaysGrid.insertAdjacentHTML(
              'beforeend',
              `<li class="${classeHoje}">${dia}</li>`
            );
          }
        };

        prevMonthBtn.addEventListener('click', () => {
          dataAtual.setMonth(dataAtual.getMonth() - 1);
          renderizarCalendario(dataAtual.getFullYear(), dataAtual.getMonth());
        });

        nextMonthBtn.addEventListener('click', () => {
          dataAtual.setMonth(dataAtual.getMonth() + 1);
          renderizarCalendario(dataAtual.getFullYear(), dataAtual.getMonth());
        });

        calendarDaysGrid.addEventListener('click', function (event) {
          const dayElement = event.target.closest('li');
          if (dayElement && dayElement.textContent) {
            const isAlreadyActive = dayElement.classList.contains('active');
            calendarDaysGrid
              .querySelector('.active')
              ?.classList.remove('active');
            if (isAlreadyActive) {
              carregarAgendamentos();
            } else {
              const ano = dataAtual.getFullYear();
              const mes = dataAtual.getMonth() + 1;
              const dia = dayElement.textContent;
              const dataISO = `${ano}-${String(mes).padStart(2, '0')}-${String(
                dia
              ).padStart(2, '0')}`;
              carregarAgendamentos(dataISO);
              dayElement.classList.add('active');
            }
          }
        });

        renderizarCalendario(dataAtual.getFullYear(), dataAtual.getMonth());
      }
    }
  }

  exibirDataAtual();
  setupSidebar();
  setupEventListeners();
  carregarAgendamentos();

  if (userRole === 'GESTOR_DE_CURSO') {
    carregarNotificacoesGestor();
    setInterval(carregarNotificacoesGestor, 60000);
  }
});

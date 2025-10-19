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

  function customConfirm(message) {
    return new Promise((resolve) => {
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

  const dashboardContainer = document.querySelector('.events-container');
  const prioritizedList = document.getElementById('prioritized-events-list');
  const miniCalendar = document.querySelector('.mini-calendar');
  const assignModal = document.getElementById('assign-modal');

  if (!assignModal) {
    console.error("ID 'assign-modal' não encontrado.");
    return;
  }

  const modalInternList = document.getElementById('modal-intern-list');
  const viewUpcomingBtn = document.getElementById('view-upcoming-btn');
  const viewPastBtn = document.getElementById('view-past-btn');
  const searchBar = document.getElementById('search-bar');
  const searchBtn = document.getElementById('search-btn');

  function formatarData(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  function formatarIntervaloDatas(startDate, endDate) {
    if (!startDate || !endDate) return '';
    const [startDia, startMes] = startDate.split('-').reverse().slice(0, 2);
    const [endDia, endMes] = endDate.split('-').reverse().slice(0, 2);
    if (startDate === endDate) {
      return `${startDia}/${startMes}`;
    }
    return `${startDia}/${startMes} a ${endDia}/${endMes}`;
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
    document.getElementById('current-date').textContent =
      dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  }

  function setupSidebar() {
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
      if (!response.ok) throw new Error('Falha ao buscar dados do servidor.');

      const agendamentos = await response.json();
      renderizarDashboard(agendamentos, dataSelecionada, view);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      dashboardContainer.innerHTML =
        '<h2 class="main-title">AGENDAMENTOS</h2><p style="color: red;">Não foi possível carregar os agendamentos.</p>';
    }
  }

  function renderizarDashboard(agendamentos, dataSelecionada, view) {
    const mainTitle = dashboardContainer.querySelector('.main-title');
    if (dataSelecionada)
      mainTitle.textContent = `AGENDAMENTOS PARA ${formatarData(
        dataSelecionada
      )}`;
    else if (view === 'past')
      mainTitle.textContent = 'HISTÓRICO DE AGENDAMENTOS';
    else mainTitle.textContent = 'PRÓXIMOS AGENDAMENTOS';

    document.querySelectorAll('.event-card').forEach((card) => card.remove());
    const noEventsMessage = dashboardContainer.querySelector('p');
    if (noEventsMessage) noEventsMessage.remove();

    prioritizedList.innerHTML = '';
    let prioritizedCount = 0;

    if (agendamentos.length === 0) {
      dashboardContainer.insertAdjacentHTML(
        'beforeend',
        '<p>Nenhum agendamento encontrado.</p>'
      );
    }

    agendamentos.forEach((ag) => {
      const cardHTML = criarCardHTML(ag);
      dashboardContainer.insertAdjacentHTML('beforeend', cardHTML);

      if (ag.is_prioritized && view !== 'past') {
        prioritizedCount++;
        const dataFormatada = formatarData(ag.startDate);
        const prioritizedItemHTML = `<div class="prioritized-item"><strong>${dataFormatada} - ${ag.startTime}h:</strong> ${ag.title} (${ag.location})</div>`;
        prioritizedList.insertAdjacentHTML('beforeend', prioritizedItemHTML);
      }
    });

    if (prioritizedCount === 0) {
      prioritizedList.innerHTML =
        '<p style="font-size: 13px; color: #888;">Nenhum evento priorizado.</p>';
    }
  }

  function criarCardHTML(ag) {
    const equipments = JSON.parse(ag.equipments);
    const checkedEquipments = JSON.parse(ag.equipments_checked || '[]');
    const interns = JSON.parse(ag.responsible_interns);

    let equipmentsHTML = '';
    if (userRole === 'SUPERVISOR' && equipments.length > 0) {
      const checklistItems = equipments
        .map((eq) => {
          const isChecked = checkedEquipments.includes(eq);
          return `<span class="equip-check-item ${
            isChecked ? 'checked' : ''
          }" data-equip="${eq}">
                  <i class="fas ${
                    isChecked ? 'fa-check-square' : 'fa-square'
                  }"></i> ${eq}
                </span>`;
        })
        .join('');
      equipmentsHTML = `<div class="equipment-checklist-container" data-id="${ag.id}">${checklistItems}</div>`;
    } else {
      equipmentsHTML = `<div class="event-equipments">${equipments
        .map((eq) => `<span class="equip-item">${eq}</span>`)
        .join('')}</div>`;
    }

    let assignHTML = '';
    if (userRole === 'ESTAGIARIO') {
      assignHTML = `<div class="assign-container"><button class="candidate-btn ${
        interns.includes(currentUserName) ? 'active' : ''
      }" data-id="${ag.id}">${
        interns.includes(currentUserName) ? 'Candidatado(a)' : 'Candidatar-se'
      }</button></div>`;
    } else if (userRole === 'SUPERVISOR') {
      let internListHTML =
        interns.length > 0
          ? interns.map((name) => `<li>${name}</li>`).join('')
          : '<span class="none">Nenhum responsável</span>';
      assignHTML = `<div class="assign-container responsible-list"><h4><span>Responsáveis:</span><button class="add-responsible-btn" data-id="${ag.id}" title="Designar estagiário">+</button></h4><ul>${internListHTML}</ul></div>`;
    }

    let notesHTML = '';
    if ((ag.notes && ag.notes.trim() !== '') || ag.presence) {
      const presenceMap = {
        inicio: 'Apenas no início',
        integral: 'Tempo integral',
        'nao-necessario': 'Não necessária',
      };
      const presenceText = presenceMap[ag.presence] || 'Não especificado';
      let notesContent = ag.notes
        ? `<div class="notes-section"><strong>Observações:</strong><p>${ag.notes}</p></div>`
        : '';
      notesHTML = `<button class="description-btn" data-target="desc-${ag.id}">DESCRIÇÃO</button><div class="description-content" id="desc-${ag.id}"><div class="description-box"><div class="presence-info"><strong>Presença:</strong> ${presenceText}</div>${notesContent}</div></div>`;
    }

    let supervisorActionsHTML = '';
    if (userRole === 'SUPERVISOR') {
      supervisorActionsHTML = `
        <div class="supervisor-actions">
          <div class="icon-button-group">
            <button class="delete-btn" data-id="${
              ag.id
            }" title="Excluir"><i class="fas fa-trash-alt"></i></button>
            <a href="form.html?id=${
              ag.id
            }" target="_blank" class="edit-btn" title="Editar"><i class="fas fa-pencil-alt"></i></a>
          </div>
          <button class="priority-btn ${
            ag.is_prioritized ? 'active' : ''
          }" data-id="${ag.id}" title="Priorizar">PRIORIDADE</button>
        </div>`;
    }

    return `
      <div class="event-card" data-id="${ag.id}">
        <div class="event-time">
          <span class="event-date-short">${formatarIntervaloDatas(
            ag.startDate,
            ag.endDate
          )}</span>
          <span>${ag.startTime}</span><span>${ag.endTime}</span>
        </div>
        <div class="event-status-bar"></div>
        <div class="event-details">
          <span class="event-location">${ag.location}</span>
          <span class="event-title">${ag.title}</span>
        </div>
        ${equipmentsHTML}
        <div class="event-actions-row">${assignHTML}${supervisorActionsHTML}</div>
        ${notesHTML}
      </div>`;
  }

  async function handleBodyClick(event) {
    const checkItem = event.target.closest('.equip-check-item');
    if (checkItem) return await toggleChecklistItem(checkItem);

    const priorityButton = event.target.closest('.priority-btn');
    if (priorityButton) return await togglePriority(priorityButton.dataset.id);

    const candidateButton = event.target.closest('.candidate-btn');
    if (candidateButton)
      return await toggleCandidacy(candidateButton.dataset.id);

    const deleteButton = event.target.closest('.delete-btn');
    if (deleteButton) return await deleteAgendamento(deleteButton.dataset.id);

    const descriptionToggle = event.target.closest('.description-btn');
    if (descriptionToggle)
      return descriptionToggle.nextElementSibling.classList.toggle('show');

    const addResponsibleBtn = event.target.closest('.add-responsible-btn');
    if (addResponsibleBtn)
      return await openAssignModal(addResponsibleBtn.dataset.id);
  }

  async function toggleChecklistItem(item) {
    const agendamentoId = item.closest('.equipment-checklist-container').dataset
      .id;
    const equipName = item.dataset.equip;
    try {
      const response = await fetch(
        `${RENDER_URL}/agendamentos/${agendamentoId}`
      );
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
          body: JSON.stringify({ equipmentsChecked: checkedEquipments }),
        }
      );

      item.classList.toggle('checked');
      const icon = item.querySelector('i');
      icon.className = `fas ${
        item.classList.contains('checked') ? 'fa-check-square' : 'fa-square'
      }`;
    } catch (error) {
      console.error('Erro ao alternar checklist:', error);
      customAlert('Não foi possível atualizar o status do equipamento.', false);
    }
  }

  async function togglePriority(id) {
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
    const querExcluir = await customConfirm(
      'Tem certeza que deseja excluir este agendamento?'
    );
    if (querExcluir) {
      try {
        await fetch(`${RENDER_URL}/agendamentos/${id}`, { method: 'DELETE' });
        await carregarAgendamentos();
        customAlert('Agendamento excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        customAlert('Não foi possível excluir o agendamento.', false);
      }
    }
  }

  async function openAssignModal(agendamentoId) {
    assignModal.dataset.agendamentoId = agendamentoId;
    try {
      const [internsResponse, agendamentoResponse] = await Promise.all([
        fetch(`${RENDER_URL}/estagiarios`),
        fetch(`${RENDER_URL}/agendamentos/${agendamentoId}`),
      ]);
      const allInterns = await internsResponse.json();
      const agendamento = await agendamentoResponse.json();
      const internNames = allInterns.map((intern) => intern.name);
      const responsibleInterns = JSON.parse(agendamento.responsible_interns);

      renderizarListaModal(responsibleInterns, internNames);
      assignModal.style.display = 'flex';
    } catch (error) {
      console.error('Erro ao abrir modal de designação:', error);
    }
  }

  function renderizarListaModal(responsibleInterns, allInterns) {
    modalInternList.innerHTML = '';
    allInterns.forEach((internName) => {
      const isAssigned = responsibleInterns.includes(internName);
      modalInternList.innerHTML += `<li data-name="${internName}">${internName} <i class="fas ${
        isAssigned ? 'fa-user-minus' : 'fa-user-plus'
      }"></i></li>`;
    });
  }

  async function handleModalListClick(event) {
    const internListItem = event.target.closest('li');
    if (!internListItem) return;

    const internName = internListItem.dataset.name;
    const agendamentoId = assignModal.dataset.agendamentoId;
    try {
      await fetch(`${RENDER_URL}/agendamentos/${agendamentoId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internName, supervisorName: currentUserName }),
      });
      await carregarAgendamentos();

      const updatedResponse = await fetch(
        `${RENDER_URL}/agendamentos/${agendamentoId}`
      );
      const updatedAgendamento = await updatedResponse.json();
      const updatedInterns = JSON.parse(updatedAgendamento.responsible_interns);
      const allInterns = Array.from(modalInternList.children).map(
        (li) => li.dataset.name
      );

      renderizarListaModal(updatedInterns, allInterns);
    } catch (error) {
      console.error('Erro ao designar/remover estagiário:', error);
    }
  }

  function setupEventListeners() {
    document.body.addEventListener('click', handleBodyClick);

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

    searchBar.addEventListener('input', () => {
      const searchTerm = searchBar.value.toLowerCase();
      document.querySelectorAll('.event-card').forEach((card) => {
        card.style.display = card.textContent.toLowerCase().includes(searchTerm)
          ? 'flex'
          : 'none';
      });
    });

    searchBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      searchBar.classList.toggle('active');
      if (searchBar.classList.contains('active')) searchBar.focus();
    });

    assignModal.addEventListener('click', (event) => {
      if (
        event.target === assignModal ||
        event.target.closest('.modal-close-btn')
      ) {
        assignModal.style.display = 'none';
      }
    });

    modalInternList.addEventListener('click', handleModalListClick);

    window.addEventListener('storage', (event) => {
      if (event.key === 'agendamentoAtualizado') carregarAgendamentos();
    });
  }

  function setupMiniCalendar() {
    if (!miniCalendar) return;

    let dataAtual = new Date();
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarDaysGrid = document.getElementById('calendar-days-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    function renderizarCalendario(ano, mes) {
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
    }

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
        calendarDaysGrid.querySelector('.active')?.classList.remove('active');

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

  exibirDataAtual();
  setupSidebar();
  setupEventListeners();
  setupMiniCalendar();
  carregarAgendamentos();
});

document.addEventListener('DOMContentLoaded', function () {
  const RENDER_URL = 'https://projeto-cjud-backend.onrender.com';

  const currentUserJSON = localStorage.getItem('currentUser');
  if (!currentUserJSON) {
    window.location.href = 'login.html';
    return;
  }
  const currentUser = JSON.parse(currentUserJSON);

  if (currentUser.role !== 'ESTAGIARIO') {
    window.location.href = 'index.html';
    return;
  }

  const currentUserName = currentUser.name;

  const tasksContainer = document.querySelector('.events-container');
  const remindersContainer = document.getElementById('reminders-container');

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
    document.querySelector('.profile-name').textContent = currentUser.name;
    document.querySelector('.profile-role').textContent = currentUser.role;

    const logoutButton = document.querySelector('.logout-link a');
    logoutButton.addEventListener('click', function (event) {
      event.preventDefault();
      localStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    });
  }

  function gerarLembretes(agendamentos, notificacoes) {
    remindersContainer.innerHTML = '';
    let lembretesGerados = 0;
    const agora = new Date();
    const dismissedReminders =
      JSON.parse(sessionStorage.getItem('dismissedReminders')) || [];

    notificacoes.forEach((notif) => {
      lembretesGerados++;
      remindersContainer.innerHTML += `<div class="reminder-card info"><button class="close-btn notification-btn" data-notification-id="${notif.id}">&times;</button><strong>Notificação:</strong> ${notif.message}</div>`;
    });

    agendamentos.forEach((ag) => {
      const reminderIdBase = `reminder-${ag.id}`;

      const priorityId = `${reminderIdBase}-priority`;
      if (ag.is_prioritized && !dismissedReminders.includes(priorityId)) {
        lembretesGerados++;
        remindersContainer.innerHTML += `<div class="reminder-card attention"><button class="close-btn" data-reminder-id="${priorityId}">&times;</button><strong>Atenção!</strong> A tarefa "${ag.title}" foi marcada como prioridade.</div>`;
      }

      const timeId = `${reminderIdBase}-time`;
      const eventDate = new Date(`${ag.startDate}T${ag.startTime}`);
      const diffHoras = (eventDate - agora) / (1000 * 60 * 60);
      if (
        diffHoras > 0 &&
        diffHoras <= 24 &&
        !dismissedReminders.includes(timeId)
      ) {
        lembretesGerados++;
        remindersContainer.innerHTML += `<div class="reminder-card time"><button class="close-btn" data-reminder-id="${timeId}">&times;</button><strong>Lembrete:</strong> A tarefa "${ag.title}" começa em menos de 24 horas.</div>`;
      }

      const notesId = `${reminderIdBase}-notes`;
      if (
        ag.notes &&
        ag.notes.trim() !== '' &&
        !dismissedReminders.includes(notesId)
      ) {
        lembretesGerados++;
        remindersContainer.innerHTML += `<div class="reminder-card notes"><button class="close-btn" data-reminder-id="${notesId}">&times;</button><strong>Pendente:</strong> A tarefa "${ag.title}" possui observações. Dê uma olhada!</div>`;
      }
    });

    if (lembretesGerados === 0) {
      remindersContainer.innerHTML =
        '<p style="font-size: 13px; color: #888;">Nenhum lembrete importante no momento.</p>';
    }
  }

  async function carregarMinhasTarefas() {
    try {
      const [tarefasResponse, notificacoesResponse] = await Promise.all([
        fetch(
          `${RENDER_URL}/minhas-tarefas?internName=${encodeURIComponent(
            currentUserName
          )}`
        ),
        fetch(
          `${RENDER_URL}/notifications?internName=${encodeURIComponent(
            currentUserName
          )}`
        ),
      ]);

      if (!tarefasResponse.ok || !notificacoesResponse.ok) {
        throw new Error('Falha ao buscar dados do servidor.');
      }

      const agendamentos = await tarefasResponse.json();
      const notificacoes = await notificacoesResponse.json();

      tasksContainer.innerHTML =
        '<h2 class="main-title">AGENDAMENTOS SOB SUA RESPONSABILIDADE</h2>';

      if (agendamentos.length === 0) {
        tasksContainer.insertAdjacentHTML(
          'beforeend',
          '<p>Você ainda não foi designado para nenhuma tarefa futura.</p>'
        );
      }

      agendamentos.forEach((ag) => {
        const equipments = JSON.parse(ag.equipments);
        const checkedEquipments = JSON.parse(ag.equipments_checked || '[]');

        let equipmentsHTML = '';
        if (equipments.length > 0) {
          const equipmentItemsHTML = equipments
            .map((eq) => {
              const safeEq = String(eq);
              const isChecked = checkedEquipments.includes(safeEq);
              return `<span class="equip-check-item ${
                isChecked ? 'checked' : ''
              }" data-equip="${safeEq}">
                      <i class="fas ${
                        isChecked ? 'fa-check-square' : 'fa-square'
                      }"></i> ${safeEq}
                    </span>`;
            })
            .join('');
          equipmentsHTML = `<div class="equipment-checklist-container" data-id="${ag.id}">${equipmentItemsHTML}</div>`;
        }

        const intervaloDatas = formatarIntervaloDatas(ag.startDate, ag.endDate);

        let notesHTML = '';
        if (
          (ag.notes && ag.notes.trim() !== '') ||
          ag.presence !== 'nao-necessario'
        ) {
          const presenceMap = {
            inicio: 'Apenas no início',
            integral: 'Tempo integral',
          };
          const presenceText = presenceMap[ag.presence] || 'Não especificado';
          let notesContent = '';
          if (ag.notes && ag.notes.trim() !== '') {
            notesContent = `<div class="notes-section"><strong>Observações:</strong><p>${ag.notes}</p></div>`;
          }
          notesHTML = `<button class="description-btn" data-target="desc-${ag.id}">DESCRIÇÃO</button><div class="description-content" id="desc-${ag.id}"><div class="description-box"><div class="presence-info"><strong>Presença:</strong> ${presenceText}</div>${notesContent}</div></div>`;
        }

        const cardHTML = `
          <div class="event-card assigned" data-id="${ag.id}">
            <div class="event-header">
              <div class="event-time">
                <span class="event-date-short">${intervaloDatas}</span>
                <span>${ag.startTime}</span>
                <span>${ag.endTime}</span>
              </div>
              <div class="event-status-bar"></div>
              <div class="event-details">
                <span class="event-location">${ag.location}</span>
                <span class="event-title">${ag.title}</span>
              </div>
              ${equipmentsHTML}
              <div class="event-top-right-actions">
                <div class="assign-container">
                  <button class="candidate-btn active" data-id="${ag.id}">Remover-me</button>
                </div>
              </div>
            </div>
            ${notesHTML}
          </div>`;
        tasksContainer.insertAdjacentHTML('beforeend', cardHTML);
      });

      gerarLembretes(agendamentos, notificacoes);
    } catch (error) {
      tasksContainer.innerHTML =
        '<h2 class="main-title">AGENDAMENTOS SOB SUA RESPONSABILIDADE</h2><p style="color: red;">Não foi possível carregar suas tarefas.</p>';
    }
  }

  async function handleReminderClick(event) {
    const closeButton = event.target.closest('.close-btn');
    if (closeButton) {
      const notificationId = closeButton.dataset.notificationId;
      if (notificationId) {
        try {
          await fetch(`${RENDER_URL}/notifications/${notificationId}/read`, {
            method: 'PUT',
          });
        } catch (error) {}
      }

      const reminderId = closeButton.dataset.reminderId;
      if (reminderId) {
        let dismissedReminders =
          JSON.parse(sessionStorage.getItem('dismissedReminders')) || [];
        if (!dismissedReminders.includes(reminderId)) {
          dismissedReminders.push(reminderId);
          sessionStorage.setItem(
            'dismissedReminders',
            JSON.stringify(dismissedReminders)
          );
        }
      }
      closeButton.parentElement.remove();
    }
  }

  async function toggleChecklistItem(item) {
    if (!item) return;
    const container = item.closest('.equipment-checklist-container');
    if (!container || !container.dataset.id) return;

    const agendamentoId = container.dataset.id;
    const equipName = item.dataset.equip;
    if (!agendamentoId || !equipName) return;

    try {
      const response = await fetch(
        `${RENDER_URL}/agendamentos/${agendamentoId}`
      );
      if (!response.ok)
        throw new Error('Agendamento não encontrado para checklist');
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
      if (icon)
        icon.className = `fas ${
          item.classList.contains('checked') ? 'fa-check-square' : 'fa-square'
        }`;
    } catch (error) {
      console.error('Erro ao alternar checklist:', error);
    }
  }

  async function handleBodyClick(event) {
    const checkItem = event.target.closest('.equip-check-item');
    if (checkItem) return await toggleChecklistItem(checkItem);

    const candidateButton = event.target.closest('.candidate-btn');
    if (candidateButton) {
      const id = candidateButton.dataset.id;
      try {
        await fetch(`${RENDER_URL}/agendamentos/${id}/assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internName: currentUserName }),
        });
        await carregarMinhasTarefas();
      } catch (error) {}
    }

    const descriptionToggle = event.target.closest('.description-btn');
    if (descriptionToggle) {
      const targetId = descriptionToggle.dataset.target;
      const content = document.getElementById(targetId);
      if (content) {
        content.classList.toggle('show');
      }
    }
  }

  exibirDataAtual();
  setupSidebar();
  carregarMinhasTarefas();
  remindersContainer.addEventListener('click', handleReminderClick);
  document.body.addEventListener('click', handleBodyClick);
});

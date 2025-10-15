// dashboard.js - VERSÃO COMPLETA E CORRIGIDA FINAL

document.addEventListener('DOMContentLoaded', function () {
  // --- LÓGICA DE AUTENTICAÇÃO ---
  const currentUserJSON = localStorage.getItem('currentUser');
  const currentUser = JSON.parse(currentUserJSON);

  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const userRole = currentUser.role;
  const currentUserName = currentUser.name;

  // --- REFERÊNCIAS AOS ELEMENTOS DO HTML ---
  const dashboardContainer = document.querySelector('.events-container');
  const prioritizedList = document.getElementById('prioritized-events-list');
  const miniCalendar = document.querySelector('.mini-calendar');
  const assignModal = document.getElementById('assign-modal');

  if (!assignModal) {
    console.error(
      "Erro Crítico: O elemento do popup com id='assign-modal' não foi encontrado no HTML."
    );
    return;
  }

  const modalCloseBtn = assignModal.querySelector('.modal-close-btn');
  const modalInternList = document.getElementById('modal-intern-list');

  // Lista de estagiários para o popup de designação
  const TODOS_OS_ESTAGIARIOS = [
    'Quetlin Pavinatto',
    'Lian Fernandes',
    'Guilherme Ferreira',
    'Guilherme Viana',
  ];

  // --- FUNÇÕES AUXILIARES DE FORMATAÇÃO DE DATA ---
  function formatarData(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  function formatarIntervaloDatas(startDate, endDate) {
    if (!startDate || !endDate) return '';
    const [startAno, startMes, startDia] = startDate.split('-');
    const [endAno, endMes, endDia] = endDate.split('-');
    if (startDate === endDate) {
      return `${startDia}/${startMes}`;
    }
    return `${startDia}/${startMes} a ${endDia}/${endMes}`;
  }

  // --- LÓGICA PRINCIPAL DO DASHBOARD ---
  if (dashboardContainer) {
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
    exibirDataAtual();

    document.querySelector('.profile-name').textContent = currentUserName;
    document.querySelector('.profile-role').textContent = userRole;

    if (userRole === 'SUPERVISOR') {
      const minhasTarefasLink = document.querySelector(
        'a[href="minhas-tarefas.html"]'
      );
      if (minhasTarefasLink) {
        minhasTarefasLink.parentElement.style.display = 'none';
      }
    }

    const equipeLink = document.querySelector('a[href="equipe.html"]');
    if (equipeLink && userRole === 'SUPERVISOR') {
      equipeLink.innerHTML = '<i class="fas fa-users"></i> Minha Equipe';
    }

    const logoutButton = document.querySelector('.logout-link a');
    logoutButton.addEventListener('click', function (event) {
      event.preventDefault();
      localStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    });

    async function carregarAgendamentos(
      dataSelecionada = null,
      view = 'upcoming'
    ) {
      try {
        let url = 'https://projeto-cjud-backend.onrender.com/agendamentos';
        const params = new URLSearchParams();
        if (dataSelecionada) {
          params.append('date', dataSelecionada);
        } else if (view === 'past') {
          params.append('view', 'past');
        }
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao buscar dados do servidor.');
        const agendamentos = await response.json();

        const mainTitle = dashboardContainer.querySelector('.main-title');
        if (dataSelecionada) {
          mainTitle.textContent = `AGENDAMENTOS PARA ${formatarData(
            dataSelecionada
          )}`;
        } else if (view === 'past') {
          mainTitle.textContent = `HISTÓRICO DE AGENDAMENTOS`;
        } else {
          mainTitle.textContent = `PRÓXIMOS AGENDAMENTOS`;
        }

        document
          .querySelectorAll('.event-card')
          .forEach((card) => card.remove());
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
          const equipments = JSON.parse(ag.equipments);
          const equipmentsHTML = equipments
            .map((eq) => `<span class="equip-item">${eq}</span>`)
            .join('');
          const interns = JSON.parse(ag.responsible_interns);
          let assignHTML = '';
          if (userRole === 'ESTAGIARIO') {
            if (interns.includes(currentUserName)) {
              assignHTML = `<div class="assign-container"><button class="candidate-btn active" data-id="${ag.id}">Candidatado(a)</button></div>`;
            } else {
              assignHTML = `<div class="assign-container"><button class="candidate-btn" data-id="${ag.id}">Candidatar-se</button></div>`;
            }
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
              inicio: 'Apenas no início do evento',
              integral: 'Durante o período integral do evento',
              'nao-necessario': 'Não é necessária a presença de um estagiário',
            };
            const presenceText = presenceMap[ag.presence] || 'Não especificado';
            let notesContent = '';
            if (ag.notes && ag.notes.trim() !== '') {
              notesContent = `<div class="notes-section"><strong>Observações:</strong><p>${ag.notes}</p></div>`;
            }
            notesHTML = `<button class="description-btn" data-target="desc-${ag.id}">DESCRIÇÃO</button><div class="description-content" id="desc-${ag.id}"><div class="description-box"><div class="presence-info"><strong>Presença do Estagiário:</strong> ${presenceText}</div>${notesContent}</div></div>`;
          }
          let supervisorActionsHTML = '';
          if (userRole === 'SUPERVISOR') {
            const buttonClass = ag.is_prioritized
              ? 'priority-btn active'
              : 'priority-btn';
            const priorityButton = `<button class="${buttonClass}" data-id="${ag.id}" title="Marcar como prioridade">PRIORIDADE</button>`;
            const editButton = `<a href="form.html?id=${ag.id}" target="_blank" rel="noopener noreferrer" class="edit-btn" title="Editar agendamento"><i class="fas fa-pencil-alt"></i></a>`;
            const deleteButton = `<button class="delete-btn" data-id="${ag.id}" title="Excluir agendamento"><i class="fas fa-trash-alt"></i></button>`;
            const iconButtons = `<div class="icon-button-group">${deleteButton}${editButton}</div>`;
            supervisorActionsHTML = `<div class="supervisor-actions">${iconButtons}${priorityButton}</div>`;
          }

          const intervaloDatas = formatarIntervaloDatas(
            ag.startDate,
            ag.endDate
          );
          const cardHTML = `<div class="event-card assigned" data-id="${ag.id}"><div class="event-time"><span class="event-date-short">${intervaloDatas}</span><span>${ag.startTime}</span><span>${ag.endTime}</span></div><div class="event-status-bar"></div><div class="event-details"><span class="event-location">${ag.location}</span><span class="event-title">${ag.title}</span></div><div class="event-equipments">${equipmentsHTML}</div><div class="event-actions-row">${assignHTML}${supervisorActionsHTML}</div>${notesHTML}</div>`;
          dashboardContainer.insertAdjacentHTML('beforeend', cardHTML);
          if (ag.is_prioritized && view !== 'past') {
            prioritizedCount++;
            const dataFormatada = formatarData(ag.startDate);
            const prioritizedItemHTML = `<div class="prioritized-item"><strong>${dataFormatada} - ${ag.startTime}h:</strong> ${ag.title} (${ag.location})</div>`;
            prioritizedList.insertAdjacentHTML(
              'beforeend',
              prioritizedItemHTML
            );
          }
        });
        if (prioritizedCount === 0) {
          prioritizedList.innerHTML =
            '<p style="font-size: 13px; color: #888;">Nenhum evento priorizado.</p>';
        }
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        dashboardContainer.innerHTML =
          '<h2 class="main-title">AGENDAMENTOS</h2><p style="color: red;">Não foi possível carregar os agendamentos. Verifique se o servidor está ligado.</p>';
      }
    }

    carregarAgendamentos();

    if (miniCalendar) {
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

    const viewUpcomingBtn = document.getElementById('view-upcoming-btn');
    const viewPastBtn = document.getElementById('view-past-btn');
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

    const searchBtn = document.getElementById('search-btn');
    const searchBar = document.getElementById('search-bar');
    searchBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      searchBar.classList.toggle('active');
      if (searchBar.classList.contains('active')) {
        searchBar.focus();
      }
    });
    searchBar.addEventListener('input', () => {
      const searchTerm = searchBar.value.toLowerCase();
      const allCards = document.querySelectorAll('.event-card');
      allCards.forEach((card) => {
        const cardText = card.textContent.toLowerCase();
        if (cardText.includes(searchTerm)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });

    document.body.addEventListener('click', async function (event) {
      if (event.target.closest('.search-container')) return;
      const priorityButton = event.target.closest('.priority-btn');
      if (priorityButton) {
        const id = priorityButton.dataset.id;
        try {
          await fetch(
            `https://projeto-cjud-backend.onrender.com/agendamentos/${id}/prioritize`,
            {
              method: 'PUT',
            }
          );
          await carregarAgendamentos();
        } catch (error) {
          console.error('Erro ao priorizar:', error);
        }
      }
      const candidateButton = event.target.closest('.candidate-btn');
      if (candidateButton) {
        const id = candidateButton.dataset.id;
        try {
          await fetch(
            `https://projeto-cjud-backend.onrender.com/agendamentos/${id}/assign`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ internName: currentUserName }),
            }
          );
          await carregarAgendamentos();
        } catch (error) {
          console.error('Erro ao se candidatar:', error);
        }
      }
      const deleteButton = event.target.closest('.delete-btn');
      if (deleteButton) {
        const id = deleteButton.dataset.id;
        const querExcluir = confirm(
          'Você tem certeza que deseja excluir este agendamento?\nEsta ação não pode ser desfeita.'
        );
        if (querExcluir) {
          try {
            await fetch(
              `https://projeto-cjud-backend.onrender.com/agendamentos/${id}`,
              {
                method: 'DELETE',
              }
            );
            await carregarAgendamentos();
          } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            alert('Não foi possível excluir o agendamento.');
          }
        }
      }
      const descriptionToggle = event.target.closest('.description-btn');
      if (descriptionToggle) {
        const targetId = descriptionToggle.dataset.target;
        const content = document.getElementById(targetId);
        if (content) {
          content.classList.toggle('show');
        }
      }

      const addResponsibleBtn = event.target.closest('.add-responsible-btn');
      if (addResponsibleBtn) {
        const agendamentoId = addResponsibleBtn.dataset.id;
        assignModal.dataset.agendamentoId = agendamentoId;
        const [internsResponse, agendamentoResponse] = await Promise.all([
          fetch('https://projeto-cjud-backend.onrender.com/estagiarios'),
          fetch(
            `https://projeto-cjud-backend.onrender.com/agendamentos/${agendamentoId}`
          ),
        ]);
        const allInterns = await internsResponse.json();
        const internNames = allInterns.map((intern) => intern.name);
        const agendamento = await agendamentoResponse.json();
        const responsibleInterns = JSON.parse(agendamento.responsible_interns);
        renderizarListaModal(responsibleInterns, internNames);
        assignModal.style.display = 'flex';
      }
    });

    function renderizarListaModal(responsibleInterns, allInterns) {
      modalInternList.innerHTML = '';
      allInterns.forEach((internName) => {
        const isAssigned = responsibleInterns.includes(internName);
        const iconHTML = isAssigned
          ? '<i class="fas fa-user-minus"></i>'
          : '<i class="fas fa-user-plus"></i>';
        modalInternList.innerHTML += `<li data-name="${internName}">${internName} ${iconHTML}</li>`;
      });
    }

    assignModal.addEventListener('click', function (event) {
      if (
        event.target === assignModal ||
        event.target.closest('.modal-close-btn')
      ) {
        assignModal.style.display = 'none';
      }
    });
    modalInternList.addEventListener('click', async function (event) {
      const internListItem = event.target.closest('li');
      if (internListItem) {
        const internName = internListItem.dataset.name;
        const agendamentoId = assignModal.dataset.agendamentoId;
        try {
          await fetch(
            `https://projeto-cjud-backend.onrender.com/agendamentos/${agendamentoId}/assign`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                internName: internName,
                supervisorName: currentUserName,
              }),
            }
          );
          const updatedResponse = await fetch(
            `https://projeto-cjud-backend.onrender.com/agendamentos/${agendamentoId}`
          );
          const updatedAgendamento = await updatedResponse.json();
          const updatedInterns = JSON.parse(
            updatedAgendamento.responsible_interns
          );

          const internsResponse = await fetch(
            'https://projeto-cjud-backend.onrender.com/estagiarios'
          );
          const allInterns = await internsResponse.json();
          const internNames = allInterns.map((intern) => intern.name);

          renderizarListaModal(updatedInterns, internNames);
          await carregarAgendamentos();
        } catch (error) {
          console.error('Erro ao designar/remover estagiário:', error);
        }
      }
    });

    window.addEventListener('storage', function (event) {
      if (event.key === 'agendamentoAtualizado') {
        carregarAgendamentos();
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('form');
  const dashboardContainer = document.querySelector('.events-container');
  const prioritizedList = document.getElementById('prioritized-events-list');

  // --- NOVA LÓGICA DE AUTENTICAÇÃO ---
  // 1. Pega os dados do usuário que foram salvos no login (no localStorage)
  const currentUserJSON = localStorage.getItem('currentUser');

  // 2. Converte os dados do usuário de texto para um objeto JavaScript
  const currentUser = JSON.parse(currentUserJSON);

  // 3. VERIFICAÇÃO DE SEGURANÇA: Se não há usuário logado, redireciona para o login
  // A condição !form garante que isso não aconteça na própria página de login (caso usássemos o mesmo script)
  if (!currentUser && !document.getElementById('login-form')) {
    window.location.href = 'login.html';
    return; // Para a execução do script para não dar erro
  }

  // 4. Substitui a simulação pelos dados REAIS do usuário logado
  const userRole = currentUser ? currentUser.role : null;
  const currentUserName = currentUser ? currentUser.name : null;
  // --- FIM DA LÓGICA DE AUTENTICAÇÃO ---

  function formatarData(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  if (dashboardContainer) {
    // --- ATUALIZA A SIDEBAR COM DADOS REAIS ---
    document.querySelector('.profile-name').textContent = currentUserName;
    document.querySelector('.profile-role').textContent = userRole;

    // --- LÓGICA DO BOTÃO SAIR ---
    const logoutButton = document.querySelector('.logout-link a');
    logoutButton.addEventListener('click', function (event) {
      event.preventDefault(); // Impede o link de fazer qualquer outra coisa
      localStorage.removeItem('currentUser'); // Limpa os dados do usuário do "porta-malas"
      window.location.href = 'login.html'; // Redireciona para a página de login
    });

    async function carregarAgendamentos() {
      try {
        const response = await fetch('http://localhost:3000/agendamentos');
        if (!response.ok) throw new Error('Falha ao buscar dados do servidor.');
        const agendamentos = await response.json();
        dashboardContainer.innerHTML =
          '<h2 class="main-title">AGENDAMENTOS</h2>';
        prioritizedList.innerHTML = '';
        let prioritizedCount = 0;
        if (agendamentos.length === 0) {
          dashboardContainer.insertAdjacentHTML(
            'beforeend',
            '<p>Nenhum agendamento futuro encontrado.</p>'
          );
        }
        agendamentos.forEach((ag) => {
          const equipments = JSON.parse(ag.equipments);
          const equipmentsHTML = equipments
            .map((eq) => `<span class="equip-item">${eq}</span>`)
            .join('');
          const interns = JSON.parse(ag.responsible_interns);
          let assignHTML = '';
          if (ag.presence !== 'nao-necessario') {
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
              assignHTML = `<div class="assign-container responsible-list"><h4>Responsáveis:</h4><ul>${internListHTML}</ul></div>`;
            }
          }
          let priorityButtonHTML = '';
          if (userRole === 'SUPERVISOR') {
            const buttonClass = ag.is_prioritized
              ? 'priority-btn active'
              : 'priority-btn';
            priorityButtonHTML = `<button class="${buttonClass}" data-id="${ag.id}" title="Marcar como prioridade">PRIORIDADE</button>`;
          }
          const cardHTML = `<div class="event-card assigned" data-id="${ag.id}"><div class="event-time"><span>${ag.startTime}</span><span>${ag.endTime}</span></div><div class="event-status-bar"></div><div class="event-details"><span class="event-location">${ag.location}</span><span class="event-title">${ag.title}</span></div><div class="event-equipments">${equipmentsHTML}</div>${assignHTML}${priorityButtonHTML}</div>`;
          dashboardContainer.insertAdjacentHTML('beforeend', cardHTML);
          if (ag.is_prioritized) {
            prioritizedCount++;
            const dataFormatada = formatarData(ag.date);
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
    document.body.addEventListener('click', async function (event) {
      const priorityButton = event.target.closest('.priority-btn');
      if (priorityButton) {
        const id = priorityButton.dataset.id;
        try {
          await fetch(`http://localhost:3000/agendamentos/${id}/prioritize`, {
            method: 'PUT',
          });
          await carregarAgendamentos();
        } catch (error) {
          console.error('Erro ao priorizar:', error);
        }
      }
      const candidateButton = event.target.closest('.candidate-btn');
      if (candidateButton) {
        const id = candidateButton.dataset.id;
        try {
          await fetch(`http://localhost:3000/agendamentos/${id}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ internName: currentUserName }),
          });
          await carregarAgendamentos();
        } catch (error) {
          console.error('Erro ao se candidatar:', error);
        }
      }
    });
  }

  if (form) {
  }
});

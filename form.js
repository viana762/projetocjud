document.addEventListener('DOMContentLoaded', function () {
  const RENDER_URL = 'https://projeto-cjud-backend.onrender.com';
  const form = document.getElementById('agendamento-form');
  if (!form) return;

  const currentUserJSON = localStorage.getItem('currentUser');
  const currentUser = JSON.parse(currentUserJSON);
  const schedulerEmail = currentUser ? currentUser.email : null;

  const urlParams = new URLSearchParams(window.location.search);
  const agendamentoId = urlParams.get('id');
  const isEditMode = agendamentoId !== null;

  const addLocationBtn = document.getElementById('add-location-btn');
  const locationSelect = document.getElementById('event-location');
  const newLocationInput = document.getElementById('new-location-input');
  const newLocationContainer = document.getElementById(
    'new-location-container'
  );
  const saveNewLocationBtn = document.getElementById('save-new-location-btn');

  if (addLocationBtn) {
    addLocationBtn.addEventListener('click', function () {
      newLocationContainer.style.display = 'flex';
      newLocationInput.focus();
    });
    saveNewLocationBtn.addEventListener('click', function () {
      const newLocationName = newLocationInput.value.trim();
      if (newLocationName !== '') {
        const newOption = document.createElement('option');
        newOption.value = newLocationName;
        newOption.textContent = newLocationName;
        locationSelect.appendChild(newOption);
        newOption.selected = true;
        newLocationInput.value = '';
        newLocationContainer.style.display = 'none';
      }
    });
  }

  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');

  function setDateRestrictions() {
    const hoje = new Date().toISOString().split('T')[0];
    if (!isEditMode) {
      startDateInput.min = hoje;
      endDateInput.min = hoje;
    }
    startDateInput.addEventListener('change', () => {
      endDateInput.min = startDateInput.value;
      if (endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
    });
  }

  async function preencherFormularioParaEdicao() {
    document.querySelector('.form-header h1').textContent =
      'Editar Agendamento';
    document.querySelector('button[type="submit"]').textContent =
      'Salvar Alterações';
    try {
      const response = await fetch(
        `${RENDER_URL}/agendamentos/${agendamentoId}`
      );
      if (!response.ok) return;

      const ag = await response.json();
      document.getElementById('event-title').value = ag.title;
      startDateInput.value = ag.startDate;
      endDateInput.value = ag.endDate;
      document.getElementById('start-time').value = ag.startTime;
      document.getElementById('end-time').value = ag.endTime;
      document.getElementById('event-location').value = ag.location;
      document.getElementById('event-notes').value = ag.notes;

      const equipments = JSON.parse(ag.equipments);
      equipments.forEach((equip) => {
        const checkbox = document.querySelector(
          `input[name="equip"][value="${equip}"]`
        );
        if (checkbox) checkbox.checked = true;
      });

      const radio = document.querySelector(
        `input[name="presenca"][value="${ag.presence}"]`
      );
      if (radio) radio.checked = true;
    } catch (error) {
      // não faz nada
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!isEditMode && !schedulerEmail) {
      return;
    }

    const formData = {
      title: document.getElementById('event-title').value,
      startDate: document.getElementById('start-date').value,
      endDate: document.getElementById('end-date').value,
      startTime: document.getElementById('start-time').value,
      endTime: document.getElementById('end-time').value,
      location: document.getElementById('event-location').value,
      equipments: Array.from(
        document.querySelectorAll('input[name="equip"]:checked')
      ).map((cb) => cb.value),
      presence: document.querySelector('input[name="presenca"]:checked').value,
      notes: document.getElementById('event-notes').value,
      ...(isEditMode ? {} : { schedulerEmail: schedulerEmail }),
    };

    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode
      ? `${RENDER_URL}/agendamentos/${agendamentoId}`
      : `${RENDER_URL}/agendamentos`;

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Falha na requisição');
      }

      localStorage.setItem('agendamentoAtualizado', Date.now());
      window.close();
    } catch (error) {
      // não faz nada
    }
  });

  setDateRestrictions();
  if (isEditMode) {
    preencherFormularioParaEdicao();
  }
});

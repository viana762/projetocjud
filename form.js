document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('agendamento-form');
  if (!form) return;

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

  const currentUserJSON = localStorage.getItem('currentUser');
  const currentUser = currentUserJSON ? JSON.parse(currentUserJSON) : null;

  if (!currentUser) {
    customAlert(
      'Erro: Utilizador não autenticado. Por favor, faça o login novamente.',
      false
    );
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return;
  }
  const schedulerEmail = currentUser.email;

  const urlParams = new URLSearchParams(window.location.search);
  const agendamentoId = urlParams.get('id');
  const duplicateId = urlParams.get('duplicateId');
  const isEditMode = agendamentoId !== null;
  const isDuplicateMode = duplicateId !== null;

  const addLocationBtn = document.getElementById('add-location-btn');
  const locationSelect = document.getElementById('event-location');
  const newLocationInput = document.getElementById('new-location-input');
  const newLocationContainer = document.getElementById(
    'new-location-container'
  );
  const saveNewLocationBtn = document.getElementById('save-new-location-btn');

  const startTimeSelect = document.getElementById('start-time');
  const endTimeSelect = document.getElementById('end-time');

  function populateTimeSelects(selectElement) {
    if (!selectElement) return;

    const startTime = 8;
    const endTime = 19;

    selectElement.innerHTML =
      '<option value="" disabled selected>Selecione...</option>';

    for (let hour = startTime; hour <= endTime; hour++) {
      const hourStr = String(hour).padStart(2, '0');
      const option00 = document.createElement('option');
      option00.value = `${hourStr}:00`;
      option00.textContent = `${hourStr}:00`;
      selectElement.appendChild(option00);

      if (hour < endTime) {
        const option30 = document.createElement('option');
        option30.value = `${hourStr}:30`;
        option30.textContent = `${hourStr}:30`;
        selectElement.appendChild(option30);
      }
    }
  }

  populateTimeSelects(startTimeSelect);
  populateTimeSelects(endTimeSelect);

  if (
    addLocationBtn &&
    newLocationContainer &&
    newLocationInput &&
    saveNewLocationBtn &&
    locationSelect
  ) {
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
        locationSelect.value = newLocationName;
        newLocationInput.value = '';
        newLocationContainer.style.display = 'none';
      }
    });
  }
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');

  function setDateRestrictions() {
    if (!startDateInput || !endDateInput) return;
    const hoje = new Date().toISOString().split('T')[0];
    if (!isEditMode && !isDuplicateMode) {
      startDateInput.min = hoje;
    }
    startDateInput.addEventListener('change', () => {
      endDateInput.min = startDateInput.value;
      if (endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
    });
    if (startDateInput.value) {
      endDateInput.min = startDateInput.value;
    }
  }
  setDateRestrictions();

  async function preencherFormulario() {
    const idParaBuscar = isEditMode ? agendamentoId : duplicateId;
    if (!idParaBuscar) return;

    if (isEditMode) {
      const formTitle = document.querySelector('.form-header h1');
      const submitButton = document.querySelector('button[type="submit"]');
      if (formTitle) formTitle.textContent = 'Editar Agendamento';
      if (submitButton) submitButton.textContent = 'Salvar Alterações';
    }

    try {
      const response = await fetch(
        `${RENDER_URL}/agendamentos/${idParaBuscar}`
      );
      if (!response.ok) throw new Error('Agendamento não encontrado.');

      const ag = await response.json();

      const eventTitleInput = document.getElementById('event-title');
      const notesTextArea = document.getElementById('event-notes');
      const grupoEventoInput = document.getElementById('grupo-evento');

      if (eventTitleInput) eventTitleInput.value = ag.title || '';
      if (startDateInput) startDateInput.value = ag.startDate || '';
      if (endDateInput) endDateInput.value = ag.endDate || '';
      if (notesTextArea) notesTextArea.value = ag.notes || '';
      if (grupoEventoInput) grupoEventoInput.value = ag.grupo_evento || '';

      if (locationSelect) {
        let optionExists = false;
        for (let i = 0; i < locationSelect.options.length; i++) {
          if (locationSelect.options[i].value === ag.location) {
            optionExists = true;
            break;
          }
        }
        if (!optionExists && ag.location) {
          const newOption = document.createElement('option');
          newOption.value = ag.location;
          newOption.textContent = ag.location;
          locationSelect.appendChild(newOption);
        }
        locationSelect.value = ag.location || '';
      }

      if (startTimeSelect) startTimeSelect.value = ag.startTime || '';
      if (endTimeSelect) endTimeSelect.value = ag.endTime || '';

      const equipments = JSON.parse(ag.equipments || '[]');
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

      setDateRestrictions();
    } catch (error) {
      console.error('Erro ao buscar dados para preencher:', error);
      customAlert('Não foi possível carregar os dados do agendamento.', false);
    }
  }

  if (isEditMode || isDuplicateMode) {
    preencherFormulario();
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!schedulerEmail) {
      customAlert(
        'Erro de autenticação: E-mail do agendador não encontrado.',
        false
      );
      return;
    }

    const startTimeValue = startTimeSelect?.value || '';
    const endTimeValue = endTimeSelect?.value || '';

    if (
      startDateInput.value === endDateInput.value &&
      startTimeValue >= endTimeValue
    ) {
      customAlert(
        'O horário de fim deve ser posterior ao horário de início no mesmo dia.',
        false
      );
      return;
    }

    const formData = {
      title: document.getElementById('event-title')?.value || '',
      startDate: startDateInput?.value || '',
      endDate: endDateInput?.value || '',
      startTime: startTimeValue,
      endTime: endTimeValue,
      location: locationSelect?.value || '',
      grupo_evento: document.getElementById('grupo-evento')?.value || null,
      equipments: Array.from(
        document.querySelectorAll('input[name="equip"]:checked')
      ).map((cb) => cb.value),
      presence:
        document.querySelector('input[name="presenca"]:checked')?.value ||
        'inicio',
      notes: document.getElementById('event-notes')?.value || '',
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

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.indexOf('application/json') !== -1) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok)
        throw new Error(data.message || 'Erro desconhecido do servidor');

      customAlert(data.message || 'Operação realizada com sucesso!', true);

      if (window.opener && !window.opener.closed) {
        try {
          window.opener.localStorage.setItem(
            'agendamentoAtualizado',
            Date.now()
          );
        } catch (e) {
          console.warn(
            'Não foi possível notificar a janela principal (pode estar fechada ou ser de origem diferente).'
          );
        }
      }

      setTimeout(() => {
        if (window.opener && !window.opener.closed) {
          window.close();
        } else {
          window.location.href = 'index.html';
        }
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      customAlert(
        `Ocorreu um erro ao salvar: ${error.message || 'Erro desconhecido'}`,
        false
      );
    }
  });
});

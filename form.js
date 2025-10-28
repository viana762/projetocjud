document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('agendamento-form');
  if (!form) return;

  const RENDER_URL = 'https://projeto-cjud-backend.onrender.com';

  const EQUIPMENT_LIST = [
    'Projetor',
    'Sistema de Som',
    'Microfone sem Fio',
    'Microfone com Fio',
    'Passador de Slides',
    'Webcam para Transmissão',
  ];

  const EQUIPMENT_ICONS = {
    Projetor: 'fa-video',
    'Sistema de Som': 'fa-volume-up',
    'Microfone sem Fio': 'fa-microphone',
    'Microfone com Fio': 'fa-microphone',
    'Passador de Slides': 'fa-hand-pointer',
    'Webcam para Transmissão': 'fa-camera',
  };

  const EQUIPMENT_LIMITS = {
    Projetor: 1,
    'Sistema de Som': 2,
    'Microfone sem Fio': 2,
    'Microfone com Fio': 2,
    'Passador de Slides': 1,
    'Webcam para Transmissão': 999,
  };

  const equipmentQuantities = {};
  EQUIPMENT_LIST.forEach((equip) => {
    equipmentQuantities[equip] = 1;
  });

  function customAlert(message, isSuccess = true) {
    document
      .querySelectorAll('.custom-alert')
      .forEach((alert) => alert.remove());
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert ${isSuccess ? 'success' : 'error'}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 3000);
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
  const schedulerRole = currentUser.role;

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
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');

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
      checkEquipmentAvailability();
    });
    if (startDateInput.value) {
      endDateInput.min = startDateInput.value;
    }
  }
  setDateRestrictions();

  function renderEquipamentos() {
    const container = document.getElementById('equipamentos-container');
    if (!container) return;
    container.innerHTML = '';
    EQUIPMENT_LIST.forEach((equipName) => {
      const equipItem = document.createElement('div');
      equipItem.className = 'equipment-card';
      equipItem.id = `equip-${equipName}`;
      const iconClass = EQUIPMENT_ICONS[equipName] || 'fa-box';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'equip';
      checkbox.value = equipName;
      checkbox.className = 'equipment-checkbox';
      checkbox.addEventListener('change', () => {
        checkEquipmentAvailability();
        updateFormEquipments();
      });
      const iconSpan = document.createElement('span');
      iconSpan.className = 'equipment-icon';
      iconSpan.innerHTML = `<i class="fas ${iconClass}"></i>`;
      const infoDiv = document.createElement('div');
      infoDiv.className = 'equipment-info';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'equipment-name';
      nameSpan.textContent = equipName;
      const availSpan = document.createElement('span');
      availSpan.className = 'equipment-availability';
      availSpan.textContent = 'Selecione data e horário';
      availSpan.id = `avail-${equipName}`;
      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(availSpan);
      const quantityControl = document.createElement('div');
      quantityControl.className = 'quantity-control';
      quantityControl.id = `qty-control-${equipName}`;
      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'quantity-btn';
      minusBtn.textContent = '−';
      minusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (equipmentQuantities[equipName] > 1) {
          equipmentQuantities[equipName]--;
          updateQuantityDisplay(equipName);
          checkEquipmentAvailability();
          updateFormEquipments();
        }
      });
      const quantityDisplay = document.createElement('span');
      quantityDisplay.className = 'quantity-display';
      quantityDisplay.textContent = '1';
      quantityDisplay.id = `qty-${equipName}`;
      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'quantity-btn';
      plusBtn.textContent = '+';
      plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const maxAvailable = getMaxAvailableQuantity(equipName);
        if (equipmentQuantities[equipName] < maxAvailable) {
          equipmentQuantities[equipName]++;
          updateQuantityDisplay(equipName);
          checkEquipmentAvailability();
          updateFormEquipments();
        }
      });
      quantityControl.appendChild(minusBtn);
      quantityControl.appendChild(quantityDisplay);
      quantityControl.appendChild(plusBtn);
      const topDiv = document.createElement('div');
      topDiv.className = 'equipment-top';
      topDiv.appendChild(checkbox);
      topDiv.appendChild(iconSpan);
      topDiv.appendChild(infoDiv);
      equipItem.appendChild(topDiv);
      equipItem.appendChild(quantityControl);
      container.appendChild(equipItem);
    });
    checkEquipmentAvailability();
  }

  function getMaxAvailableQuantity(equipName) {
    const maxLimit = EQUIPMENT_LIMITS[equipName] || 1;
    return maxLimit;
  }

  function updateQuantityDisplay(equipName) {
    const display = document.getElementById(`qty-${equipName}`);
    if (display) {
      display.textContent = equipmentQuantities[equipName];
    }
  }

  function toggleQuantityControl(equipName, show) {
    const control = document.getElementById(`qty-control-${equipName}`);
    if (control) {
      control.style.display = show ? 'flex' : 'none';
    }
  }

  async function checkEquipmentAvailability() {
    const data = startDateInput?.value;
    const horaInicio = startTimeSelect?.value;
    const horaFim = endTimeSelect?.value;

    if (!data || !horaInicio || !horaFim) {
      EQUIPMENT_LIST.forEach((equipName) => {
        const availSpan = document.getElementById(`avail-${equipName}`);
        if (availSpan) {
          availSpan.textContent = 'Selecione data e horário';
          availSpan.className = 'equipment-availability';
        }
      });
      return;
    }

    try {
      const response = await fetch(
        `${RENDER_URL}/equipamentos-disponiveis?data=${data}&horaInicio=${horaInicio}&horaFim=${horaFim}`
      );
      if (!response.ok) throw new Error('Erro ao buscar disponibilidade');
      const disponibilidade = await response.json();

      EQUIPMENT_LIST.forEach((equipName) => {
        const equipItem = document.getElementById(`equip-${equipName}`);
        const availSpan = document.getElementById(`avail-${equipName}`);
        const checkbox = equipItem?.querySelector('input[type="checkbox"]');
        const maxLimit = EQUIPMENT_LIMITS[equipName] || 1;

        if (!disponibilidade[equipName]) {
          if (availSpan) {
            availSpan.textContent = 'Equipamento não encontrado';
            availSpan.className = 'equipment-availability';
          }
          return;
        }

        const { total, disponivel, reservados } = disponibilidade[equipName];
        const quantidadeSolicitada = equipmentQuantities[equipName] || 1;
        const podeReservar = disponivel >= quantidadeSolicitada;

        if (availSpan) {
          availSpan.textContent = `${disponivel}/${total} disponível(is)`;
          availSpan.className = 'equipment-availability';
          if (podeReservar) {
            availSpan.classList.add('available');
            availSpan.classList.remove('warning');
          } else {
            availSpan.classList.add('warning');
            availSpan.classList.remove('available');
            availSpan.textContent = `${disponivel}/${total} disponível(is) - Insuficiente!`;
          }
        }

        if (equipItem) {
          if (podeReservar) {
            equipItem.classList.remove('unavailable');
          } else {
            equipItem.classList.add('unavailable');
          }
          if (checkbox && !podeReservar && checkbox.checked) {
            checkbox.checked = false;
            updateFormEquipments();
          }
          if (checkbox) {
            checkbox.disabled = !podeReservar;
          }
        }

        if (maxLimit === 1) {
          toggleQuantityControl(equipName, false);
        } else {
          toggleQuantityControl(equipName, true);
        }

        if (reservados.length > 0 && availSpan) {
          let existingTooltip =
            availSpan.parentElement?.querySelector('.conflict-tooltip');
          if (existingTooltip) existingTooltip.remove();
          const tooltip = document.createElement('div');
          tooltip.className = 'conflict-tooltip';
          const conflitosText = reservados
            .map((r) => `${r.agendamento} (${r.horario})`)
            .join(', ');
          tooltip.innerHTML = `⚠️ Já reservado: ${conflitosText}`;
          availSpan.parentElement?.appendChild(tooltip);
        } else {
          let existingTooltip =
            availSpan?.parentElement?.querySelector('.conflict-tooltip');
          if (existingTooltip) existingTooltip.remove();
        }
      });
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      EQUIPMENT_LIST.forEach((equipName) => {
        const availSpan = document.getElementById(`avail-${equipName}`);
        if (availSpan) {
          availSpan.textContent = 'Erro ao carregar';
          availSpan.className = 'equipment-availability';
        }
      });
    }
  }

  function updateFormEquipments() {
    const equipmentForm = EQUIPMENT_LIST.filter((equipName) => {
      const checkbox = document.querySelector(
        `input[name="equip"][value="${equipName}"]`
      );
      return checkbox && checkbox.checked;
    }).map((equipName) => ({
      name: equipName,
      quantity: equipmentQuantities[equipName] || 1,
    }));
  }

  startTimeSelect?.addEventListener('change', checkEquipmentAvailability);
  endTimeSelect?.addEventListener('change', checkEquipmentAvailability);

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
        const equipName = typeof equip === 'string' ? equip : equip.name;
        const quantity = typeof equip === 'object' ? equip.quantity : 1;
        const checkbox = document.querySelector(
          `input[name="equip"][value="${equipName}"]`
        );
        if (checkbox) {
          checkbox.checked = true;
          equipmentQuantities[equipName] = quantity;
          updateQuantityDisplay(equipName);
        }
      });

      const radio = document.querySelector(
        `input[name="presenca"][value="${ag.presence}"]`
      );
      if (radio) radio.checked = true;

      setDateRestrictions();
      checkEquipmentAvailability();
    } catch (error) {
      console.error('Erro ao buscar dados para preencher:', error);
      customAlert('Não foi possível carregar os dados do agendamento.', false);
    }
  }

  renderEquipamentos();

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

    const equipmentsForm = EQUIPMENT_LIST.filter((equipName) => {
      const checkbox = document.querySelector(
        `input[name="equip"][value="${equipName}"]`
      );
      return checkbox && checkbox.checked;
    }).map((equipName) => ({
      name: equipName,
      quantity: equipmentQuantities[equipName] || 1,
    }));

    const formData = {
      title: document.getElementById('event-title')?.value || '',
      startDate: startDateInput?.value || '',
      endDate: endDateInput?.value || '',
      startTime: startTimeValue,
      endTime: endTimeValue,
      location: locationSelect?.value || '',
      grupo_evento: document.getElementById('grupo-evento')?.value || null,
      equipments: equipmentsForm,
      presence:
        document.querySelector('input[name="presenca"]:checked')?.value ||
        'inicio',
      notes: document.getElementById('event-notes')?.value || '',
      ...(isEditMode
        ? { editorEmail: schedulerEmail, editorRole: schedulerRole }
        : { schedulerEmail: schedulerEmail }),
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
          window.opener.location.reload();
        } catch (e) {
          console.warn('Não foi possível notificar a janela principal.');
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

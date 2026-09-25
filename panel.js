(() => {
  const id = name => document.getElementById(`quick-actions-${name}`);
  const base = '/api/addons/quick-actions';
  let currentButtons = [];
  let feedbackTimer;
  let railActionRemovers = [];
  const runningButtons = new Set();
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const railAddonSection = document.querySelector('[data-command-section="addons"]');

  function createBar(name, parent, prepend = false) {
    const bar = document.createElement('div');
    bar.id = `quick-actions-${name}-bar`;
    bar.className = `quick-actions-live-bar quick-actions-${name}-bar`;
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Quick actions');
    bar.hidden = true;
    if (prepend) parent.prepend(bar);
    else parent.append(bar);
    return bar;
  }

  const bars = [
    createBar('desktop', document.querySelector('.composer-tools'), true),
    createBar('mobile', document.getElementById('mobile-quick-actions-slot') || document.querySelector('.mobile-chat-actions'), true),
    createBar('visual', document.getElementById('visual-chat')),
  ];
  const toast = document.createElement('div');
  toast.id = 'quick-actions-toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  document.body.append(toast);

  async function api(path, options = {}) {
    const response = await fetch(base + path, options);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Quick Actions request failed.');
    return payload;
  }

  function setStatus(message, type = '') {
    id('status').textContent = message;
    id('status').dataset.type = type;
  }

  function showFeedback(message, type = '') {
    setStatus(message, type);
    toast.textContent = message;
    toast.dataset.type = type;
    toast.hidden = false;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  }

  function isConfigured(button) {
    if (!button.enabled) return false;
    if (button.action_type === 'home_assistant') {
      return Boolean(button.ha_url && button.ha_service && button.ha_token_set);
    }
    return Boolean(button.command?.trim());
  }

  function showChat() {
    if (document.getElementById('view-addon-quick-actions').classList.contains('active-view')) {
      document.querySelector('.nav-button[data-view="chat"]')?.click();
    }
  }

  async function runButton(buttonId, trigger = null) {
    if (runningButtons.has(buttonId)) return;
    runningButtons.add(buttonId);
    if (trigger) trigger.disabled = true;
    try {
      const result = await api('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          button_id: buttonId,
          surface: window.matchMedia('(max-width: 760px)').matches ? 'mobile_petey' : 'petey_desktop',
        }),
      });
      showChat();
      showFeedback(result.message || 'Quick action sent to PETEY.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
    } finally {
      runningButtons.delete(buttonId);
      if (trigger) trigger.disabled = false;
    }
  }

  function commandRailEnabled() {
    return !mobileViewport.matches
      && document.documentElement.dataset.commandRail !== 'disabled'
      && !railAddonSection?.hidden
      && typeof window.peteyInterface?.registerAction === 'function';
  }

  function clearRailActions() {
    for (const remove of railActionRemovers) remove();
    railActionRemovers = [];
  }

  function registerRailActions(buttons) {
    clearRailActions();
    if (!commandRailEnabled()) return false;
    railActionRemovers = buttons.map(button => window.peteyInterface.registerAction({
      id: `quick-actions-${button.id}`,
      label: button.label,
      icon: button.icon || '⚡',
      onClick: () => runButton(button.id),
    }));
    return true;
  }

  function renderLiveBars(buttons) {
    const available = buttons.filter(isConfigured);
    const usingRail = registerRailActions(available);
    for (const bar of bars) {
      bar.replaceChildren();
      bar._closeMenu = null;
      const desktopFallback = bar.classList.contains('quick-actions-desktop-bar');
      const visualDesktopFallback = bar.classList.contains('quick-actions-visual-bar') && !mobileViewport.matches;
      const hiddenByRail = usingRail && (desktopFallback || visualDesktopFallback);
      bar.hidden = !available.length || hiddenByRail;
      if (!available.length || hiddenByRail) continue;
      const compact = true;
      const menu = compact ? document.createElement('div') : bar;
      if (compact) {
        menu.className = 'quick-actions-menu';
        menu.hidden = true;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'quick-actions-menu-toggle';
        toggle.setAttribute('aria-label', `Quick actions, ${available.length} available`);
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '⚡';
        const closeMenu = () => {
          menu.hidden = true;
          toggle.setAttribute('aria-expanded', 'false');
        };
        toggle.addEventListener('click', () => {
          const opening = menu.hidden;
          document.querySelectorAll('.quick-actions-menu').forEach(other => { other.hidden = true; });
          document.querySelectorAll('.quick-actions-menu-toggle').forEach(other => other.setAttribute('aria-expanded', 'false'));
          if (opening) {
            if (!bar.closest('.mobile-quick-actions-slot') && !bar.classList.contains('quick-actions-desktop-bar')) {
              menu.style.top = `${Math.round(toggle.getBoundingClientRect().bottom + 8)}px`;
            }
            menu.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
          }
        });
        menu.addEventListener('click', event => event.stopPropagation());
        bar.append(toggle, menu);
        bar._closeMenu = closeMenu;
      }
      for (const button of available) {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'quick-actions-bar-button';
        action.textContent = `${button.icon} ${button.label}`;
        action.title = button.label;
        action.addEventListener('click', () => {
          if (compact) bar._closeMenu();
          runButton(button.id, action);
        });
        menu.append(action);
      }
    }
  }

  document.addEventListener('pointerdown', event => {
    for (const bar of bars) {
      if (!bar._closeMenu || bar.contains(event.target)) continue;
      bar._closeMenu();
    }
  });
  function syncPlacement() {
    bars.forEach(bar => bar._closeMenu?.());
    renderLiveBars(currentButtons);
  }

  window.addEventListener('resize', () => bars.forEach(bar => bar._closeMenu?.()));
  mobileViewport.addEventListener('change', syncPlacement);
  window.addEventListener('petey:interface-ready', syncPlacement);
  const placementObserver = new MutationObserver(syncPlacement);
  placementObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-command-rail'],
  });
  if (railAddonSection) {
    placementObserver.observe(railAddonSection, {attributes: true, attributeFilter: ['hidden']});
  }

  function renderButtonConfig(button, index) {
    const card = document.createElement('div');
    card.className = 'quick-actions-card';
    card.dataset.buttonId = button.id;

    const header = document.createElement('div');
    header.className = 'quick-actions-card-header';

    const title = document.createElement('h3');
    title.textContent = `Button ${index + 1}`;

    const toggle = document.createElement('label');
    toggle.className = 'quick-actions-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = button.enabled;
    checkbox.dataset.field = 'enabled';
    const slider = document.createElement('span');
    slider.className = 'quick-actions-slider';
    toggle.append(checkbox, slider);
    header.append(title, toggle);

    const fields = document.createElement('div');
    fields.className = 'quick-actions-fields';

    const labelField = document.createElement('label');
    labelField.className = 'full-field';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = 'Label';
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = button.label;
    labelInput.dataset.field = 'label';
    labelInput.maxLength = 32;
    labelInput.placeholder = 'Button label';
    labelField.append(labelSpan, labelInput);

    const iconField = document.createElement('label');
    iconField.className = 'full-field';
    const iconSpan = document.createElement('span');
    iconSpan.textContent = 'Icon (emoji or text)';
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.value = button.icon;
    iconInput.dataset.field = 'icon';
    iconInput.maxLength = 4;
    iconInput.placeholder = '⚡';
    iconField.append(iconSpan, iconInput);

    const typeField = document.createElement('label');
    typeField.className = 'full-field';
    const typeSpan = document.createElement('span');
    typeSpan.textContent = 'Action Type';
    const typeSelect = document.createElement('select');
    typeSelect.dataset.field = 'action_type';
    for (const [value, label] of [
      ['text_command', 'Text Command'],
      ['task', 'Task'],
      ['home_assistant', 'Home Assistant API Call'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = button.action_type === value;
      typeSelect.append(option);
    }
    typeField.append(typeSpan, typeSelect);

    fields.append(labelField, iconField, typeField);

    const actionConfig = document.createElement('div');
    actionConfig.className = 'quick-actions-action-config';
    actionConfig.id = `quick-actions-config-${button.id}`;
    renderActionFields(actionConfig, button);

    const actions = document.createElement('div');
    actions.className = 'quick-actions-card-actions';
    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'secondary-button';
    testBtn.textContent = 'Run';
    testBtn.addEventListener('click', () => runButton(button.id, testBtn));
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'primary-button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => saveButton(card));
    actions.append(testBtn, saveBtn);

    card.append(header, fields, actionConfig, actions);
    return card;
  }

  function renderActionFields(container, button) {
    container.innerHTML = '';
    if (button.action_type === 'text_command' || button.action_type === 'task') {
      const commandField = document.createElement('label');
      commandField.className = 'full-field';
      const commandSpan = document.createElement('span');
      commandSpan.textContent = button.action_type === 'text_command' ? 'Message to send' : 'Task description';
      const commandInput = document.createElement('textarea');
      commandInput.value = button.command || '';
      commandInput.dataset.field = 'command';
      commandInput.maxLength = 500;
      commandInput.rows = 3;
      commandInput.placeholder = button.action_type === 'text_command'
        ? 'Enter the message Petey should send...'
        : 'Describe the task Petey should perform...';
      commandField.append(commandSpan, commandInput);
      container.append(commandField);
    } else if (button.action_type === 'home_assistant') {
      const urlField = document.createElement('label');
      urlField.className = 'full-field';
      const urlSpan = document.createElement('span');
      urlSpan.textContent = 'Home Assistant URL';
      const urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.value = button.ha_url || '';
      urlInput.dataset.field = 'ha_url';
      urlInput.placeholder = 'http://homeassistant.local:8123';
      urlField.append(urlSpan, urlInput);

      const tokenField = document.createElement('label');
      tokenField.className = 'full-field';
      const tokenSpan = document.createElement('span');
      tokenSpan.textContent = 'Long-lived Access Token';
      const tokenInput = document.createElement('input');
      tokenInput.type = 'password';
      tokenInput.value = '';
      tokenInput.dataset.field = 'ha_token';
      tokenInput.placeholder = button.ha_token_set ? '•••••••• (saved)' : 'Enter token...';
      tokenField.append(tokenSpan, tokenInput);

      const serviceField = document.createElement('label');
      serviceField.className = 'full-field';
      const serviceSpan = document.createElement('span');
      serviceSpan.textContent = 'Service (e.g., light.turn_on)';
      const serviceInput = document.createElement('input');
      serviceInput.type = 'text';
      serviceInput.value = button.ha_service || '';
      serviceInput.dataset.field = 'ha_service';
      serviceInput.placeholder = 'light.turn_on';
      serviceField.append(serviceSpan, serviceInput);

      const entityField = document.createElement('label');
      entityField.className = 'full-field';
      const entitySpan = document.createElement('span');
      entitySpan.textContent = 'Entity ID (optional)';
      const entityInput = document.createElement('input');
      entityInput.type = 'text';
      entityInput.value = button.ha_entity_id || '';
      entityInput.dataset.field = 'ha_entity_id';
      entityInput.placeholder = 'light.living_room';
      entityField.append(entitySpan, entityInput);

      container.append(urlField, tokenField, serviceField, entityField);
    }
  }

  function renderPreview(buttons) {
    const preview = id('preview');
    preview.innerHTML = '';
    for (const button of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-actions-bar-button';
      if (!isConfigured(button)) btn.disabled = true;
      const icon = document.createElement('span');
      icon.className = 'quick-actions-bar-icon';
      icon.textContent = button.icon;
      const label = document.createElement('span');
      label.className = 'quick-actions-bar-label';
      label.textContent = button.label;
      btn.append(icon, label);
      preview.append(btn);
    }
  }

  function render(state) {
    const container = id('buttons');
    container.innerHTML = '';
    currentButtons = state.buttons || [];
    for (let i = 0; i < currentButtons.length; i++) {
      container.append(renderButtonConfig(currentButtons[i], i));
    }
    renderPreview(currentButtons);
    renderLiveBars(currentButtons);
  }

  async function refresh() {
    try {
      const state = await api('/state');
      render(state);
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  async function saveButton(card) {
    const buttonId = card.dataset.buttonId;
    const index = currentButtons.findIndex(b => b.id === buttonId);
    if (index === -1) return;

    const updated = { ...currentButtons[index] };
    for (const input of card.querySelectorAll('[data-field]')) {
      const field = input.dataset.field;
      if (field === 'enabled') {
        updated[field] = input.checked;
      } else if (field === 'action_type') {
        updated[field] = input.value;
      } else {
        updated[field] = input.value;
      }
    }

    const configContainer = card.querySelector('.quick-actions-action-config');
    for (const input of configContainer.querySelectorAll('[data-field]')) {
      updated[input.dataset.field] = input.value;
    }

    const newButtons = [...currentButtons];
    newButtons[index] = updated;

    try {
      setStatus('Saving...');
      const state = await api('/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttons: newButtons }),
      });
      render(state);
      setStatus('Saved.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  document.addEventListener('change', event => {
    const target = event.target;
    if (target.dataset.field === 'action_type') {
      const card = target.closest('.quick-actions-card');
      if (card) {
        const buttonId = card.dataset.buttonId;
        const button = currentButtons.find(b => b.id === buttonId);
        if (button) {
          const updated = { ...button, action_type: target.value };
          const configContainer = card.querySelector('.quick-actions-action-config');
          renderActionFields(configContainer, updated);
        }
      }
    }
  });

  window.addEventListener('petey:view', event => {
    if (event.detail.view === 'addon-quick-actions') {
      refresh();
    }
  });

  refresh();
})();

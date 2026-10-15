(function () {
  'use strict';

  // 1. Identify Script Element and Configuration
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].getAttribute('data-widget-id')) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!currentScript) {
    console.error('[FlyRank Widget] Unable to detect script tag with data-widget-id attribute.');
    return;
  }

  const widgetId = currentScript.getAttribute('data-widget-id');
  if (!widgetId) {
    console.error('[FlyRank Widget] Missing required data-widget-id attribute.');
    return;
  }

  // Derive API Base URL from script src
  let baseUrl = '';
  try {
    const scriptUrl = new URL(currentScript.src);
    baseUrl = scriptUrl.origin;
  } catch (e) {
    baseUrl = window.location.origin;
  }

  // Ensure external CSS is loaded
  const cssId = 'flyrank-widget-styles';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = baseUrl + '/widget.v1.css';
    document.head.appendChild(link);
  }

  // 2. Locate or create target mount element
  let container = document.getElementById('flyrank-widget-' + widgetId);
  if (!container) {
    container = document.createElement('div');
    container.id = 'flyrank-widget-' + widgetId;
    currentScript.parentNode.insertBefore(container, currentScript.nextSibling);
  }

  // 3. Render Initial Loading State
  renderLoading(container);

  // 4. Fetch Widget Configuration
  fetch(baseUrl + '/api/public/widgets/' + encodeURIComponent(widgetId) + '/config')
    .then(function (res) {
      if (!res.ok) {
        throw new Error('Widget configuration not available (HTTP ' + res.status + ')');
      }
      return res.json();
    })
    .then(function (config) {
      renderWidget(container, config, baseUrl);
    })
    .catch(function (err) {
      renderError(container, 'Failed to load widget: ' + err.message);
    });

  /**
   * Helper: Render loading skeleton
   */
  function renderLoading(target) {
    target.replaceChildren();
    const loadingCard = document.createElement('div');
    loadingCard.className = 'flyrank-widget-card flyrank-theme-dark';
    loadingCard.style.textAlign = 'center';
    loadingCard.style.padding = '30px';

    const spinner = document.createElement('div');
    spinner.className = 'flyrank-spinner';
    spinner.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    spinner.style.borderTopColor = '#6366f1';
    spinner.style.width = '28px';
    spinner.style.height = '28px';

    const text = document.createElement('p');
    text.textContent = 'Loading widget...';
    text.style.margin = '12px 0 0 0';
    text.style.fontSize = '0.9rem';
    text.style.color = '#94a3b8';

    loadingCard.appendChild(spinner);
    loadingCard.appendChild(text);
    target.appendChild(loadingCard);
  }

  /**
   * Helper: Render load failure card
   */
  function renderError(target, message) {
    target.replaceChildren();
    const errCard = document.createElement('div');
    errCard.className = 'flyrank-widget-card flyrank-theme-dark';
    errCard.style.border = '1px solid #ef4444';

    const p = document.createElement('p');
    p.textContent = message;
    p.style.color = '#f87171';
    p.style.margin = '0';
    p.style.fontSize = '0.9rem';

    errCard.appendChild(p);
    target.appendChild(errCard);
  }

  /**
   * Safe DOM rendering of the widget (NO innerHTML for untrusted content)
   */
  function renderWidget(target, config, apiBase) {
    target.replaceChildren();

    const display = config.display_settings || {};
    const theme = display.theme === 'light' ? 'flyrank-theme-light' : 'flyrank-theme-dark';

    const card = document.createElement('div');
    card.className = 'flyrank-widget-card ' + theme;
    if (display.borderRadius) {
      card.style.borderRadius = display.borderRadius;
    }

    // Title
    const titleEl = document.createElement('h3');
    titleEl.className = 'flyrank-title';
    titleEl.textContent = config.title;
    card.appendChild(titleEl);

    // Description (optional)
    if (config.description) {
      const descEl = document.createElement('p');
      descEl.className = 'flyrank-desc';
      descEl.textContent = config.description;
      card.appendChild(descEl);
    }

    // Error Alert Box
    const errorAlert = document.createElement('div');
    errorAlert.className = 'flyrank-alert flyrank-alert-error';
    errorAlert.setAttribute('role', 'alert');
    card.appendChild(errorAlert);

    // Form Element
    const form = document.createElement('form');
    form.noValidate = true;

    // Honeypot Field (Traps automated bots)
    const honeypotWrapper = document.createElement('div');
    honeypotWrapper.className = 'flyrank-honeypot';
    honeypotWrapper.setAttribute('aria-hidden', 'true');
    const honeypotInput = document.createElement('input');
    honeypotInput.type = 'text';
    honeypotInput.name = 'website';
    honeypotInput.tabIndex = -1;
    honeypotInput.autocomplete = 'off';
    honeypotWrapper.appendChild(honeypotInput);
    form.appendChild(honeypotWrapper);

    // Configured Form Fields
    const fieldInputs = {};
    const fields = Array.isArray(config.fields) ? config.fields : [];

    fields.forEach(function (field) {
      const group = document.createElement('div');
      group.className = 'flyrank-form-group';

      const label = document.createElement('label');
      label.className = 'flyrank-label';
      label.htmlFor = 'flyrank-field-' + field.name + '-' + config.id;
      label.textContent = field.label || field.name;

      if (field.required) {
        const reqStar = document.createElement('span');
        reqStar.className = 'flyrank-required';
        reqStar.textContent = ' *';
        label.appendChild(reqStar);
      }
      group.appendChild(label);

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'flyrank-textarea';
      } else if (field.type === 'select') {
        input = document.createElement('select');
        input.className = 'flyrank-select';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select an option --';
        input.appendChild(defaultOption);

        if (Array.isArray(field.options)) {
          field.options.forEach(function (opt) {
            const optEl = document.createElement('option');
            optEl.value = opt;
            optEl.textContent = opt;
            input.appendChild(optEl);
          });
        }
      } else {
        input = document.createElement('input');
        input.className = 'flyrank-input';
        input.type = field.type || 'text';
      }

      input.id = 'flyrank-field-' + field.name + '-' + config.id;
      input.name = field.name;
      if (field.placeholder) {
        input.placeholder = field.placeholder;
      }
      if (field.required) {
        input.required = true;
      }

      fieldInputs[field.name] = input;
      group.appendChild(input);
      form.appendChild(group);
    });

    // Submit Button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'flyrank-btn';
    submitBtn.textContent = config.button_text || 'Submit';
    if (display.primaryColor) {
      submitBtn.style.backgroundColor = display.primaryColor;
    }
    form.appendChild(submitBtn);

    card.appendChild(form);
    target.appendChild(card);

    // Form Submission Handling
    let isSubmitting = false;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Prevent duplicate submissions while request in progress
      if (isSubmitting) return;

      errorAlert.style.display = 'none';
      errorAlert.textContent = '';

      // Client-side validation
      const submissionData = {};
      let hasError = false;

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const val = fieldInputs[f.name] ? fieldInputs[f.name].value.trim() : '';

        if (f.required && !val) {
          showError('Please fill out the required field: ' + (f.label || f.name));
          hasError = true;
          if (fieldInputs[f.name]) fieldInputs[f.name].focus();
          break;
        }

        if (val && f.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            showError('Please enter a valid email address for ' + (f.label || f.name));
            hasError = true;
            if (fieldInputs[f.name]) fieldInputs[f.name].focus();
            break;
          }
        }

        submissionData[f.name] = val;
      }

      if (hasError) return;

      // Include honeypot if present
      if (honeypotInput.value) {
        submissionData.website = honeypotInput.value;
      }

      // Enter submitting state
      isSubmitting = true;
      submitBtn.disabled = true;
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Submitting...';

      // Generate Idempotency Key
      const idempotencyKey = 'idem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);

      fetch(apiBase + '/api/public/widgets/' + encodeURIComponent(config.id) + '/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(submissionData)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            let errMsg = result.data.message || result.data.error || 'Submission failed. Please try again.';
            if (result.data.details && Array.isArray(result.data.details)) {
              errMsg = result.data.details.map(function (d) { return d.message || d; }).join(', ');
            }
            showError(errMsg);
            resetButton();
            return;
          }

          // Render Success State
          renderSuccess(card, config);
        })
        .catch(function (networkErr) {
          showError('Network error connecting to submission server. Please try again.');
          resetButton();
        });

      function showError(msg) {
        errorAlert.textContent = msg;
        errorAlert.style.display = 'block';
      }

      function resetButton() {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  /**
   * Safe DOM rendering of success state
   */
  function renderSuccess(card, config) {
    card.replaceChildren();

    const successBox = document.createElement('div');
    successBox.className = 'flyrank-alert-success';

    const icon = document.createElement('div');
    icon.className = 'flyrank-success-icon';
    icon.textContent = '✓';

    const h4 = document.createElement('h4');
    h4.style.margin = '0 0 8px 0';
    h4.style.fontSize = '1.25rem';
    h4.textContent = 'Submission Received!';

    const p = document.createElement('p');
    p.style.margin = '0';
    p.style.fontSize = '0.95rem';
    p.textContent = 'Thank you for your interest. Your information has been securely received.';

    successBox.appendChild(icon);
    successBox.appendChild(h4);
    successBox.appendChild(p);

    card.appendChild(successBox);
  }
})();

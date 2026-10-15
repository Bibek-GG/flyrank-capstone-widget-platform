(function () {
  'use strict';

  // API Base URL
  const API_BASE = window.location.origin;

  // Local Storage State
  let token = localStorage.getItem('flyrank_token');
  let currentUser = null;
  let activeTab = 'overview';
  let currentPage = 1;
  let currentWidgetFilter = '';
  let editingWidgetId = null;
  let configuredFormFields = [];

  // DOM Elements
  const authView = document.getElementById('auth-view');
  const appView = document.getElementById('app-view');
  const navUserArea = document.getElementById('nav-user-area');
  const navUserName = document.getElementById('nav-user-name');
  const authAlert = document.getElementById('auth-alert');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const toggleAuthMode = document.getElementById('toggle-auth-mode');
  const nameGroup = document.getElementById('name-group');

  let isRegisterMode = false;

  // 1. Initial State Check
  if (token) {
    verifySession();
  } else {
    showAuthView();
  }

  // 2. Auth Flow
  toggleAuthMode.addEventListener('click', function (e) {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    authAlert.style.display = 'none';
    if (isRegisterMode) {
      authTitle.textContent = 'Create an Account';
      authSubmitBtn.textContent = 'Register Account';
      toggleAuthMode.textContent = 'Already have an account? Sign in';
      nameGroup.style.display = 'block';
    } else {
      authTitle.textContent = 'Welcome to FlyRank';
      authSubmitBtn.textContent = 'Sign In';
      toggleAuthMode.textContent = "Don't have an account? Sign up";
      nameGroup.style.display = 'none';
    }
  });

  // Quick Demo Buttons (Alice & Bob)
  document.getElementById('demo-login-alice').addEventListener('click', function () {
    loginWithCredentials('alice@example.com', 'Password123!');
  });

  document.getElementById('demo-login-bob').addEventListener('click', function () {
    loginWithCredentials('bob@example.com', 'Password123!');
  });

  authForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();

    if (isRegisterMode) {
      registerAccount({ name, email, password });
    } else {
      loginWithCredentials(email, password);
    }
  });

  document.getElementById('logout-btn').addEventListener('click', function () {
    localStorage.removeItem('flyrank_token');
    token = null;
    currentUser = null;
    showAuthView();
  });

  function loginWithCredentials(email, password) {
    authAlert.style.display = 'none';
    fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(handleApiResponse)
      .then(function (data) {
        token = data.token;
        localStorage.setItem('flyrank_token', token);
        currentUser = data.user;
        showAppView();
      })
      .catch(function (err) {
        showAuthError(err.message);
      });
  }

  function registerAccount(body) {
    authAlert.style.display = 'none';
    fetch(API_BASE + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(handleApiResponse)
      .then(function (data) {
        token = data.token;
        localStorage.setItem('flyrank_token', token);
        currentUser = data.user;
        showAppView();
      })
      .catch(function (err) {
        showAuthError(err.message);
      });
  }

  function verifySession() {
    fetch(API_BASE + '/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(handleApiResponse)
      .then(function (data) {
        currentUser = data.user;
        showAppView();
      })
      .catch(function () {
        localStorage.removeItem('flyrank_token');
        token = null;
        showAuthView();
      });
  }

  function showAuthView() {
    authView.style.display = 'block';
    appView.style.display = 'none';
    navUserArea.style.display = 'none';
  }

  function showAppView() {
    authView.style.display = 'none';
    appView.style.display = 'block';
    navUserArea.style.display = 'flex';
    navUserName.textContent = currentUser ? currentUser.name : 'Owner';
    loadActiveTab(activeTab);
  }

  function showAuthError(msg) {
    authAlert.textContent = msg;
    authAlert.style.display = 'block';
  }

  // 3. Tab Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabButtons.forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (c) { c.style.display = 'none'; });

      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      document.getElementById('tab-' + activeTab).style.display = 'block';
      loadActiveTab(activeTab);
    });
  });

  function loadActiveTab(tab) {
    if (tab === 'overview') {
      loadOverviewMetrics();
    } else if (tab === 'widgets') {
      loadWidgetsList();
    } else if (tab === 'submissions') {
      loadSubmissionsList();
    } else if (tab === 'geo') {
      loadGeoMetrics();
    }
  }

  // 4. Overview Metrics
  function loadOverviewMetrics() {
    fetch(API_BASE + '/api/dashboard/overview', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(handleApiResponse)
      .then(function (data) {
        const stats = data.stats || {};
        document.getElementById('stat-total-submissions').textContent = stats.totalSubmissions || 0;
        document.getElementById('stat-active-widgets').textContent = stats.activeWidgets || 0;
        document.getElementById('stat-total-widgets').textContent = stats.totalWidgets || 0;

        renderTrendChart(stats.conversionTrend || []);
        renderTopWidgets(stats.topWidgets || []);
      })
      .catch(function (err) {
        console.error('Failed to load overview:', err);
      });
  }

  function renderTrendChart(trend) {
    const container = document.getElementById('trend-chart-container');
    container.innerHTML = '';

    if (!trend || trend.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No submission activity in the last 7 days.</p>';
      return;
    }

    const maxCount = Math.max(...trend.map(function (t) { return t.count; }), 1);

    trend.forEach(function (item) {
      const col = document.createElement('div');
      col.style.flex = '1';
      col.style.display = 'flex';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'center';
      col.style.height = '100%';
      col.style.justifyContent = 'flex-end';

      const barHeight = Math.round((item.count / maxCount) * 120) + 10;

      const bar = document.createElement('div');
      bar.style.width = '100%';
      bar.style.maxWidth = '36px';
      bar.style.height = barHeight + 'px';
      bar.style.background = 'linear-gradient(to top, #6366f1, #38bdf8)';
      bar.style.borderRadius = '6px 6px 0 0';
      bar.title = item.date + ': ' + item.count + ' leads';

      const countLabel = document.createElement('div');
      countLabel.textContent = item.count;
      countLabel.style.fontSize = '0.75rem';
      countLabel.style.fontWeight = 'bold';
      countLabel.style.marginBottom = '4px';

      const dateLabel = document.createElement('div');
      dateLabel.textContent = item.date.substring(5);
      dateLabel.style.fontSize = '0.75rem';
      dateLabel.style.color = 'var(--text-muted)';
      dateLabel.style.marginTop = '6px';

      col.appendChild(countLabel);
      col.appendChild(bar);
      col.appendChild(dateLabel);
      container.appendChild(col);
    });
  }

  function renderTopWidgets(top) {
    const tbody = document.getElementById('top-widgets-tbody');
    tbody.innerHTML = '';

    if (!top || top.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No widgets configured yet.</td></tr>';
      return;
    }

    top.forEach(function (w) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + escapeHtml(w.name) + '</strong></td>' +
        '<td><span class="widget-tag tag-' + escapeHtml(w.type) + '">' + escapeHtml(w.type) + '</span></td>' +
        '<td><span class="status-badge status-' + escapeHtml(w.status) + '">' + escapeHtml(w.status) + '</span></td>' +
        '<td><strong>' + escapeHtml(String(w.submission_count)) + '</strong></td>';
      tbody.appendChild(tr);
    });
  }

  // 5. Widgets List
  function loadWidgetsList() {
    fetch(API_BASE + '/api/widgets', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(handleApiResponse)
      .then(function (data) {
        renderWidgetsGrid(data.widgets || []);
        populateFilterDropdown(data.widgets || []);
      })
      .catch(function (err) {
        console.error('Failed to load widgets:', err);
      });
  }

  function renderWidgetsGrid(widgets) {
    const container = document.getElementById('widgets-list-container');
    container.innerHTML = '';

    if (widgets.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No widgets found. Click "+ Create New Widget" above to build your first widget!</p>';
      return;
    }

    widgets.forEach(function (w) {
      const fields = Array.isArray(w.fields) ? w.fields : [];
      const card = document.createElement('div');
      card.className = 'widget-item-card';

      card.innerHTML = 
        '<div>' +
          '<div class="widget-item-header">' +
            '<span class="widget-tag tag-' + escapeHtml(w.type) + '">' + escapeHtml(w.type) + '</span>' +
            '<span class="status-badge status-' + escapeHtml(w.status) + '">' + escapeHtml(w.status) + '</span>' +
          '</div>' +
          '<h3 style="font-size: 1.15rem; margin-bottom: 6px;">' + escapeHtml(w.name) + '</h3>' +
          '<p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">' + escapeHtml(w.title) + '</p>' +
          '<div style="font-size: 0.8rem; color: var(--text-muted);">' +
            '<span>Fields: ' + fields.length + '</span> &bull; <span>Btn: "' + escapeHtml(w.button_text) + '"</span>' +
          '</div>' +
        '</div>' +
        '<div class="widget-item-footer">' +
          '<button class="btn btn-primary btn-embed" data-id="' + w.id + '" style="font-size: 0.8rem;">Embed Code</button>' +
          '<button class="btn btn-secondary btn-toggle" data-id="' + w.id + '" data-status="' + w.status + '" style="font-size: 0.8rem;">' +
            (w.status === 'enabled' ? 'Disable' : 'Enable') +
          '</button>' +
          '<button class="btn btn-danger btn-delete" data-id="' + w.id + '" style="font-size: 0.8rem;">Delete</button>' +
        '</div>';

      container.appendChild(card);
    });

    // Wire action buttons
    container.querySelectorAll('.btn-embed').forEach(function (b) {
      b.addEventListener('click', function () { openEmbedSnippetModal(b.getAttribute('data-id')); });
    });
    container.querySelectorAll('.btn-toggle').forEach(function (b) {
      b.addEventListener('click', function () { toggleWidgetStatus(b.getAttribute('data-id'), b.getAttribute('data-status')); });
    });
    container.querySelectorAll('.btn-delete').forEach(function (b) {
      b.addEventListener('click', function () { deleteWidget(b.getAttribute('data-id')); });
    });
  }

  function toggleWidgetStatus(id, currentStatus) {
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    fetch(API_BASE + '/api/widgets/' + id, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then(handleApiResponse)
      .then(function () {
        loadWidgetsList();
      })
      .catch(function (err) {
        alert('Failed to update status: ' + err.message);
      });
  }

  function deleteWidget(id) {
    if (!confirm('Are you sure you want to delete this widget? All associated leads will be deleted.')) return;
    fetch(API_BASE + '/api/widgets/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(handleApiResponse)
      .then(function () {
        loadWidgetsList();
      })
      .catch(function (err) {
        alert('Failed to delete widget: ' + err.message);
      });
  }

  // 6. Embed Snippet Modal
  const snippetModal = document.getElementById('snippet-modal');
  const modalSnippetCode = document.getElementById('modal-snippet-code');
  let currentSnippetText = '';

  function openEmbedSnippetModal(widgetId) {
    fetch(API_BASE + '/api/widgets/' + widgetId + '/embed', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(handleApiResponse)
      .then(function (data) {
        currentSnippetText = data.snippet;
        modalSnippetCode.textContent = data.snippet;
        snippetModal.style.display = 'flex';
      })
      .catch(function (err) {
        alert('Failed to generate snippet: ' + err.message);
      });
  }

  document.getElementById('close-snippet-modal').addEventListener('click', function () {
    snippetModal.style.display = 'none';
  });

  document.getElementById('copy-snippet-btn').addEventListener('click', function () {
    navigator.clipboard.writeText(currentSnippetText).then(function () {
      alert('Embed snippet copied to clipboard!');
    });
  });

  document.getElementById('test-snippet-btn').addEventListener('click', function () {
    window.open('http://localhost:5500', '_blank');
  });

  // 7. Create Widget Modal & Field Builder
  const widgetModal = document.getElementById('widget-modal');
  const fieldsEditorList = document.getElementById('fields-editor-list');

  document.getElementById('open-create-widget-modal').addEventListener('click', function () {
    editingWidgetId = null;
    document.getElementById('widget-modal-title').textContent = 'Create New Widget';
    document.getElementById('widget-form').reset();
    configuredFormFields = [
      { name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'name@domain.com' },
      { name: 'name', label: 'Full Name', type: 'text', required: false, placeholder: 'Your Name' }
    ];
    renderFieldsEditor();
    widgetModal.style.display = 'flex';
  });

  document.getElementById('close-widget-modal').addEventListener('click', function () {
    widgetModal.style.display = 'none';
  });

  document.getElementById('add-field-btn').addEventListener('click', function () {
    configuredFormFields.push({
      name: 'field_' + (configuredFormFields.length + 1),
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: ''
    });
    renderFieldsEditor();
  });

  function renderFieldsEditor() {
    fieldsEditorList.innerHTML = '';
    configuredFormFields.forEach(function (field, idx) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';
      row.style.background = 'var(--bg-surface-elevated)';
      row.style.padding = '8px 12px';
      row.style.borderRadius = '6px';

      row.innerHTML = 
        '<input type="text" class="form-input" style="flex: 2; padding: 6px 10px; font-size: 0.85rem;" placeholder="Name (key)" value="' + escapeHtml(field.name) + '">' +
        '<input type="text" class="form-input" style="flex: 2; padding: 6px 10px; font-size: 0.85rem;" placeholder="Label" value="' + escapeHtml(field.label) + '">' +
        '<select class="form-select" style="flex: 1.5; padding: 6px 8px; font-size: 0.85rem;">' +
          '<option value="text"' + (field.type === 'text' ? ' selected' : '') + '>Text</option>' +
          '<option value="email"' + (field.type === 'email' ? ' selected' : '') + '>Email</option>' +
          '<option value="tel"' + (field.type === 'tel' ? ' selected' : '') + '>Phone</option>' +
          '<option value="textarea"' + (field.type === 'textarea' ? ' selected' : '') + '>Textarea</option>' +
        '</select>' +
        '<label style="font-size: 0.8rem; display: flex; align-items: center; gap: 4px; color: var(--text-muted); cursor: pointer;">' +
          '<input type="checkbox"' + (field.required ? ' checked' : '') + '> Req' +
        '</label>' +
        '<button type="button" class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;">&times;</button>';

      const inputs = row.querySelectorAll('input, select');
      inputs[0].addEventListener('input', function (e) { field.name = e.target.value.trim().replace(/[^a-zA-Z0-9_]/g, '_'); });
      inputs[1].addEventListener('input', function (e) { field.label = e.target.value; });
      inputs[2].addEventListener('change', function (e) { field.type = e.target.value; });
      inputs[3].addEventListener('change', function (e) { field.required = e.target.checked; });
      row.querySelector('.btn-danger').addEventListener('click', function () {
        configuredFormFields.splice(idx, 1);
        renderFieldsEditor();
      });

      fieldsEditorList.appendChild(row);
    });
  }

  document.getElementById('widget-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const payload = {
      name: document.getElementById('widget-name').value.trim(),
      type: document.getElementById('widget-type').value,
      title: document.getElementById('widget-title').value.trim(),
      description: document.getElementById('widget-desc').value.trim(),
      button_text: document.getElementById('widget-btn-text').value.trim() || 'Submit',
      display_settings: {
        theme: document.getElementById('widget-theme').value,
        primaryColor: '#6366f1',
        borderRadius: '8px'
      },
      fields: configuredFormFields
    };

    fetch(API_BASE + '/api/widgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    })
      .then(handleApiResponse)
      .then(function () {
        widgetModal.style.display = 'none';
        loadWidgetsList();
      })
      .catch(function (err) {
        alert('Failed to save widget: ' + err.message);
      });
  });

  // 8. Submissions List
  function loadSubmissionsList() {
    let url = API_BASE + '/api/dashboard/submissions?page=' + currentPage + '&limit=15';
    if (currentWidgetFilter) {
      url += '&widgetId=' + encodeURIComponent(currentWidgetFilter);
    }

    fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(handleApiResponse)
      .then(function (data) {
        renderSubmissionsTable(data.submissions || []);
        renderPagination(data.pagination || {});
      })
      .catch(function (err) {
        console.error('Failed to load submissions:', err);
      });
  }

  function renderSubmissionsTable(submissions) {
    const tbody = document.getElementById('submissions-tbody');
    tbody.innerHTML = '';

    if (submissions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No lead submissions captured yet.</td></tr>';
      return;
    }

    submissions.forEach(function (sub) {
      const dataObj = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {});
      const geoObj = typeof sub.geolocation === 'string' ? JSON.parse(sub.geolocation) : sub.geolocation;

      let dataBadges = '';
      for (const [k, v] of Object.entries(dataObj)) {
        dataBadges += '<span class="badge-lead-data"><strong>' + escapeHtml(k) + ':</strong> ' + escapeHtml(String(v)) + '</span> ';
      }

      const locationStr = geoObj ? (escapeHtml(geoObj.city) + ', ' + escapeHtml(geoObj.country)) : 'Unknown';
      const dateStr = new Date(sub.created_at).toLocaleString();

      const tr = document.createElement('tr');
      tr.innerHTML = 
        '<td><strong>' + escapeHtml(sub.widget_name || 'Widget') + '</strong></td>' +
        '<td>' + dataBadges + '</td>' +
        '<td><span style="display: inline-flex; align-items: center; gap: 4px;">📍 ' + locationStr + '</span></td>' +
        '<td><code>' + escapeHtml(sub.client_ip || 'N/A') + '</code></td>' +
        '<td style="color: var(--text-muted); font-size: 0.85rem;">' + dateStr + '</td>';
      tbody.appendChild(tr);
    });
  }

  function renderPagination(pagination) {
    document.getElementById('pagination-info').textContent = 'Page ' + (pagination.page || 1) + ' of ' + (pagination.totalPages || 1) + ' (' + (pagination.total || 0) + ' total)';
    document.getElementById('prev-page-btn').disabled = (pagination.page <= 1);
    document.getElementById('next-page-btn').disabled = (pagination.page >= pagination.totalPages);
  }

  document.getElementById('prev-page-btn').addEventListener('click', function () {
    if (currentPage > 1) {
      currentPage--;
      loadSubmissionsList();
    }
  });

  document.getElementById('next-page-btn').addEventListener('click', function () {
    currentPage++;
    loadSubmissionsList();
  });

  document.getElementById('refresh-submissions-btn').addEventListener('click', function () {
    loadSubmissionsList();
  });

  document.getElementById('filter-widget-select').addEventListener('change', function (e) {
    currentWidgetFilter = e.target.value;
    currentPage = 1;
    loadSubmissionsList();
  });

  function populateFilterDropdown(widgets) {
    const sel = document.getElementById('filter-widget-select');
    sel.innerHTML = '<option value="">All Widgets</option>';
    widgets.forEach(function (w) {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = w.name;
      if (w.id === currentWidgetFilter) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // 9. Geolocation Distribution Tab
  function loadGeoMetrics() {
    fetch(API_BASE + '/api/dashboard/submissions?limit=100', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(handleApiResponse)
      .then(function (data) {
        const counts = {};
        (data.submissions || []).forEach(function (s) {
          const geo = typeof s.geolocation === 'string' ? JSON.parse(s.geolocation) : s.geolocation;
          const country = geo && geo.country ? geo.country : 'Unknown';
          const code = geo && geo.country_code ? geo.country_code : 'XX';
          if (!counts[country]) counts[country] = { count: 0, code };
          counts[country].count++;
        });

        const tbody = document.getElementById('geo-tbody');
        tbody.innerHTML = '';

        const entries = Object.entries(counts).sort(function (a, b) { return b[1].count - a[1].count; });

        if (entries.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No geolocation data recorded yet.</td></tr>';
          return;
        }

        entries.forEach(function (entry) {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td><strong>' + escapeHtml(entry[0]) + '</strong></td>' +
            '<td><code>' + escapeHtml(entry[1].code) + '</code></td>' +
            '<td><strong>' + entry[1].count + '</strong></td>';
          tbody.appendChild(tr);
        });
      })
      .catch(function (err) {
        console.error('Failed to load geo metrics:', err);
      });
  }

  // Utilities
  function handleApiResponse(res) {
    return res.json().then(function (data) {
      if (!res.ok) {
        let msg = data.message || data.error || ('HTTP Error ' + res.status);
        if (data.details && Array.isArray(data.details)) {
          msg = data.details.map(function (d) { return d.message || d.field + ': ' + d.message; }).join(', ');
        }
        throw new Error(msg);
      }
      return data;
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();

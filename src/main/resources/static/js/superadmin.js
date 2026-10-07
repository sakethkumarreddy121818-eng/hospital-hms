/**
 * CAREVISTA HOSPITAL MANAGEMENT SAAS
 * Super Admin Management Module (Phase 2)
 */

const SuperAdmin = (function () {
  'use strict';

  let currentTab = null;
  let activeSearch = '';
  let activeStatusFilter = 'ALL';
  let hospitalsData = [];
  let saHistoryIndex = 1;
  let isNavigatingHistory = false;

  function init() {
    initSuperAdminSidebar();
    setupSidebarNavigation();

    // Check initial hash if user refreshed or navigated directly
    let initialTab = 'hospitals';
    const hash = window.location.hash.replace(/^#/, '');
    if (['hospitals', 'notifications', 'audit', 'backup'].includes(hash)) {
      initialTab = hash;
    }

    try {
      window.history.replaceState(
        { role: 'SUPER_ADMIN', mod: initialTab, sub: 'main', index: 1, isCareVistaNav: true },
        '',
        '#' + initialTab
      );
    } catch (e) {}

    currentTab = null;
    navigateToTab(initialTab, false);
  }

  function syncSuperAdminSidebarCollapsedClass() {
    const isCollapsed = localStorage.getItem('cv_superadmin_sidebar_collapsed') === 'true' ||
      document.getElementById('appSidebar')?.classList.contains('cv-sidebar-collapsed');
    document.body.classList.toggle('cv-sidebar-collapsed-mode', !!isCollapsed);
  }

  function initSuperAdminSidebar() {
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const sidebar = document.getElementById('appSidebar') || document.querySelector('.cv-sidebar');
    if (!sidebar) return;

    // Restore persisted sidebar state for Super Admin
    const isCollapsed = localStorage.getItem('cv_superadmin_sidebar_collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('cv-sidebar-collapsed');
    } else {
      sidebar.classList.remove('cv-sidebar-collapsed');
    }
    syncSuperAdminSidebarCollapsedClass();

    if (collapseBtn) {
      collapseBtn.onclick = (e) => {
        e.preventDefault();
        sidebar.classList.toggle('cv-sidebar-collapsed');
        const nowCollapsed = sidebar.classList.contains('cv-sidebar-collapsed');
        localStorage.setItem('cv_superadmin_sidebar_collapsed', nowCollapsed ? 'true' : 'false');
        syncSuperAdminSidebarCollapsedClass();
      };
    }

    // Header Global Operations / SAAS PLATFORM Area Internal Navigation
    const sidebarHeader = document.querySelector('.cv-sidebar-header');
    if (sidebarHeader) {
      sidebarHeader.style.cursor = 'pointer';
      sidebarHeader.onclick = (e) => {
        if (e.target.closest('#sidebarCollapseBtn')) return;
        e.preventDefault();
        navigateToTab('hospitals');
      };
    }

    const tenantNameEl = document.getElementById('sidebarTenantName');
    if (tenantNameEl) {
      tenantNameEl.textContent = 'Global Operations';
      tenantNameEl.style.cursor = 'pointer';
      tenantNameEl.setAttribute('title', 'Go to Super Admin Portal');
      tenantNameEl.onclick = (e) => {
        e.preventDefault();
        navigateToTab('hospitals');
      };
    }

    const tenantBadgeEl = document.getElementById('sidebarTenantBadge');
    if (tenantBadgeEl) {
      tenantBadgeEl.textContent = 'SAAS PLATFORM';
      tenantBadgeEl.style.cursor = 'pointer';
      tenantBadgeEl.setAttribute('title', 'Go to Super Admin Portal');
      tenantBadgeEl.onclick = (e) => {
        e.preventDefault();
        navigateToTab('hospitals');
      };
    }

    updateSuperAdminBackButton();
  }

  function updateSuperAdminBackButton() {
    let btn = document.getElementById('cvFloatingBackBtn');
    let wrap = document.getElementById('sidebarBackWrap');
    if (!btn) return;

    btn.onclick = (e) => {
      e.preventDefault();
      navigateBack();
    };

    const hasOpenModal = !!document.getElementById('activeModalContainer');
    const isRoot = (currentTab === 'hospitals' && !hasOpenModal);
    if (isRoot) {
      btn.style.display = 'none';
      if (wrap) wrap.style.display = 'none';
    } else {
      btn.style.display = 'inline-flex';
      if (wrap) wrap.style.display = 'flex';
    }
    syncSuperAdminSidebarCollapsedClass();
  }

  function navigateBack() {
    const existing = document.getElementById('activeModalContainer');
    if (existing) {
      closeModal();
      if (window.location.hash.includes('details')) {
        if (saHistoryIndex > 1) {
          window.history.back();
          return;
        } else {
          try {
            window.history.replaceState({ role: 'SUPER_ADMIN', mod: 'hospitals', sub: 'main', index: 1, isCareVistaNav: true }, '', '#hospitals');
          } catch (e) {}
        }
      }
      updateSuperAdminBackButton();
      return;
    }

    if (saHistoryIndex > 1) {
      window.history.back();
    } else {
      navigateToTab('hospitals', false);
    }
  }

  function navigateToTab(tab, recordHistory = true) {
    if (currentTab === tab && !document.getElementById('activeModalContainer')) {
      return;
    }
    closeModal();
    currentTab = tab;

    const navList = document.getElementById('sidebarNavList');
    if (navList) {
      navList.querySelectorAll('.cv-nav-item').forEach((i) => {
        i.classList.toggle('active', i.dataset.tab === tab);
      });
    }

    if (!isNavigatingHistory && recordHistory) {
      saHistoryIndex++;
      try {
        window.history.pushState(
          { role: 'SUPER_ADMIN', mod: tab, sub: 'main', index: saHistoryIndex, isCareVistaNav: true },
          '',
          '#' + tab
        );
      } catch (e) {}
    }

    renderView(tab);
    updateSuperAdminBackButton();
  }

  function handlePopstate(e) {
    const state = e.state;
    closeModal();
    isNavigatingHistory = true;
    try {
      if (state && state.role === 'SUPER_ADMIN') {
        saHistoryIndex = state.index || saHistoryIndex;
        if (state.sub === 'details' && state.id) {
          if (currentTab !== 'hospitals') {
            navigateToTab('hospitals', false);
          }
          showHospitalDetails(state.id, false);
        } else {
          navigateToTab(state.mod || 'hospitals', false);
        }
      } else {
        const hash = window.location.hash.replace(/^#/, '');
        if (hash.startsWith('hospitals/details') && hash.includes('id=')) {
          const id = hash.split('id=')[1];
          if (id) {
            navigateToTab('hospitals', false);
            showHospitalDetails(id, false);
            return;
          }
        }
        if (['hospitals', 'notifications', 'audit', 'backup'].includes(hash)) {
          navigateToTab(hash, false);
        } else {
          navigateToTab('hospitals', false);
        }
      }
    } finally {
      isNavigatingHistory = false;
      updateSuperAdminBackButton();
    }
  }

  function setupSidebarNavigation() {
    const navList = document.getElementById('sidebarNavList');
    if (!navList) return;

    navList.innerHTML = `
      <li><a class="cv-nav-item active" data-tab="hospitals" id="navHospitalsTab" title="Hospitals & Admins" data-tooltip="Hospitals & Admins">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
        <span>Hospitals &amp; Admins</span>
      </a></li>
      <li><a class="cv-nav-item" data-tab="notifications" id="navNotificationsTab" title="Notification Center" data-tooltip="Notification Center">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        <span>Notification Center</span> <span id="badgeNotifCount" class="cv-badge" style="background:#fecaca; color:#dc2626; margin-left:auto; display:none;">0</span>
      </a></li>
      <li><a class="cv-nav-item" data-tab="audit" id="navAuditTab" title="Audit History" data-tooltip="Audit History">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
        <span>Audit History</span>
      </a></li>
      <li><a class="cv-nav-item" data-tab="backup" id="navBackupTab" title="Backup / Billing History" data-tooltip="Backup / Billing History">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        <span>Backup / Billing History</span>
      </a></li>
    `;

    navList.querySelectorAll('.cv-nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        navigateToTab(tab);
      });
    });

    // Check notifications count
    updateNotificationBadge();
  }

  function renderView(tab) {
    currentTab = tab;
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    if (tab === 'hospitals') {
      renderHospitalsView(mainContent);
    } else if (tab === 'notifications') {
      renderNotificationsView(mainContent);
    } else if (tab === 'audit') {
      renderAuditLogsView(mainContent);
    } else if (tab === 'backup') {
      renderBackupView(mainContent);
    }
  }

  // ====================================================================
  // 1. HOSPITALS & ADMINS DIRECTORY
  // ====================================================================
  async function renderHospitalsView(container) {
    container.innerHTML = `
      <div class="cv-page-header">
        <div>
          <h1 class="cv-page-title">Super Admin Portal</h1>
          <p class="cv-page-subtitle">Multi-Tenant Hospital Network & Administration</p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button type="button" class="cv-btn-secondary" id="btnDownloadBackupTop">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Billing History Backup
          </button>
          <button type="button" class="cv-btn-primary" style="width:auto;" id="btnAddHospital">
            <span style="font-size:1.1rem; line-height:1;">+</span> Add Hospital / Admin
          </button>
        </div>
      </div>

      <!-- Real-time metrics grid -->
      <div class="cv-cards-grid" id="saMetricsGrid">
        <div class="cv-metric-card"><div class="cv-metric-label">Hospitals</div><div class="cv-metric-value" id="mHospitals">...</div><span class="cv-metric-badge" style="background:#eff6ff; color:#1d4ed8;">Configured</span></div>
        <div class="cv-metric-card"><div class="cv-metric-label">Active Tenants</div><div class="cv-metric-value" id="mActive">...</div><span class="cv-metric-badge" style="background:#ecfdf5; color:#059669;">Operational</span></div>
        <div class="cv-metric-card"><div class="cv-metric-label">Hospital Staff</div><div class="cv-metric-value" id="mEmployees">...</div><span class="cv-metric-badge" style="background:#f0fdfa; color:#0d9488;">In Directory</span></div>
        <div class="cv-metric-card"><div class="cv-metric-label">Monthly OP Quota (Network)</div><div class="cv-metric-value" id="mOpCap">...</div><span class="cv-metric-badge" id="mOpBadge" style="background:#ecfdf5; color:#059669;">This Month</span></div>
      </div>

      <!-- Toolbar: Search + Status filter -->
      <div class="cv-toolbar">
        <div class="cv-search-box">
          <svg style="width:18px; height:18px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" id="hospitalSearchInput" class="cv-search-input" placeholder="Search hospital name, admin, or email..." value="${activeSearch}">
        </div>

        <div class="cv-filter-group">
          <button type="button" class="cv-filter-btn ${activeStatusFilter === 'ALL' ? 'active' : ''}" data-status="ALL">All</button>
          <button type="button" class="cv-filter-btn ${activeStatusFilter === 'ACTIVE' ? 'active' : ''}" data-status="ACTIVE">Active</button>
          <button type="button" class="cv-filter-btn ${activeStatusFilter === 'DISABLED' ? 'active' : ''}" data-status="DISABLED">Disabled</button>
        </div>
      </div>

      <!-- Hospitals Table -->
      <div class="cv-table-wrapper">
        <table class="cv-table" id="hospitalsTable">
          <thead>
            <tr>
              <th>Hospital & Code</th>
              <th>Admin Contact</th>
              <th>Status</th>
              <th>Services</th>
              <th>Monthly OP Usage / Limit</th>
              <th>Staff Count</th>
              <th>Enrolled</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="hospitalsTableBody">
            <tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">Loading hospital directory from MySQL...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    // Event listeners
    document.getElementById('btnAddHospital').onclick = () => showAddHospitalModal();
    document.getElementById('btnDownloadBackupTop').onclick = () => {
      navigateToTab('backup');
    };

    const searchInput = document.getElementById('hospitalSearchInput');
    let debounceTimer;
    searchInput.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        activeSearch = searchInput.value;
        loadHospitals();
      }, 250);
    };

    container.querySelectorAll('.cv-filter-btn').forEach((btn) => {
      btn.onclick = () => {
        container.querySelectorAll('.cv-filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeStatusFilter = btn.dataset.status;
        loadHospitals();
      };
    });

    loadMetrics();
    loadHospitals();
  }

  async function loadMetrics() {
    const res = await Api.get('/api/superadmin/metrics');
    if (res.ok && res.data) {
      const d = res.data;
      const mHospitals = document.getElementById('mHospitals');
      const mActive = document.getElementById('mActive');
      const mEmployees = document.getElementById('mEmployees');
      const mOpCap = document.getElementById('mOpCap');
      const mOpBadge = document.getElementById('mOpBadge');

      if (mHospitals) mHospitals.textContent = d.totalHospitals;
      if (mActive) mActive.textContent = `${d.activeHospitals} / ${d.totalHospitals}`;
      if (mEmployees) mEmployees.textContent = `${d.totalAdmins} Admins, ${d.totalEmployees} Staff`;
      if (mOpCap) mOpCap.textContent = `${d.totalOpCurrentUsage} / ${d.totalOpCapacity}`;
      if (mOpBadge) {
        const pct = d.totalOpCapacity > 0 ? Math.round((d.totalOpCurrentUsage * 100) / d.totalOpCapacity) : 0;
        mOpBadge.textContent = `${pct}% Capacity`;
      }
    }
  }

  async function loadHospitals() {
    const tbody = document.getElementById('hospitalsTableBody');
    if (!tbody) return;

    let url = `/api/superadmin/hospitals?search=${encodeURIComponent(activeSearch)}&status=${activeStatusFilter}`;
    const res = await Api.get(url);

    if (res.ok && res.data) {
      hospitalsData = res.data;
      if (hospitalsData.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding:3rem 1rem; color:var(--cv-text-muted);">
              <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.3rem;">No hospitals found</div>
              <p style="font-size:0.85rem;">Try modifying your search query or add a new hospital.</p>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = hospitalsData.map((h) => {
        const isAct = h.status === 'ACTIVE';
        const isExceeded = (h.limitExceeded || h.opCurrentUsage > h.opLimit);
        const isReached = (h.opCurrentUsage === h.opLimit);
        const progressClass = isExceeded || isReached ? 'danger' : (h.opUsagePercentage >= 80 ? 'warning' : '');
        const labTag = h.hasLaboratory
          ? `<span class="cv-service-tag cv-tag-lab">Lab Available</span>`
          : `<span class="cv-service-tag cv-tag-none">Lab = 0 / Not Available</span>`;
        const pharTag = h.hasPharmacy
          ? `<span class="cv-service-tag cv-tag-pharmacy">Pharmacy Available</span>`
          : `<span class="cv-service-tag cv-tag-none">Pharmacy = 0 / Not Available</span>`;

        return `
          <tr>
            <td>
              <div style="font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(h.hospitalName)}</div>
              <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(h.tenantCode)}</div>
            </td>
            <td>
              <div style="font-weight:600;">${escapeHtml(h.adminName || 'Not Assigned')}</div>
              <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(h.adminEmail || 'No Email')}</div>
            </td>
            <td>
              <span class="cv-badge ${isAct ? 'cv-badge-active' : 'cv-badge-disabled'}">
                ${isAct ? 'ACTIVE' : 'DISABLED'}
              </span>
            </td>
            <td>
              <div style="display:flex; flex-direction:column; gap:3px;">
                <span class="cv-service-tag cv-tag-office">Office: ${escapeHtml(h.officeStatus || 'ACTIVE')}</span>
                ${labTag}
                ${pharTag}
              </div>
            </td>
            <td>
              <div class="cv-progress-bar-container">
                <div class="cv-progress-header">
                  <span style="font-size:0.75rem; font-weight:700;">This Month: ${h.opCurrentUsage} / ${h.opLimit}</span>
                  <span style="font-size:0.75rem; font-weight:700; ${isExceeded ? 'color:var(--cv-danger);' : ''}">${h.opUsagePercentage}%</span>
                </div>
                <div class="cv-progress-track">
                  <div class="cv-progress-fill ${progressClass}" style="width:${Math.min(100, h.opUsagePercentage)}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--cv-text-muted); margin-top:3px;">
                  <span>Monthly Limit: <strong>${h.opLimit}</strong></span>
                  <span style="${isExceeded ? 'color:var(--cv-danger); font-weight:700;' : ''}">Remaining: <strong>${h.opRemaining}</strong>${isExceeded ? ' (Exceeded)' : ''}</span>
                </div>
              </div>
            </td>
            <td>
              <span style="font-weight:600; color:var(--cv-text-secondary);">${h.employeeCount} Staff</span>
            </td>
            <td style="font-size:0.78rem; color:var(--cv-text-muted); white-space:nowrap;">
              ${formatDate(h.createdAt)}
            </td>
            <td style="text-align:right; white-space:nowrap;">
              <button type="button" class="cv-btn-sm cv-btn-action-primary" onclick="SuperAdmin.showHospitalDetails(${h.id})" title="View Complete Hospital Details">Details</button>
              <button type="button" class="cv-btn-sm cv-btn-action-primary" onclick="SuperAdmin.showOpLimitModal(${h.id}, ${h.opLimit}, ${h.opCurrentUsage}, '${escapeJs(h.hospitalName)}', ${h.opRemaining})" title="Configure Monthly OP Limit">OP Limit</button>
              <button type="button" class="cv-btn-sm cv-btn-action-warning" onclick="SuperAdmin.showResetPasswordModal(${h.id}, '${escapeJs(h.adminEmail)}', '${escapeJs(h.hospitalName)}')" title="Reset Admin Password">Reset PWD</button>
              ${isAct 
                ? `<button type="button" class="cv-btn-sm cv-btn-action-danger" onclick="SuperAdmin.confirmStatusChange(${h.id}, 'DISABLED', '${escapeJs(h.hospitalName)}')" title="Disable Hospital Admin">Disable</button>`
                : `<button type="button" class="cv-btn-sm cv-btn-action-success" onclick="SuperAdmin.confirmStatusChange(${h.id}, 'ACTIVE', '${escapeJs(h.hospitalName)}')" title="Activate Hospital Admin">Activate</button>`
              }
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // ====================================================================
  // 2. ADD HOSPITAL MODAL
  // ====================================================================
  function showAddHospitalModal() {
    const modalHtml = `
      <div class="cv-modal-backdrop show" id="saModalBackdrop">
        <div class="cv-modal">
          <div class="cv-modal-header">
            <h3 class="cv-modal-title">Enrol New Hospital & Admin</h3>
            <button type="button" class="cv-modal-close" onclick="SuperAdmin.closeModal()">&times;</button>
          </div>
          <form id="addHospitalForm">
            <div class="cv-modal-body">
              <div id="modalAlert" class="cv-alert"></div>

              <div class="cv-form-group">
                <label class="cv-form-label">Hospital Name *</label>
                <input type="text" id="mHospitalName" class="cv-input" placeholder="e.g. St. Jude Super Speciality Hospital" required>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="cv-form-group">
                  <label class="cv-form-label">Hospital Administrator Name *</label>
                  <input type="text" id="mAdminName" class="cv-input" placeholder="e.g. Dr. Arthur Bell" required>
                </div>
                <div class="cv-form-group">
                  <label class="cv-form-label">Admin Email Address *</label>
                  <input type="email" id="mAdminEmail" class="cv-input" placeholder="admin@stjude.com" required>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="cv-form-group">
                  <label class="cv-form-label">Initial Password *</label>
                  <input type="password" id="mAdminPassword" class="cv-input" placeholder="Minimum 6 characters" required>
                </div>
                <div class="cv-form-group">
                  <label class="cv-form-label">Phone Contact</label>
                  <input type="text" id="mPhone" class="cv-input" placeholder="+1 800-555-0155">
                </div>
              </div>

              <div class="cv-form-group">
                <label class="cv-form-label">Hospital Address</label>
                <input type="text" id="mAddress" class="cv-input" placeholder="100 Healthcare Way, Suite 400">
              </div>

              <!-- Hospital Services Configuration (Section 9) -->
              <div style="margin:1.25rem 0 0.5rem; font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--cv-text-muted);">
                Hospital Services & Facilities Configuration
              </div>

              <div class="cv-toggle-group">
                <div>
                  <div class="cv-toggle-label">Office & Administration Facility</div>
                  <div class="cv-toggle-sub">Default mandatory facility for all hospital tenants</div>
                </div>
                <span class="cv-badge cv-badge-active">ALWAYS ACTIVE</span>
              </div>

              <div class="cv-toggle-group">
                <div>
                  <div class="cv-toggle-label">Laboratory Diagnostic Unit</div>
                  <div class="cv-toggle-sub">Enable path lab tests, billing, and lab report generation</div>
                </div>
                <label style="cursor:pointer; display:flex; align-items:center;">
                  <input type="checkbox" id="mHasLab" checked style="width:18px; height:18px; accent-color:var(--cv-primary);">
                </label>
              </div>

              <div class="cv-toggle-group">
                <div>
                  <div class="cv-toggle-label">In-House Pharmacy Unit</div>
                  <div class="cv-toggle-sub">Enable medicine inventory, batch control, and drug billing</div>
                </div>
                <label style="cursor:pointer; display:flex; align-items:center;">
                  <input type="checkbox" id="mHasPharmacy" checked style="width:18px; height:18px; accent-color:var(--cv-primary);">
                </label>
              </div>

              <!-- OP Limit Configuration (Section 10) -->
              <div class="cv-form-group">
                <label class="cv-form-label">Monthly Outpatient (OP) Limit *</label>
                <input type="number" id="mOpLimit" class="cv-input" value="50" min="1" max="10000" required>
                <small style="color:var(--cv-text-muted); font-size:0.75rem;">Allowed OP registrations per calendar month. Alerts trigger automatically if monthly quota is reached.</small>
              </div>
            </div>

            <div class="cv-modal-footer">
              <button type="button" class="cv-btn-secondary" onclick="SuperAdmin.closeModal()">Cancel</button>
              <button type="submit" class="cv-btn-primary" style="width:auto;" id="btnSubmitHospital">
                <span id="mSubmitSpinner" class="cv-spinner"></span>
                <span>Save Hospital & Admin</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    openModal(modalHtml);

    document.getElementById('addHospitalForm').onsubmit = async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('modalAlert');
      alertBox.className = 'cv-alert';

      const payload = {
        hospitalName: document.getElementById('mHospitalName').value.trim(),
        adminName: document.getElementById('mAdminName').value.trim(),
        email: document.getElementById('mAdminEmail').value.trim(),
        password: document.getElementById('mAdminPassword').value,
        phone: document.getElementById('mPhone').value.trim(),
        address: document.getElementById('mAddress').value.trim(),
        hasLaboratory: document.getElementById('mHasLab').checked,
        hasPharmacy: document.getElementById('mHasPharmacy').checked,
        opLimit: parseInt(document.getElementById('mOpLimit').value, 10) || 50
      };

      const btn = document.getElementById('btnSubmitHospital');
      const spinner = document.getElementById('mSubmitSpinner');
      btn.disabled = true;
      spinner.classList.add('show');

      const res = await Api.post('/api/superadmin/hospitals', payload);

      btn.disabled = false;
      spinner.classList.remove('show');

      if (res.ok) {
        showToast('Hospital and Admin registered successfully in MySQL!', 'success');
        closeModal();
        loadMetrics();
        loadHospitals();
        try {
          const freshList = await Api.get('/api/superadmin/hospitals');
          if (freshList.ok && Array.isArray(freshList.data)) {
            cachedHospitals = freshList.data;
          }
        } catch (ignored) {}
      } else {
        alertBox.textContent = res.message || 'Unable to register hospital. Please verify input.';
        alertBox.className = 'cv-alert cv-alert-danger show';
      }
    };
  }

  // ====================================================================
  // 3. COMPLETE HOSPITAL DETAILS MODAL (Section 9)
  // ====================================================================
  async function showHospitalDetails(id, recordHistory = true) {
    if (!isNavigatingHistory && recordHistory) {
      saHistoryIndex++;
      try {
        window.history.pushState(
          { role: 'SUPER_ADMIN', mod: 'hospitals', sub: 'details', id: id, index: saHistoryIndex, isCareVistaNav: true },
          '',
          '#hospitals/details?id=' + id
        );
      } catch (e) {}
    }
    const res = await Api.get(`/api/superadmin/hospitals/${id}`);
    if (!res.ok || !res.data) {
      showToast('Could not load hospital details', 'danger');
      return;
    }
    const h = res.data;

    const modalHtml = `
      <div class="cv-modal-backdrop show" id="saModalBackdrop">
        <div class="cv-modal">
          <div class="cv-modal-header">
            <h3 class="cv-modal-title">${escapeHtml(h.hospitalName)}</h3>
            <button type="button" class="cv-modal-close" onclick="SuperAdmin.closeModal()">&times;</button>
          </div>
          <div class="cv-modal-body">
            <div style="margin-bottom:1.25rem;">
              <span class="cv-badge ${h.status === 'ACTIVE' ? 'cv-badge-active' : 'cv-badge-disabled'}">
                TENANT STATUS: ${h.status}
              </span>
              <span class="cv-badge cv-badge-available" style="margin-left:0.5rem;">
                CODE: ${escapeHtml(h.tenantCode)}
              </span>
            </div>

            <!-- Mandatory Services Section (Section 9) -->
            <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--cv-text-muted); margin-bottom:0.75rem;">
              Hospital Clinical Services Status
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem; margin-bottom:1.5rem;">
              <div style="background:var(--cv-bg); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); padding:0.85rem; text-align:center;">
                <div style="font-size:0.72rem; color:var(--cv-text-muted); font-weight:700; text-transform:uppercase;">Office</div>
                <div style="font-size:0.95rem; font-weight:700; color:var(--cv-primary); margin-top:0.25rem;">${escapeHtml(h.officeStatus || 'ACTIVE')}</div>
                <div style="font-size:0.7rem; color:var(--cv-success); font-weight:600;">Always Available</div>
              </div>

              <div style="background:var(--cv-bg); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); padding:0.85rem; text-align:center;">
                <div style="font-size:0.72rem; color:var(--cv-text-muted); font-weight:700; text-transform:uppercase;">Laboratory</div>
                <div style="font-size:0.95rem; font-weight:700; color:${h.hasLaboratory ? 'var(--cv-success)' : 'var(--cv-danger)'}; margin-top:0.25rem;">
                  ${h.hasLaboratory ? 'AVAILABLE' : '0 / Not Available'}
                </div>
                <div style="font-size:0.7rem; color:var(--cv-text-muted); font-weight:600;">${h.hasLaboratory ? 'Pathology Diagnostics' : 'No Lab Attached'}</div>
              </div>

              <div style="background:var(--cv-bg); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); padding:0.85rem; text-align:center;">
                <div style="font-size:0.72rem; color:var(--cv-text-muted); font-weight:700; text-transform:uppercase;">Pharmacy</div>
                <div style="font-size:0.95rem; font-weight:700; color:${h.hasPharmacy ? 'var(--cv-success)' : 'var(--cv-danger)'}; margin-top:0.25rem;">
                  ${h.hasPharmacy ? 'AVAILABLE' : '0 / Not Available'}
                </div>
                <div style="font-size:0.7rem; color:var(--cv-text-muted); font-weight:600;">${h.hasPharmacy ? 'Stock & Dispensing' : 'No Pharmacy Attached'}</div>
              </div>
            </div>

            <!-- OP Usage & Limit Details (Section 10) -->
            <div style="background:var(--cv-surface); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); padding:1rem; margin-bottom:1.5rem;">
              <div style="font-size:0.78rem; font-weight:700; color:var(--cv-deep-blue); margin-bottom:0.5rem;">Outpatient (OP) Monthly Limit & Usage Monitoring</div>
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.35rem;">
                <span>Current Month Usage: <strong>${h.opCurrentUsage} OP patients</strong></span>
                <span>Monthly OP Limit: <strong>${h.opLimit}</strong></span>
              </div>
              <div class="cv-progress-track" style="height:8px;">
                <div class="cv-progress-fill ${h.limitExceeded || h.opCurrentUsage >= h.opLimit ? 'danger' : (h.opUsagePercentage >= 80 ? 'warning' : '')}" style="width:${Math.min(100, h.opUsagePercentage)}%;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.74rem; color:var(--cv-text-muted); margin-top:0.35rem;">
                <span>Month Usage: ${h.opUsagePercentage}%</span>
                <span style="${h.limitExceeded ? 'color:var(--cv-danger); font-weight:700;' : ''}">Remaining This Month: ${h.opRemaining}${h.limitExceeded ? ' (Exceeded)' : ''}</span>
                <span>Status: <strong style="color:${h.limitExceeded || h.opUsagePercentage >= 100 ? 'var(--cv-danger)' : 'var(--cv-success)'}">${h.opLimitStatus}</strong></span>
              </div>
            </div>

            <!-- Admin & Staff Overview -->
            <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--cv-text-muted); margin-bottom:0.5rem;">
              Hospital Administrative Account
            </div>
            <div style="background:var(--cv-bg); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); padding:0.85rem; font-size:0.86rem; line-height:1.6;">
              <div><strong>Admin Name:</strong> ${escapeHtml(h.adminName || 'None')}</div>
              <div><strong>Email ID:</strong> ${escapeHtml(h.adminEmail || 'None')}</div>
              <div><strong>Phone:</strong> ${escapeHtml(h.phone || 'Not provided')}</div>
              <div><strong>Address:</strong> ${escapeHtml(h.address || 'Not provided')}</div>
              <div><strong>Active Hospital Staff:</strong> ${h.employeeCount} employees registered</div>
              <div><strong>Last Activity / Login:</strong> ${formatDate(h.adminLastLogin)}</div>
            </div>
          </div>
          <div class="cv-modal-footer">
            <button type="button" class="cv-btn-secondary" onclick="SuperAdmin.closeModal()">Close</button>
            <button type="button" class="cv-btn-primary" style="width:auto;" onclick="SuperAdmin.showOpLimitModal(${h.id}, ${h.opLimit}, ${h.opCurrentUsage}, '${escapeJs(h.hospitalName)}', ${h.opRemaining})">Configure Monthly OP Limit</button>
          </div>
        </div>
      </div>
    `;

    openModal(modalHtml);
    updateSuperAdminBackButton();
  }

  // ====================================================================
  // 4. CONFIGURE OP LIMIT MODAL (Section 10)
  // ====================================================================
  function showOpLimitModal(tenantId, currentLimit, currentUsage, hospitalName, remaining) {
    const h = (typeof hospitalsData !== 'undefined' && hospitalsData) ? hospitalsData.find(item => item.id === tenantId) : null;
    const hName = hospitalName || (h ? h.hospitalName : 'Hospital');
    const limit = (currentLimit !== undefined && currentLimit !== null) ? currentLimit : (h ? h.opLimit : 50);
    const usage = (currentUsage !== undefined && currentUsage !== null) ? currentUsage : (h ? h.opCurrentUsage : 0);
    const rem = (remaining !== undefined && remaining !== null) ? remaining : Math.max(0, limit - usage);
    const isExceeded = (h && h.limitExceeded) || (usage > limit);
    const isReached = (usage === limit);
    const pct = limit > 0 ? Math.round((usage * 100) / limit) : 0;
    const progressClass = isExceeded || isReached ? 'danger' : (pct >= 80 ? 'warning' : '');

    const modalHtml = `
      <div class="cv-modal-backdrop show" id="saModalBackdrop">
        <div class="cv-modal" style="max-width:460px;">
          <div class="cv-modal-header">
            <h3 class="cv-modal-title">Configure Hospital OP Limit</h3>
            <button type="button" class="cv-modal-close" onclick="SuperAdmin.closeModal()">&times;</button>
          </div>
          <form id="opLimitForm">
            <div class="cv-modal-body">
              <div id="modalAlert" class="cv-alert"></div>
              <div style="font-weight:700; color:var(--cv-deep-blue); font-size:0.95rem; margin-bottom:0.75rem;">
                ${escapeHtml(hName)}
              </div>

              <!-- Monthly usage & limit status card -->
              <div style="background:var(--cv-bg); padding:0.9rem 1rem; border-radius:var(--cv-radius-md); border:1px solid var(--cv-border); margin-bottom:1.25rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                  <span style="font-size:0.85rem; color:var(--cv-text-secondary);">Current Usage:</span>
                  <strong style="font-size:0.9rem;">${usage} OP patients</strong>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                  <span style="font-size:0.85rem; color:var(--cv-text-secondary);">Current Monthly Limit:</span>
                  <strong style="font-size:0.9rem;">${limit} OP patients</strong>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                  <span style="font-size:0.85rem; color:var(--cv-text-secondary);">Remaining:</span>
                  <strong style="font-size:0.9rem; color:${rem <= 0 ? 'var(--cv-danger)' : 'var(--cv-success)'};">
                    ${rem} OP patients ${isExceeded ? '<span class="cv-badge cv-badge-disabled" style="font-size:0.68rem; margin-left:4px; vertical-align:middle;">Exceeded</span>' : ''}
                  </strong>
                </div>

                <!-- Monthly progress indicator -->
                <div class="cv-progress-track" style="height:6px;">
                  <div class="cv-progress-fill ${progressClass}" style="width:${Math.min(100, pct)}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--cv-text-muted); margin-top:0.35rem;">
                  <span>This Month: ${pct}%</span>
                  <span>Status: <strong style="color:${isExceeded ? 'var(--cv-danger)' : (isReached ? 'var(--cv-warning)' : 'var(--cv-success)')};">${isExceeded ? 'LIMIT EXCEEDED' : (isReached ? 'LIMIT REACHED' : 'NORMAL')}</strong></span>
                </div>
              </div>

              <div class="cv-form-group">
                <label class="cv-form-label">New Configured OP Limit *</label>
                <input type="number" id="mNewOpLimit" class="cv-input" value="${limit}" min="1" required>
                <small style="color:var(--cv-text-muted); font-size:0.75rem;">
                  Monthly OP limit automatically resets at the start of each calendar month. If current month usage reaches or exceeds this limit, an immediate Super Admin alert is generated.
                </small>
              </div>
            </div>
            <div class="cv-modal-footer">
              <button type="button" class="cv-btn-secondary" onclick="SuperAdmin.closeModal()">Cancel</button>
              <button type="submit" class="cv-btn-primary" style="width:auto;">Update OP Limit</button>
            </div>
          </form>
        </div>
      </div>
    `;

    openModal(modalHtml);

    document.getElementById('opLimitForm').onsubmit = async (e) => {
      e.preventDefault();
      const newLimit = parseInt(document.getElementById('mNewOpLimit').value, 10);
      if (!newLimit || newLimit < 1) {
        showToast('Please enter a valid limit number', 'danger');
        return;
      }

      const res = await Api.put(`/api/superadmin/hospitals/${tenantId}/op-limit`, { opLimit: newLimit });
      if (res.ok) {
        showToast(`Monthly OP limit updated to ${newLimit} successfully!`, 'success');
        closeModal();
        loadMetrics();
        loadHospitals();
      } else {
        const alertBox = document.getElementById('modalAlert');
        alertBox.textContent = res.message || 'Unable to update monthly limit';
        alertBox.className = 'cv-alert cv-alert-danger show';
      }
    };
  }

  // ====================================================================
  // 5. RESET ADMIN PASSWORD MODAL (Section 12)
  // ====================================================================
  function showResetPasswordModal(tenantId, adminEmail, hospitalName) {
    const modalHtml = `
      <div class="cv-modal-backdrop show" id="saModalBackdrop">
        <div class="cv-modal" style="max-width:440px;">
          <div class="cv-modal-header">
            <h3 class="cv-modal-title">Reset Admin Password</h3>
            <button type="button" class="cv-modal-close" onclick="SuperAdmin.closeModal()">&times;</button>
          </div>
          <form id="resetPwdForm">
            <div class="cv-modal-body">
              <div id="modalAlert" class="cv-alert"></div>

              <div style="background:var(--cv-warning-light); border:1px solid var(--cv-warning-border); padding:0.85rem; border-radius:var(--cv-radius-md); font-size:0.84rem; color:var(--cv-warning); margin-bottom:1.25rem;">
                <strong>Security Notice:</strong> Setting a new password will immediately revoke the previous password for <strong>${escapeHtml(adminEmail)}</strong>. This event is recorded in the permanent audit log.
              </div>

              <div class="cv-form-group">
                <label class="cv-form-label">New Temporary Password *</label>
                <div class="cv-input-wrapper">
                  <input type="text" id="mNewPassword" class="cv-input" placeholder="Enter new password (min 6 chars)" value="Hospital@${Math.floor(1000 + Math.random() * 9000)}" required>
                </div>
              </div>
            </div>
            <div class="cv-modal-footer">
              <button type="button" class="cv-btn-secondary" onclick="SuperAdmin.closeModal()">Cancel</button>
              <button type="submit" class="cv-btn-primary" style="width:auto; background:var(--cv-warning); border-color:var(--cv-warning);">Reset Password</button>
            </div>
          </form>
        </div>
      </div>
    `;

    openModal(modalHtml);

    document.getElementById('resetPwdForm').onsubmit = async (e) => {
      e.preventDefault();
      const pwd = document.getElementById('mNewPassword').value.trim();
      if (!pwd || pwd.length < 6) {
        showToast('Password must be at least 6 characters long', 'danger');
        return;
      }

      const res = await Api.post(`/api/superadmin/hospitals/${tenantId}/reset-password`, { newPassword: pwd });
      if (res.ok) {
        showToast('Password reset successfully and audit logged!', 'success');
        closeModal();
      } else {
        const alertBox = document.getElementById('modalAlert');
        alertBox.textContent = res.message || 'Error resetting password';
        alertBox.className = 'cv-alert cv-alert-danger show';
      }
    };
  }

  // ====================================================================
  // 6. CONFIRM ENABLE / DISABLE ADMIN (Section 11 & Section 101)
  // ====================================================================
  function confirmStatusChange(tenantId, newStatus, hospitalName) {
    const isDisabling = newStatus === 'DISABLED';
    const actionText = isDisabling ? 'Disable Hospital Tenant' : 'Activate Hospital Tenant';

    const modalHtml = `
      <div class="cv-modal-backdrop show" id="saModalBackdrop">
        <div class="cv-modal" style="max-width:440px;">
          <div class="cv-modal-header">
            <h3 class="cv-modal-title">${actionText}</h3>
            <button type="button" class="cv-modal-close" onclick="SuperAdmin.closeModal()">&times;</button>
          </div>
          <div class="cv-modal-body">
            <p style="font-size:0.92rem; color:var(--cv-text-primary); line-height:1.6;">
              Are you sure you want to <strong>${newStatus.toLowerCase()}</strong> hospital <strong>${escapeHtml(hospitalName)}</strong>?
            </p>
            ${isDisabling ? `
              <div style="background:var(--cv-danger-light); border:1px solid var(--cv-danger-border); padding:0.85rem; border-radius:var(--cv-radius-md); font-size:0.82rem; color:var(--cv-danger); margin-top:1rem;">
                <strong>Hospital Isolation Effect:</strong> When disabled, the Admin and all hospital employees will be blocked from logging in. All hospital records, patients, pharmacy stock, and billing data remain safely preserved in MySQL.
              </div>
            ` : `
              <div style="background:var(--cv-success-light); border:1px solid var(--cv-success-border); padding:0.85rem; border-radius:var(--cv-radius-md); font-size:0.82rem; color:var(--cv-success); margin-top:1rem;">
                <strong>Re-activation Effect:</strong> The Hospital Admin and employees will regain immediate access to their workstations.
              </div>
            `}
          </div>
          <div class="cv-modal-footer">
            <button type="button" class="cv-btn-secondary" onclick="SuperAdmin.closeModal()">Cancel</button>
            <button type="button" class="cv-btn-sm ${isDisabling ? 'cv-btn-action-danger' : 'cv-btn-action-success'}" style="padding:0.6rem 1rem; font-size:0.88rem;" id="btnConfirmStatus">
              Confirm ${isDisabling ? 'Disable' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    `;

    openModal(modalHtml);

    document.getElementById('btnConfirmStatus').onclick = async () => {
      const res = await Api.put(`/api/superadmin/hospitals/${tenantId}/status`, { status: newStatus });
      if (res.ok) {
        showToast(`Hospital ${newStatus.toLowerCase()} successfully!`, 'success');
        closeModal();
        loadMetrics();
        loadHospitals();
      } else {
        showToast(res.message || 'Status update failed', 'danger');
      }
    };
  }

  // ====================================================================
  // 7. REAL PATIENT BILLING HISTORY BACKUP & EXPORT (MySQL-Connected)
  // ====================================================================
  let backupActivePeriod = 'TODAY';
  let backupCustomStart = '';
  let backupCustomEnd = '';
  let backupSelectedTenant = '';
  let cachedHospitals = [];

  function formatCurrency(val) {
    if (val == null) return '$0.00';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '$0.00';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function renderBackupView(container) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!backupCustomStart) backupCustomStart = todayStr;
    if (!backupCustomEnd) backupCustomEnd = todayStr;

    // Always load real hospitals/tenants dynamically from MySQL
    try {
      const hRes = await Api.get('/api/superadmin/hospitals');
      if ((hRes.ok || hRes.success) && Array.isArray(hRes.data)) {
        cachedHospitals = hRes.data;
      }
    } catch (e) {
      console.warn('Could not load hospital list for backup filter', e);
    }

    container.innerHTML = `
      <div class="cv-page-header">
        <div>
          <h1 class="cv-page-title">Backup & Patient Billing History</h1>
          <p class="cv-page-subtitle">Export and download verified patient billing audit records directly from MySQL across OP, IP, Pharmacy, Laboratory, and Central billing.</p>
        </div>
      </div>

      <!-- Export Configuration & Filter Card -->
      <div class="cv-welcome-card" style="margin-bottom:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
          <div>
            <h2 style="font-size:1.15rem; color:var(--cv-deep-blue); margin-bottom:0.25rem;">Patient Billing History Export & Backup</h2>
            <p style="font-size:0.875rem; color:var(--cv-text-secondary); margin:0;">
              Generate a clean, structured, human-readable export of authenticated patient billing transactions retrieved directly from the MySQL database.
            </p>
          </div>
          <div class="cv-badge" style="background:#eff6ff; color:#1d4ed8; padding:0.4rem 0.8rem; font-weight:600; font-size:0.8rem; border:1px solid #bfdbfe;">
            MySQL 8.x Production Source
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem; margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--cv-border);">
          <!-- Hospital Filter -->
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; text-transform:uppercase; color:var(--cv-text-muted); margin-bottom:0.4rem;">
              Hospital / Tenant
            </label>
            <select id="backupTenantSelect" class="cv-input" style="height:42px; font-weight:600; color:var(--cv-deep-blue); cursor:pointer;">
              <option value="">All Hospitals (Overall History)</option>
              ${cachedHospitals.map(h => `<option value="${h.id}" ${backupSelectedTenant == h.id ? 'selected' : ''}>${escapeHtml(h.hospitalName)}</option>`).join('')}
            </select>
          </div>

          <!-- Date Range Preset -->
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; text-transform:uppercase; color:var(--cv-text-muted); margin-bottom:0.4rem;">
              Select Date Range Filter
            </label>
            <div class="cv-filter-group" style="flex-wrap:wrap; gap:0.25rem;">
              <button type="button" class="cv-filter-btn backup-period-btn ${backupActivePeriod === 'TODAY' ? 'active' : ''}" data-period="TODAY">Today</button>
              <button type="button" class="cv-filter-btn backup-period-btn ${backupActivePeriod === 'YESTERDAY' ? 'active' : ''}" data-period="YESTERDAY">Yesterday</button>
              <button type="button" class="cv-filter-btn backup-period-btn ${backupActivePeriod === 'THIS_WEEK' ? 'active' : ''}" data-period="THIS_WEEK">This Week</button>
              <button type="button" class="cv-filter-btn backup-period-btn ${backupActivePeriod === 'THIS_MONTH' ? 'active' : ''}" data-period="THIS_MONTH">This Month</button>
              <button type="button" class="cv-filter-btn backup-period-btn ${backupActivePeriod === 'THIS_YEAR' ? 'active' : ''}" data-period="THIS_YEAR">This Year</button>
              <button type="button" class="cv-filter-btn backup-period-btn ${backupActivePeriod === 'ALL' ? 'active' : ''}" data-period="ALL">All History</button>
              <button type="button" class="cv-filter-btn backup-period-btn ${backupActivePeriod === 'CUSTOM' ? 'active' : ''}" data-period="CUSTOM">Custom Range</button>
            </div>
          </div>
        </div>

        <!-- Custom Date Range Pickers (Toggled when CUSTOM is selected) -->
        <div id="backupCustomDateRow" style="display:${backupActivePeriod === 'CUSTOM' ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr auto; gap:1rem; align-items:flex-end; margin-top:1.25rem; padding:1rem; background:var(--cv-bg); border-radius:var(--cv-radius-md); border:1px solid var(--cv-border);">
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--cv-text-muted); margin-bottom:0.35rem;">From Date</label>
            <input type="date" id="backupStartDate" class="cv-input" value="${backupCustomStart}">
          </div>
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:600; color:var(--cv-text-muted); margin-bottom:0.35rem;">To Date</label>
            <input type="date" id="backupEndDate" class="cv-input" value="${backupCustomEnd}">
          </div>
          <div>
            <button type="button" class="cv-btn-secondary" id="btnApplyCustomDates" style="height:42px;">Apply Filter</button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--cv-border);">
          <div style="font-size:0.85rem; color:var(--cv-text-muted);">
            <span id="backupSelectedPeriodLabel" style="font-weight:600; color:var(--cv-deep-blue);">Filtering: ${escapeHtml(backupActivePeriod)}</span> &bull; 
            <span id="backupRecordCounter">Loading real records from MySQL...</span>
          </div>

          <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
            <button type="button" class="cv-btn-secondary" id="btnRefreshBackupPreview" title="Refresh data from MySQL">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh
            </button>
            <button type="button" class="cv-btn-secondary" id="btnDownloadPdf" style="font-weight:600; color:#b91c1c; border-color:#fca5a5; background:#fff5f5; display:inline-flex; align-items:center; gap:0.4rem;" title="Download Formatted PDF Document">
              <svg id="pdfIconSvg" style="width:16px; height:16px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>
              <span id="pdfBtnSpinner" class="cv-spinner" style="display:none; width:14px; height:14px; border-width:2px;"></span>
              <span id="pdfBtnText">Download PDF</span>
            </button>
            <button type="button" class="cv-btn-secondary" id="btnDownloadWord" style="font-weight:600; color:#1d4ed8; border-color:#bfdbfe; background:#eff6ff; display:inline-flex; align-items:center; gap:0.4rem;" title="Download Editable Microsoft Word Document (.docx)">
              <svg id="wordIconSvg" style="width:16px; height:16px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
              <span id="wordBtnSpinner" class="cv-spinner" style="display:none; width:14px; height:14px; border-width:2px;"></span>
              <span id="wordBtnText">Download Word</span>
            </button>
            <button type="button" class="cv-btn-primary" style="width:auto; padding:0.85rem 1.5rem; font-weight:600;" id="btnDownloadBillingHistory">
              <svg id="downloadIconSvg" style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span id="downloadBtnSpinner" class="cv-spinner" style="display:none; width:16px; height:16px; border-width:2px; margin-right:0.5rem;"></span>
              <span id="downloadBtnText">DOWNLOAD BILLING HISTORY</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Real-Time Metrics Strip for Selected Date Range -->
      <div class="cv-cards-grid" id="backupMetricsGrid" style="margin-bottom:1.5rem;">
        <div class="cv-metric-card">
          <div class="cv-metric-label">Bills / Items</div>
          <div class="cv-metric-value" id="mBackupCount">...</div>
          <span class="cv-metric-badge" style="background:#eff6ff; color:#1d4ed8;">Matching Range</span>
        </div>
        <div class="cv-metric-card">
          <div class="cv-metric-label">Gross Subtotal</div>
          <div class="cv-metric-value" id="mBackupGross">...</div>
          <span class="cv-metric-badge" style="background:#f8fafc; color:#475569;">Before Deductions</span>
        </div>
        <div class="cv-metric-card">
          <div class="cv-metric-label">Discounts & Taxes</div>
          <div class="cv-metric-value" id="mBackupDiscounts">...</div>
          <span class="cv-metric-badge" style="background:#fffbeb; color:#d97706;">Discount / GST</span>
        </div>
        <div class="cv-metric-card">
          <div class="cv-metric-label">Total Net Billed</div>
          <div class="cv-metric-value" id="mBackupNet">...</div>
          <span class="cv-metric-badge" style="background:#ecfdf5; color:#059669;">Net Invoiced</span>
        </div>
        <div class="cv-metric-card">
          <div class="cv-metric-label">Collected Amount</div>
          <div class="cv-metric-value" id="mBackupCollected">...</div>
          <span class="cv-metric-badge" style="background:#f0fdfa; color:#0d9488;">Realized Revenue</span>
        </div>
      </div>

      <!-- Live Table Preview -->
      <div class="cv-table-wrapper" style="margin-bottom:2rem;">
        <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--cv-border); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:0.95rem; font-weight:700; color:var(--cv-deep-blue); margin:0;">
            Billing History Audit Records (MySQL Live Preview)
          </h3>
          <span style="font-size:0.8rem; color:var(--cv-text-muted);">
            Showing verified hospital transactions
          </span>
        </div>
        <table class="cv-table" id="backupPreviewTable">
          <thead>
            <tr>
              <th>Bill # / Module</th>
              <th>Date & Time</th>
              <th>Patient Name & UHID</th>
              <th>Hospital Tenant</th>
              <th>Services / Items</th>
              <th>Doctor / Dept</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Status & Mode</th>
            </tr>
          </thead>
          <tbody id="backupPreviewTableBody">
            <tr>
              <td colspan="9" style="text-align:center; padding:2.5rem; color:var(--cv-text-muted);">
                <span class="cv-spinner" style="display:inline-block; vertical-align:middle; margin-right:0.5rem;"></span>
                Retrieving real billing records from MySQL...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Data Safeguard Footer Card -->
      <div style="background:var(--cv-surface); border:1px solid var(--cv-border); border-left:4px solid var(--cv-teal); border-radius:var(--cv-radius-md); padding:1rem 1.25rem; font-size:0.825rem; color:var(--cv-text-secondary); line-height:1.6;">
        <strong style="color:var(--cv-deep-blue); display:block; margin-bottom:0.25rem;">Enterprise Billing Export Safeguard:</strong>
        This export retrieves authenticated clinical billing records across Outpatient (OP), Inpatient (IP), Pharmacy, and Diagnostic Laboratory modules directly from MySQL tables (<code>op_registrations</code>, <code>pharmacy_bills</code>, <code>lab_orders</code>, <code>payment_records</code>). Sensitive system credentials, password hashes, and security keys are automatically omitted to ensure healthcare privacy compliance.
      </div>
    `;

    bindBackupEvents();
    populateBackupTenantDropdown();
    fetchBackupPreview();
  }

  function populateBackupTenantDropdown() {
    const tenantSelect = document.getElementById('backupTenantSelect');
    if (!tenantSelect) return;
    let html = `<option value="">All Hospitals (Overall History)</option>`;
    if (Array.isArray(cachedHospitals)) {
      html += cachedHospitals.map(h => {
        const isSel = (backupSelectedTenant && String(backupSelectedTenant) === String(h.id));
        return `<option value="${h.id}" ${isSel ? 'selected' : ''}>${escapeHtml(h.hospitalName)}</option>`;
      }).join('');
    }
    tenantSelect.innerHTML = html;
  }

  function bindBackupEvents() {
    const periodButtons = document.querySelectorAll('.backup-period-btn');
    periodButtons.forEach(btn => {
      btn.onclick = () => {
        periodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        backupActivePeriod = btn.dataset.period;

        const customRow = document.getElementById('backupCustomDateRow');
        if (customRow) {
          customRow.style.display = backupActivePeriod === 'CUSTOM' ? 'grid' : 'none';
        }

        const label = document.getElementById('backupSelectedPeriodLabel');
        if (label) label.textContent = 'Filtering: ' + btn.textContent;

        fetchBackupPreview();
      };
    });

    const applyBtn = document.getElementById('btnApplyCustomDates');
    if (applyBtn) {
      applyBtn.onclick = () => {
        const startInput = document.getElementById('backupStartDate');
        const endInput = document.getElementById('backupEndDate');
        if (startInput && endInput) {
          if (startInput.value > endInput.value) {
            showToast('Start date cannot be after end date', 'warning');
            return;
          }
          backupCustomStart = startInput.value;
          backupCustomEnd = endInput.value;
        }
        fetchBackupPreview();
      };
    }

    const tenantSelect = document.getElementById('backupTenantSelect');
    if (tenantSelect) {
      tenantSelect.onchange = () => {
        backupSelectedTenant = tenantSelect.value;
        fetchBackupPreview();
      };
    }

    const refreshBtn = document.getElementById('btnRefreshBackupPreview');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        // Also refresh hospital options from MySQL when refresh is clicked
        Api.get('/api/superadmin/hospitals').then(res => {
          if ((res.ok || res.success) && Array.isArray(res.data)) {
            cachedHospitals = res.data;
            populateBackupTenantDropdown();
          }
        }).finally(() => {
          fetchBackupPreview();
        });
      };
    }

    const downloadBtn = document.getElementById('btnDownloadBillingHistory');
    if (downloadBtn) {
      downloadBtn.onclick = () => downloadBillingHistory();
    }

    const downloadPdfBtn = document.getElementById('btnDownloadPdf');
    if (downloadPdfBtn) {
      downloadPdfBtn.onclick = () => downloadDocument('pdf');
    }

    const downloadWordBtn = document.getElementById('btnDownloadWord');
    if (downloadWordBtn) {
      downloadWordBtn.onclick = () => downloadDocument('word');
    }
  }

  async function fetchBackupPreview() {
    const tableBody = document.getElementById('backupPreviewTableBody');
    const counter = document.getElementById('backupRecordCounter');
    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">
          <span class="cv-spinner" style="display:inline-block; vertical-align:middle; margin-right:0.5rem;"></span>
          Querying MySQL database for ${escapeHtml(backupActivePeriod)} billing records...
        </td>
      </tr>
    `;

    try {
      const params = new URLSearchParams();
      params.append('period', backupActivePeriod);
      if (backupActivePeriod === 'CUSTOM') {
        const startInput = document.getElementById('backupStartDate');
        const endInput = document.getElementById('backupEndDate');
        if (startInput && startInput.value) params.append('startDate', startInput.value);
        if (endInput && endInput.value) params.append('endDate', endInput.value);
      }
      if (backupSelectedTenant) {
        params.append('tenantId', backupSelectedTenant);
      }

      const res = await Api.get(`/api/superadmin/billing-history/preview?${params.toString()}`);
      if ((res.ok || res.success) && res.data) {
        const report = res.data;

        // Update metric cards
        const mCount = document.getElementById('mBackupCount');
        const mGross = document.getElementById('mBackupGross');
        const mDisc = document.getElementById('mBackupDiscounts');
        const mNet = document.getElementById('mBackupNet');
        const mCol = document.getElementById('mBackupCollected');

        if (mCount) mCount.textContent = report.totalRecords + ' Records';
        if (mGross) mGross.textContent = formatCurrency(report.grossSubtotal);
        if (mDisc) mDisc.textContent = `-${formatCurrency(report.totalDiscount)} / +${formatCurrency(report.totalGst)}`;
        if (mNet) mNet.textContent = formatCurrency(report.totalBilled);
        if (mCol) mCol.textContent = formatCurrency(report.totalPaid);

        if (counter) counter.textContent = `${report.totalRecords} verified records found in MySQL (${formatCurrency(report.totalBilled)})`;

        const label = document.getElementById('backupSelectedPeriodLabel');
        if (label) {
          label.innerHTML = `<strong>Hospital:</strong> ${escapeHtml(report.hospitalFilter || 'All Hospitals')} &bull; <strong>Range:</strong> ${escapeHtml(report.periodName)}`;
        }

        // Render rows
        if (!report.items || report.items.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="9" style="text-align:center; padding:2.5rem; color:var(--cv-text-muted);">
                <div style="font-weight:600; color:var(--cv-text-primary); margin-bottom:0.25rem;">No Billing Records Found for Selected Hospital & Range</div>
                <div>There are no hospital transactions in MySQL for <strong>${escapeHtml(report.hospitalFilter || 'Selected Hospital')}</strong> matching the "${escapeHtml(report.periodName)}" filter.</div>
              </td>
            </tr>
          `;
          return;
        }

        tableBody.innerHTML = report.items.map(item => {
          let badgeBg = '#eff6ff';
          let badgeColor = '#1d4ed8';
          if (item.billingType === 'IP') { badgeBg = '#fdf2f8'; badgeColor = '#be185d'; }
          else if (item.billingType === 'Pharmacy') { badgeBg = '#f0fdfa'; badgeColor = '#0d9488'; }
          else if (item.billingType === 'Laboratory') { badgeBg = '#fefce8'; badgeColor = '#a16207'; }
          else if (item.billingType === 'Central Billing') { badgeBg = '#f5f3ff'; badgeColor = '#6d28d9'; }

          return `
            <tr>
              <td>
                <div style="font-weight:700; color:var(--cv-deep-blue); font-family:monospace; font-size:0.9rem;">${escapeHtml(item.billNumber)}</div>
                <span class="cv-badge" style="background:${badgeBg}; color:${badgeColor}; font-size:0.75rem; margin-top:0.2rem;">${escapeHtml(item.billingType)}</span>
              </td>
              <td>
                <div style="font-weight:600; color:var(--cv-text-primary);">${escapeHtml(item.billDate)}</div>
                <div style="font-size:0.775rem; color:var(--cv-text-muted); font-family:monospace;">${escapeHtml(item.billTime || '')}</div>
              </td>
              <td>
                <div style="font-weight:600; color:var(--cv-text-primary);">${escapeHtml(item.patientName)}</div>
                <div style="font-size:0.775rem; color:var(--cv-text-muted); font-family:monospace;">${escapeHtml(item.uhid)}</div>
              </td>
              <td>
                <div style="font-size:0.85rem; font-weight:600; color:var(--cv-text-secondary);">${escapeHtml(item.hospitalName)}</div>
                <span class="cv-badge" style="background:#f1f5f9; color:#475569; font-size:0.7rem;">${escapeHtml(item.tenantCode || 'TENANT')}</span>
              </td>
              <td style="max-width:240px;">
                <div style="font-size:0.85rem; color:var(--cv-text-primary);">${escapeHtml(item.servicesOrItems)}</div>
                <div style="font-size:0.75rem; color:var(--cv-text-muted);">Qty: ${item.quantity || 1} &bull; Sub: ${formatCurrency(item.subtotal)}</div>
              </td>
              <td>
                <div style="font-size:0.85rem; font-weight:600; color:var(--cv-text-primary);">${escapeHtml(item.doctorName || 'N/A')}</div>
                <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(item.department || '')}</div>
              </td>
              <td>
                <div style="font-weight:700; color:var(--cv-deep-blue);">${formatCurrency(item.totalAmount)}</div>
                ${item.discountAmount > 0 ? `<div style="font-size:0.7rem; color:var(--cv-danger);">Disc: -${formatCurrency(item.discountAmount)}</div>` : ''}
                ${item.gstAmount > 0 ? `<div style="font-size:0.7rem; color:var(--cv-text-muted);">GST: +${formatCurrency(item.gstAmount)}</div>` : ''}
              </td>
              <td>
                <div style="font-weight:600; color:var(--cv-success);">${formatCurrency(item.paidAmount)}</div>
                ${item.outstandingAmount > 0 ? `<div style="font-size:0.7rem; color:var(--cv-danger); font-weight:600;">Bal: ${formatCurrency(item.outstandingAmount)}</div>` : ''}
              </td>
              <td>
                <span class="cv-badge" style="background:#ecfdf5; color:#059669; font-size:0.75rem;">${escapeHtml(item.paymentStatus || 'PAID')}</span>
                <div style="font-size:0.75rem; color:var(--cv-text-muted); margin-top:0.2rem; font-weight:600;">${escapeHtml(item.paymentMethod || 'CASH')}</div>
              </td>
            </tr>
          `;
        }).join('');
      } else {
        tableBody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-danger);">
              Failed to load billing preview: ${escapeHtml(res.message || 'Unknown database error')}
            </td>
          </tr>
        `;
      }
    } catch (e) {
      console.error('Failed to fetch billing preview:', e);
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-danger);">
            Connection error retrieving billing records from server.
          </td>
        </tr>
      `;
    }
  }

  async function downloadBillingHistory() {
    const btn = document.getElementById('btnDownloadBillingHistory');
    const spinner = document.getElementById('downloadBtnSpinner');
    const icon = document.getElementById('downloadIconSvg');
    const text = document.getElementById('downloadBtnText');

    let selectedHospName = 'All Hospitals';
    if (backupSelectedTenant) {
      const foundH = cachedHospitals.find(h => String(h.id) === String(backupSelectedTenant));
      if (foundH) selectedHospName = foundH.hospitalName;
    }

    try {
      if (btn) btn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';
      if (icon) icon.style.display = 'none';
      if (text) text.textContent = 'Generating Export...';

      showToast(`Generating billing history export for ${selectedHospName} from MySQL...`, 'info');

      const params = new URLSearchParams();
      params.append('period', backupActivePeriod);
      if (backupActivePeriod === 'CUSTOM') {
        const startInput = document.getElementById('backupStartDate');
        const endInput = document.getElementById('backupEndDate');
        if (startInput && startInput.value) params.append('startDate', startInput.value);
        if (endInput && endInput.value) params.append('endDate', endInput.value);
      }
      if (backupSelectedTenant) {
        params.append('tenantId', backupSelectedTenant);
      }

      const downloadUrl = `/api/superadmin/billing-history/export?${params.toString()}`;

      const token = localStorage.getItem('carevista_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(downloadUrl, { headers });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      let filename = `carevista_billing_history_${backupActivePeriod.toLowerCase()}_${new Date().toISOString().replace(/[:.]/g, '')}.csv`;
      const fnMatch = contentDisposition.match(/filename="?([^";]+)"?/);
      if (fnMatch && fnMatch[1]) {
        filename = fnMatch[1];
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.setAttribute('download', filename);
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      window.URL.revokeObjectURL(blobUrl);

      showToast(`Billing history backup downloaded successfully as ${filename}!`, 'success');
    } catch (err) {
      console.error('Billing export error:', err);
      showToast(`Billing history export failed: ${err.message || 'Please verify server and database connectivity.'}`, 'danger');
    } finally {
      if (btn) btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (icon) icon.style.display = 'inline-block';
      if (text) text.textContent = 'DOWNLOAD BILLING HISTORY';
    }
  }

  async function downloadDocument(format) {
    const isPdf = format === 'pdf';
    const btn = document.getElementById(isPdf ? 'btnDownloadPdf' : 'btnDownloadWord');
    const spinner = document.getElementById(isPdf ? 'pdfBtnSpinner' : 'wordBtnSpinner');
    const icon = document.getElementById(isPdf ? 'pdfIconSvg' : 'wordIconSvg');
    const text = document.getElementById(isPdf ? 'pdfBtnText' : 'wordBtnText');

    const defaultText = isPdf ? 'Download PDF' : 'Download Word';
    const loadingMessage = isPdf ? 'Generating billing history PDF...' : 'Generating billing history Word document...';
    const successMessage = isPdf ? 'Billing history PDF downloaded successfully.' : 'Billing history Word document downloaded successfully.';

    try {
      if (btn) btn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';
      if (icon) icon.style.display = 'none';
      if (text) text.textContent = isPdf ? 'Generating PDF...' : 'Generating Word...';

      showToast(loadingMessage, 'info');

      const params = new URLSearchParams();
      params.append('period', backupActivePeriod);
      if (backupActivePeriod === 'CUSTOM') {
        const startInput = document.getElementById('backupStartDate');
        const endInput = document.getElementById('backupEndDate');
        if (startInput && startInput.value) params.append('startDate', startInput.value);
        if (endInput && endInput.value) params.append('endDate', endInput.value);
      }
      if (backupSelectedTenant) {
        params.append('tenantId', backupSelectedTenant);
      }

      const endpoint = isPdf ? '/api/superadmin/billing-history/export/pdf' : '/api/superadmin/billing-history/export/word';
      const downloadUrl = `${endpoint}?${params.toString()}`;

      const token = localStorage.getItem('carevista_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(downloadUrl, { headers });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const blob = await response.blob();
      let filename = isPdf ? 'CareVista_Billing_History.pdf' : 'CareVista_Billing_History.docx';

      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.setAttribute('download', filename);
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      window.URL.revokeObjectURL(blobUrl);

      showToast(successMessage, 'success');
      updateNotificationBadge();
    } catch (err) {
      console.error(`Export ${format} error:`, err);
      showToast(`Unable to generate billing history ${format.toUpperCase()} document. Please check server status.`, 'danger');
    } finally {
      if (btn) btn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (icon) icon.style.display = 'inline-block';
      if (text) text.textContent = defaultText;
    }
  }

  // ====================================================================
  // 8. NOTIFICATION CENTER (Section 14 & Section 59)
  // ====================================================================
  async function renderNotificationsView(container) {
    container.innerHTML = `
      <div class="cv-page-header">
        <div>
          <h1 class="cv-page-title">Super Admin Notification Center</h1>
          <p class="cv-page-subtitle">Platform alerts, OP limits, hospital lifecycle events, and audit notifications</p>
        </div>
        <button type="button" class="cv-btn-secondary" id="btnMarkAllRead">
          Mark All as Read
        </button>
      </div>

      <div class="cv-table-wrapper" id="notifListContainer">
        <div style="padding:2rem; text-align:center; color:var(--cv-text-muted);">Loading notifications...</div>
      </div>
    `;

    document.getElementById('btnMarkAllRead').onclick = async () => {
      await Api.post('/api/superadmin/notifications/read-all', {});
      showToast('All notifications marked as read', 'success');
      loadNotificationsList();
      updateNotificationBadge();
    };

    loadNotificationsList();
  }

  async function loadNotificationsList() {
    const container = document.getElementById('notifListContainer');
    if (!container) return;

    const res = await Api.get('/api/superadmin/notifications');
    if (res.ok && res.data) {
      const list = res.data;
      if (list.length === 0) {
        container.innerHTML = `
          <div style="padding:3rem 1rem; text-align:center; color:var(--cv-text-muted);">
            <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.25rem;">All caught up!</div>
            <p style="font-size:0.85rem;">No unread system alerts or OP limit notices at this time.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <table class="cv-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Notification</th>
              <th>Message</th>
              <th>Timestamp</th>
              <th style="text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((n) => {
              const badgeType = n.type === 'DANGER' ? 'cv-badge-disabled' : (n.type === 'WARNING' ? 'cv-metric-badge' : 'cv-badge-available');
              return `
                <tr style="${n.read ? 'opacity:0.65;' : 'font-weight:600;'}">
                  <td>
                    <span class="cv-badge ${badgeType}">${escapeHtml(n.type || 'INFO')}</span>
                  </td>
                  <td>${escapeHtml(n.title)}</td>
                  <td style="max-width:400px;">${escapeHtml(n.message)}</td>
                  <td style="font-size:0.78rem; color:var(--cv-text-muted);">${formatDate(n.createdAt)}</td>
                  <td style="text-align:right;">
                    ${!n.read ? `<button type="button" class="cv-btn-sm cv-btn-action-primary" onclick="SuperAdmin.markNotifRead(${n.id})">Mark Read</button>` : '<span style="font-size:0.75rem; color:var(--cv-text-muted);">Read</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  }

  async function markNotifRead(id) {
    await Api.post(`/api/superadmin/notifications/${id}/read`, {});
    loadNotificationsList();
    updateNotificationBadge();
  }

  async function updateNotificationBadge() {
    const badge = document.getElementById('badgeNotifCount');
    if (!badge) return;
    const res = await Api.get('/api/superadmin/notifications');
    if (res.ok && res.data) {
      const unread = res.data.filter((n) => !n.read).length;
      if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ====================================================================
  // 9. AUDIT LOGS (Section 62)
  // ====================================================================
  async function renderAuditLogsView(container) {
    container.innerHTML = `
      <div class="cv-page-header">
        <div>
          <h1 class="cv-page-title">SaaS Security & Audit Trail</h1>
          <p class="cv-page-subtitle">Immutable chronological audit log of hospital creation, password resets, logins, and status changes</p>
        </div>
      </div>

      <div class="cv-table-wrapper">
        <table class="cv-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>User Email</th>
              <th>Role</th>
              <th>Tenant ID</th>
              <th>Details</th>
              <th>IP Address</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody id="auditTableBody">
            <tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">Loading audit logs...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    const res = await Api.get('/api/superadmin/audit-logs');
    const tbody = document.getElementById('auditTableBody');
    if (res.ok && res.data && tbody) {
      const logs = res.data;
      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">No audit events recorded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = logs.map((log) => `
        <tr>
          <td style="font-size:0.78rem; white-space:nowrap; color:var(--cv-text-muted);">${formatDate(log.timestamp)}</td>
          <td><span class="cv-badge cv-badge-available">${escapeHtml(log.action)}</span></td>
          <td style="font-weight:600;">${escapeHtml(log.userEmail || 'System')}</td>
          <td><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(log.userRole || '-')}</span></td>
          <td>${log.tenantId ? '#' + log.tenantId : '-'}</td>
          <td style="font-size:0.82rem; color:var(--cv-text-secondary); max-width:350px;">${escapeHtml(log.details || '-')}</td>
          <td style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(log.ipAddress || '-')}</td>
          <td>
            <span class="cv-badge ${log.status === 'SUCCESS' ? 'cv-badge-active' : 'cv-badge-disabled'}">
              ${escapeHtml(log.status || 'INFO')}
            </span>
          </td>
        </tr>
      `).join('');
    }
  }

  // ====================================================================
  // MODAL HELPERS & UTILITIES
  // ====================================================================
  function openModal(html) {
    closeModal();
    const div = document.createElement('div');
    div.id = 'activeModalContainer';
    div.innerHTML = html;
    document.body.appendChild(div);
  }

  function closeModal() {
    const existing = document.getElementById('activeModalContainer');
    if (existing) existing.remove();
    updateSuperAdminBackButton();
  }

  function showToast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'cv-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `cv-toast cv-toast-${type}`;
    toast.innerHTML = `
      <span style="flex:1;">${escapeHtml(msg)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
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

  function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dStr;
    }
  }

  return {
    init: init,
    navigateToTab: navigateToTab,
    handlePopstate: handlePopstate,
    navigateBack: navigateBack,
    showAddHospitalModal: showAddHospitalModal,
    showHospitalDetails: showHospitalDetails,
    showOpLimitModal: showOpLimitModal,
    showResetPasswordModal: showResetPasswordModal,
    confirmStatusChange: confirmStatusChange,
    closeModal: closeModal,
    downloadBackup: downloadBillingHistory,
    downloadBillingHistory: downloadBillingHistory,
    downloadPdf: () => downloadDocument('pdf'),
    downloadWord: () => downloadDocument('word'),
    markNotifRead: markNotifRead,
    showToast: showToast
  };
})();

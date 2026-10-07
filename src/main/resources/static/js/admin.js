/**
 * CAREVISTA HOSPITAL MANAGEMENT SAAS
 * Hospital Admin Dashboard & Operations Module (Phase 3)
 */

const Admin = (function () {
  'use strict';

  let currentUser = null;
  let selectedDate = new Date(); // default Today
  let activePeriod = 'ONE_WEEK'; // ONE_DAY, ONE_WEEK, ONE_MONTH, ONE_YEAR, LIFETIME
  let activeMetric = 'COLLECTION'; // COLLECTION, OP, IP, PHARMACY, LAB
  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();

  // Navigation History Stack (Multi-Level Section/Tab History)
  let currentNavState = { mod: 'dashboard', sub: 'main', fn: () => renderDashboardLayout(false) };
  let isNavigatingHistory = false;
  let adminHistoryIndex = 1;
  let cachedHospitalSettings = null;

  // ====================================================================
  // COMMON HISTORY PAGE-SIZE & PAGINATION ENGINE (Phase 4)
  // Allowed page sizes strictly: 10, 25, 50, 100 (Default: 10)
  // Reusable across OP, IP, Pharmacy, Lab & Central Billing History
  // ====================================================================
  function createHistoryPaginationController(config = {}) {
    const defaultPageSize = [10, 25, 50, 100].includes(Number(config.defaultPageSize)) ? Number(config.defaultPageSize) : 10;
    let pageSize = defaultPageSize;
    let currentPage = 1;
    let allItems = [];
    const onPageChange = config.onPageChange;

    function setPageSize(newSize) {
      const allowed = [10, 25, 50, 100];
      const parsed = Number(newSize);
      pageSize = allowed.includes(parsed) ? parsed : 10;
      currentPage = 1;
      if (typeof onPageChange === 'function') {
        onPageChange(getPagedItems(), getPaginationState());
      }
    }

    function setPage(p) {
      const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
      let target = Number(p);
      if (isNaN(target) || target < 1) target = 1;
      if (target > totalPages) target = totalPages;
      currentPage = target;
      if (typeof onPageChange === 'function') {
        onPageChange(getPagedItems(), getPaginationState());
      }
    }

    function setItems(items, preservePage = false) {
      allItems = Array.isArray(items) ? items : [];
      const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
      if (!preservePage || currentPage > totalPages || currentPage < 1) {
        currentPage = 1;
      }
      return getPagedItems();
    }

    function getPagedItems() {
      const start = (currentPage - 1) * pageSize;
      return allItems.slice(start, start + pageSize);
    }

    function getPaginationState() {
      const total = allItems.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const end = Math.min(total, currentPage * pageSize);
      return {
        currentPage,
        pageSize,
        total,
        totalPages,
        start,
        end,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages
      };
    }

    function renderControlsHtml(prefix) {
      const state = getPaginationState();
      return `
        <div class="cv-history-pagination-bar" id="${prefix}_paginationBar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; padding:0.65rem 1rem; background:#f8fafc; border-top:1px solid #e2e8f0; border-radius:0 0 8px 8px; font-size:0.82rem; color:#475569;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <label for="${prefix}_pageSizeSelect" style="font-weight:600; font-size:0.8rem; color:#475569; margin:0;">Rows per page:</label>
            <select id="${prefix}_pageSizeSelect" class="cv-form-select" style="height:32px; width:74px; padding:0 0.5rem; font-size:0.82rem; font-weight:700; background:#fff; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer;">
              <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
            </select>
            <span style="color:#64748b; font-size:0.8rem; margin-left:0.5rem;">
              Showing <strong>${state.start}</strong>–<strong>${state.end}</strong> of <strong>${state.total}</strong> records
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <button type="button" class="cv-btn-secondary" id="${prefix}_prevBtn" style="padding:0.3rem 0.7rem; font-size:0.78rem; height:30px;" ${!state.hasPrev ? 'disabled' : ''}>
              &larr; Prev
            </button>
            <span style="padding:0 0.4rem; font-weight:700; font-size:0.8rem; color:#1e293b;">
              Page ${state.currentPage} of ${state.totalPages}
            </span>
            <button type="button" class="cv-btn-secondary" id="${prefix}_nextBtn" style="padding:0.3rem 0.7rem; font-size:0.78rem; height:30px;" ${!state.hasNext ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      `;
    }

    function bindEvents(prefix) {
      const selectEl = document.getElementById(`${prefix}_pageSizeSelect`);
      const prevEl = document.getElementById(`${prefix}_prevBtn`);
      const nextEl = document.getElementById(`${prefix}_nextBtn`);

      selectEl?.addEventListener('change', (e) => {
        setPageSize(e.target.value);
      });
      prevEl?.addEventListener('click', () => {
        setPage(currentPage - 1);
      });
      nextEl?.addEventListener('click', () => {
        setPage(currentPage + 1);
      });
    }

    return {
      setItems,
      setPageSize,
      setPage,
      getPagedItems,
      getPaginationState,
      renderControlsHtml,
      bindEvents,
      getPageSize: () => pageSize,
      getCurrentPage: () => currentPage
    };
  }

  function init(user) {
    currentUser = user || Auth.getCurrentUser();
    if (currentUser && currentUser.role === 'ADMIN') {
      currentUser.hospitalName = 'CITYCARE SUPER SPECIALITY HOSPITAL';
    }
    initAdminSidebar();
    loadAndApplyTenantSettings();
    setupAdminNavigation();

    // Check if initial hash exists
    let initialMod = 'dashboard';
    let initialSub = 'main';
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const parts = hash.split('/');
      initialMod = parts[0] || 'dashboard';
      initialSub = parts[1] || 'main';
    }

    try {
      window.history.replaceState(
        { role: 'ADMIN', mod: initialMod, sub: initialSub, index: 1, isCareVistaNav: true },
        '',
        '#' + initialMod + (initialSub && initialSub !== 'main' ? '/' + initialSub : '')
      );
    } catch (e) {}

    dispatchAdminRoute(initialMod, initialSub);
    updateFloatingBackButton();
  }

  function handlePopstate(e) {
    // 1. Dismiss any open modal
    const modal = document.querySelector('.cv-op-modal-backdrop, .cv-modal-backdrop, #activeModalContainer');
    if (modal) {
      modal.remove();
    }

    const state = e.state;
    isNavigatingHistory = true;
    try {
      if (state && state.role === 'ADMIN') {
        adminHistoryIndex = state.index || adminHistoryIndex;
        dispatchAdminRoute(state.mod || 'dashboard', state.sub || 'main');
      } else {
        const hash = window.location.hash.replace(/^#/, '');
        if (hash) {
          const parts = hash.split('/');
          dispatchAdminRoute(parts[0] || 'dashboard', parts[1] || 'main');
        } else {
          dispatchAdminRoute('dashboard', 'main');
        }
      }
    } finally {
      isNavigatingHistory = false;
      updateFloatingBackButton();
    }
  }

  function syncSidebarCollapsedClass() {
    const isCollapsed = localStorage.getItem('cv_admin_sidebar_collapsed') === 'true' ||
      document.getElementById('appSidebar')?.classList.contains('cv-sidebar-collapsed');
    document.body.classList.toggle('cv-sidebar-collapsed-mode', !!isCollapsed);
  }

  function initAdminSidebar() {
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const sidebar = document.getElementById('appSidebar') || document.querySelector('.cv-sidebar');
    if (!sidebar) return;

    // Restore persisted sidebar state (Section 15)
    const isCollapsed = localStorage.getItem('cv_admin_sidebar_collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('cv-sidebar-collapsed');
    } else {
      sidebar.classList.remove('cv-sidebar-collapsed');
    }
    syncSidebarCollapsedClass();

    if (collapseBtn) {
      collapseBtn.onclick = (e) => {
        e.preventDefault();
        sidebar.classList.toggle('cv-sidebar-collapsed');
        const nowCollapsed = sidebar.classList.contains('cv-sidebar-collapsed');
        localStorage.setItem('cv_admin_sidebar_collapsed', nowCollapsed ? 'true' : 'false');
        syncSidebarCollapsedClass();
      };
    }

    // Header Hospital / Tenant Area Internal Navigation (No Full Reload)
    const sidebarHeader = document.querySelector('.cv-sidebar-header');
    if (sidebarHeader) {
      sidebarHeader.style.cursor = 'pointer';
      sidebarHeader.onclick = (e) => {
        if (e.target.closest('#sidebarCollapseBtn')) return;
        e.preventDefault();
        navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
      };
    }

    const tenantNameEl = document.getElementById('sidebarTenantName');
    if (tenantNameEl) {
      tenantNameEl.textContent = 'CITYCARE SUPER SPECIALITY HOSPITAL';
      tenantNameEl.style.cursor = 'pointer';
      tenantNameEl.setAttribute('title', 'Go to Hospital Dashboard');
      tenantNameEl.onclick = (e) => {
        e.preventDefault();
        navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
      };
    }
    const tenantBadgeEl = document.getElementById('sidebarTenantBadge');
    if (tenantBadgeEl) {
      tenantBadgeEl.style.cursor = 'pointer';
      tenantBadgeEl.setAttribute('title', 'Go to Hospital Dashboard');
      tenantBadgeEl.onclick = (e) => {
        e.preventDefault();
        navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
      };
    }
  }

  function sortByStartsWith(items, query, nameProp = 'fullName') {
    if (!items || !items.length || !query) return items || [];
    const q = query.toLowerCase().trim();
    return [...items].sort((a, b) => {
      const valA = String(a[nameProp] || a.name || a.patientName || '').toLowerCase().trim();
      const valB = String(b[nameProp] || b.name || b.patientName || '').toLowerCase().trim();
      
      const startsA = valA.startsWith(q);
      const startsB = valB.startsWith(q);
      if (startsA && !startsB) return -1;
      if (!startsA && startsB) return 1;

      // Check word starts (e.g. "Robert Smith" matching "Sm")
      const wordStartsA = valA.split(/\s+/).some(w => w.startsWith(q));
      const wordStartsB = valB.split(/\s+/).some(w => w.startsWith(q));
      if (wordStartsA && !wordStartsB) return -1;
      if (!wordStartsA && wordStartsB) return 1;

      // Check identifier starts (UHID, medicineCode, batchNumber, phone)
      const uhidA = String(a.uhid || a.medicineCode || a.batchNumber || a.phone || '').toLowerCase();
      const uhidB = String(b.uhid || b.medicineCode || b.batchNumber || b.phone || '').toLowerCase();
      const uhidStartsA = uhidA.startsWith(q);
      const uhidStartsB = uhidB.startsWith(q);
      if (uhidStartsA && !uhidStartsB) return -1;
      if (!uhidStartsA && uhidStartsB) return 1;

      return valA.localeCompare(valB);
    });
  }

  function updateFloatingBackButton() {
    let btn = document.getElementById('cvFloatingBackBtn');
    let wrap = document.getElementById('sidebarBackWrap');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'cvFloatingBackBtn';
      btn.className = 'cv-sidebar-back-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('title', 'Back to previous view');
      btn.setAttribute('aria-label', 'Back');
      btn.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
      `;
      btn.onclick = (e) => {
        e.preventDefault();
        navigateBack();
      };
      if (wrap) {
        wrap.appendChild(btn);
      } else {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) {
          const footer = sidebar.querySelector('.cv-sidebar-footer');
          wrap = document.createElement('div');
          wrap.id = 'sidebarBackWrap';
          wrap.className = 'cv-sidebar-back-wrap';
          wrap.appendChild(btn);
          sidebar.insertBefore(wrap, footer);
        } else {
          document.body.appendChild(btn);
        }
      }
    } else {
      btn.onclick = (e) => {
        e.preventDefault();
        navigateBack();
      };
    }

    const isRoot = !currentNavState || (currentNavState.mod === 'dashboard' && (!currentNavState.sub || currentNavState.sub === 'main'));
    if (isRoot) {
      btn.style.display = 'none';
      if (wrap) wrap.style.display = 'none';
    } else {
      btn.style.display = 'inline-flex';
      if (wrap) wrap.style.display = 'flex';
    }
    syncSidebarCollapsedClass();
  }

  function navigateTo(mod, subOrFn, fnOrRecord, maybeRecord = true) {
    let sub = 'main';
    let fn = null;
    let recordHistory = true;

    if (typeof subOrFn === 'function') {
      fn = subOrFn;
      recordHistory = (fnOrRecord !== false);
    } else {
      sub = subOrFn || 'main';
      fn = typeof fnOrRecord === 'function' ? fnOrRecord : null;
      recordHistory = (maybeRecord !== false);
    }

    // Deduplication: Avoid recording duplicate history if already on this module and sub-view
    if (currentNavState && currentNavState.mod === mod && currentNavState.sub === sub) {
      if (typeof fn === 'function') fn();
      return;
    }

    if (!isNavigatingHistory && recordHistory) {
      adminHistoryIndex++;
      try {
        const hash = '#' + mod + (sub && sub !== 'main' ? '/' + sub : '');
        window.history.pushState({ role: 'ADMIN', mod, sub, index: adminHistoryIndex, isCareVistaNav: true }, '', hash);
      } catch (e) {}
    }

    currentNavState = { mod, sub, fn };
    updateSidebarNavActive(mod);
    if (typeof fn === 'function') fn();
    updateFloatingBackButton();
  }

  function dispatchAdminRoute(mod, sub) {
    mod = mod || 'dashboard';
    sub = sub || 'main';

    currentNavState = { mod, sub, fn: null };
    updateSidebarNavActive(mod);

    if (mod === 'dashboard') {
      renderDashboardLayout(false);
    } else if (mod === 'op') {
      executeOpTab(sub && sub !== 'main' ? sub : 'register');
    } else if (mod === 'ip') {
      executeIpTab(sub && sub !== 'main' ? sub : 'admission');
    } else if (mod === 'pharmacy') {
      executePharTab(sub && sub !== 'main' ? sub : 'billing');
    } else if (mod === 'laboratory') {
      executeLabTab(sub && sub !== 'main' ? sub : 'orders');
    } else if (mod === 'billing') {
      if (sub === 'history' || sub === 'main-history') {
        renderBillingModule('main');
        mainBillingSubView = 'history';
        renderSection2MainBilling();
      } else if (sub === 'main' || sub === 'main-billing') {
        renderBillingModule('main');
      } else {
        renderBillingModule('billing', sub && sub !== 'main' ? sub : 'op');
      }
    } else if (mod === 'money') {
      renderMoneyManagementModule();
    } else if (mod === 'settings') {
      renderSettingsModule(sub && sub !== 'main' ? sub : 'all');
    } else {
      renderDashboardLayout(false);
    }

    updateFloatingBackButton();
  }

  function navigateBack() {
    // 1. If an open modal or details popup is present, dismiss it first
    const modal = document.querySelector('.cv-op-modal-backdrop, .cv-modal-backdrop, #activeModalContainer');
    if (modal) {
      modal.remove();
      return;
    }

    if (adminHistoryIndex > 1) {
      window.history.back();
    } else {
      navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
    }
  }

  function updateSidebarNavActive(mod) {
    const navList = document.getElementById('sidebarNavList');
    if (!navList) return;
    navList.querySelectorAll('.cv-nav-item').forEach((i) => {
      if (i.dataset.mod === mod) {
        i.classList.add('active');
      } else {
        i.classList.remove('active');
      }
    });
  }

  function renderBackArrowHtml(tooltip = 'Back') {
    // Returns slot placeholder; persistent floating back button ensures visibility across all scroll depths
    return '';
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
    toast.innerHTML = `<span style="flex:1;">${escapeHtml(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  async function loadAndApplyTenantSettings() {
    try {
      const res = await Api.get('/api/settings');
      if (res && res.data) {
        cachedHospitalSettings = res.data;
        applyThemeStyles(res.data);
        const adminHospName = (currentUser && currentUser.role === 'ADMIN') ? 'CITYCARE SUPER SPECIALITY HOSPITAL' : (res.data.hospitalName || 'Hospital Center');
        if (currentUser) currentUser.hospitalName = adminHospName;
        const tenantNameEl = document.getElementById('sidebarTenantName');
        if (tenantNameEl) {
          tenantNameEl.textContent = adminHospName;
          tenantNameEl.title = 'Go to Hospital Dashboard';
          tenantNameEl.style.cursor = 'pointer';
          tenantNameEl.onclick = (e) => {
            e.preventDefault();
            navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
          };
        }
        const hospTitle = document.getElementById('hospTitle');
        if (hospTitle) {
          hospTitle.textContent = adminHospName;
          hospTitle.style.cursor = 'pointer';
          hospTitle.title = 'Hospital Dashboard';
          hospTitle.onclick = (e) => {
            e.preventDefault();
            navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
          };
        }
      }
    } catch (err) {
      console.warn('Could not load tenant settings:', err);
    }
  }

  function applyThemeStyles(settings) {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.primaryColor) {
      root.style.setProperty('--cv-primary', settings.primaryColor);
      root.style.setProperty('--cv-primary-hover', adjustColorBrightness(settings.primaryColor, -15));
      root.style.setProperty('--cv-primary-light', hexToRgba(settings.primaryColor, 0.08));
      root.style.setProperty('--cv-primary-border', hexToRgba(settings.primaryColor, 0.25));
    }
    if (settings.secondaryColor) {
      root.style.setProperty('--cv-deep-blue', settings.secondaryColor);
      root.style.setProperty('--cv-deep-navy', adjustColorBrightness(settings.secondaryColor, 15));
    }
    if (settings.accentColor) {
      root.style.setProperty('--cv-teal', settings.accentColor);
      root.style.setProperty('--cv-teal-light', hexToRgba(settings.accentColor, 0.08));
    }
  }

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(29, 78, 216, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(29, 78, 216, ${alpha})`;
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  function adjustColorBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string') return hex;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return hex;
    let r = ((num >> 16) & 255) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 255) + Math.round(255 * (percent / 100));
    let b = (num & 255) + Math.round(255 * (percent / 100));
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function setupAdminNavigation() {
    const navList = document.getElementById('sidebarNavList');
    if (!navList) return;

    navList.innerHTML = `
      <li><a class="cv-nav-item active" data-mod="dashboard" title="Dashboard" data-tooltip="Dashboard">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
        <span>Dashboard</span>
      </a></li>
      <li><a class="cv-nav-item" data-mod="op" title="Outpatient (OP)" data-tooltip="Outpatient (OP)">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        <span>Outpatient (OP)</span>
      </a></li>
      <li><a class="cv-nav-item" data-mod="ip" title="Inpatient (IP) & Rooms" data-tooltip="Inpatient (IP) & Rooms">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        <span>Inpatient (IP) &amp; Rooms</span>
      </a></li>
      <li><a class="cv-nav-item" data-mod="pharmacy" title="Pharmacy" data-tooltip="Pharmacy">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
        <span>Pharmacy</span>
      </a></li>
      <li><a class="cv-nav-item" data-mod="laboratory" title="Laboratory" data-tooltip="Laboratory">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
        <span>Laboratory</span>
      </a></li>
      <li><a class="cv-nav-item" data-mod="billing" title="Central Billing" data-tooltip="Central Billing">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        <span>Central Billing</span>
      </a></li>
      <li><a class="cv-nav-item" data-mod="money" title="Money Management" data-tooltip="Money Management">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Money Management</span>
      </a></li>
      <li><a class="cv-nav-item" data-mod="settings" title="Settings" data-tooltip="Settings">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        <span>Settings</span>
      </a></li>
    `;

    navList.querySelectorAll('.cv-nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const mod = item.dataset.mod;
        if (mod === 'dashboard') {
          navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
        } else if (mod === 'op') {
          navigateTo('op', 'register', () => renderOpModule('register'));
        } else if (mod === 'ip') {
          navigateTo('ip', 'admission', () => renderIpModule('admission'));
        } else if (mod === 'pharmacy') {
          navigateTo('pharmacy', 'billing', () => renderPharmacyModule('billing'));
        } else if (mod === 'laboratory') {
          navigateTo('laboratory', 'orders', () => renderLaboratoryModule('orders'));
        } else if (mod === 'billing') {
          navigateTo('billing', 'op', () => renderBillingModule('billing', 'op'));
        } else if (mod === 'money') {
          navigateTo('money', 'overview', () => renderMoneyManagementModule());
        } else if (mod === 'settings') {
          navigateTo('settings', 'all', () => renderSettingsModule());
        }
      });
    });
  }

  function renderDashboardLayout() {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    const formattedDate = formatDDMMYYYY(selectedDate);
    const isToday = isSameDay(selectedDate, new Date());

    mainContent.innerHTML = `
      <div class="cv-page-header">
        <div>
          <h1 class="cv-page-title" id="hospTitle" style="cursor:pointer;" title="Hospital Dashboard">CITYCARE SUPER SPECIALITY HOSPITAL</h1>
          <p class="cv-page-subtitle">Hospital Operations &bull; Clinical Activity &bull; Financial Summary</p>
        </div>

        <!-- Custom Calendar & Historical Date Filter (Sections 17 & 61) -->
        <div style="display:flex; align-items:center; gap:0.6rem; position:relative;">
          <button type="button" class="cv-btn-secondary ${isToday ? 'active' : ''}" id="btnSelectToday" style="padding:0.5rem 0.85rem; font-size:0.82rem;">
            Today
          </button>
          <button type="button" class="cv-btn-secondary" id="btnSelectYesterday" style="padding:0.5rem 0.85rem; font-size:0.82rem;">
            Yesterday
          </button>

          <!-- Custom Calendar Input with decorative icon (pointer-events: none) -->
          <div class="cv-date-input-wrapper">
            <input type="text" id="adminDateInput" class="cv-date-input" value="${formattedDate}" placeholder="DD/MM/YYYY" readonly autocomplete="off">
            <div class="cv-date-icon">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>

            <!-- Custom Calendar Popover (Section 61) -->
            <div class="cv-calendar-popover" id="adminCalPopover">
              <div class="cv-cal-header">
                <button type="button" class="cv-cal-nav" id="calPrevMonth">&lt;</button>
                <span class="cv-cal-title" id="calMonthYearTitle">September 2026</span>
                <button type="button" class="cv-cal-nav" id="calNextMonth">&gt;</button>
              </div>
              <div class="cv-cal-weekdays">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div class="cv-cal-grid" id="calGridDays"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5 Main Summary Cards (Section 16 & 17) -->
      <div class="cv-cards-grid" id="adminSummaryCards">
        <!-- 1. TODAY OP -->
        <div class="cv-metric-card">
          <div class="cv-metric-label" id="lblOpCard">OP Registrations</div>
          <div class="cv-metric-value" id="cardValOp">...</div>
          <div style="margin-top:0.4rem;">
            <div class="cv-progress-track" style="height:6px; margin-bottom:0.25rem;">
              <div class="cv-progress-fill" id="cardOpProgress" style="width:0%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--cv-text-muted);">
              <span id="cardOpLimit">Limit: ...</span>
              <span id="cardOpRemaining">Remaining: ...</span>
            </div>
          </div>
        </div>

        <!-- 2. TODAY IP -->
        <div class="cv-metric-card">
          <div class="cv-metric-label" id="lblIpCard">Inpatient (IP)</div>
          <div class="cv-metric-value" id="cardValIp">...</div>
          <span class="cv-metric-badge" style="background:#f0fdfa; color:#0d9488;">Admissions</span>
        </div>

        <!-- 3. TODAY PHARMACY -->
        <div class="cv-metric-card">
          <div class="cv-metric-label" id="lblPharCard">Pharmacy Bills</div>
          <div class="cv-metric-value" id="cardValPharmacy">...</div>
          <div style="font-size:0.75rem; color:var(--cv-text-muted); margin-top:0.35rem;">
            Revenue: <strong id="cardValPharRev" style="color:var(--cv-deep-blue);">&#8377;0</strong>
          </div>
        </div>

        <!-- 4. TODAY LAB -->
        <div class="cv-metric-card">
          <div class="cv-metric-label" id="lblLabCard">Laboratory Orders</div>
          <div class="cv-metric-value" id="cardValLab">...</div>
          <div style="font-size:0.75rem; color:var(--cv-text-muted); margin-top:0.35rem;">
            Completed: <strong id="cardValLabComp" style="color:var(--cv-success);">0</strong> &bull;
            Revenue: <strong id="cardValLabRev" style="color:var(--cv-deep-blue);">&#8377;0</strong>
          </div>
        </div>

        <!-- 5. TODAY COLLECTION -->
        <div class="cv-metric-card">
          <div class="cv-metric-label" id="lblCollCard">Total Collection</div>
          <div class="cv-metric-value" id="cardValCollection" style="color:var(--cv-success);">&#8377;...</div>
          <div style="font-size:0.75rem; color:var(--cv-text-muted); margin-top:0.35rem;">
            Lifetime: <strong id="cardValLifeColl" style="color:var(--cv-deep-blue);">&#8377;0</strong>
          </div>
        </div>
      </div>

      <!-- Dashboard Interactive Graphs (Section 19) -->
      <div class="cv-chart-card">
        <div class="cv-chart-header">
          <div class="cv-chart-title-area">
            <h2 id="chartHeading">Performance Analytics & Trend Analysis</h2>
            <p id="chartSubheading">Aggregated financial and clinical statistics from MySQL database</p>
          </div>

          <div class="cv-chart-controls">
            <!-- Metric Selector -->
            <select id="selectChartMetric" class="cv-input" style="padding:0.4rem 0.75rem; font-size:0.82rem; width:auto;">
              <option value="COLLECTION" selected>Total Collections (₹)</option>
              <option value="OP">OP Registrations</option>
              <option value="IP">IP Admissions</option>
              <option value="PHARMACY">Pharmacy Sales</option>
              <option value="LAB">Lab Diagnostic Tests</option>
            </select>

            <!-- Timeframe Filter Buttons: ONE DAY, ONE WEEK, ONE MONTH, ONE YEAR, LIFETIME (Section 19) -->
            <div class="cv-filter-group">
              <button type="button" class="cv-filter-btn ${activePeriod === 'ONE_DAY' ? 'active' : ''}" data-period="ONE_DAY">One Day</button>
              <button type="button" class="cv-filter-btn ${activePeriod === 'ONE_WEEK' ? 'active' : ''}" data-period="ONE_WEEK">One Week</button>
              <button type="button" class="cv-filter-btn ${activePeriod === 'ONE_MONTH' ? 'active' : ''}" data-period="ONE_MONTH">One Month</button>
              <button type="button" class="cv-filter-btn ${activePeriod === 'ONE_YEAR' ? 'active' : ''}" data-period="ONE_YEAR">One Year</button>
              <button type="button" class="cv-filter-btn ${activePeriod === 'LIFETIME' ? 'active' : ''}" data-period="LIFETIME">Lifetime</button>
            </div>
          </div>
        </div>

        <!-- Rendered Chart Area -->
        <div class="cv-chart-display-container" id="chartDisplay">
          <div style="margin:auto; color:var(--cv-text-muted); font-size:0.88rem;">Loading real graph telemetry from MySQL...</div>
        </div>
      </div>
    `;

    setupDateFilterHandlers();
    setupChartHandlers();
    document.getElementById('hospTitle')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
    });
    loadDashboardData();
    loadChartData();
  }

  // ====================================================================
  // CUSTOM CALENDAR LOGIC (Section 61)
  // ====================================================================
  function setupDateFilterHandlers() {
    const input = document.getElementById('adminDateInput');
    const popover = document.getElementById('adminCalPopover');
    const btnToday = document.getElementById('btnSelectToday');
    const btnYesterday = document.getElementById('btnSelectYesterday');

    if (btnToday) {
      btnToday.onclick = () => {
        selectedDate = new Date();
        input.value = formatDDMMYYYY(selectedDate);
        updateCardLabels();
        loadDashboardData();
      };
    }

    if (btnYesterday) {
      btnYesterday.onclick = () => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        selectedDate = y;
        input.value = formatDDMMYYYY(selectedDate);
        updateCardLabels();
        loadDashboardData();
      };
    }

    if (input && popover) {
      input.onclick = (e) => {
        e.stopPropagation();
        popover.classList.toggle('show');
        renderCalendarGrid();
      };

      document.addEventListener('click', (e) => {
        if (!popover.contains(e.target) && e.target !== input) {
          popover.classList.remove('show');
        }
      });
    }

    const prevBtn = document.getElementById('calPrevMonth');
    const nextBtn = document.getElementById('calNextMonth');
    if (prevBtn) {
      prevBtn.onclick = (e) => {
        e.stopPropagation();
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendarGrid();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = (e) => {
        e.stopPropagation();
        if (calYear >= 2050 && calMonth >= 11) return; // Max year 2050 per Section 61
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendarGrid();
      };
    }
  }

  function renderCalendarGrid() {
    const title = document.getElementById('calMonthYearTitle');
    const grid = document.getElementById('calGridDays');
    if (!title || !grid) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    title.textContent = `${monthNames[calMonth]} ${calYear}`;

    grid.innerHTML = '';

    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = getDaysInMonth(calMonth, calYear); // Strict leap year validated

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'cv-cal-day empty';
      grid.appendChild(cell);
    }

    const today = new Date();

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cv-cal-day';
      cell.textContent = d;

      const cellDate = new Date(calYear, calMonth, d);
      if (isSameDay(cellDate, today)) cell.classList.add('today');
      if (isSameDay(cellDate, selectedDate)) cell.classList.add('selected');

      cell.onclick = (e) => {
        e.stopPropagation();
        selectedDate = new Date(calYear, calMonth, d);
        document.getElementById('adminDateInput').value = formatDDMMYYYY(selectedDate);
        document.getElementById('adminCalPopover').classList.remove('show');
        updateCardLabels();
        loadDashboardData();
      };

      grid.appendChild(cell);
    }
  }

  function updateCardLabels() {
    const isToday = isSameDay(selectedDate, new Date());
    const prefix = isToday ? 'TODAY' : formatDDMMYYYY(selectedDate);

    const lblOp = document.getElementById('lblOpCard');
    const lblIp = document.getElementById('lblIpCard');
    const lblPhar = document.getElementById('lblPharCard');
    const lblLab = document.getElementById('lblLabCard');
    const lblColl = document.getElementById('lblCollCard');

    if (lblOp) lblOp.textContent = `${prefix} OP`;
    if (lblIp) lblIp.textContent = `${prefix} IP`;
    if (lblPhar) lblPhar.textContent = `${prefix} PHARMACY`;
    if (lblLab) lblLab.textContent = `${prefix} LAB`;
    if (lblColl) lblColl.textContent = `${prefix} COLLECTION`;
  }

  // ====================================================================
  // LOAD DASHBOARD DATA (Real Database Values)
  // ====================================================================
  async function loadDashboardData() {
    const formattedDate = formatDDMMYYYY(selectedDate);
    const res = await Api.get(`/api/admin/dashboard/summary?date=${encodeURIComponent(formattedDate)}`);

    if (res.ok && res.data) {
      const d = res.data;
      const vOp = document.getElementById('cardValOp');
      const pOp = document.getElementById('cardOpProgress');
      const lOp = document.getElementById('cardOpLimit');
      const rOp = document.getElementById('cardOpRemaining');

      const vIp = document.getElementById('cardValIp');
      const vPhar = document.getElementById('cardValPharmacy');
      const vPharRev = document.getElementById('cardValPharRev');

      const vLab = document.getElementById('cardValLab');
      const vLabComp = document.getElementById('cardValLabComp');
      const vLabRev = document.getElementById('cardValLabRev');

      const vColl = document.getElementById('cardValCollection');
      const vLifeColl = document.getElementById('cardValLifeColl');

      if (vOp) vOp.textContent = d.todayOp;
      if (pOp) {
        pOp.style.width = `${Math.min(100, d.opUsagePercentage)}%`;
        pOp.className = 'cv-progress-fill ' + (d.opUsagePercentage >= 100 ? 'danger' : (d.opUsagePercentage >= 80 ? 'warning' : ''));
      }
      if (lOp) lOp.textContent = `Limit: ${d.opLimit}`;
      if (rOp) rOp.textContent = `Remaining: ${d.opRemaining}`;

      if (vIp) vIp.textContent = d.todayIp;
      if (vPhar) vPhar.textContent = d.todayPharmacy;
      if (vPharRev) vPharRev.innerHTML = `&#8377;${formatCurrency(d.pharmacyRevenue)}`;

      if (vLab) vLab.textContent = d.todayLab;
      if (vLabComp) vLabComp.textContent = d.todayLabCompleted;
      if (vLabRev) vLabRev.innerHTML = `&#8377;${formatCurrency(d.labRevenue)}`;

      if (vColl) vColl.innerHTML = `&#8377;${formatCurrency(d.todayCollection)}`;
      if (vLifeColl) vLifeColl.innerHTML = `&#8377;${formatCurrency(d.lifetimeCollection)}`;
    }
  }

  // ====================================================================
  // DASHBOARD GRAPHS (Section 19)
  // ====================================================================
  function setupChartHandlers() {
    const metricSelect = document.getElementById('selectChartMetric');
    if (metricSelect) {
      metricSelect.onchange = () => {
        activeMetric = metricSelect.value;
        loadChartData();
      };
    }

    const filterBtns = document.querySelectorAll('.cv-chart-controls .cv-filter-btn');
    filterBtns.forEach((btn) => {
      btn.onclick = () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activePeriod = btn.dataset.period;
        loadChartData();
      };
    });
  }

  async function loadChartData() {
    const container = document.getElementById('chartDisplay');
    if (!container) return;

    const res = await Api.get(`/api/admin/dashboard/graphs?period=${activePeriod}&metric=${activeMetric}`);
    if (res.ok && res.data) {
      const g = res.data;
      renderBarChart(container, g);
    }
  }

  function renderBarChart(container, g) {
    if (!g.values || g.values.length === 0) {
      container.innerHTML = '<div style="margin:auto; color:var(--cv-text-muted);">No records found for this period in MySQL.</div>';
      return;
    }

    const maxVal = Math.max(...g.values, 1);
    const unit = g.unit || '';

    container.innerHTML = g.values.map((val, idx) => {
      const label = g.labels[idx] || '';
      const heightPct = Math.round((val / maxVal) * 85); // 85% max bar height
      const displayVal = unit ? `${unit}${formatCurrency(val)}` : val;

      return `
        <div class="cv-chart-bar-group">
          <div class="cv-chart-bar-value">${displayVal}</div>
          <div class="cv-chart-bar-pillar" style="height:${Math.max(6, heightPct)}%;" data-tooltip="${label}: ${displayVal}"></div>
          <div class="cv-chart-bar-label">${label}</div>
        </div>
      `;
    }).join('');
  }

  // ====================================================================
  // HOSPITAL ADMIN SETTINGS MODULE (Phase 6 Incremental UI/UX)
  // Section 1: DOCTORS | Section 2: STAFF | Section 3: ADDITIONAL SETTINGS
  // ====================================================================
  let settingsActiveSection = 'all';
  let cachedDoctorsList = [];
  let cachedStaffList = [];

  async function renderSettingsModule(filterSection = 'all') {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    settingsActiveSection = filterSection;
    mainContent.classList.remove('cv-pharmacy-mode', 'cv-laboratory-mode');

    // Show initial loading skeleton
    mainContent.innerHTML = `
      <div class="cv-settings-container">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          ${renderBackArrowHtml('Back')}
          <h1 class="cv-page-title">Settings &amp; Hospital Administration</h1>
        </div>
        <div class="cv-welcome-card" style="padding:2.5rem; text-align:center;">
          <div class="cv-spinner show" style="margin:0 auto 1rem; width:28px; height:28px; border-width:3px;"></div>
          <p style="color:var(--cv-text-muted);">Loading tenant configuration, doctors, and staff from MySQL...</p>
        </div>
      </div>
    `;

    try {
      const [settingsRes, doctorsRes, staffRes, logsRes] = await Promise.all([
        Api.get('/api/settings').catch(() => ({ data: cachedHospitalSettings || {} })),
        Api.get('/api/settings/doctors').catch(() => ({ data: [] })),
        Api.get('/api/settings/staff').catch(() => ({ data: [] })),
        Api.get('/api/settings/audit-logs').catch(() => ({ data: [] }))
      ]);

      cachedHospitalSettings = settingsRes?.data || cachedHospitalSettings || {};
      cachedDoctorsList = doctorsRes?.data || [];
      cachedStaffList = staffRes?.data || [];
      const auditLogs = logsRes?.data || [];

      renderSettingsView(cachedHospitalSettings, cachedDoctorsList, cachedStaffList, auditLogs);
    } catch (err) {
      console.error('Error loading settings:', err);
      mainContent.innerHTML = `
        <div class="cv-settings-container">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            ${renderBackArrowHtml('Back')}
            <h1 class="cv-page-title">Settings &amp; Hospital Administration</h1>
          </div>
          <div class="cv-alert cv-alert-danger" style="margin-top:1rem;">
            Failed to load settings from MySQL: ${escapeHtml(err.message || 'Please check server connection.')}
          </div>
        </div>
      `;
    }
  }

  function renderSettingsView(settings, doctors, staff, auditLogs) {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    const hospName = escapeHtml(settings.hospitalName || currentUser?.hospitalName || 'Hospital Center');
    const tenantId = settings.tenantId || currentUser?.tenantId || 1;

    mainContent.innerHTML = `
      <div class="cv-settings-container">
        <!-- Header Banner with Back Arrow (Section 12 & 13) -->
        <div class="cv-settings-header-banner">
          <div style="display:flex; align-items:center; gap:1rem;">
            ${renderBackArrowHtml('Back to Previous View')}
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="cv-tenant-badge">HOSPITAL SETTINGS</span>
                <span style="font-size:0.76rem; font-weight:700; color:var(--cv-text-muted); background:var(--cv-border-light); padding:0.15rem 0.5rem; border-radius:var(--cv-radius-pill);">Tenant ID: #${tenantId}</span>
              </div>
              <h1 class="cv-page-title" style="margin-top:0.25rem; font-size:1.4rem;">${hospName}</h1>
              <p class="cv-page-subtitle">Configure Hospital Clinical Personnel, Staff Access, Appearance, and Operations</p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.6rem;">
            <button type="button" class="cv-btn-secondary" onclick="Admin.renderSettingsModule()" style="padding:0.45rem 0.85rem; font-size:0.82rem;">
              <svg style="width:14px; height:14px; margin-right:4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- Section Navigation Filter Tabs (Section 9) -->
        <div class="cv-settings-nav-tabs">
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'all' ? 'active' : ''}" onclick="Admin.filterSettingsSection('all')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            All Sections
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'doctors' ? 'active' : ''}" onclick="Admin.filterSettingsSection('doctors')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            1. Doctors (${doctors.length})
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'staff' ? 'active' : ''}" onclick="Admin.filterSettingsSection('staff')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            2. Staff (${staff.length})
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'appearance' ? 'active' : ''}" onclick="Admin.filterSettingsSection('appearance')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4 5 5 0 012-4.242M14 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            3. Appearance &amp; Colors
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'profile' ? 'active' : ''}" onclick="Admin.filterSettingsSection('profile')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            Hospital Profile
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'billing' ? 'active' : ''}" onclick="Admin.filterSettingsSection('billing')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            Billing
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'pharmacy' ? 'active' : ''}" onclick="Admin.filterSettingsSection('pharmacy')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Pharmacy
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'laboratory' ? 'active' : ''}" onclick="Admin.filterSettingsSection('laboratory')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
            Laboratory
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'notifications' ? 'active' : ''}" onclick="Admin.filterSettingsSection('notifications')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            Notifications
          </button>
          <button type="button" class="cv-settings-tab-btn ${settingsActiveSection === 'security' ? 'active' : ''}" onclick="Admin.filterSettingsSection('security')">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Security
          </button>
        </div>

        <!-- ============================================================== -->
        <!-- 1. DOCTORS SECTION (MANDATORY FIRST SECTION)                   -->
        <!-- ============================================================== -->
        ${(settingsActiveSection === 'all' || settingsActiveSection === 'doctors') ? `
        <div class="cv-settings-section-card" id="sectionDoctors">
          <div class="cv-settings-section-header">
            <div>
              <div class="cv-settings-section-title">
                <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                DOCTORS
              </div>
              <div class="cv-settings-section-desc">Manage hospital physicians, clinical specialties, and real-time consultation availability.</div>
            </div>
            <button type="button" class="cv-btn-primary" onclick="Admin.showAddDoctorModal()" style="width:auto; padding:0.45rem 0.9rem; font-size:0.82rem;">
              <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Doctor
            </button>
          </div>

          <div class="cv-settings-section-body" style="padding:0;">
            ${renderDoctorsTableHtml(doctors)}
          </div>
        </div>
        ` : ''}

        <!-- ============================================================== -->
        <!-- 2. STAFF SECTION (MANDATORY SECOND SECTION)                    -->
        <!-- ============================================================== -->
        ${(settingsActiveSection === 'all' || settingsActiveSection === 'staff') ? `
        <div class="cv-settings-section-card" id="sectionStaff">
          <div class="cv-settings-section-header">
            <div>
              <div class="cv-settings-section-title">
                <svg style="width:20px; height:20px; color:var(--cv-teal);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                STAFF
              </div>
              <div class="cv-settings-section-desc">Manage hospital staff members, operational roles, access permissions, and login credentials.</div>
            </div>
            <button type="button" class="cv-btn-primary" onclick="Admin.showAddStaffModal()" style="width:auto; padding:0.45rem 0.9rem; font-size:0.82rem; background:var(--cv-teal);">
              <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Staff Member
            </button>
          </div>

          <div class="cv-settings-section-body" style="padding:0;">
            ${renderStaffTableHtml(staff)}
          </div>
        </div>
        ` : ''}

        <!-- ============================================================== -->
        <!-- 3. ADDITIONAL SETTINGS (Section 6, 7, 8)                        -->
        <!-- ============================================================== -->
        ${(settingsActiveSection === 'all' || settingsActiveSection === 'appearance' || settingsActiveSection === 'profile' || settingsActiveSection === 'billing' || settingsActiveSection === 'pharmacy' || settingsActiveSection === 'laboratory' || settingsActiveSection === 'notifications' || settingsActiveSection === 'security') ? `
        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.5rem;">
            <h2 style="font-size:1.15rem; font-weight:700; color:var(--cv-deep-blue);">ADDITIONAL SETTINGS</h2>
            <div style="height:1px; flex:1; background:var(--cv-border);"></div>
          </div>

          <!-- Appearance / Theme Section (Section 6 & 7: Admin-Local Scope) -->
          ${(settingsActiveSection === 'all' || settingsActiveSection === 'appearance') ? `
          <div class="cv-settings-section-card" id="sectionAppearance">
            <div class="cv-settings-section-header">
              <div>
                <div class="cv-settings-section-title">
                  <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4 5 5 0 012-4.242M14 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  APPLICATION APPEARANCE &amp; THEME
                </div>
                <div class="cv-settings-section-desc">Customize interface colors for your hospital. Scoped strictly to <strong>${hospName}</strong> and saved in MySQL.</div>
              </div>
            </div>

            <div class="cv-settings-section-body">
              <label class="cv-form-label" style="margin-bottom:0.6rem; display:block;">Curated Healthcare Palette Presets</label>
              <div class="cv-color-presets-grid">
                <div class="cv-color-preset-card ${settings.themePreset === 'medical-blue' ? 'active' : ''}" onclick="Admin.selectThemePreset('medical-blue', '#1d4ed8', '#0f172a', '#0d9488')">
                  <div class="cv-swatch-circle" style="background:#1d4ed8;"></div>
                  <div>
                    <div style="font-weight:700; font-size:0.85rem;">Medical Blue</div>
                    <div style="font-size:0.72rem; color:var(--cv-text-muted);">Standard Clinical</div>
                  </div>
                </div>

                <div class="cv-color-preset-card ${settings.themePreset === 'deep-blue' ? 'active' : ''}" onclick="Admin.selectThemePreset('deep-blue', '#1e40af', '#0f172a', '#0284c7')">
                  <div class="cv-swatch-circle" style="background:#1e40af;"></div>
                  <div>
                    <div style="font-weight:700; font-size:0.85rem;">Deep Blue</div>
                    <div style="font-size:0.72rem; color:var(--cv-text-muted);">Executive Navy</div>
                  </div>
                </div>

                <div class="cv-color-preset-card ${settings.themePreset === 'teal' ? 'active' : ''}" onclick="Admin.selectThemePreset('teal', '#0d9488', '#134e4a', '#14b8a6')">
                  <div class="cv-swatch-circle" style="background:#0d9488;"></div>
                  <div>
                    <div style="font-weight:700; font-size:0.85rem;">Healthcare Teal</div>
                    <div style="font-size:0.72rem; color:var(--cv-text-muted);">Therapeutic Teal</div>
                  </div>
                </div>

                <div class="cv-color-preset-card ${settings.themePreset === 'soft-blue' ? 'active' : ''}" onclick="Admin.selectThemePreset('soft-blue', '#2563eb', '#1e293b', '#38bdf8')">
                  <div class="cv-swatch-circle" style="background:#2563eb;"></div>
                  <div>
                    <div style="font-weight:700; font-size:0.85rem;">Soft Blue</div>
                    <div style="font-size:0.72rem; color:var(--cv-text-muted);">Modern Wellness</div>
                  </div>
                </div>

                <div class="cv-color-preset-card ${settings.themePreset === 'neutral-slate' ? 'active' : ''}" onclick="Admin.selectThemePreset('neutral-slate', '#475569', '#0f172a', '#0d9488')">
                  <div class="cv-swatch-circle" style="background:#475569;"></div>
                  <div>
                    <div style="font-weight:700; font-size:0.85rem;">Neutral Slate</div>
                    <div style="font-size:0.72rem; color:var(--cv-text-muted);">Balanced Charcoal</div>
                  </div>
                </div>
              </div>

              <!-- Custom Hex Color Pickers -->
              <div class="cv-custom-color-inputs">
                <div class="cv-form-group">
                  <label class="cv-form-label" for="themePrimaryPicker">Primary Brand Color</label>
                  <div class="cv-color-input-group">
                    <input type="color" id="themePrimaryPicker" class="cv-color-picker-input" value="${settings.primaryColor || '#1d4ed8'}" onchange="Admin.onCustomColorChange()">
                    <input type="text" id="themePrimaryText" class="cv-input" value="${settings.primaryColor || '#1d4ed8'}" maxlength="7" style="font-family:monospace;" oninput="Admin.onCustomColorTextInput('themePrimaryPicker', this.value)">
                  </div>
                </div>

                <div class="cv-form-group">
                  <label class="cv-form-label" for="themeSecondaryPicker">Deep Navy / Header Color</label>
                  <div class="cv-color-input-group">
                    <input type="color" id="themeSecondaryPicker" class="cv-color-picker-input" value="${settings.secondaryColor || '#0f172a'}" onchange="Admin.onCustomColorChange()">
                    <input type="text" id="themeSecondaryText" class="cv-input" value="${settings.secondaryColor || '#0f172a'}" maxlength="7" style="font-family:monospace;" oninput="Admin.onCustomColorTextInput('themeSecondaryPicker', this.value)">
                  </div>
                </div>

                <div class="cv-form-group">
                  <label class="cv-form-label" for="themeAccentPicker">Accent / Teal Color</label>
                  <div class="cv-color-input-group">
                    <input type="color" id="themeAccentPicker" class="cv-color-picker-input" value="${settings.accentColor || '#0d9488'}" onchange="Admin.onCustomColorChange()">
                    <input type="text" id="themeAccentText" class="cv-input" value="${settings.accentColor || '#0d9488'}" maxlength="7" style="font-family:monospace;" oninput="Admin.onCustomColorTextInput('themeAccentPicker', this.value)">
                  </div>
                </div>
              </div>

              <!-- Real-time Preview Swatch -->
              <div id="themePreviewBox" style="margin-top:1.25rem; padding:1.25rem; border-radius:var(--cv-radius-md); background:var(--cv-bg); border:1px solid var(--cv-border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                  <div id="previewBadge" style="background:${settings.primaryColor || '#1d4ed8'}; color:#ffffff; padding:0.35rem 0.75rem; border-radius:var(--cv-radius-sm); font-size:0.8rem; font-weight:700;">Live Brand Button</div>
                  <div id="previewSecondaryBadge" style="background:${settings.secondaryColor || '#0f172a'}; color:#ffffff; padding:0.35rem 0.75rem; border-radius:var(--cv-radius-sm); font-size:0.8rem; font-weight:700;">Header Surface</div>
                  <div id="previewAccentBadge" style="background:${settings.accentColor || '#0d9488'}; color:#ffffff; padding:0.35rem 0.75rem; border-radius:var(--cv-radius-sm); font-size:0.8rem; font-weight:700;">Accent Pill</div>
                </div>
                <div style="font-size:0.82rem; color:var(--cv-text-muted);">
                  Selected Palette: <strong id="previewThemeName">${settings.themePreset || 'Custom'}</strong>
                </div>
              </div>

              <div style="margin-top:1.25rem; display:flex; justify-content:flex-end;">
                <button type="button" class="cv-btn-primary" onclick="Admin.saveAppearanceTheme()" style="width:auto; padding:0.6rem 1.4rem;">
                  <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Save &amp; Apply Theme to MySQL
                </button>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Hospital Profile Card -->
          ${(settingsActiveSection === 'all' || settingsActiveSection === 'profile') ? `
          <div class="cv-settings-section-card" id="sectionProfile">
            <div class="cv-settings-section-header">
              <div>
                <div class="cv-settings-section-title">
                  <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  HOSPITAL PROFILE
                </div>
                <div class="cv-settings-section-desc">Official healthcare institution details displayed on OPD sheets, IP summaries, and invoices.</div>
              </div>
            </div>

            <div class="cv-settings-section-body">
              <form id="formHospitalProfile" onsubmit="event.preventDefault(); Admin.saveHospitalProfile();">
                <div class="cv-settings-grid-2">
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setHospName">Hospital / Institution Legal Name *</label>
                    <input type="text" id="setHospName" class="cv-input" value="${escapeHtml(settings.hospitalName || '')}" required>
                  </div>
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setHospPhone">Primary Phone Number *</label>
                    <input type="text" id="setHospPhone" class="cv-input" value="${escapeHtml(settings.phone || '')}" required>
                  </div>
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setHospEmail">Official Support / Billing Email *</label>
                    <input type="email" id="setHospEmail" class="cv-input" value="${escapeHtml(settings.email || '')}" required>
                  </div>
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setHospEmergency">Emergency Helpline / Ambulance</label>
                    <input type="text" id="setHospEmergency" class="cv-input" value="${escapeHtml(settings.emergencyContact || '')}" placeholder="e.g. 108 / +1 800-EMERGENCY">
                  </div>
                </div>

                <div class="cv-form-group" style="margin-top:1rem;">
                  <label class="cv-form-label" for="setHospAddress">Physical Address / Campus Location *</label>
                  <input type="text" id="setHospAddress" class="cv-input" value="${escapeHtml(settings.address || '')}" required>
                </div>

                <div class="cv-form-group" style="margin-top:1rem;">
                  <label class="cv-form-label" for="setHospAccreditation">Accreditation / Regulatory Registration Details</label>
                  <input type="text" id="setHospAccreditation" class="cv-input" value="${escapeHtml(settings.accreditationDetails || '')}" placeholder="e.g. NABH Certified Multi-Speciality Tertiary Care Hospital">
                </div>

                <div style="margin-top:1.25rem; display:flex; justify-content:flex-end;">
                  <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.6rem 1.4rem;">
                    Save Hospital Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
          ` : ''}

          <!-- Billing Settings Card -->
          ${(settingsActiveSection === 'all' || settingsActiveSection === 'billing') ? `
          <div class="cv-settings-section-card" id="sectionBilling">
            <div class="cv-settings-section-header">
              <div>
                <div class="cv-settings-section-title">
                  <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  BILLING &amp; FINANCIAL CONFIGURATION
                </div>
                <div class="cv-settings-section-desc">Configure GST tax identification, invoice numbering format, default payment mode, and terms.</div>
              </div>
            </div>

            <div class="cv-settings-section-body">
              <form id="formBillingSettings" onsubmit="event.preventDefault(); Admin.saveBillingSettings();">
                <div class="cv-settings-grid-3">
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setBillingGst">GST Identification Number (GSTIN)</label>
                    <input type="text" id="setBillingGst" class="cv-input" value="${escapeHtml(settings.gstNumber || '29ABCDE1234F1Z5')}">
                  </div>
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setBillingTaxPct">Default GST Tax Rate (%)</label>
                    <input type="number" id="setBillingTaxPct" class="cv-input" value="${settings.defaultGstPct ?? 18}" min="0" max="40" step="0.5">
                  </div>
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setBillingPrefix">Invoice Serial Prefix</label>
                    <input type="text" id="setBillingPrefix" class="cv-input" value="${escapeHtml(settings.invoicePrefix || 'INV')}" placeholder="e.g. INV, CARE">
                  </div>
                </div>

                <div class="cv-form-group" style="margin-top:1rem;">
                  <label class="cv-form-label" for="setBillingPayment">Default Primary Payment Method</label>
                  <select id="setBillingPayment" class="cv-input">
                    <option value="CASH" ${settings.defaultPaymentMethod === 'CASH' ? 'selected' : ''}>Cash</option>
                    <option value="UPI" ${settings.defaultPaymentMethod === 'UPI' ? 'selected' : ''}>UPI / QR Code</option>
                    <option value="CARD" ${settings.defaultPaymentMethod === 'CARD' ? 'selected' : ''}>Credit / Debit Card</option>
                    <option value="NET_BANKING" ${settings.defaultPaymentMethod === 'NET_BANKING' ? 'selected' : ''}>Net Banking / NEFT</option>
                    <option value="INSURANCE" ${settings.defaultPaymentMethod === 'INSURANCE' ? 'selected' : ''}>TPA / Health Insurance</option>
                  </select>
                </div>

                <div class="cv-form-group" style="margin-top:1rem;">
                  <label class="cv-form-label" for="setBillingTerms">Printed Invoice Disclaimer &amp; Terms</label>
                  <textarea id="setBillingTerms" class="cv-input" rows="2">${escapeHtml(settings.billingTerms || 'This is a computer-generated billing document from CareVista Hospital Management SaaS.')}</textarea>
                </div>

                <div style="margin-top:1.25rem; display:flex; justify-content:flex-end;">
                  <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.6rem 1.4rem;">
                    Save Billing Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
          ` : ''}

          <!-- Pharmacy & Laboratory Settings -->
          ${(settingsActiveSection === 'all' || settingsActiveSection === 'pharmacy' || settingsActiveSection === 'laboratory') ? `
          <div class="cv-settings-grid-2">
            <!-- Pharmacy -->
            <div class="cv-settings-section-card" id="sectionPharmacy">
              <div class="cv-settings-section-header">
                <div>
                  <div class="cv-settings-section-title">
                    <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    PHARMACY SETTINGS
                  </div>
                  <div class="cv-settings-section-desc">Inventory reorder alert levels &amp; expiry notices.</div>
                </div>
              </div>
              <div class="cv-settings-section-body">
                <form id="formPharmacySettings" onsubmit="event.preventDefault(); Admin.savePharmacySettings();">
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setPharReorder">Default Minimum Reorder Level (units)</label>
                    <input type="number" id="setPharReorder" class="cv-input" value="${settings.pharmacyReorderLevel ?? 20}" min="1">
                  </div>
                  <div class="cv-form-group" style="margin-top:0.75rem;">
                    <label class="cv-form-label" for="setPharExpiry">Expiry Alert Warning Threshold (days)</label>
                    <input type="number" id="setPharExpiry" class="cv-input" value="${settings.pharmacyExpiryAlertDays ?? 60}" min="15" max="365">
                  </div>
                  <div class="cv-form-group" style="margin-top:0.75rem;">
                    <label class="cv-form-label" for="setPharNotice">Return &amp; Refund Invoice Policy</label>
                    <input type="text" id="setPharNotice" class="cv-input" value="${escapeHtml(settings.pharmacyReturnNotice || 'Medicines once dispensed cannot be returned or refunded.')}">
                  </div>
                  <div style="margin-top:1rem; display:flex; justify-content:flex-end;">
                    <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1rem; font-size:0.85rem;">
                      Save Pharmacy
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Laboratory -->
            <div class="cv-settings-section-card" id="sectionLaboratory">
              <div class="cv-settings-section-header">
                <div>
                  <div class="cv-settings-section-title">
                    <svg style="width:18px; height:18px; color:var(--cv-teal);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                    LABORATORY SETTINGS
                  </div>
                  <div class="cv-settings-section-desc">Diagnostic standard turnaround time &amp; critical value rules.</div>
                </div>
              </div>
              <div class="cv-settings-section-body">
                <form id="formLabSettings" onsubmit="event.preventDefault(); Admin.saveLabSettings();">
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setLabTurnaround">Standard Report Turnaround (hours)</label>
                    <input type="number" id="setLabTurnaround" class="cv-input" value="${settings.labTurnaroundHours ?? 24}" min="1" max="168">
                  </div>
                  <div class="cv-form-group" style="margin-top:0.75rem;">
                    <label class="cv-form-label" for="setLabCritical">Critical Lab Value Protocol</label>
                    <input type="text" id="setLabCritical" class="cv-input" value="${escapeHtml(settings.labCriticalAlert || 'Immediate Notification to Physician')}">
                  </div>
                  <div style="margin-top:1rem; display:flex; justify-content:flex-end;">
                    <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1rem; font-size:0.85rem; background:var(--cv-teal);">
                      Save Laboratory
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Notifications & Security Settings -->
          ${(settingsActiveSection === 'all' || settingsActiveSection === 'notifications' || settingsActiveSection === 'security') ? `
          <div class="cv-settings-grid-2">
            <!-- Notifications -->
            <div class="cv-settings-section-card" id="sectionNotifications">
              <div class="cv-settings-section-header">
                <div>
                  <div class="cv-settings-section-title">
                    <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    NOTIFICATION ALERTS
                  </div>
                  <div class="cv-settings-section-desc">Automated alerts for clinical events and inventory thresholds.</div>
                </div>
              </div>
              <div class="cv-settings-section-body">
                <form id="formNotificationSettings" onsubmit="event.preventDefault(); Admin.saveNotificationSettings();">
                  <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    <label style="display:flex; align-items:center; gap:0.6rem; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" id="setNotifyEmail" ${settings.emailNotifications ? 'checked' : ''} style="width:16px; height:16px;">
                      <span>Email Notifications for Critical Clinical Events</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:0.6rem; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" id="setNotifyStock" ${settings.lowStockAlerts ? 'checked' : ''} style="width:16px; height:16px;">
                      <span>Low Medicine Inventory Stock Warnings</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:0.6rem; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" id="setNotifyPatient" ${settings.patientArrivalAlerts ? 'checked' : ''} style="width:16px; height:16px;">
                      <span>Patient OP Registration &amp; IP Admission Alerts</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:0.6rem; font-size:0.85rem; cursor:pointer;">
                      <input type="checkbox" id="setNotifyBilling" ${settings.billingAlerts ? 'checked' : ''} style="width:16px; height:16px;">
                      <span>Financial Settlements &amp; Invoicing Alert Log</span>
                    </label>
                  </div>
                  <div style="margin-top:1.25rem; display:flex; justify-content:flex-end;">
                    <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1rem; font-size:0.85rem;">
                      Save Notifications
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Security Policy -->
            <div class="cv-settings-section-card" id="sectionSecurity">
              <div class="cv-settings-section-header">
                <div>
                  <div class="cv-settings-section-title">
                    <svg style="width:18px; height:18px; color:var(--cv-danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    SECURITY &amp; ACCESS POLICY
                  </div>
                  <div class="cv-settings-section-desc">Session timeouts, password rotations, and admin credentials.</div>
                </div>
              </div>
              <div class="cv-settings-section-body">
                <form id="formSecuritySettings" onsubmit="event.preventDefault(); Admin.saveSecuritySettings();">
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="setSecTimeout">Inactivity Session Timeout (minutes)</label>
                    <input type="number" id="setSecTimeout" class="cv-input" value="${settings.sessionTimeoutMinutes ?? 60}" min="15" max="480">
                  </div>
                  <div class="cv-form-group" style="margin-top:0.75rem;">
                    <label class="cv-form-label" for="setSecExpiry">Staff Password Change Cycle (days)</label>
                    <input type="number" id="setSecExpiry" class="cv-input" value="${settings.requirePasswordChangeDays ?? 90}" min="30" max="365">
                  </div>
                  <div style="margin-top:1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.6rem;">
                    <button type="button" class="cv-btn-secondary" onclick="Admin.showChangeAdminPasswordModal()" style="padding:0.45rem 0.85rem; font-size:0.82rem; color:var(--cv-danger);">
                      Change Admin Password
                    </button>
                    <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1rem; font-size:0.85rem;">
                      Save Security Policy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Audit Log Section (Section 24) -->
          <div class="cv-settings-section-card" id="sectionAuditLogs">
            <div class="cv-settings-section-header">
              <div>
                <div class="cv-settings-section-title" style="font-size:0.95rem;">
                  <svg style="width:16px; height:16px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  ADMIN AUDIT TRAIL (LAST ACTIONS)
                </div>
                <div class="cv-settings-section-desc">Mandatory audit logging of configuration, doctor, and staff alterations.</div>
              </div>
            </div>
            <div class="cv-settings-section-body" style="padding:0;">
              ${renderAuditLogsTableHtml(auditLogs)}
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  function filterSettingsSection(section, recordHistory = true) {
    if (recordHistory) {
      navigateTo('settings', section, () => {
        settingsActiveSection = section;
        renderSettingsView(cachedHospitalSettings, cachedDoctorsList, cachedStaffList, []);
      }, true);
    } else {
      settingsActiveSection = section;
      renderSettingsView(cachedHospitalSettings, cachedDoctorsList, cachedStaffList, []);
    }
  }

  // ====================================================================
  // DOCTORS SECTION TABLE & ACTIONS (Section 3)
  // ====================================================================
  function renderDoctorsTableHtml(doctors) {
    if (!doctors || doctors.length === 0) {
      return `
        <div style="padding:2rem; text-align:center; color:var(--cv-text-muted);">
          No doctors configured yet for this hospital. Click <strong>Add Doctor</strong> above to configure hospital physicians.
        </div>
      `;
    }

    const rows = doctors.map(doc => {
      const badgeClass = {
        'AVAILABLE': 'cv-badge-available',
        'ABSENT': 'cv-badge-absent',
        'BUSY': 'cv-badge-busy',
        'IN_SURGERY': 'cv-badge-surgery'
      }[doc.status] || 'cv-badge-available';

      const statusLabels = {
        'AVAILABLE': 'AVAILABLE',
        'ABSENT': 'ABSENT',
        'BUSY': 'BUSY',
        'IN_SURGERY': 'IN SURGERY'
      };

      return `
        <tr style="border-bottom:1px solid var(--cv-border-light);">
          <td style="padding:0.85rem 1.25rem;">
            <div style="font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(doc.name)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(doc.phone || 'No direct phone')}</div>
          </td>
          <td style="padding:0.85rem 1.25rem;">
            <div style="font-weight:600; color:var(--cv-primary);">${escapeHtml(doc.specialization || doc.department)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-secondary);">${escapeHtml(doc.department)}</div>
          </td>
          <td style="padding:0.85rem 1.25rem; font-size:0.85rem;">
            ${escapeHtml(doc.roomNumber || 'OPD Desk')}
          </td>
          <td style="padding:0.85rem 1.25rem; font-weight:700; color:var(--cv-deep-blue);">
            ₹${(doc.consultationFee || 0).toLocaleString()}
          </td>
          <td style="padding:0.85rem 1.25rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="${badgeClass}" style="padding:0.25rem 0.55rem; border-radius:var(--cv-radius-pill); font-size:0.75rem; font-weight:700;">
                ${statusLabels[doc.status] || doc.status}
              </span>
              <select class="cv-status-select-sm" onchange="Admin.updateDoctorStatus(${doc.id}, this.value)" title="Change Availability Status">
                <option value="AVAILABLE" ${doc.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
                <option value="ABSENT" ${doc.status === 'ABSENT' ? 'selected' : ''}>ABSENT</option>
                <option value="BUSY" ${doc.status === 'BUSY' ? 'selected' : ''}>BUSY</option>
                <option value="IN_SURGERY" ${doc.status === 'IN_SURGERY' ? 'selected' : ''}>IN SURGERY</option>
              </select>
            </div>
          </td>
          <td style="padding:0.85rem 1.25rem; text-align:right;">
            <button type="button" class="cv-btn-secondary" onclick="Admin.showEditDoctorModal(${doc.id})" style="padding:0.35rem 0.65rem; font-size:0.78rem;">
              Edit Details
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem;">
          <thead style="background:#f8fafc; border-bottom:1px solid var(--cv-border); font-size:0.76rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--cv-text-muted);">
            <tr>
              <th style="padding:0.75rem 1.25rem;">Doctor Name</th>
              <th style="padding:0.75rem 1.25rem;">Specialty &amp; Dept</th>
              <th style="padding:0.75rem 1.25rem;">Cabin / OPD</th>
              <th style="padding:0.75rem 1.25rem;">Consultation Fee</th>
              <th style="padding:0.75rem 1.25rem;">Availability Status</th>
              <th style="padding:0.75rem 1.25rem; text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  async function updateDoctorStatus(docId, newStatus) {
    try {
      const res = await Api.put(`/api/settings/doctors/${docId}/status`, { status: newStatus });
      showToast(`Doctor availability set to ${newStatus}`, 'success');
      // Refresh local cache and list
      const doc = cachedDoctorsList.find(d => d.id === docId);
      if (doc) doc.status = newStatus;
      renderSettingsView(cachedHospitalSettings, cachedDoctorsList, cachedStaffList, []);
    } catch (err) {
      showToast(err.message || 'Failed to update doctor availability', 'danger');
    }
  }

  function showAddDoctorModal() {
    const modalHtml = `
      <form id="addDoctorForm" onsubmit="event.preventDefault(); Admin.submitCreateDoctor();">
        <div class="cv-form-group">
          <label class="cv-form-label" for="addDocName">Doctor Full Name *</label>
          <input type="text" id="addDocName" class="cv-input" placeholder="e.g. Dr. Arthur Vance, MD" required>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="addDocDept">Clinical Department *</label>
            <input type="text" id="addDocDept" class="cv-input" placeholder="e.g. Cardiology" required>
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="addDocSpecialty">Specialization *</label>
            <input type="text" id="addDocSpecialty" class="cv-input" placeholder="e.g. Interventional Cardiology" required>
          </div>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="addDocRoom">Cabin / OPD Room</label>
            <input type="text" id="addDocRoom" class="cv-input" placeholder="e.g. OPD-101">
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="addDocFee">Consultation Fee (₹) *</label>
            <input type="number" id="addDocFee" class="cv-input" value="500" min="0" required>
          </div>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="addDocPhone">Contact Phone</label>
            <input type="text" id="addDocPhone" class="cv-input" placeholder="+1 800-555-DOC">
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="addDocStatus">Initial Availability</label>
            <select id="addDocStatus" class="cv-input">
              <option value="AVAILABLE" selected>AVAILABLE</option>
              <option value="ABSENT">ABSENT</option>
              <option value="BUSY">BUSY</option>
              <option value="IN_SURGERY">IN SURGERY</option>
            </select>
          </div>
        </div>
        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.6rem;">
          <button type="button" class="cv-btn-secondary" onclick="Admin.closeModal()" style="width:auto;">Cancel</button>
          <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1.25rem;">Save Doctor</button>
        </div>
      </form>
    `;
    showAdminModal('Add New Hospital Doctor', modalHtml);
  }

  async function submitCreateDoctor() {
    const payload = {
      name: document.getElementById('addDocName')?.value?.trim(),
      department: document.getElementById('addDocDept')?.value?.trim(),
      specialization: document.getElementById('addDocSpecialty')?.value?.trim(),
      roomNumber: document.getElementById('addDocRoom')?.value?.trim(),
      consultationFee: parseFloat(document.getElementById('addDocFee')?.value || '500'),
      phone: document.getElementById('addDocPhone')?.value?.trim(),
      status: document.getElementById('addDocStatus')?.value || 'AVAILABLE'
    };

    try {
      const res = await Api.post('/api/settings/doctors', payload);
      closeModal();
      showToast('Doctor registered successfully in MySQL', 'success');
      renderSettingsModule('doctors');
    } catch (err) {
      showToast(err.message || 'Failed to create doctor', 'danger');
    }
  }

  function showEditDoctorModal(docId) {
    const doc = cachedDoctorsList.find(d => d.id === docId);
    if (!doc) return;

    const modalHtml = `
      <form id="editDoctorForm" onsubmit="event.preventDefault(); Admin.submitUpdateDoctor(${docId});">
        <div class="cv-form-group">
          <label class="cv-form-label" for="editDocName">Doctor Full Name *</label>
          <input type="text" id="editDocName" class="cv-input" value="${escapeHtml(doc.name)}" required>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="editDocDept">Clinical Department *</label>
            <input type="text" id="editDocDept" class="cv-input" value="${escapeHtml(doc.department)}" required>
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="editDocSpecialty">Specialization *</label>
            <input type="text" id="editDocSpecialty" class="cv-input" value="${escapeHtml(doc.specialization || '')}" required>
          </div>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="editDocRoom">Cabin / OPD Room</label>
            <input type="text" id="editDocRoom" class="cv-input" value="${escapeHtml(doc.roomNumber || '')}">
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="editDocFee">Consultation Fee (₹) *</label>
            <input type="number" id="editDocFee" class="cv-input" value="${doc.consultationFee || 500}" min="0" required>
          </div>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="editDocPhone">Contact Phone</label>
            <input type="text" id="editDocPhone" class="cv-input" value="${escapeHtml(doc.phone || '')}">
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="editDocStatus">Availability Status</label>
            <select id="editDocStatus" class="cv-input">
              <option value="AVAILABLE" ${doc.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
              <option value="ABSENT" ${doc.status === 'ABSENT' ? 'selected' : ''}>ABSENT</option>
              <option value="BUSY" ${doc.status === 'BUSY' ? 'selected' : ''}>BUSY</option>
              <option value="IN_SURGERY" ${doc.status === 'IN_SURGERY' ? 'selected' : ''}>IN SURGERY</option>
            </select>
          </div>
        </div>
        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.6rem;">
          <button type="button" class="cv-btn-secondary" onclick="Admin.closeModal()" style="width:auto;">Cancel</button>
          <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1.25rem;">Update Doctor</button>
        </div>
      </form>
    `;
    showAdminModal(`Edit Doctor: ${escapeHtml(doc.name)}`, modalHtml);
  }

  async function submitUpdateDoctor(docId) {
    const payload = {
      name: document.getElementById('editDocName')?.value?.trim(),
      department: document.getElementById('editDocDept')?.value?.trim(),
      specialization: document.getElementById('editDocSpecialty')?.value?.trim(),
      roomNumber: document.getElementById('editDocRoom')?.value?.trim(),
      consultationFee: parseFloat(document.getElementById('editDocFee')?.value || '500'),
      phone: document.getElementById('editDocPhone')?.value?.trim(),
      status: document.getElementById('editDocStatus')?.value || 'AVAILABLE'
    };

    try {
      const res = await Api.put(`/api/settings/doctors/${docId}`, payload);
      closeModal();
      showToast('Doctor details updated successfully', 'success');
      renderSettingsModule('doctors');
    } catch (err) {
      showToast(err.message || 'Failed to update doctor', 'danger');
    }
  }

  // ====================================================================
  // STAFF SECTION TABLE & ACTIONS (Section 4)
  // ====================================================================
  function renderStaffTableHtml(staff) {
    if (!staff || staff.length === 0) {
      return `
        <div style="padding:2rem; text-align:center; color:var(--cv-text-muted);">
          No hospital staff members registered yet. Click <strong>Add Staff Member</strong> to configure team credentials.
        </div>
      `;
    }

    const rows = staff.map(emp => {
      const isActive = emp.status === 'ACTIVE';
      return `
        <tr style="border-bottom:1px solid var(--cv-border-light);">
          <td style="padding:0.85rem 1.25rem;">
            <div style="font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(emp.fullName || 'Employee')}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted); font-family:monospace;">ID: #${emp.id}</div>
          </td>
          <td style="padding:0.85rem 1.25rem;">
            <div style="font-weight:600; color:var(--cv-text-primary);">${escapeHtml(emp.email)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(emp.phone || 'No phone')}</div>
          </td>
          <td style="padding:0.85rem 1.25rem;">
            <div style="font-weight:600; color:var(--cv-deep-blue);">${escapeHtml(emp.department || 'General Staff')}</div>
            <div style="font-size:0.72rem; color:var(--cv-teal); font-weight:700;">${escapeHtml(emp.role)}</div>
          </td>
          <td style="padding:0.85rem 1.25rem;">
            <span style="display:inline-block; max-width:220px; font-size:0.74rem; color:var(--cv-text-muted); word-break:break-word;">
              ${escapeHtml(emp.permissions || 'Standard Access')}
            </span>
          </td>
          <td style="padding:0.85rem 1.25rem;">
            <span style="padding:0.25rem 0.55rem; border-radius:var(--cv-radius-pill); font-size:0.75rem; font-weight:700; background:${isActive ? 'var(--cv-success-light)' : 'var(--cv-danger-light)'}; color:${isActive ? 'var(--cv-success)' : 'var(--cv-danger)'}; border:1px solid ${isActive ? 'var(--cv-success-border)' : 'var(--cv-danger-border)'};">
              ${isActive ? 'ACTIVE' : 'DISABLED'}
            </span>
          </td>
          <td style="padding:0.85rem 1.25rem; text-align:right;">
            <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
              <button type="button" class="cv-btn-secondary" onclick="Admin.toggleStaffStatus(${emp.id}, '${emp.status}')" style="padding:0.35rem 0.65rem; font-size:0.76rem; color:${isActive ? 'var(--cv-danger)' : 'var(--cv-success)'};">
                ${isActive ? 'Disable' : 'Enable'}
              </button>
              <button type="button" class="cv-btn-secondary" onclick="Admin.showResetStaffPasswordModal(${emp.id}, '${escapeHtml(emp.fullName)}')" style="padding:0.35rem 0.65rem; font-size:0.76rem;">
                Reset Password
              </button>
              <button type="button" class="cv-btn-secondary" onclick="Admin.showEditStaffModal(${emp.id})" style="padding:0.35rem 0.65rem; font-size:0.76rem;">
                Edit
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem;">
          <thead style="background:#f8fafc; border-bottom:1px solid var(--cv-border); font-size:0.76rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--cv-text-muted);">
            <tr>
              <th style="padding:0.75rem 1.25rem;">Employee Name</th>
              <th style="padding:0.75rem 1.25rem;">Login Email / Phone</th>
              <th style="padding:0.75rem 1.25rem;">Department &amp; Role</th>
              <th style="padding:0.75rem 1.25rem;">Permissions</th>
              <th style="padding:0.75rem 1.25rem;">Status</th>
              <th style="padding:0.75rem 1.25rem; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  async function toggleStaffStatus(staffId, currentStatus) {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await Api.put(`/api/settings/staff/${staffId}/status`, { status: nextStatus });
      showToast(`Staff access status updated to ${nextStatus}`, 'success');
      const emp = cachedStaffList.find(s => s.id === staffId);
      if (emp) emp.status = nextStatus;
      renderSettingsView(cachedHospitalSettings, cachedDoctorsList, cachedStaffList, []);
    } catch (err) {
      showToast(err.message || 'Failed to update staff status', 'danger');
    }
  }

  function showResetStaffPasswordModal(staffId, staffName) {
    const modalHtml = `
      <form id="resetStaffPassForm" onsubmit="event.preventDefault(); Admin.submitResetStaffPassword(${staffId});">
        <p style="font-size:0.85rem; color:var(--cv-text-secondary); margin-bottom:1rem;">
          Assign a new secure login password for <strong>${escapeHtml(staffName)}</strong>. The staff member will be required to use this new password immediately.
        </p>
        <div class="cv-form-group">
          <label class="cv-form-label" for="resetPassNew">New Staff Password *</label>
          <input type="password" id="resetPassNew" class="cv-input" placeholder="At least 6 characters" minlength="6" required>
        </div>
        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.6rem;">
          <button type="button" class="cv-btn-secondary" onclick="Admin.closeModal()" style="width:auto;">Cancel</button>
          <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1.25rem;">Reset &amp; Save Password</button>
        </div>
      </form>
    `;
    showAdminModal(`Reset Password: ${escapeHtml(staffName)}`, modalHtml);
  }

  async function submitResetStaffPassword(staffId) {
    const newPassword = document.getElementById('resetPassNew')?.value?.trim();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning');
      return;
    }
    try {
      await Api.put(`/api/settings/staff/${staffId}/reset-password`, { newPassword: newPassword });
      closeModal();
      showToast('Staff password reset successfully and audit logged', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'danger');
    }
  }

  function showAddStaffModal() {
    const modalHtml = `
      <form id="addStaffForm" onsubmit="event.preventDefault(); Admin.submitCreateStaff();">
        <div class="cv-form-group">
          <label class="cv-form-label" for="addStaffName">Staff Full Name *</label>
          <input type="text" id="addStaffName" class="cv-input" placeholder="e.g. Rachel Adams" required>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="addStaffEmail">Login Email *</label>
            <input type="email" id="addStaffEmail" class="cv-input" placeholder="rachel@hospital.com" required>
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="addStaffPass">Initial Password *</label>
            <input type="password" id="addStaffPass" class="cv-input" placeholder="Min 6 characters" minlength="6" required>
          </div>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="addStaffPhone">Phone Number</label>
            <input type="text" id="addStaffPhone" class="cv-input" placeholder="+1 800-555-0104">
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="addStaffDept">Department *</label>
            <input type="text" id="addStaffDept" class="cv-input" placeholder="Front Desk / OPD / Pharmacy" required>
          </div>
        </div>
        <div class="cv-form-group" style="margin-top:0.75rem;">
          <label class="cv-form-label" for="addStaffPerms">Permissions (Comma Separated)</label>
          <input type="text" id="addStaffPerms" class="cv-input" value="OP_VIEW,OP_REGISTER,PATIENT_SEARCH,BILLING_VIEW">
        </div>
        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.6rem;">
          <button type="button" class="cv-btn-secondary" onclick="Admin.closeModal()" style="width:auto;">Cancel</button>
          <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1.25rem;">Create Staff Account</button>
        </div>
      </form>
    `;
    showAdminModal('Add New Hospital Staff Member', modalHtml);
  }

  async function submitCreateStaff() {
    const payload = {
      fullName: document.getElementById('addStaffName')?.value?.trim(),
      email: document.getElementById('addStaffEmail')?.value?.trim(),
      password: document.getElementById('addStaffPass')?.value?.trim(),
      phone: document.getElementById('addStaffPhone')?.value?.trim(),
      department: document.getElementById('addStaffDept')?.value?.trim(),
      permissions: document.getElementById('addStaffPerms')?.value?.trim() || 'OP_VIEW,OP_REGISTER'
    };

    try {
      await Api.post('/api/settings/staff', payload);
      closeModal();
      showToast('Staff member registered successfully in MySQL', 'success');
      renderSettingsModule('staff');
    } catch (err) {
      showToast(err.message || 'Failed to create staff member', 'danger');
    }
  }

  function showEditStaffModal(staffId) {
    const emp = cachedStaffList.find(s => s.id === staffId);
    if (!emp) return;

    const modalHtml = `
      <form id="editStaffForm" onsubmit="event.preventDefault(); Admin.submitUpdateStaff(${staffId});">
        <div class="cv-form-group">
          <label class="cv-form-label" for="editStaffName">Staff Full Name *</label>
          <input type="text" id="editStaffName" class="cv-input" value="${escapeHtml(emp.fullName)}" required>
        </div>
        <div class="cv-settings-grid-2" style="margin-top:0.75rem;">
          <div class="cv-form-group">
            <label class="cv-form-label" for="editStaffPhone">Phone Number</label>
            <input type="text" id="editStaffPhone" class="cv-input" value="${escapeHtml(emp.phone || '')}">
          </div>
          <div class="cv-form-group">
            <label class="cv-form-label" for="editStaffDept">Department *</label>
            <input type="text" id="editStaffDept" class="cv-input" value="${escapeHtml(emp.department || '')}" required>
          </div>
        </div>
        <div class="cv-form-group" style="margin-top:0.75rem;">
          <label class="cv-form-label" for="editStaffPerms">Permissions (Comma Separated)</label>
          <input type="text" id="editStaffPerms" class="cv-input" value="${escapeHtml(emp.permissions || 'OP_VIEW,OP_REGISTER')}">
        </div>
        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.6rem;">
          <button type="button" class="cv-btn-secondary" onclick="Admin.closeModal()" style="width:auto;">Cancel</button>
          <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1.25rem;">Update Staff</button>
        </div>
      </form>
    `;
    showAdminModal(`Edit Staff: ${escapeHtml(emp.fullName)}`, modalHtml);
  }

  async function submitUpdateStaff(staffId) {
    const payload = {
      fullName: document.getElementById('editStaffName')?.value?.trim(),
      phone: document.getElementById('editStaffPhone')?.value?.trim(),
      department: document.getElementById('editStaffDept')?.value?.trim(),
      permissions: document.getElementById('editStaffPerms')?.value?.trim()
    };

    try {
      await Api.put(`/api/settings/staff/${staffId}`, payload);
      closeModal();
      showToast('Staff member updated successfully', 'success');
      renderSettingsModule('staff');
    } catch (err) {
      showToast(err.message || 'Failed to update staff', 'danger');
    }
  }

  // ====================================================================
  // THEME & ADDITIONAL SETTINGS ACTIONS (Section 6, 7, 8, 10, 11)
  // ====================================================================
  function selectThemePreset(presetKey, primary, secondary, accent) {
    document.querySelectorAll('.cv-color-preset-card').forEach(c => c.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    const pPicker = document.getElementById('themePrimaryPicker');
    const pText = document.getElementById('themePrimaryText');
    const sPicker = document.getElementById('themeSecondaryPicker');
    const sText = document.getElementById('themeSecondaryText');
    const aPicker = document.getElementById('themeAccentPicker');
    const aText = document.getElementById('themeAccentText');
    const pName = document.getElementById('previewThemeName');

    if (pPicker) pPicker.value = primary;
    if (pText) pText.value = primary;
    if (sPicker) sPicker.value = secondary;
    if (sText) sText.value = secondary;
    if (aPicker) aPicker.value = accent;
    if (aText) aText.value = accent;
    if (pName) pName.textContent = presetKey;

    updateThemePreview(primary, secondary, accent);
  }

  function onCustomColorChange() {
    const primary = document.getElementById('themePrimaryPicker')?.value;
    const secondary = document.getElementById('themeSecondaryPicker')?.value;
    const accent = document.getElementById('themeAccentPicker')?.value;

    if (document.getElementById('themePrimaryText')) document.getElementById('themePrimaryText').value = primary;
    if (document.getElementById('themeSecondaryText')) document.getElementById('themeSecondaryText').value = secondary;
    if (document.getElementById('themeAccentText')) document.getElementById('themeAccentText').value = accent;
    if (document.getElementById('previewThemeName')) document.getElementById('previewThemeName').textContent = 'Custom';

    updateThemePreview(primary, secondary, accent);
  }

  function onCustomColorTextInput(pickerId, hexValue) {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      const picker = document.getElementById(pickerId);
      if (picker) {
        picker.value = hexValue;
        onCustomColorChange();
      }
    }
  }

  function updateThemePreview(primary, secondary, accent) {
    const badge = document.getElementById('previewBadge');
    const secBadge = document.getElementById('previewSecondaryBadge');
    const accBadge = document.getElementById('previewAccentBadge');
    if (badge) badge.style.background = primary;
    if (secBadge) secBadge.style.background = secondary;
    if (accBadge) accBadge.style.background = accent;
  }

  async function saveAppearanceTheme() {
    const primary = document.getElementById('themePrimaryPicker')?.value || '#1d4ed8';
    const secondary = document.getElementById('themeSecondaryPicker')?.value || '#0f172a';
    const accent = document.getElementById('themeAccentPicker')?.value || '#0d9488';
    const preset = document.getElementById('previewThemeName')?.textContent || 'custom';

    const payload = Object.assign({}, cachedHospitalSettings, {
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      themePreset: preset
    });

    try {
      const res = await Api.put('/api/settings', payload);
      cachedHospitalSettings = res.data;
      applyThemeStyles(res.data);
      showToast('Theme colors saved to MySQL and applied successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save theme settings', 'danger');
    }
  }

  async function saveHospitalProfile() {
    const payload = Object.assign({}, cachedHospitalSettings, {
      hospitalName: document.getElementById('setHospName')?.value?.trim(),
      phone: document.getElementById('setHospPhone')?.value?.trim(),
      email: document.getElementById('setHospEmail')?.value?.trim(),
      emergencyContact: document.getElementById('setHospEmergency')?.value?.trim(),
      address: document.getElementById('setHospAddress')?.value?.trim(),
      accreditationDetails: document.getElementById('setHospAccreditation')?.value?.trim()
    });

    try {
      const res = await Api.put('/api/settings', payload);
      cachedHospitalSettings = res.data;
      if (currentUser) currentUser.hospitalName = res.data.hospitalName;
      const tenantNameEl = document.getElementById('sidebarTenantName');
      if (tenantNameEl) {
        tenantNameEl.textContent = res.data.hospitalName;
        tenantNameEl.title = res.data.hospitalName;
      }
      showToast('Hospital profile updated successfully in MySQL.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save hospital profile', 'danger');
    }
  }

  async function saveBillingSettings() {
    const payload = Object.assign({}, cachedHospitalSettings, {
      gstNumber: document.getElementById('setBillingGst')?.value?.trim(),
      defaultGstPct: parseFloat(document.getElementById('setBillingTaxPct')?.value || '18'),
      invoicePrefix: document.getElementById('setBillingPrefix')?.value?.trim(),
      defaultPaymentMethod: document.getElementById('setBillingPayment')?.value,
      billingTerms: document.getElementById('setBillingTerms')?.value?.trim()
    });

    try {
      const res = await Api.put('/api/settings', payload);
      cachedHospitalSettings = res.data;
      showToast('Billing & GST settings saved successfully in MySQL.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save billing settings', 'danger');
    }
  }

  async function savePharmacySettings() {
    const payload = Object.assign({}, cachedHospitalSettings, {
      pharmacyReorderLevel: parseInt(document.getElementById('setPharReorder')?.value || '20', 10),
      pharmacyExpiryAlertDays: parseInt(document.getElementById('setPharExpiry')?.value || '60', 10),
      pharmacyReturnNotice: document.getElementById('setPharNotice')?.value?.trim()
    });

    try {
      const res = await Api.put('/api/settings', payload);
      cachedHospitalSettings = res.data;
      showToast('Pharmacy thresholds saved successfully in MySQL.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save pharmacy settings', 'danger');
    }
  }

  async function saveLabSettings() {
    const payload = Object.assign({}, cachedHospitalSettings, {
      labTurnaroundHours: parseInt(document.getElementById('setLabTurnaround')?.value || '24', 10),
      labCriticalAlert: document.getElementById('setLabCritical')?.value?.trim()
    });

    try {
      const res = await Api.put('/api/settings', payload);
      cachedHospitalSettings = res.data;
      showToast('Laboratory preferences saved successfully in MySQL.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save laboratory settings', 'danger');
    }
  }

  async function saveNotificationSettings() {
    const payload = Object.assign({}, cachedHospitalSettings, {
      emailNotifications: document.getElementById('setNotifyEmail')?.checked,
      lowStockAlerts: document.getElementById('setNotifyStock')?.checked,
      patientArrivalAlerts: document.getElementById('setNotifyPatient')?.checked,
      billingAlerts: document.getElementById('setNotifyBilling')?.checked
    });

    try {
      const res = await Api.put('/api/settings', payload);
      cachedHospitalSettings = res.data;
      showToast('Notification alert preferences saved successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save notification preferences', 'danger');
    }
  }

  async function saveSecuritySettings() {
    const payload = Object.assign({}, cachedHospitalSettings, {
      sessionTimeoutMinutes: parseInt(document.getElementById('setSecTimeout')?.value || '60', 10),
      requirePasswordChangeDays: parseInt(document.getElementById('setSecExpiry')?.value || '90', 10)
    });

    try {
      const res = await Api.put('/api/settings', payload);
      cachedHospitalSettings = res.data;
      showToast('Security policy preferences saved successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save security policy', 'danger');
    }
  }

  function showChangeAdminPasswordModal() {
    const modalHtml = `
      <form id="changeAdminPassForm" onsubmit="event.preventDefault(); Admin.submitChangeAdminPassword();">
        <div class="cv-form-group">
          <label class="cv-form-label" for="currAdminPass">Current Admin Password *</label>
          <input type="password" id="currAdminPass" class="cv-input" required>
        </div>
        <div class="cv-form-group" style="margin-top:0.75rem;">
          <label class="cv-form-label" for="newAdminPass">New Admin Password *</label>
          <input type="password" id="newAdminPass" class="cv-input" minlength="6" required>
        </div>
        <div class="cv-form-group" style="margin-top:0.75rem;">
          <label class="cv-form-label" for="confirmAdminPass">Confirm New Password *</label>
          <input type="password" id="confirmAdminPass" class="cv-input" minlength="6" required>
        </div>
        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.6rem;">
          <button type="button" class="cv-btn-secondary" onclick="Admin.closeModal()" style="width:auto;">Cancel</button>
          <button type="submit" class="cv-btn-primary" style="width:auto; padding:0.5rem 1.25rem;">Update Password</button>
        </div>
      </form>
    `;
    showAdminModal('Change Hospital Administrator Password', modalHtml);
  }

  async function submitChangeAdminPassword() {
    const currentPass = document.getElementById('currAdminPass')?.value;
    const newPass = document.getElementById('newAdminPass')?.value;
    const confirmPass = document.getElementById('confirmAdminPass')?.value;

    if (newPass !== confirmPass) {
      showToast('New passwords do not match', 'warning');
      return;
    }
    if (newPass.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning');
      return;
    }

    try {
      await Api.post('/api/auth/change-password', {
        currentPassword: currentPass,
        newPassword: newPass
      });
      closeModal();
      showToast('Admin password changed successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to change admin password', 'danger');
    }
  }

  function renderAuditLogsTableHtml(logs) {
    if (!logs || logs.length === 0) {
      return `
        <div style="padding:1.5rem; text-align:center; color:var(--cv-text-muted); font-size:0.84rem;">
          No audit logs recorded for recent sessions.
        </div>
      `;
    }

    const rows = logs.slice(0, 8).map(log => {
      const formattedTime = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent';
      return `
        <tr style="border-bottom:1px solid var(--cv-border-light); font-size:0.82rem;">
          <td style="padding:0.65rem 1.25rem; color:var(--cv-text-muted); white-space:nowrap;">
            ${escapeHtml(formattedTime)}
          </td>
          <td style="padding:0.65rem 1.25rem; font-weight:700; color:var(--cv-primary);">
            ${escapeHtml(log.action || 'SETTINGS_UPDATE')}
          </td>
          <td style="padding:0.65rem 1.25rem; color:var(--cv-text-secondary);">
            ${escapeHtml(log.details || log.description || 'Settings altered')}
          </td>
          <td style="padding:0.65rem 1.25rem; color:var(--cv-text-muted); text-align:right;">
            ${escapeHtml(log.userEmail || 'Admin')}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table style="width:100%; border-collapse:collapse; text-align:left;">
        <thead style="background:#f8fafc; border-bottom:1px solid var(--cv-border); font-size:0.74rem; text-transform:uppercase; color:var(--cv-text-muted);">
          <tr>
            <th style="padding:0.65rem 1.25rem;">Timestamp</th>
            <th style="padding:0.65rem 1.25rem;">Event</th>
            <th style="padding:0.65rem 1.25rem;">Details</th>
            <th style="padding:0.65rem 1.25rem; text-align:right;">Operator</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function showAdminModal(title, bodyHtml) {
    let host = document.getElementById('adminModalHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'adminModalHost';
      document.body.appendChild(host);
    }
    host.innerHTML = `
      <div class="cv-op-modal-backdrop" id="adminModalBackdrop">
        <div class="cv-op-modal-box" style="max-width:580px;">
          <div class="cv-op-modal-header">
            <div class="cv-op-modal-title">${escapeHtml(title)}</div>
            <button type="button" class="cv-btn-secondary" id="btnCloseAdminModalX" style="padding:0.3rem 0.6rem; font-size:1rem;">&times;</button>
          </div>
          <div class="cv-op-modal-body">
            ${bodyHtml}
          </div>
        </div>
      </div>
    `;
    const backdrop = document.getElementById('adminModalBackdrop');
    const closeBtn = document.getElementById('btnCloseAdminModalX');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) closeModal();
      };
    }
  }

  function closeModal() {
    const host = document.getElementById('adminModalHost');
    if (host) host.innerHTML = '';
  }


  // ====================================================================
  // OUTPATIENT (OP) REGISTRATION & CLINICAL WORKFLOW MODULE
  // ====================================================================
  let opClockInterval = null;
  let opSearchDebounce = null;
  let opLoadedPatient = null;
  let opAvailableDoctors = [];

  function renderOpModule(activeTab = 'register') {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    if (opClockInterval) {
      clearInterval(opClockInterval);
      opClockInterval = null;
    }

    const hospName = escapeHtml(currentUser?.hospitalName || 'Hospital Center');

    mainContent.innerHTML = `
      <div class="cv-op-wrapper">
        <div class="cv-page-header">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            ${renderBackArrowHtml('Back')}
            <div>
              <h1 class="cv-page-title">Outpatient (OP) Registration</h1>
              <p class="cv-page-subtitle">Hospital: <strong>${hospName}</strong> &bull; Tenant Operations &bull; OPD Clinical Desk</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <button type="button" class="cv-btn-secondary" id="btnOpBackDashboard" style="padding:0.5rem 0.85rem; font-size:0.82rem;">
              &larr; Back to Dashboard
            </button>
          </div>
        </div>

        <!-- Sub-Navigation Tabs -->
        <div class="cv-op-tabs">
          <button type="button" class="cv-op-tab-btn ${activeTab === 'register' ? 'active' : ''}" id="tabBtnRegister">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
            Outpatient (OP) Registration
          </button>
          <button type="button" class="cv-op-tab-btn ${activeTab === 'history' ? 'active' : ''}" id="tabBtnHistory">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            OP History & Patient Records
          </button>
        </div>

        <!-- Container for active tab -->
        <div id="opTabContent"></div>
      </div>

      <!-- Modal Mount Container -->
      <div id="opModalHost"></div>
    `;

    document.getElementById('btnOpBackDashboard')?.addEventListener('click', () => {
      if (opClockInterval) clearInterval(opClockInterval);
      navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
    });

    document.getElementById('tabBtnRegister')?.addEventListener('click', () => {
      switchOpTab('register', true);
    });

    document.getElementById('tabBtnHistory')?.addEventListener('click', () => {
      switchOpTab('history', true);
    });

    // Start Live Clock for Form
    startOpClock();

    switchOpTab(activeTab, false);
  }

  function executeOpTab(tab) {
    const tabContent = document.getElementById('opTabContent');
    if (!tabContent) {
      renderOpModule(tab);
      return;
    }
    document.querySelectorAll('.cv-op-tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'register') {
      document.getElementById('tabBtnRegister')?.classList.add('active');
      renderOpRegisterTab();
    } else {
      document.getElementById('tabBtnHistory')?.classList.add('active');
      renderOpHistoryTab();
    }
  }

  function switchOpTab(tab, recordHistory = true) {
    if (recordHistory) {
      navigateTo('op', tab, () => executeOpTab(tab), true);
    } else {
      executeOpTab(tab);
    }
  }

  function startOpClock() {
    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      const regTimeInput = document.getElementById('opRegTimeInput');
      if (regTimeInput && !regTimeInput.dataset.fixed) {
        regTimeInput.value = timeStr;
      }
    }
    updateClock();
    if (opClockInterval) clearInterval(opClockInterval);
    opClockInterval = setInterval(updateClock, 1000);
  }

  // ====================================================================
  // SUB-TAB 1: OP REGISTRATION FORM
  // ====================================================================
  function renderOpRegisterTab() {
    const tabContent = document.getElementById('opTabContent');
    if (!tabContent) return;

    opLoadedPatient = null;
    const now = new Date();
    const todayFormatted = formatDDMMYYYY(now);
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    tabContent.innerHTML = `
      <!-- Prominent Patient Search Box (Auto-Fill) -->
      <div class="cv-patient-search-card">
        <div class="cv-patient-search-title">
          <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          Search Existing Patient (Auto-Fill Form)
          <span style="font-size:0.75rem; font-weight:400; color:var(--cv-text-muted); margin-left:auto;">Search by Patient Name, Phone Number, UHID, or OP ID</span>
        </div>
        <div class="cv-patient-search-input-wrap">
          <svg class="cv-patient-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" id="opPatientSearchInput" class="cv-patient-search-input" placeholder="Start typing Patient Name, Phone, UHID, or OP ID..." autocomplete="off">
          <button type="button" id="btnClearSearch" class="cv-patient-search-clear">&times;</button>
        </div>
        <div id="opSearchResultsDropdown" class="cv-patient-results-dropdown"></div>

        <div id="opPatientFoundBanner" style="display:none;" class="cv-patient-found-chip">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
            <span id="opFoundBannerText">Existing Patient Loaded</span>
          </div>
          <button type="button" id="btnClearLoadedPatient" class="cv-btn-secondary" style="padding:0.25rem 0.65rem; font-size:0.75rem; background:#ffffff;">
            Clear / Register New Patient
          </button>
        </div>
      </div>

      <!-- Notification / Error Alert Box -->
      <div id="opFormAlert" class="cv-alert" style="display:none; margin-top:1rem;"></div>

      <!-- Multi-Column OP Registration Form -->
      <form id="opRegistrationForm" style="margin-top:1rem;" novalidate>
        <div class="cv-op-form-grid">
          
          <!-- 1. Patient Information Card -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>Patient Information</span>
              <span class="cv-op-section-badge">Required</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="opPatientName">Patient Full Name *</label>
              <input type="text" id="opPatientName" class="cv-input" placeholder="" required>
              <span class="cv-feedback-error" id="errPatientName">Patient name is required.</span>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group">
                <label class="cv-form-label" for="opPatientAge">Patient Age (Years) *</label>
                <input type="number" id="opPatientAge" class="cv-input" placeholder="" min="0" max="130" required>
                <span class="cv-feedback-error" id="errPatientAge">Please enter a valid age (0-130).</span>
              </div>
              <div class="cv-form-group">
                <label class="cv-form-label" for="opPatientGender">Patient Gender *</label>
                <select id="opPatientGender" class="cv-input" required>
                  <option value="">Select Gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <span class="cv-feedback-error" id="errPatientGender">Please select patient gender.</span>
              </div>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group">
                <label class="cv-form-label" for="opPatientPhone">Patient Phone Number *</label>
                <input type="tel" id="opPatientPhone" class="cv-input" placeholder="" required>
                <span class="cv-feedback-error" id="errPatientPhone">Please enter a valid phone number.</span>
              </div>
              <div class="cv-form-group">
                <label class="cv-form-label" for="opPatientEmail">Patient Email ID (Optional)</label>
                <input type="email" id="opPatientEmail" class="cv-input" placeholder="">
                <span class="cv-feedback-error" id="errPatientEmail">Please enter a valid email address.</span>
              </div>
            </div>

            <div class="cv-form-group" style="margin-bottom:0;">
              <label class="cv-form-label" for="opPatientUhid">Patient UHID (Identifier)</label>
              <input type="text" id="opPatientUhid" class="cv-input cv-op-input-readonly" readonly placeholder="">
            </div>
          </div>

          <!-- 2. Registration Schedule & System Assignment Card -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>Registration & Visit Metadata</span>
              <span class="cv-op-section-badge" style="background:#f0fdfa; color:#0d9488;">Auto Generated</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="opIdPreview">Outpatient (OP) ID *</label>
              <input type="text" id="opIdPreview" class="cv-input cv-op-input-readonly" readonly value="Auto-Generated on Save">
              <span style="font-size:0.73rem; color:var(--cv-text-muted); margin-top:0.25rem; display:block;">
                A unique, sequential OP ID is automatically assigned and stored in MySQL upon submission.
              </span>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group">
                <label class="cv-form-label" for="opRegDateInput">Registration Date *</label>
                <input type="text" id="opRegDateInput" class="cv-input cv-op-input-readonly" readonly value="${todayFormatted}">
              </div>
              <div class="cv-form-group">
                <label class="cv-form-label" for="opRegTimeInput">Registration Time *</label>
                <input type="text" id="opRegTimeInput" class="cv-input cv-op-input-readonly" readonly value="${timeFormatted}">
              </div>
            </div>

            <div class="cv-form-group" style="margin-bottom:0;">
              <label class="cv-form-label" for="opVisitType">Consultation Type</label>
              <select id="opVisitType" class="cv-input">
                <option value="GENERAL">General Outpatient Consultation</option>
                <option value="SPECIALIST">Specialist OPD Review</option>
                <option value="FOLLOW_UP">Follow-up Clinical Visit</option>
                <option value="EMERGENCY">Emergency OPD Care</option>
              </select>
            </div>
          </div>

          <!-- 3. Doctor & Department Assignment Card -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>Doctor & Department Assignment</span>
              <span class="cv-op-section-badge">Availability Enforced</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="opDoctorSelect">Attending Doctor *</label>
              <select id="opDoctorSelect" class="cv-input" required>
                <option value="">Loading attending doctors from database...</option>
              </select>
              <span class="cv-feedback-error" id="errDoctor">Please select an available doctor.</span>
              <div id="docAvailabilityNotice" style="font-size:0.75rem; color:var(--cv-text-muted); margin-top:0.35rem;">
                Only doctors whose status is <strong>AVAILABLE</strong> can be selected. Absent or Busy doctors are strictly restricted.
              </div>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group">
                <label class="cv-form-label" for="opDepartmentInput">Department *</label>
                <input type="text" id="opDepartmentInput" class="cv-input cv-op-input-readonly" readonly placeholder="">
                <span class="cv-feedback-error" id="errDepartment">Department is required.</span>
              </div>
              <div class="cv-form-group">
                <label class="cv-form-label" for="opRoomNumberInput">OPD Room Number</label>
                <input type="text" id="opRoomNumberInput" class="cv-input cv-op-input-readonly" readonly placeholder="">
              </div>
            </div>

            <div class="cv-form-group" style="margin-bottom:0;">
              <label class="cv-form-label" for="opFeeInput">Consultation Fee (&#8377;)</label>
              <input type="text" id="opFeeInput" class="cv-input cv-op-input-readonly" readonly value="0.00">
            </div>
          </div>

          <!-- 4. Address & Contact Card -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>Patient Address & Notes</span>
              <span class="cv-op-section-badge" style="background:#f1f5f9; color:#475569;">Optional</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="opAddressInput">Residential Address</label>
              <textarea id="opAddressInput" class="cv-input" rows="3" placeholder="" style="resize:vertical;"></textarea>
            </div>

            <div class="cv-form-group" style="margin-bottom:0;">
              <label class="cv-form-label" for="opNotesInput">Clinical Triage / Presenting Complaint Notes</label>
              <input type="text" id="opNotesInput" class="cv-input" placeholder="">
            </div>
          </div>

          <!-- 5. Payment & Billing Settlement Card -->
          <div class="cv-op-section-card" style="grid-column:1 / -1;">
            <div class="cv-op-section-header">
              <span>OP Billing & Payment Collection</span>
              <span class="cv-op-section-badge" style="background:#ecfdf5; color:#059669;">Real-Time MySQL Persistence</span>
            </div>

            <div class="cv-op-fields-row" style="grid-template-columns: repeat(3, 1fr);">
              <div class="cv-form-group">
                <label class="cv-form-label" for="opPaymentMethod">Payment Method *</label>
                <select id="opPaymentMethod" class="cv-input" required>
                  <option value="CASH">Cash Payment</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="NET_BANKING">Net Banking / Transfer</option>
                </select>
              </div>

              <div class="cv-form-group">
                <label class="cv-form-label" for="opAmountPaid">Amount to Collect (&#8377;) *</label>
                <input type="number" id="opAmountPaid" class="cv-input" value="0.00" min="0" step="1" required>
                <span class="cv-feedback-error" id="errAmount">Please enter a valid consultation amount.</span>
              </div>

              <div class="cv-form-group">
                <label class="cv-form-label" for="opPaymentStatusDisplay">Payment Status</label>
                <input type="text" id="opPaymentStatusDisplay" class="cv-input cv-op-input-readonly" readonly value="PAID - Recorded">
              </div>
            </div>
          </div>
        </div>

        <!-- Form Action Footer -->
        <div class="cv-op-actions">
          <button type="button" id="btnResetOpForm" class="cv-btn-secondary" style="padding:0.75rem 1.4rem;">
            Cancel / Reset Form
          </button>
          <button type="submit" id="btnRegisterOpSubmit" class="cv-btn-primary" style="padding:0.75rem 2rem; font-size:1rem;">
            <span id="opRegisterSpinner" class="cv-spinner" style="margin-right:0.5rem;"></span>
            <span id="opRegisterBtnText">Register OP (Outpatient)</span>
          </button>
        </div>
      </form>
    `;

    setupPatientSearchEvents();
    loadDoctorDropdown();
    setupOpFormSubmission();

    document.getElementById('btnResetOpForm')?.addEventListener('click', () => {
      resetOpForm();
    });
  }

  function setupPatientSearchEvents() {
    const searchInput = document.getElementById('opPatientSearchInput');
    const dropdown = document.getElementById('opSearchResultsDropdown');
    const clearBtn = document.getElementById('btnClearSearch');
    const clearLoadedBtn = document.getElementById('btnClearLoadedPatient');

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

      if (opSearchDebounce) clearTimeout(opSearchDebounce);

      if (q.length < 2) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }

      opSearchDebounce = setTimeout(async () => {
        try {
          const res = await Api.get('/api/op/search-patients?q=' + encodeURIComponent(q));
          if (res.ok && res.data && res.data.length > 0) {
            const sorted = sortByStartsWith(res.data, q);
            renderPatientSearchResults(sorted);
          } else {
            dropdown.style.display = 'block';
            dropdown.innerHTML = `
              <div style="padding:0.85rem 1rem; color:var(--cv-text-muted); font-size:0.85rem; text-align:center;">
                No existing patients found matching "<strong>${escapeHtml(q)}</strong>". Proceeding with new patient registration.
              </div>
            `;
          }
        } catch (err) {
          console.error('Patient search error:', err);
        }
      }, 250);
    });

    clearBtn?.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      dropdown.style.display = 'none';
    });

    clearLoadedBtn?.addEventListener('click', () => {
      resetOpForm();
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  function renderPatientSearchResults(patients) {
    const dropdown = document.getElementById('opSearchResultsDropdown');
    if (!dropdown) return;

    dropdown.style.display = 'block';
    dropdown.innerHTML = patients.map((p) => `
      <div class="cv-patient-result-item" data-uhid="${escapeHtml(p.uhid)}">
        <div>
          <div style="font-weight:700; color:var(--cv-deep-blue); font-size:0.92rem;">
            ${escapeHtml(p.fullName)}
            <span class="cv-op-section-badge" style="margin-left:0.5rem;">${escapeHtml(p.uhid)}</span>
          </div>
          <div style="font-size:0.78rem; color:var(--cv-text-muted); margin-top:0.2rem;">
            Phone: <strong>${escapeHtml(p.phone)}</strong> &bull; Age/Gender: ${p.age || 'N/A'} Yrs / ${escapeHtml(p.gender || 'N/A')}
            ${p.lastOpId ? ` &bull; Recent OP: <strong style="color:var(--cv-primary);">${escapeHtml(p.lastOpId)}</strong>` : ''}
          </div>
        </div>
        <button type="button" class="cv-btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem; pointer-events:none;">
          Auto-Fill
        </button>
      </div>
    `).join('');

    dropdown.querySelectorAll('.cv-patient-result-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const patient = patients[index];
        fillPatientIntoForm(patient);
        dropdown.style.display = 'none';
      });
    });
  }

  function fillPatientIntoForm(p) {
    opLoadedPatient = p;
    document.getElementById('opPatientName').value = p.fullName || '';
    document.getElementById('opPatientAge').value = p.age || '';
    document.getElementById('opPatientGender').value = p.gender || '';
    document.getElementById('opPatientPhone').value = p.phone || '';
    document.getElementById('opPatientEmail').value = p.email || '';
    document.getElementById('opPatientUhid').value = p.uhid || '';
    document.getElementById('opAddressInput').value = p.address || '';

    // Clear validation errors
    document.querySelectorAll('.cv-feedback-error').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.cv-input').forEach(el => el.classList.remove('is-invalid'));

    const banner = document.getElementById('opPatientFoundBanner');
    const bannerText = document.getElementById('opFoundBannerText');
    if (banner && bannerText) {
      banner.style.display = 'flex';
      bannerText.innerHTML = `Existing Patient Loaded: <strong>${escapeHtml(p.fullName)}</strong> (UHID: <strong>${escapeHtml(p.uhid)}</strong>, Phone: <strong>${escapeHtml(p.phone)}</strong>)`;
    }

    const searchInput = document.getElementById('opPatientSearchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('btnClearSearch');
    if (clearBtn) clearBtn.style.display = 'none';
  }

  function resetOpForm() {
    opLoadedPatient = null;
    const form = document.getElementById('opRegistrationForm');
    if (form) form.reset();

    const banner = document.getElementById('opPatientFoundBanner');
    if (banner) banner.style.display = 'none';

    document.getElementById('opPatientUhid').value = '';
    document.getElementById('opDepartmentInput').value = '';
    document.getElementById('opRoomNumberInput').value = '';
    document.getElementById('opFeeInput').value = '0.00';
    document.getElementById('opAmountPaid').value = '0.00';

    const now = new Date();
    document.getElementById('opRegDateInput').value = formatDDMMYYYY(now);
    document.getElementById('opRegTimeInput').value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    document.querySelectorAll('.cv-feedback-error').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.cv-input').forEach(el => el.classList.remove('is-invalid'));

    const alertBox = document.getElementById('opFormAlert');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }
  }

  async function loadDoctorDropdown() {
    const docSelect = document.getElementById('opDoctorSelect');
    if (!docSelect) return;

    try {
      const res = await Api.get('/api/op/all-doctors');
      if (res.ok && res.data && res.data.length > 0) {
        opAvailableDoctors = res.data;
        docSelect.innerHTML = `
          <option value="">-- Select Attending Doctor (Available Only) --</option>
          ${res.data.map(doc => {
            const isAvail = (doc.status === 'AVAILABLE');
            const statusLabel = doc.status.replace('_', ' ');
            if (isAvail) {
              return `<option value="${escapeHtml(doc.name)}" data-dept="${escapeHtml(doc.department)}" data-room="${escapeHtml(doc.roomNumber || 'OPD-101')}" data-fee="${doc.consultationFee}">
                Dr. ${escapeHtml(doc.name)} &bull; ${escapeHtml(doc.department)} &bull; &#8377;${doc.consultationFee} [AVAILABLE]
              </option>`;
            } else {
              return `<option value="${escapeHtml(doc.name)}" disabled style="color:#94a3b8; background:#f8fafc; font-style:italic;">
                Dr. ${escapeHtml(doc.name)} &bull; ${escapeHtml(doc.department)} &bull; [${statusLabel}] UNAVAILABLE
              </option>`;
            }
          }).join('')}
        `;

        docSelect.addEventListener('change', (e) => {
          const selectedOption = docSelect.options[docSelect.selectedIndex];
          if (selectedOption && selectedOption.value) {
            const dept = selectedOption.dataset.dept || '';
            const room = selectedOption.dataset.room || '';
            const fee = selectedOption.dataset.fee || '0.00';

            document.getElementById('opDepartmentInput').value = dept;
            document.getElementById('opRoomNumberInput').value = room;
            document.getElementById('opFeeInput').value = fee;
            document.getElementById('opAmountPaid').value = fee;
            document.getElementById('errDoctor')?.classList.remove('show');
            docSelect.classList.remove('is-invalid');
          } else {
            document.getElementById('opDepartmentInput').value = '';
            document.getElementById('opRoomNumberInput').value = '';
            document.getElementById('opFeeInput').value = '0.00';
            document.getElementById('opAmountPaid').value = '0.00';
          }
        });
      } else {
        docSelect.innerHTML = `<option value="">No doctors registered for this hospital</option>`;
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      docSelect.innerHTML = `<option value="">Failed to load doctors</option>`;
    }
  }

  function setupOpFormSubmission() {
    const form = document.getElementById('opRegistrationForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const alertBox = document.getElementById('opFormAlert');
      if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
      }

      // 1. Gather Inputs
      const patientName = document.getElementById('opPatientName').value.trim();
      const ageStr = document.getElementById('opPatientAge').value.trim();
      const gender = document.getElementById('opPatientGender').value.trim();
      const phone = document.getElementById('opPatientPhone').value.trim();
      const email = document.getElementById('opPatientEmail').value.trim();
      const doctorName = document.getElementById('opDoctorSelect').value.trim();
      const department = document.getElementById('opDepartmentInput').value.trim();
      const address = document.getElementById('opAddressInput').value.trim();
      const notes = document.getElementById('opNotesInput').value.trim();
      const paymentMethod = document.getElementById('opPaymentMethod').value.trim();
      const amountStr = document.getElementById('opAmountPaid').value.trim();
      const existingUhid = opLoadedPatient ? opLoadedPatient.uhid : document.getElementById('opPatientUhid').value.trim();

      // 2. Validate
      let isValid = true;
      document.querySelectorAll('.cv-feedback-error').forEach(el => el.classList.remove('show'));
      document.querySelectorAll('.cv-input').forEach(el => el.classList.remove('is-invalid'));

      if (!patientName) {
        document.getElementById('opPatientName').classList.add('is-invalid');
        document.getElementById('errPatientName').classList.add('show');
        isValid = false;
      }

      const ageNum = parseInt(ageStr, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
        document.getElementById('opPatientAge').classList.add('is-invalid');
        document.getElementById('errPatientAge').classList.add('show');
        isValid = false;
      }

      if (!gender) {
        document.getElementById('opPatientGender').classList.add('is-invalid');
        document.getElementById('errPatientGender').classList.add('show');
        isValid = false;
      }

      if (!phone || phone.length < 7) {
        document.getElementById('opPatientPhone').classList.add('is-invalid');
        document.getElementById('errPatientPhone').classList.add('show');
        isValid = false;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('opPatientEmail').classList.add('is-invalid');
        document.getElementById('errPatientEmail').classList.add('show');
        isValid = false;
      }

      if (!doctorName) {
        document.getElementById('opDoctorSelect').classList.add('is-invalid');
        document.getElementById('errDoctor').classList.add('show');
        isValid = false;
      } else {
        // Enforce doctor availability on client
        const matchedDoc = opAvailableDoctors.find(d => d.name === doctorName);
        if (matchedDoc && matchedDoc.status !== 'AVAILABLE') {
          document.getElementById('opDoctorSelect').classList.add('is-invalid');
          const errDoc = document.getElementById('errDoctor');
          errDoc.textContent = `Selected doctor is currently unavailable (${matchedDoc.status.replace('_', ' ')}).`;
          errDoc.classList.add('show');
          isValid = false;
        }
      }

      const feeNum = parseFloat(amountStr);
      if (isNaN(feeNum) || feeNum < 0) {
        document.getElementById('opAmountPaid').classList.add('is-invalid');
        document.getElementById('errAmount').classList.add('show');
        isValid = false;
      }

      if (!isValid) {
        if (alertBox) {
          alertBox.className = 'cv-alert cv-alert-danger show';
          alertBox.textContent = 'Please correct the highlighted validation errors before registering.';
        }
        return;
      }

      // 3. Submit to Backend
      const btn = document.getElementById('btnRegisterOpSubmit');
      const spinner = document.getElementById('opRegisterSpinner');
      const btnText = document.getElementById('opRegisterBtnText');

      btn.disabled = true;
      spinner?.classList.add('show');
      if (btnText) btnText.textContent = 'Saving to Database...';

      const payload = {
        patientName: patientName,
        age: ageNum,
        gender: gender,
        phone: phone,
        email: email || null,
        address: address || null,
        existingUhid: existingUhid || null,
        doctorName: doctorName,
        department: department,
        consultationFee: feeNum,
        paymentMethod: paymentMethod,
        notes: notes || null
      };

      try {
        const res = await Api.post('/api/op/register', payload);

        btn.disabled = false;
        spinner?.classList.remove('show');
        if (btnText) btnText.textContent = 'Register OP (Outpatient)';

        if (res.ok && res.data) {
          const registeredOp = res.data;

          if (alertBox) {
            alertBox.className = 'cv-alert cv-alert-success show';
            alertBox.innerHTML = `
              <strong>OP Registration completed successfully!</strong><br>
              OP ID: <strong>${registeredOp.opId}</strong> &bull; UHID: <strong>${registeredOp.uhid}</strong> &bull; Patient: <strong>${registeredOp.patientName}</strong> &bull; Doctor: <strong>${registeredOp.doctorName}</strong>
            `;
          }

          // Reset form inputs
          resetOpForm();

          // Automatically prompt receipt modal for printing
          showOpReceiptModal(registeredOp.id);
        } else {
          if (alertBox) {
            alertBox.className = 'cv-alert cv-alert-danger show';
            alertBox.textContent = res.message || 'Failed to complete OP registration. Please check inputs.';
          }
        }
      } catch (networkErr) {
        btn.disabled = false;
        spinner?.classList.remove('show');
        if (btnText) btnText.textContent = 'Register OP (Outpatient)';
        if (alertBox) {
          alertBox.className = 'cv-alert cv-alert-danger show';
          alertBox.textContent = 'Network error while contacting the server.';
        }
      }
    });
  }

  // ====================================================================
  // SUB-TAB 2: OP HISTORY & PATIENT DIRECTORY
  // ====================================================================
  let opHistoryPagination = null;
  let opHistoryRawList = [];

  function renderOpHistoryTab() {
    const tabContent = document.getElementById('opTabContent');
    if (!tabContent) return;

    if (!opHistoryPagination) {
      opHistoryPagination = createHistoryPaginationController({
        defaultPageSize: 10,
        onPageChange: (pagedItems) => {
          renderOpHistoryTableRows(pagedItems);
          const mount = document.getElementById('opHistoryPaginationMount');
          if (mount) {
            mount.innerHTML = opHistoryPagination.renderControlsHtml('opHistory');
            opHistoryPagination.bindEvents('opHistory');
          }
        }
      });
    }

    tabContent.innerHTML = `
      <div class="cv-op-section-card">
        <div class="cv-op-section-header">
          <span>Outpatient (OP) Registration History & Records</span>
          <span class="cv-op-section-badge" style="background:#eff6ff; color:#1d4ed8;">Real MySQL Records</span>
        </div>

        <div style="display:flex; gap:0.75rem; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap;">
          <div style="flex:1; min-width:260px; position:relative;">
            <svg style="position:absolute; left:0.85rem; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" id="opHistorySearchInput" class="cv-input" style="padding-left:2.5rem;" placeholder="Search previous OP by OP ID, Patient Name, UHID, Phone, or Doctor...">
          </div>
          <button type="button" id="btnRefreshOpHistory" class="cv-btn-secondary" style="padding:0.75rem 1.25rem; display:inline-flex; align-items:center; gap:0.4rem;">
            <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Refresh History
          </button>
        </div>

        <div style="overflow-x:auto;">
          <table class="cv-table" id="opHistoryTable">
            <thead>
              <tr>
                <th>OP ID</th>
                <th>Patient & UHID</th>
                <th>Age / Gender</th>
                <th>Phone Number</th>
                <th>Doctor & Dept</th>
                <th>Visit Date & Time</th>
                <th>Fee & Method</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody id="opHistoryTableBody">
              <tr>
                <td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">
                  Loading OP registration history from MySQL database...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div id="opHistoryPaginationMount"></div>
      </div>
    `;

    loadOpHistoryList();

    const searchInput = document.getElementById('opHistorySearchInput');
    let historyDebounce = null;
    searchInput?.addEventListener('input', (e) => {
      if (historyDebounce) clearTimeout(historyDebounce);
      historyDebounce = setTimeout(() => {
        loadOpHistoryList(e.target.value.trim());
      }, 300);
    });

    document.getElementById('btnRefreshOpHistory')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnRefreshOpHistory');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:4px;"></span> Refreshing...';
      }
      try {
        await loadOpHistoryList(searchInput ? searchInput.value.trim() : '');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Refresh History';
        }
      }
    });
  }

  function renderOpHistoryTableRows(items) {
    const tbody = document.getElementById('opHistoryTableBody');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">
            No OP registration records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <strong style="color:var(--cv-primary); font-family:monospace; font-size:0.92rem;">${escapeHtml(item.opId)}</strong>
        </td>
        <td>
          <div style="font-weight:700; color:var(--cv-deep-blue); font-size:0.88rem;">${escapeHtml(item.patientName || 'Patient')}</div>
          <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(item.uhid || 'N/A')}</div>
        </td>
        <td>
          ${item.age ? `${item.age} Yrs` : 'N/A'} &bull; ${escapeHtml(item.gender || 'N/A')}
        </td>
        <td>
          ${escapeHtml(item.phone || 'N/A')}
        </td>
        <td>
          <div style="font-weight:600; color:var(--cv-deep-blue);">${escapeHtml(item.doctorName)}</div>
          <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(item.department || 'OPD')}</div>
        </td>
        <td>
          <div style="font-size:0.84rem;">${escapeHtml(item.visitDate)}</div>
          <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(item.registrationTime || '')}</div>
        </td>
        <td>
          <div style="font-weight:700; color:#059669;">&#8377;${formatCurrency(item.consultationFee)}</div>
          <div style="font-size:0.73rem; color:var(--cv-text-muted);">${escapeHtml(item.paymentMethod || 'CASH')}</div>
        </td>
        <td>
          <span class="cv-metric-badge" style="background:#ecfdf5; color:#059669; font-size:0.72rem;">
            ${escapeHtml(item.status || 'REGISTERED')}
          </span>
        </td>
        <td style="text-align:right; white-space:nowrap;">
          <button type="button" class="cv-btn-secondary btn-view-op" data-id="${item.id}" style="padding:0.35rem 0.65rem; font-size:0.78rem; margin-right:0.3rem;">
            View
          </button>
          <button type="button" class="cv-btn-primary btn-receipt-op" data-id="${item.id}" style="padding:0.35rem 0.65rem; font-size:0.78rem;">
            Receipt
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-view-op').forEach(btn => {
      btn.addEventListener('click', () => showOpDetailsModal(btn.dataset.id));
    });

    tbody.querySelectorAll('.btn-receipt-op').forEach(btn => {
      btn.addEventListener('click', () => showOpReceiptModal(btn.dataset.id));
    });
  }

  async function loadOpHistoryList(query = '') {
    const tbody = document.getElementById('opHistoryTableBody');
    if (!tbody) return;

    try {
      const url = '/api/op/history' + (query ? '?q=' + encodeURIComponent(query) : '');
      const res = await Api.get(url);
      if (res.ok && res.data) {
        opHistoryRawList = res.data;
        if (!opHistoryPagination) {
          opHistoryPagination = createHistoryPaginationController({
            defaultPageSize: 10,
            onPageChange: (pagedItems) => {
              renderOpHistoryTableRows(pagedItems);
              const mount = document.getElementById('opHistoryPaginationMount');
              if (mount) {
                mount.innerHTML = opHistoryPagination.renderControlsHtml('opHistory');
                opHistoryPagination.bindEvents('opHistory');
              }
            }
          });
        }
        const paged = opHistoryPagination.setItems(opHistoryRawList, true);
        renderOpHistoryTableRows(paged);
        const mount = document.getElementById('opHistoryPaginationMount');
        if (mount) {
          mount.innerHTML = opHistoryPagination.renderControlsHtml('opHistory');
          opHistoryPagination.bindEvents('opHistory');
        }
      } else {
        renderOpHistoryTableRows([]);
        const mount = document.getElementById('opHistoryPaginationMount');
        if (mount) mount.innerHTML = '';
      }
    } catch (err) {
      console.error('Error fetching OP history:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-danger);">
            Failed to load OP registrations from MySQL. Please check server connection.
          </td>
        </tr>
      `;
    }
  }

  // ====================================================================
  // OP DETAILS MODAL
  // ====================================================================
  async function showOpDetailsModal(id) {
    const modalHost = document.getElementById('opModalHost');
    if (!modalHost) return;

    try {
      const res = await Api.get('/api/op/' + id);
      if (!res.ok || !res.data) {
        alert('Failed to retrieve OP record details.');
        return;
      }
      const op = res.data;

      modalHost.innerHTML = `
        <div class="cv-op-modal-backdrop" id="opDetailsModalBackdrop">
          <div class="cv-op-modal-box">
            <div class="cv-op-modal-header">
              <div class="cv-op-modal-title">
                Outpatient Details &bull; <span style="color:var(--cv-primary);">${escapeHtml(op.opId)}</span>
              </div>
              <button type="button" class="cv-btn-secondary" id="btnCloseOpDetails" style="padding:0.3rem 0.6rem; font-size:1rem;">&times;</button>
            </div>
            <div class="cv-op-modal-body">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid var(--cv-border-light); padding-bottom:0.75rem;">
                <div>
                  <h3 style="font-size:1.15rem; color:var(--cv-deep-blue); font-weight:700;">${escapeHtml(op.patientName || 'Patient')}</h3>
                  <div style="font-size:0.82rem; color:var(--cv-text-muted);">UHID: <strong>${escapeHtml(op.uhid || 'N/A')}</strong> &bull; Age/Gender: ${op.age || 'N/A'} Yrs / ${escapeHtml(op.gender || 'N/A')}</div>
                </div>
                <span class="cv-metric-badge" style="background:#ecfdf5; color:#059669; font-size:0.82rem; padding:0.3rem 0.75rem;">
                  ${escapeHtml(op.status || 'REGISTERED')}
                </span>
              </div>

              <div class="cv-receipt-grid">
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Phone Number</span>
                  <span class="cv-receipt-val">${escapeHtml(op.phone || 'N/A')}</span>
                </div>
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Email ID</span>
                  <span class="cv-receipt-val">${escapeHtml(op.email || 'N/A')}</span>
                </div>
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Attending Doctor</span>
                  <span class="cv-receipt-val">Dr. ${escapeHtml(op.doctorName)}</span>
                </div>
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Department</span>
                  <span class="cv-receipt-val">${escapeHtml(op.department || 'General')}</span>
                </div>
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Registration Date</span>
                  <span class="cv-receipt-val">${escapeHtml(op.visitDate)}</span>
                </div>
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Registration Time</span>
                  <span class="cv-receipt-val">${escapeHtml(op.registrationTime || 'N/A')}</span>
                </div>
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Payment Mode</span>
                  <span class="cv-receipt-val">${escapeHtml(op.paymentMethod || 'CASH')}</span>
                </div>
                <div class="cv-receipt-item">
                  <span class="cv-receipt-label">Payment Status</span>
                  <span class="cv-receipt-val" style="color:#059669;">${escapeHtml(op.paymentStatus || 'PAID')}</span>
                </div>
              </div>

              <div style="margin-top:0.5rem; font-size:0.86rem; background:var(--cv-bg); padding:0.75rem 1rem; border-radius:var(--cv-radius-md); border:1px solid var(--cv-border);">
                <span class="cv-receipt-label">Address</span>
                <p style="margin-top:0.25rem; color:var(--cv-text-primary);">${escapeHtml(op.address || 'No residential address recorded.')}</p>
              </div>

              <div class="cv-receipt-fee-box" style="margin-top:1.25rem;">
                <span class="cv-receipt-fee-label">Consultation Fee</span>
                <span class="cv-receipt-fee-amount">&#8377;${formatCurrency(op.consultationFee)}</span>
              </div>
            </div>
            <div class="cv-op-modal-footer">
              <button type="button" class="cv-btn-secondary" id="btnCloseDetailsModal">Close</button>
              <button type="button" class="cv-btn-primary" id="btnReceiptFromDetails">
                Print OP Receipt
              </button>
            </div>
          </div>
        </div>
      `;

      const close = () => { modalHost.innerHTML = ''; };
      document.getElementById('btnCloseOpDetails')?.addEventListener('click', close);
      document.getElementById('btnCloseDetailsModal')?.addEventListener('click', close);
      document.getElementById('btnReceiptFromDetails')?.addEventListener('click', () => {
        showOpReceiptModal(id);
      });
    } catch (e) {
      console.error(e);
      alert('Error fetching OP details.');
    }
  }

  // ====================================================================
  // PRINT OP RECEIPT MODAL
  // ====================================================================
  async function showOpReceiptModal(id) {
    const modalHost = document.getElementById('opModalHost');
    if (!modalHost) return;

    try {
      const res = await Api.get('/api/op/' + id + '/receipt');
      if (!res.ok || !res.data) {
        alert('Failed to retrieve OP receipt data.');
        return;
      }
      const r = res.data;

      modalHost.innerHTML = `
        <div class="cv-op-modal-backdrop" id="opReceiptModalBackdrop">
          <div class="cv-op-modal-box" style="max-width:620px;">
            <div class="cv-op-modal-header">
              <div class="cv-op-modal-title">Outpatient Registration Receipt</div>
              <button type="button" class="cv-btn-secondary" id="btnCloseReceiptX" style="padding:0.3rem 0.6rem; font-size:1rem;">&times;</button>
            </div>
            <div class="cv-op-modal-body">
              <div class="cv-receipt-sheet cv-receipt-printable">
                <div class="cv-receipt-header">
                  <div class="cv-receipt-brand">${escapeHtml(r.appBrand)}</div>
                  <div class="cv-receipt-hosp-name">${escapeHtml(r.hospitalName || 'Hospital Center')}</div>
                  <div class="cv-receipt-hosp-sub">
                    ${escapeHtml(r.hospitalAddress || 'Clinical Health District')} &bull; Tel: ${escapeHtml(r.hospitalPhone || '+1 800-555-0101')}
                  </div>
                  <div>
                    <span class="cv-receipt-title-badge">OUTPATIENT (OP) RECEIPT</span>
                  </div>
                </div>

                <div class="cv-receipt-grid">
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Receipt Number</span>
                    <span class="cv-receipt-val" style="font-family:monospace;">${escapeHtml(r.receiptNumber)}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">OP Registration ID</span>
                    <span class="cv-receipt-val" style="font-family:monospace; color:var(--cv-primary);">${escapeHtml(r.opId)}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Patient UHID</span>
                    <span class="cv-receipt-val" style="font-family:monospace;">${escapeHtml(r.uhid || 'N/A')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Date & Time</span>
                    <span class="cv-receipt-val">${escapeHtml(r.visitDate)} ${escapeHtml(r.registrationTime || '')}</span>
                  </div>
                </div>

                <div class="cv-receipt-divider"></div>

                <div class="cv-receipt-grid">
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Patient Name</span>
                    <span class="cv-receipt-val">${escapeHtml(r.patientName)}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Age / Gender</span>
                    <span class="cv-receipt-val">${r.age || 'N/A'} Yrs / ${escapeHtml(r.gender || 'N/A')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Contact Phone</span>
                    <span class="cv-receipt-val">${escapeHtml(r.phone || 'N/A')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Attending Doctor</span>
                    <span class="cv-receipt-val">Dr. ${escapeHtml(r.doctorName)}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Department</span>
                    <span class="cv-receipt-val">${escapeHtml(r.department || 'General Medicine')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Consultation Room</span>
                    <span class="cv-receipt-val">${escapeHtml(r.roomNumber || 'OPD Desk')}</span>
                  </div>
                </div>

                <div class="cv-receipt-fee-box">
                  <div>
                    <div class="cv-receipt-fee-label">Consultation Fee Paid</div>
                    <div style="font-size:0.75rem; color:var(--cv-text-muted);">
                      Method: <strong>${escapeHtml(r.paymentMethod || 'CASH')}</strong> &bull; Status: <strong style="color:#059669;">${escapeHtml(r.paymentStatus || 'PAID')}</strong>
                    </div>
                  </div>
                  <div class="cv-receipt-fee-amount">&#8377;${formatCurrency(r.consultationFee)}</div>
                </div>

                <div class="cv-receipt-footer">
                  <p>This is a computer-generated clinical outpatient receipt verified by MySQL persistence.</p>
                  <p style="margin-top:0.3rem;">Please carry this slip when consulting the physician at ${escapeHtml(r.roomNumber || 'OPD')}.</p>
                </div>
              </div>
            </div>
            <div class="cv-op-modal-footer">
              <button type="button" class="cv-btn-secondary" id="btnCloseReceiptBtn">Close</button>
              <button type="button" class="cv-btn-primary" id="btnPrintReceiptAction" style="display:flex; align-items:center; gap:0.4rem;">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                Print OP Receipt
              </button>
            </div>
          </div>
        </div>
      `;

      const close = () => { modalHost.innerHTML = ''; };
      document.getElementById('btnCloseReceiptX')?.addEventListener('click', close);
      document.getElementById('btnCloseReceiptBtn')?.addEventListener('click', close);
      document.getElementById('btnPrintReceiptAction')?.addEventListener('click', () => {
        window.print();
      });
    } catch (e) {
      console.error(e);
      alert('Error loading receipt.');
    }
  }

  // ====================================================================
  // INPATIENT (IP) MANAGEMENT & ROOM / BED MANAGEMENT MODULE
  // ====================================================================
  let ipClockInterval = null;
  let ipSearchDebounce = null;
  let ipLoadedPatient = null;
  let ipAvailableDoctors = [];
  let ipRoomsList = [];
  let ipSelectedRoom = null;
  let ipSelectedBed = null;
  let ipCurrentInpatientsList = [];
  let ipHistoryList = [];
  let ipActiveRoomCategoryFilter = 'ALL';
  let ipActiveRoomStatusFilter = 'ALL';
  let ipRoomSearchQuery = '';

  function renderIpModule(activeTab = 'admission') {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    if (ipClockInterval) {
      clearInterval(ipClockInterval);
      ipClockInterval = null;
    }

    const hospName = escapeHtml(currentUser?.hospitalName || 'Hospital Center');

    mainContent.innerHTML = `
      <div class="cv-ip-wrapper">
        <div class="cv-page-header">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            ${renderBackArrowHtml('Back')}
            <div>
              <h1 class="cv-page-title">Inpatient (IP) Management &amp; Rooms</h1>
              <p class="cv-page-subtitle">Hospital: <strong>${hospName}</strong> &bull; Tenant Operations &bull; Inpatient Admissions &amp; Bed Desk</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <button type="button" class="cv-btn-secondary" id="btnIpBackDashboard" style="padding:0.5rem 0.85rem; font-size:0.82rem;">
              &larr; Back to Dashboard
            </button>
          </div>
        </div>

        <!-- Sub-Navigation Tabs (Section 2) -->
        <div class="cv-ip-tabs">
          <button type="button" class="cv-ip-tab-btn ${activeTab === 'admission' ? 'active' : ''}" id="tabBtnIpAdmission">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            1. New IP Admission
          </button>
          <button type="button" class="cv-ip-tab-btn ${activeTab === 'inpatients' ? 'active' : ''}" id="tabBtnIpCurrent">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            2. Current Inpatients
          </button>
          <button type="button" class="cv-ip-tab-btn ${activeTab === 'history' ? 'active' : ''}" id="tabBtnIpHistory">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            3. IP History
          </button>
          <button type="button" class="cv-ip-tab-btn ${activeTab === 'rooms' ? 'active' : ''}" id="tabBtnIpRooms">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            4. Rooms &amp; Beds
          </button>
        </div>

        <!-- Container for active tab -->
        <div id="ipTabContent"></div>
      </div>

      <!-- Modal Mount Container -->
      <div id="ipModalHost"></div>
    `;

    document.getElementById('btnIpBackDashboard')?.addEventListener('click', () => {
      if (ipClockInterval) clearInterval(ipClockInterval);
      navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
    });

    document.getElementById('tabBtnIpAdmission')?.addEventListener('click', () => {
      switchIpTab('admission', true);
    });

    document.getElementById('tabBtnIpCurrent')?.addEventListener('click', () => {
      switchIpTab('inpatients', true);
    });

    document.getElementById('tabBtnIpHistory')?.addEventListener('click', () => {
      switchIpTab('history', true);
    });

    document.getElementById('tabBtnIpRooms')?.addEventListener('click', () => {
      switchIpTab('rooms', true);
    });

    switchIpTab(activeTab, false);
  }

  function executeIpTab(tab) {
    const tabContent = document.getElementById('ipTabContent');
    if (!tabContent) {
      renderIpModule(tab);
      return;
    }
    document.querySelectorAll('.cv-ip-tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'admission') {
      document.getElementById('tabBtnIpAdmission')?.classList.add('active');
      renderIpAdmissionTab();
    } else if (tab === 'inpatients') {
      document.getElementById('tabBtnIpCurrent')?.classList.add('active');
      renderIpCurrentInpatientsTab();
    } else if (tab === 'history') {
      document.getElementById('tabBtnIpHistory')?.classList.add('active');
      renderIpHistoryTab();
    } else if (tab === 'rooms') {
      document.getElementById('tabBtnIpRooms')?.classList.add('active');
      renderIpRoomsTab();
    }
  }

  function switchIpTab(tab, recordHistory = true) {
    if (recordHistory) {
      navigateTo('ip', tab, () => executeIpTab(tab), true);
    } else {
      executeIpTab(tab);
    }
  }

  function startIpClock() {
    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      const timeInput = document.getElementById('ipAdmissionTimeInput');
      if (timeInput && !timeInput.dataset.fixed) {
        timeInput.value = timeStr;
      }
    }
    updateClock();
    if (ipClockInterval) clearInterval(ipClockInterval);
    ipClockInterval = setInterval(updateClock, 1000);
  }

  // ====================================================================
  // SUB-TAB 1: NEW IP ADMISSION
  // ====================================================================
  function renderIpAdmissionTab() {
    const tabContent = document.getElementById('ipTabContent');
    if (!tabContent) return;

    ipLoadedPatient = null;
    ipSelectedRoom = null;
    ipSelectedBed = null;
    const now = new Date();
    const todayFormatted = formatDDMMYYYY(now);
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    tabContent.innerHTML = `
      <!-- Prominent Patient Search Box (Section 3 & 4) -->
      <div class="cv-patient-search-card">
        <div class="cv-patient-search-title">
          <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          Search Existing Patient (Auto-Fill Admission Form)
          <span style="font-size:0.75rem; font-weight:400; color:var(--cv-text-muted); margin-left:auto;">Search by Patient Name, Phone Number, UHID, or OP ID</span>
        </div>
        <div class="cv-patient-search-input-wrap">
          <svg class="cv-patient-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" id="ipPatientSearchInput" class="cv-patient-search-input" placeholder="Search by Patient Name, Phone Number, UHID, or OP ID" autocomplete="off">
          <button type="button" id="btnClearIpSearch" class="cv-patient-search-clear">&times;</button>
        </div>
        <div id="ipSearchResultsDropdown" class="cv-patient-results-dropdown"></div>

        <div id="ipPatientFoundBanner" style="display:none;" class="cv-patient-found-chip">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
            <span id="ipFoundBannerText">Existing Patient Record Retrieved from MySQL</span>
          </div>
          <button type="button" id="btnClearLoadedIpPatient" class="cv-btn-secondary" style="padding:0.25rem 0.65rem; font-size:0.75rem; background:#ffffff;">
            Clear / Register New Patient
          </button>
        </div>
      </div>

      <!-- Alert Box -->
      <div id="ipFormAlert" class="cv-alert" style="display:none; margin-top:1rem;"></div>

      <!-- IP Admission Form (Section 5) -->
      <form id="ipAdmissionForm" style="margin-top:1rem;" novalidate>
        <div class="cv-op-form-grid">

          <!-- 1. Patient Demographics Card -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>1. Patient Demographics</span>
              <span class="cv-op-section-badge">Required</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="ipPatientName">Patient Full Name *</label>
              <input type="text" id="ipPatientName" class="cv-input" placeholder="" required>
              <span class="cv-feedback-error" id="errIpPatientName">Patient name is required.</span>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group">
                <label class="cv-form-label" for="ipPatientAge">Age (Years) *</label>
                <input type="number" id="ipPatientAge" class="cv-input" placeholder="" min="0" max="130" required>
                <span class="cv-feedback-error" id="errIpPatientAge">Please enter a valid age.</span>
              </div>
              <div class="cv-form-group">
                <label class="cv-form-label" for="ipPatientGender">Gender *</label>
                <select id="ipPatientGender" class="cv-input" required>
                  <option value="">Select Gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <span class="cv-feedback-error" id="errIpPatientGender">Please select patient gender.</span>
              </div>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group">
                <label class="cv-form-label" for="ipPatientPhone">Phone Number *</label>
                <input type="tel" id="ipPatientPhone" class="cv-input" placeholder="" required>
                <span class="cv-feedback-error" id="errIpPatientPhone">Valid phone number is required.</span>
              </div>
              <div class="cv-form-group">
                <label class="cv-form-label" for="ipPatientEmail">Email ID (Optional)</label>
                <input type="email" id="ipPatientEmail" class="cv-input" placeholder="">
              </div>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group" style="margin-bottom:0;">
                <label class="cv-form-label" for="ipPatientUhid">Patient UHID</label>
                <input type="text" id="ipPatientUhid" class="cv-input cv-op-input-readonly" readonly placeholder="Auto-linked from patient (or generated)">
              </div>
              <div class="cv-form-group" style="margin-bottom:0;">
                <label class="cv-form-label" for="ipOpId">OP ID Reference (Optional)</label>
                <input type="text" id="ipOpId" class="cv-input cv-op-input-readonly" placeholder="Loaded from OP consultation if linked">
              </div>
            </div>

            <div class="cv-form-group" style="margin-top:0.75rem; margin-bottom:0;">
              <label class="cv-form-label" for="ipAddressInput">Residential Address</label>
              <textarea id="ipAddressInput" class="cv-input" rows="2" placeholder="" style="resize:vertical;"></textarea>
            </div>
          </div>

          <!-- 2. Admission Schedule & Clinical Metadata -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>2. Admission &amp; Clinical Schedule</span>
              <span class="cv-op-section-badge" style="background:#f0fdfa; color:#0d9488;">Auto Generated</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="ipIdPreview">IP ID / Admission Number *</label>
              <input type="text" id="ipIdPreview" class="cv-input cv-op-input-readonly" readonly value="Auto-Generated on Save (e.g. IP-YYYYMMDD-XXXX)">
              <span style="font-size:0.73rem; color:var(--cv-text-muted); margin-top:0.25rem; display:block;">
                A unique, sequential IP admission ID is generated by the server and persisted in MySQL.
              </span>
            </div>

            <div class="cv-op-fields-row">
              <div class="cv-form-group">
                <label class="cv-form-label" for="ipAdmissionDateInput">Admission Date *</label>
                <input type="text" id="ipAdmissionDateInput" class="cv-input cv-op-input-readonly" readonly value="${todayFormatted}">
              </div>
              <div class="cv-form-group">
                <label class="cv-form-label" for="ipAdmissionTimeInput">Admission Time *</label>
                <input type="text" id="ipAdmissionTimeInput" class="cv-input cv-op-input-readonly" readonly value="${timeFormatted}">
              </div>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="ipReasonInput">Reason for Admission</label>
              <input type="text" id="ipReasonInput" class="cv-input" placeholder="">
            </div>

            <div class="cv-form-group" style="margin-bottom:0;">
              <label class="cv-form-label" for="ipDiagnosisInput">Diagnosis / Clinical Notes</label>
              <textarea id="ipDiagnosisInput" class="cv-input" rows="2" placeholder="" style="resize:vertical;"></textarea>
            </div>
          </div>

          <!-- 3. Doctor & Department Assignment -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>3. Attending Doctor &amp; Department</span>
              <span class="cv-op-section-badge">Availability Enforced</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="ipDoctorSelect">Attending Physician / Surgeon *</label>
              <select id="ipDoctorSelect" class="cv-input" required>
                <option value="">Loading attending doctors from MySQL...</option>
              </select>
              <span class="cv-feedback-error" id="errIpDoctor">Please select an attending doctor.</span>
              <div style="font-size:0.74rem; color:var(--cv-text-muted); margin-top:0.35rem;">
                Doctors marked <strong>AVAILABLE</strong> can be assigned. Doctors who are <em>BUSY / IN SURGERY</em> or <em>ABSENT</em> are disabled.
              </div>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="ipDepartmentInput">Department *</label>
              <input type="text" id="ipDepartmentInput" class="cv-input" placeholder="" required>
              <span class="cv-feedback-error" id="errIpDepartment">Department is required.</span>
            </div>

            <div class="cv-form-group" style="margin-bottom:0;">
              <label class="cv-form-label" for="ipAdmissionNotesInput">Admission Notes / Special Instructions</label>
              <input type="text" id="ipAdmissionNotesInput" class="cv-input" placeholder="">
            </div>
          </div>

          <!-- 4. Room & Bed Allocation with Real Pricing -->
          <div class="cv-op-section-card">
            <div class="cv-op-section-header">
              <span>4. Room &amp; Bed Allocation</span>
              <span class="cv-op-section-badge" style="background:#ecfdf5; color:#059669;">Real-Time Availability</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="ipRoomSelect">Select Room *</label>
              <select id="ipRoomSelect" class="cv-input" required>
                <option value="">-- Choose Room --</option>
              </select>
              <span class="cv-feedback-error" id="errIpRoom">Please select a room.</span>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label" for="ipBedSelect">Select Available Bed *</label>
              <select id="ipBedSelect" class="cv-input" required disabled>
                <option value="">-- Select Room First --</option>
              </select>
              <span class="cv-feedback-error" id="errIpBed">Please select an available bed.</span>
              <div style="font-size:0.73rem; color:var(--cv-text-muted); margin-top:0.25rem;">
                Only beds with status <strong>AVAILABLE</strong> are listed. Occupied, Reserved, and Maintenance beds cannot be double-booked.
              </div>
            </div>

            <!-- Dynamic Pricing Indicator Box (Section 15) -->
            <div style="background:var(--cv-bg); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); padding:0.85rem 1rem; margin-top:0.75rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.35rem;">
                <span style="color:var(--cv-text-secondary);">Room Daily Price:</span>
                <strong id="ipDisplayRoomPrice" style="color:var(--cv-deep-blue);">&#8377;0.00 / day</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.35rem;">
                <span style="color:var(--cv-text-secondary);">Bed Daily Price:</span>
                <strong id="ipDisplayBedPrice" style="color:var(--cv-deep-blue);">&#8377;0.00 / day</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.88rem; font-weight:700; border-top:1px dashed var(--cv-border); padding-top:0.35rem;">
                <span>Total Daily Hospitalization:</span>
                <strong id="ipDisplayTotalDaily" style="color:#059669;">&#8377;0.00 / day</strong>
              </div>
            </div>

            <!-- Initial Deposit & Billing Integration (Section 16 & 17) -->
            <div class="cv-op-fields-row" style="margin-top:0.85rem; margin-bottom:0;">
              <div class="cv-form-group" style="margin-bottom:0;">
                <label class="cv-form-label" for="ipDepositAmount">Initial Deposit (&#8377;)</label>
                <input type="number" id="ipDepositAmount" class="cv-input" placeholder="0.00" min="0" step="100" value="0.00">
              </div>
              <div class="cv-form-group" style="margin-bottom:0;">
                <label class="cv-form-label" for="ipPaymentMethod">Deposit Mode</label>
                <select id="ipPaymentMethod" class="cv-input">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="BANK_TRANSFER">Net Banking / NEFT</option>
                  <option value="INSURANCE">TPA / Health Insurance</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        <!-- Form Actions -->
        <div class="cv-op-actions">
          <button type="button" id="btnResetIpForm" class="cv-btn-secondary" style="padding:0.75rem 1.4rem;">
            Cancel / Reset Form
          </button>
          <button type="submit" id="btnCreateIpSubmit" class="cv-btn-primary" style="padding:0.75rem 2rem; font-size:1rem;">
            <span id="ipCreateSpinner" class="cv-spinner" style="margin-right:0.5rem; display:none;"></span>
            <span id="ipCreateBtnText">Create IP Admission</span>
          </button>
        </div>
      </form>
    `;

    setupIpPatientSearch();
    loadIpDoctors();
    loadIpRoomsDropdown();
    setupIpFormSubmission();
    startIpClock();

    document.getElementById('btnResetIpForm')?.addEventListener('click', () => {
      resetIpForm();
    });
  }

  function setupIpPatientSearch() {
    const searchInput = document.getElementById('ipPatientSearchInput');
    const dropdown = document.getElementById('ipSearchResultsDropdown');
    const clearBtn = document.getElementById('btnClearIpSearch');
    const clearLoadedBtn = document.getElementById('btnClearLoadedIpPatient');

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

      if (ipSearchDebounce) clearTimeout(ipSearchDebounce);

      if (q.length < 2) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }

      ipSearchDebounce = setTimeout(async () => {
        try {
          const res = await Api.get('/api/ip/search-patients?q=' + encodeURIComponent(q));
          if (res.ok && res.data && res.data.length > 0) {
            const sorted = sortByStartsWith(res.data, q);
            renderIpPatientSearchResults(sorted);
          } else {
            dropdown.style.display = 'block';
            dropdown.innerHTML = `
              <div style="padding:0.85rem 1rem; color:var(--cv-text-muted); font-size:0.85rem; text-align:center;">
                No existing patients found matching "<strong>${escapeHtml(q)}</strong>". Proceeding with new patient registration.
              </div>
            `;
          }
        } catch (err) {
          console.error('IP Patient search error:', err);
        }
      }, 250);
    });

    clearBtn?.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      dropdown.style.display = 'none';
    });

    clearLoadedBtn?.addEventListener('click', () => {
      resetIpForm();
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  function renderIpPatientSearchResults(patients) {
    const dropdown = document.getElementById('ipSearchResultsDropdown');
    if (!dropdown) return;

    dropdown.style.display = 'block';
    dropdown.innerHTML = patients.map((p, idx) => `
      <div class="cv-patient-result-item" data-idx="${idx}">
        <div>
          <div class="cv-patient-result-name">${escapeHtml(p.fullName)}</div>
          <div class="cv-patient-result-meta">
            ${escapeHtml(p.uhid)} &bull; ${escapeHtml(p.phone)} &bull; ${p.age || 'N/A'} Yrs / ${escapeHtml(p.gender || 'N/A')}
            ${p.lastOpId ? ` &bull; OP ID: <strong>${escapeHtml(p.lastOpId)}</strong>` : ''}
          </div>
        </div>
        <button type="button" class="cv-btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem; pointer-events:none;">
          Auto-Fill
        </button>
      </div>
    `).join('');

    dropdown.querySelectorAll('.cv-patient-result-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const patient = patients[index];
        fillIpPatientIntoForm(patient);
        dropdown.style.display = 'none';
      });
    });
  }

  function fillIpPatientIntoForm(p) {
    ipLoadedPatient = p;
    document.getElementById('ipPatientName').value = p.fullName || '';
    document.getElementById('ipPatientAge').value = p.age || '';
    document.getElementById('ipPatientGender').value = p.gender || '';
    document.getElementById('ipPatientPhone').value = p.phone || '';
    document.getElementById('ipPatientEmail').value = p.email || '';
    document.getElementById('ipPatientUhid').value = p.uhid || '';
    document.getElementById('ipOpId').value = p.lastOpId || '';
    document.getElementById('ipAddressInput').value = p.address || '';

    // Clear validation errors
    document.querySelectorAll('#ipAdmissionForm .cv-feedback-error').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('#ipAdmissionForm .cv-input').forEach(el => el.classList.remove('is-invalid'));

    const banner = document.getElementById('ipPatientFoundBanner');
    const bannerText = document.getElementById('ipFoundBannerText');
    if (banner && bannerText) {
      banner.style.display = 'flex';
      bannerText.innerHTML = `Existing Patient Record Retrieved from MySQL: <strong>${escapeHtml(p.fullName)}</strong> (UHID: <strong>${escapeHtml(p.uhid)}</strong>, Phone: <strong>${escapeHtml(p.phone)}</strong>)`;
    }

    const searchInput = document.getElementById('ipPatientSearchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('btnClearIpSearch');
    if (clearBtn) clearBtn.style.display = 'none';
  }

  function resetIpForm() {
    ipLoadedPatient = null;
    ipSelectedRoom = null;
    ipSelectedBed = null;
    const form = document.getElementById('ipAdmissionForm');
    if (form) form.reset();

    const banner = document.getElementById('ipPatientFoundBanner');
    if (banner) banner.style.display = 'none';

    document.getElementById('ipPatientUhid').value = '';
    document.getElementById('ipOpId').value = '';
    document.getElementById('ipDepartmentInput').value = '';
    document.getElementById('ipDepositAmount').value = '0.00';
    document.getElementById('ipDisplayRoomPrice').innerHTML = '&#8377;0.00 / day';
    document.getElementById('ipDisplayBedPrice').innerHTML = '&#8377;0.00 / day';
    document.getElementById('ipDisplayTotalDaily').innerHTML = '&#8377;0.00 / day';

    const bedSelect = document.getElementById('ipBedSelect');
    if (bedSelect) {
      bedSelect.innerHTML = '<option value="">-- Select Room First --</option>';
      bedSelect.disabled = true;
    }

    const now = new Date();
    document.getElementById('ipAdmissionDateInput').value = formatDDMMYYYY(now);
    document.getElementById('ipAdmissionTimeInput').value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    document.querySelectorAll('#ipAdmissionForm .cv-feedback-error').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('#ipAdmissionForm .cv-input').forEach(el => el.classList.remove('is-invalid'));

    const alertBox = document.getElementById('ipFormAlert');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }
  }

  async function loadIpDoctors() {
    const docSelect = document.getElementById('ipDoctorSelect');
    if (!docSelect) return;

    try {
      const res = await Api.get('/api/op/all-doctors');
      if (res.ok && res.data && res.data.length > 0) {
        ipAvailableDoctors = res.data;
        docSelect.innerHTML = `
          <option value="">-- Select Attending Doctor (Available Only) --</option>
          ${res.data.map(doc => {
            const isAvail = (doc.status === 'AVAILABLE');
            const statusLabel = doc.status.replace('_', ' ');
            if (isAvail) {
              return `<option value="${escapeHtml(doc.name)}" data-dept="${escapeHtml(doc.department)}">
                Dr. ${escapeHtml(doc.name)} &bull; ${escapeHtml(doc.department)} [AVAILABLE]
              </option>`;
            } else {
              return `<option value="${escapeHtml(doc.name)}" disabled style="color:#94a3b8; background:#f8fafc; font-style:italic;">
                Dr. ${escapeHtml(doc.name)} &bull; ${escapeHtml(doc.department)} &bull; [${statusLabel}] UNAVAILABLE
              </option>`;
            }
          }).join('')}
        `;

        docSelect.addEventListener('change', () => {
          const opt = docSelect.options[docSelect.selectedIndex];
          if (opt && opt.value) {
            const dept = opt.dataset.dept || '';
            const deptInput = document.getElementById('ipDepartmentInput');
            if (deptInput && dept) deptInput.value = dept;
          }
        });
      } else {
        docSelect.innerHTML = '<option value="">No doctors found in system.</option>';
      }
    } catch (e) {
      console.error('Error loading doctors:', e);
      docSelect.innerHTML = '<option value="">Failed to load doctors.</option>';
    }
  }

  async function loadIpRoomsDropdown() {
    const roomSelect = document.getElementById('ipRoomSelect');
    if (!roomSelect) return;

    try {
      const res = await Api.get('/api/ip/rooms');
      if (res.ok && res.data) {
        ipRoomsList = res.data;
        roomSelect.innerHTML = `
          <option value="">-- Choose Room / Ward --</option>
          ${res.data.map(r => {
            const availCount = r.availableBedsCount || 0;
            const typeLabel = r.roomType ? r.roomType.replace('_', ' ') : 'General';
            return `<option value="${r.id}" data-price="${r.dailyPrice || 0}">
              Room ${escapeHtml(r.roomNumber)} &bull; ${escapeHtml(typeLabel)} &bull; Available Beds: ${availCount} / ${r.totalBedsCount}
            </option>`;
          }).join('')}
        `;

        roomSelect.addEventListener('change', () => {
          const roomId = roomSelect.value;
          onIpRoomSelectionChanged(roomId);
        });
      }
    } catch (e) {
      console.error('Error loading rooms:', e);
      roomSelect.innerHTML = '<option value="">Failed to load rooms.</option>';
    }
  }

  async function onIpRoomSelectionChanged(roomId) {
    const bedSelect = document.getElementById('ipBedSelect');
    const displayRoomPrice = document.getElementById('ipDisplayRoomPrice');
    const displayBedPrice = document.getElementById('ipDisplayBedPrice');
    const displayTotalDaily = document.getElementById('ipDisplayTotalDaily');
    if (!bedSelect) return;

    if (!roomId) {
      bedSelect.innerHTML = '<option value="">-- Select Room First --</option>';
      bedSelect.disabled = true;
      if (displayRoomPrice) displayRoomPrice.innerHTML = '&#8377;0.00 / day';
      if (displayBedPrice) displayBedPrice.innerHTML = '&#8377;0.00 / day';
      if (displayTotalDaily) displayTotalDaily.innerHTML = '&#8377;0.00 / day';
      ipSelectedRoom = null;
      ipSelectedBed = null;
      return;
    }

    const room = ipRoomsList.find(r => String(r.id) === String(roomId));
    ipSelectedRoom = room || null;
    const roomPrice = room ? Number(room.dailyPrice || 0) : 0;
    if (displayRoomPrice) displayRoomPrice.innerHTML = `&#8377;${formatCurrency(roomPrice)} / day`;

    bedSelect.disabled = true;
    bedSelect.innerHTML = '<option value="">Loading available beds from MySQL...</option>';

    try {
      const res = await Api.get(`/api/ip/rooms/${roomId}/available-beds`);
      if (res.ok && res.data && res.data.length > 0) {
        bedSelect.innerHTML = `
          <option value="">-- Select Bed (${res.data.length} Available) --</option>
          ${res.data.map(b => `
            <option value="${b.id}" data-price="${b.dailyPrice || 0}">
              Bed ${escapeHtml(b.bedNumber)} &bull; Price: &#8377;${formatCurrency(b.dailyPrice)}/day [AVAILABLE]
            </option>
          `).join('')}
        `;
        bedSelect.disabled = false;
      } else {
        bedSelect.innerHTML = '<option value="">No Available Beds in this Room (Full)</option>';
        bedSelect.disabled = true;
      }
    } catch (e) {
      console.error(e);
      bedSelect.innerHTML = '<option value="">Error loading available beds</option>';
    }

    bedSelect.onchange = () => {
      const opt = bedSelect.options[bedSelect.selectedIndex];
      const bedPrice = (opt && opt.dataset.price) ? Number(opt.dataset.price) : 0;
      ipSelectedBed = opt && opt.value ? { id: opt.value, price: bedPrice } : null;
      if (displayBedPrice) displayBedPrice.innerHTML = `&#8377;${formatCurrency(bedPrice)} / day`;
      if (displayTotalDaily) displayTotalDaily.innerHTML = `&#8377;${formatCurrency(roomPrice + bedPrice)} / day`;
    };
  }

  function setupIpFormSubmission() {
    const form = document.getElementById('ipAdmissionForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Reset errors
      document.querySelectorAll('#ipAdmissionForm .cv-feedback-error').forEach(el => el.classList.remove('show'));
      document.querySelectorAll('#ipAdmissionForm .cv-input').forEach(el => el.classList.remove('is-invalid'));
      const alertBox = document.getElementById('ipFormAlert');
      if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
      }

      let hasError = false;

      const patientName = document.getElementById('ipPatientName')?.value.trim();
      const ageStr = document.getElementById('ipPatientAge')?.value.trim();
      const gender = document.getElementById('ipPatientGender')?.value;
      const phone = document.getElementById('ipPatientPhone')?.value.trim();
      const email = document.getElementById('ipPatientEmail')?.value.trim();
      const address = document.getElementById('ipAddressInput')?.value.trim();
      const existingUhid = document.getElementById('ipPatientUhid')?.value.trim();
      const opId = document.getElementById('ipOpId')?.value.trim();

      const doctorName = document.getElementById('ipDoctorSelect')?.value;
      const department = document.getElementById('ipDepartmentInput')?.value.trim();
      const reasonForAdmission = document.getElementById('ipReasonInput')?.value.trim();
      const diagnosis = document.getElementById('ipDiagnosisInput')?.value.trim();
      const admissionNotes = document.getElementById('ipAdmissionNotesInput')?.value.trim();

      const roomId = document.getElementById('ipRoomSelect')?.value;
      const bedId = document.getElementById('ipBedSelect')?.value;

      const depositAmountStr = document.getElementById('ipDepositAmount')?.value.trim();
      const depositAmount = depositAmountStr ? parseFloat(depositAmountStr) : 0.0;
      const paymentMethod = document.getElementById('ipPaymentMethod')?.value || 'CASH';

      // Validation
      if (!patientName) {
        showIpFieldError('errIpPatientName', 'ipPatientName');
        hasError = true;
      }

      const age = parseInt(ageStr, 10);
      if (isNaN(age) || age < 0 || age > 130) {
        showIpFieldError('errIpPatientAge', 'ipPatientAge');
        hasError = true;
      }

      if (!gender) {
        showIpFieldError('errIpPatientGender', 'ipPatientGender');
        hasError = true;
      }

      if (!phone || phone.length < 5) {
        showIpFieldError('errIpPatientPhone', 'ipPatientPhone');
        hasError = true;
      }

      if (!doctorName) {
        showIpFieldError('errIpDoctor', 'ipDoctorSelect');
        hasError = true;
      }

      if (!department) {
        showIpFieldError('errIpDepartment', 'ipDepartmentInput');
        hasError = true;
      }

      if (!roomId) {
        showIpFieldError('errIpRoom', 'ipRoomSelect');
        hasError = true;
      }

      if (!bedId) {
        showIpFieldError('errIpBed', 'ipBedSelect');
        hasError = true;
      }

      if (hasError) {
        if (alertBox) {
          alertBox.className = 'cv-alert cv-alert-danger';
          alertBox.style.display = 'block';
          alertBox.textContent = 'Please fill all mandatory fields marked with an asterisk (*).';
        }
        return;
      }

      // Submit via API
      const spinner = document.getElementById('ipCreateSpinner');
      const btnText = document.getElementById('ipCreateBtnText');
      const submitBtn = document.getElementById('btnCreateIpSubmit');

      if (spinner) spinner.style.display = 'inline-block';
      if (btnText) btnText.textContent = 'Processing Admission...';
      if (submitBtn) submitBtn.disabled = true;

      const payload = {
        patientName,
        age,
        gender,
        phone,
        email: email || null,
        address: address || null,
        existingUhid: existingUhid || null,
        opId: opId || null,
        doctorName,
        department,
        reasonForAdmission: reasonForAdmission || null,
        diagnosis: diagnosis || null,
        admissionNotes: admissionNotes || null,
        roomId: parseInt(roomId, 10),
        bedId: parseInt(bedId, 10),
        depositAmount,
        paymentMethod,
        paymentStatus: depositAmount > 0 ? 'PAID' : 'UNPAID'
      };

      try {
        const res = await Api.post('/api/ip/admissions/create', payload);

        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.textContent = 'Create IP Admission';
        if (submitBtn) submitBtn.disabled = false;

        if (res.ok && res.data) {
          const adm = res.data;
          alert(`IP admission created successfully.\n\nAdmission Number: ${adm.ipId}\nPatient: ${adm.patientName} (UHID: ${adm.uhid})\nBed: ${adm.bedNumber} (Room: ${adm.roomNumber})\nStatus: OCCUPIED`);
          resetIpForm();
          switchIpTab('inpatients');
        } else {
          const errMsg = res.message || 'Failed to create IP admission. The selected bed may have been reserved by another user.';
          if (alertBox) {
            alertBox.className = 'cv-alert cv-alert-danger';
            alertBox.style.display = 'block';
            alertBox.innerHTML = `<strong>Admission Error:</strong> ${escapeHtml(errMsg)}`;
          }
        }
      } catch (err) {
        console.error('Admission submit error:', err);
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.textContent = 'Create IP Admission';
        if (submitBtn) submitBtn.disabled = false;

        if (alertBox) {
          alertBox.className = 'cv-alert cv-alert-danger';
          alertBox.style.display = 'block';
          alertBox.textContent = 'Server communication error while saving IP admission.';
        }
      }
    });
  }

  function showIpFieldError(errorElId, inputElId) {
    const err = document.getElementById(errorElId);
    const inp = document.getElementById(inputElId);
    if (err) err.classList.add('show');
    if (inp) inp.classList.add('is-invalid');
  }

  // ====================================================================
  // SUB-TAB 2: CURRENT INPATIENTS
  // ====================================================================
  async function renderIpCurrentInpatientsTab() {
    const tabContent = document.getElementById('ipTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = `
      <div style="background:var(--cv-surface); border:1px solid var(--cv-border); border-radius:var(--cv-radius-lg); padding:1.25rem; box-shadow:var(--cv-shadow-xs);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap:0.6rem; flex:1; min-width:280px; max-width:480px;">
            <div class="cv-patient-search-input-wrap" style="width:100%;">
              <svg class="cv-patient-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" id="ipInpatientsSearchInput" class="cv-patient-search-input" placeholder="Search inpatients by Name, UHID, IP ID, Doctor, Room, Bed...">
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button type="button" class="cv-btn-secondary" id="btnRefreshInpatients" style="padding:0.45rem 0.85rem; font-size:0.82rem;">
              <svg style="width:14px; height:14px; margin-right:0.35rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh
            </button>
            <button type="button" class="cv-btn-primary" id="btnNewAdmissionFromCurrent" style="padding:0.45rem 0.85rem; font-size:0.82rem;">
              + New Admission
            </button>
          </div>
        </div>

        <div class="cv-table-wrapper" style="overflow-x:auto;">
          <table class="cv-table" id="ipInpatientsTable">
            <thead>
              <tr>
                <th>IP ID</th>
                <th>Patient Details</th>
                <th>Doctor &amp; Dept</th>
                <th>Room &amp; Bed</th>
                <th>Admission Date &amp; Time</th>
                <th>Daily Rate</th>
                <th>Deposit / Payment</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody id="ipInpatientsTableBody">
              <tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">Loading active inpatients from MySQL...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btnRefreshInpatients')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnRefreshInpatients');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:4px;"></span> Refreshing...';
      }
      try {
        await loadCurrentInpatients(searchInput ? searchInput.value.trim() : '');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg style="width:14px; height:14px; margin-right:0.35rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Refresh';
        }
      }
    });
    document.getElementById('btnNewAdmissionFromCurrent')?.addEventListener('click', () => switchIpTab('admission'));

    const searchInput = document.getElementById('ipInpatientsSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        filterInpatientsTable(q);
      });
    }

    loadCurrentInpatients();
  }

  async function loadCurrentInpatients(search = '') {
    const tbody = document.getElementById('ipInpatientsTableBody');
    if (!tbody) return;

    try {
      const res = await Api.get('/api/ip/admissions/current?search=' + encodeURIComponent(search));
      if (res.ok && res.data) {
        ipCurrentInpatientsList = res.data;
        renderInpatientsRows(res.data);
      } else {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">Failed to load inpatients.</td></tr>';
      }
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#dc2626;">Error retrieving inpatients from server.</td></tr>';
    }
  }

  function filterInpatientsTable(query) {
    if (!query) {
      renderInpatientsRows(ipCurrentInpatientsList);
      return;
    }
    const filtered = ipCurrentInpatientsList.filter(adm => {
      const name = (adm.patientName || '').toLowerCase();
      const uhid = (adm.uhid || '').toLowerCase();
      const ipId = (adm.ipId || '').toLowerCase();
      const doc = (adm.doctorName || '').toLowerCase();
      const room = (adm.roomNumber || '').toLowerCase();
      const bed = (adm.bedNumber || '').toLowerCase();
      const dept = (adm.department || '').toLowerCase();
      return name.includes(query) || uhid.includes(query) || ipId.includes(query) ||
             doc.includes(query) || room.includes(query) || bed.includes(query) || dept.includes(query);
    });
    renderInpatientsRows(filtered);
  }

  function renderInpatientsRows(list) {
    const tbody = document.getElementById('ipInpatientsTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:3rem 1rem; color:var(--cv-text-muted);">
            <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.35rem;">No Active Inpatients</div>
            <div style="font-size:0.85rem;">There are currently no patients admitted in the hospital wards.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(adm => {
      const totalDaily = (Number(adm.roomPrice || 0) + Number(adm.bedPrice || 0));
      const payStatusClass = (adm.paymentStatus === 'PAID') ? 'color:#059669; font-weight:700;' : 'color:#d97706;';

      return `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cv-primary);">${escapeHtml(adm.ipId)}</td>
          <td>
            <div style="font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(adm.patientName)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">
              ${escapeHtml(adm.uhid || 'N/A')} &bull; ${adm.age || 'N/A'} Yrs / ${escapeHtml(adm.gender || 'N/A')}
              ${adm.opId ? ` &bull; OP: ${escapeHtml(adm.opId)}` : ''}
            </div>
          </td>
          <td>
            <div style="font-weight:600;">Dr. ${escapeHtml(adm.doctorName)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(adm.department || 'General')}</div>
          </td>
          <td>
            <div style="font-weight:700;">Room ${escapeHtml(adm.roomNumber)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(adm.roomType ? adm.roomType.replace('_', ' ') : 'Ward')} &bull; Bed: <strong>${escapeHtml(adm.bedNumber)}</strong></div>
          </td>
          <td>
            <div>${escapeHtml(adm.admissionDate)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(adm.admissionTime || '')}</div>
          </td>
          <td>
            <div style="font-weight:600;">&#8377;${formatCurrency(totalDaily)}/day</div>
            <div style="font-size:0.72rem; color:var(--cv-text-muted);">(Room: &#8377;${formatCurrency(adm.roomPrice)} + Bed: &#8377;${formatCurrency(adm.bedPrice)})</div>
          </td>
          <td>
            <div>&#8377;${formatCurrency(adm.depositAmount || 0)}</div>
            <div style="font-size:0.75rem; ${payStatusClass}">${escapeHtml(adm.paymentStatus || 'UNPAID')} (${escapeHtml(adm.paymentMethod || 'CASH')})</div>
          </td>
          <td>
            <span class="cv-ip-badge-admitted">
              <span style="width:6px; height:6px; border-radius:50%; background:#2563eb;"></span>
              ADMITTED
            </span>
          </td>
          <td style="text-align:right;">
            <div style="display:inline-flex; align-items:center; gap:0.4rem;">
              ${adm.paymentStatus !== 'PAID' ? `
                <button type="button" class="cv-btn-primary" onclick="Admin.showBedPaymentModal(null, ${adm.id})" style="padding:0.35rem 0.65rem; font-size:0.78rem; background:#0284c7; border-color:#0284c7;" title="Collect Payment for this Inpatient">
                  Pay Due
                </button>
              ` : ''}
              <button type="button" class="cv-btn-secondary" onclick="Admin.showIpDetailsModal(${adm.id})" style="padding:0.35rem 0.65rem; font-size:0.78rem;" title="View Clinical &amp; Admission Details">
                View
              </button>
              <button type="button" class="cv-btn-primary" onclick="Admin.showDischargeModal(${adm.id})" style="padding:0.35rem 0.65rem; font-size:0.78rem; background:#dc2626; border-color:#dc2626;" title="Discharge Patient and Release Bed">
                Discharge
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ====================================================================
  // SUB-TAB 3: IP HISTORY
  // ====================================================================
  let ipHistoryPagination = null;

  async function renderIpHistoryTab() {
    const tabContent = document.getElementById('ipTabContent');
    if (!tabContent) return;

    if (!ipHistoryPagination) {
      ipHistoryPagination = createHistoryPaginationController({
        defaultPageSize: 10,
        onPageChange: (pagedItems) => {
          renderHistoryRows(pagedItems);
          const mount = document.getElementById('ipHistoryPaginationMount');
          if (mount) {
            mount.innerHTML = ipHistoryPagination.renderControlsHtml('ipHistory');
            ipHistoryPagination.bindEvents('ipHistory');
          }
        }
      });
    }

    tabContent.innerHTML = `
      <div style="background:var(--cv-surface); border:1px solid var(--cv-border); border-radius:var(--cv-radius-lg); padding:1.25rem; box-shadow:var(--cv-shadow-xs);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap:0.6rem; flex:1; min-width:280px; max-width:480px;">
            <div class="cv-patient-search-input-wrap" style="width:100%;">
              <svg class="cv-patient-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" id="ipHistorySearchInput" class="cv-patient-search-input" placeholder="Search history by Patient Name, UHID, OP ID, IP ID, Phone...">
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <select id="ipHistoryStatusFilter" class="cv-input" style="width:auto; padding:0.45rem 0.85rem; font-size:0.82rem;">
              <option value="ALL">All Admissions</option>
              <option value="ADMITTED">Currently Admitted</option>
              <option value="DISCHARGED">Discharged Patients</option>
            </select>
            <button type="button" class="cv-btn-secondary" id="btnRefreshHistory" style="padding:0.45rem 0.85rem; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.35rem;">
              <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh
            </button>
          </div>
        </div>

        <div class="cv-table-wrapper" style="overflow-x:auto;">
          <table class="cv-table" id="ipHistoryTable">
            <thead>
              <tr>
                <th>IP ID</th>
                <th>Patient Details</th>
                <th>Doctor &amp; Dept</th>
                <th>Room &amp; Bed</th>
                <th>Admission Date</th>
                <th>Discharge Date</th>
                <th>Status</th>
                <th>Total Charges / Deposit</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody id="ipHistoryTableBody">
              <tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">Loading IP history from MySQL...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="ipHistoryPaginationMount"></div>
      </div>
    `;

    document.getElementById('btnRefreshHistory')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnRefreshHistory');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:4px;"></span> Refreshing...';
      }
      try {
        await loadIpHistory();
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Refresh';
        }
      }
    });
    document.getElementById('ipHistoryStatusFilter')?.addEventListener('change', () => filterHistoryTable());
    document.getElementById('ipHistorySearchInput')?.addEventListener('input', () => filterHistoryTable());

    loadIpHistory();
  }

  async function loadIpHistory(search = '') {
    const tbody = document.getElementById('ipHistoryTableBody');
    if (!tbody) return;

    try {
      const res = await Api.get('/api/ip/admissions/history?search=' + encodeURIComponent(search));
      if (res.ok && res.data) {
        ipHistoryList = res.data;
        filterHistoryTable();
      } else {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">Failed to load history.</td></tr>';
      }
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#dc2626;">Error retrieving history records.</td></tr>';
    }
  }

  function filterHistoryTable() {
    const searchInput = document.getElementById('ipHistorySearchInput');
    const statusSelect = document.getElementById('ipHistoryStatusFilter');
    const q = (searchInput?.value || '').toLowerCase().trim();
    const st = statusSelect?.value || 'ALL';

    let filtered = ipHistoryList;

    if (st !== 'ALL') {
      filtered = filtered.filter(a => (a.status || '').toUpperCase() === st);
    }

    if (q) {
      filtered = filtered.filter(a => {
        const name = (a.patientName || '').toLowerCase();
        const uhid = (a.uhid || '').toLowerCase();
        const ipId = (a.ipId || '').toLowerCase();
        const phone = (a.phone || '').toLowerCase();
        const doc = (a.doctorName || '').toLowerCase();
        return name.includes(q) || uhid.includes(q) || ipId.includes(q) || phone.includes(q) || doc.includes(q);
      });
    }

    if (!ipHistoryPagination) {
      ipHistoryPagination = createHistoryPaginationController({
        defaultPageSize: 10,
        onPageChange: (pagedItems) => {
          renderHistoryRows(pagedItems);
          const mount = document.getElementById('ipHistoryPaginationMount');
          if (mount) {
            mount.innerHTML = ipHistoryPagination.renderControlsHtml('ipHistory');
            ipHistoryPagination.bindEvents('ipHistory');
          }
        }
      });
    }

    const paged = ipHistoryPagination.setItems(filtered, true);
    renderHistoryRows(paged);
    const mount = document.getElementById('ipHistoryPaginationMount');
    if (mount) {
      mount.innerHTML = ipHistoryPagination.renderControlsHtml('ipHistory');
      ipHistoryPagination.bindEvents('ipHistory');
    }
  }

  function renderHistoryRows(list) {
    const tbody = document.getElementById('ipHistoryTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:3rem 1rem; color:var(--cv-text-muted);">
            No IP admission records match the selected filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(adm => {
      const isAdmitted = (adm.status === 'ADMITTED');
      const statusBadge = isAdmitted ?
        '<span class="cv-ip-badge-admitted">ADMITTED</span>' :
        '<span class="cv-ip-badge-discharged">DISCHARGED</span>';

      return `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cv-primary);">${escapeHtml(adm.ipId)}</td>
          <td>
            <div style="font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(adm.patientName)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">
              ${escapeHtml(adm.uhid || 'N/A')} &bull; ${adm.age || 'N/A'} Yrs / ${escapeHtml(adm.gender || 'N/A')}
            </div>
          </td>
          <td>
            <div style="font-weight:600;">Dr. ${escapeHtml(adm.doctorName)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(adm.department || 'General')}</div>
          </td>
          <td>
            <div style="font-weight:600;">Room ${escapeHtml(adm.roomNumber)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">Bed ${escapeHtml(adm.bedNumber)}</div>
          </td>
          <td>
            <div>${escapeHtml(adm.admissionDate)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(adm.admissionTime || '')}</div>
          </td>
          <td>
            ${adm.dischargeDate ? `<div>${escapeHtml(adm.dischargeDate)}</div><div style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(adm.dischargeTime || '')}</div>` : '<em style="color:#2563eb; font-size:0.82rem;">Currently Admitted</em>'}
          </td>
          <td>${statusBadge}</td>
          <td>
            <div>&#8377;${formatCurrency(adm.totalCharges || adm.depositAmount || 0)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">Deposit: &#8377;${formatCurrency(adm.depositAmount || 0)}</div>
          </td>
          <td style="text-align:right;">
            <button type="button" class="cv-btn-secondary" onclick="Admin.showIpDetailsModal(${adm.id})" style="padding:0.35rem 0.65rem; font-size:0.78rem;">
              View Summary
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ====================================================================
  // SUB-TAB 4: ROOMS & BEDS MANAGEMENT
  // ====================================================================
  async function renderIpRoomsTab() {
    const tabContent = document.getElementById('ipTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = `
      <!-- Top Room/Bed Summary Cards (Section 23) -->
      <div class="cv-ip-summary-grid" id="ipSummaryCardsContainer">
        <div class="cv-ip-summary-card" style="--card-accent:#0284c7;">
          <div class="cv-ip-summary-label">TOTAL ROOMS</div>
          <div class="cv-ip-summary-val" id="sumTotalRooms">...</div>
          <div class="cv-ip-summary-sub">Configured wards &amp; units</div>
        </div>
        <div class="cv-ip-summary-card" style="--card-accent:#6366f1;">
          <div class="cv-ip-summary-label">TOTAL BEDS</div>
          <div class="cv-ip-summary-val" id="sumTotalBeds">...</div>
          <div class="cv-ip-summary-sub">Hospital capacity</div>
        </div>
        <div class="cv-ip-summary-card" style="--card-accent:#2563eb;">
          <div class="cv-ip-summary-label">OCCUPIED BEDS</div>
          <div class="cv-ip-summary-val" id="sumOccupiedBeds" style="color:#2563eb;">...</div>
          <div class="cv-ip-summary-sub" id="sumOccupancyPct">0% Occupancy rate</div>
        </div>
        <div class="cv-ip-summary-card" style="--card-accent:#059669;">
          <div class="cv-ip-summary-label">AVAILABLE BEDS</div>
          <div class="cv-ip-summary-val" id="sumAvailableBeds" style="color:#059669;">...</div>
          <div class="cv-ip-summary-sub">Ready for admission</div>
        </div>
        <div class="cv-ip-summary-card" style="--card-accent:#d97706;">
          <div class="cv-ip-summary-label">RESERVED BEDS</div>
          <div class="cv-ip-summary-val" id="sumReservedBeds" style="color:#d97706;">...</div>
          <div class="cv-ip-summary-sub">Scheduled admissions</div>
        </div>
        <div class="cv-ip-summary-card" style="--card-accent:#64748b;">
          <div class="cv-ip-summary-label">MAINTENANCE</div>
          <div class="cv-ip-summary-val" id="sumMaintenanceBeds" style="color:#64748b;">...</div>
          <div class="cv-ip-summary-sub">Sanitizing / repair</div>
        </div>
      </div>

      <!-- Room & Bed Filtering Toolbar (Section 24 & 25) -->
      <div class="cv-ip-toolbar" style="margin-top:1.25rem;">
        <div class="cv-ip-filter-group">
          <span style="font-size:0.8rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">Category:</span>
          <button type="button" class="cv-filter-pill active" data-cat="ALL">All Rooms</button>
          <button type="button" class="cv-filter-pill" data-cat="ICU">ICU</button>
          <button type="button" class="cv-filter-pill" data-cat="GENERAL_WARD">General Ward</button>
          <button type="button" class="cv-filter-pill" data-cat="VIP">VIP</button>
          <button type="button" class="cv-filter-pill" data-cat="DELUXE">Deluxe</button>
          <button type="button" class="cv-filter-pill" data-cat="SEMI_PRIVATE">Semi-Private</button>
        </div>

        <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
          <select id="ipRoomStatusFilter" class="cv-input" style="width:auto; padding:0.4rem 0.75rem; font-size:0.82rem;">
            <option value="ALL">All Availability</option>
            <option value="AVAILABLE_ONLY">Available Beds Only</option>
            <option value="OCCUPIED_ONLY">Occupied Rooms</option>
            <option value="FULL_ONLY">Full Rooms (0 Available)</option>
          </select>
          <div class="cv-patient-search-input-wrap" style="width:220px;">
            <svg class="cv-patient-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" id="ipRoomSearchBox" class="cv-patient-search-input" placeholder="Search room/bed..." style="padding:0.4rem 0.5rem 0.4rem 2rem; font-size:0.82rem;">
          </div>
          <button type="button" class="cv-btn-primary" id="btnOpenAddRoomModal" style="padding:0.45rem 0.95rem; font-size:0.82rem; display:flex; align-items:center; gap:0.35rem;">
            <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
            Configure New Room
          </button>
        </div>
      </div>

      <!-- Room Cards Grid (Section 9, 10, 27) -->
      <div id="ipRoomsGrid" class="cv-rooms-grid" style="margin-top:1.25rem;">
        <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--cv-text-muted);">
          Loading rooms and beds from MySQL...
        </div>
      </div>
    `;

    setupRoomsToolbarEvents();
    loadRoomsData();
  }

  function setupRoomsToolbarEvents() {
    document.querySelectorAll('.cv-ip-filter-group .cv-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cv-ip-filter-group .cv-filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ipActiveRoomCategoryFilter = btn.dataset.cat || 'ALL';
        filterRoomsGrid();
      });
    });

    document.getElementById('ipRoomStatusFilter')?.addEventListener('change', (e) => {
      ipActiveRoomStatusFilter = e.target.value;
      filterRoomsGrid();
    });

    document.getElementById('ipRoomSearchBox')?.addEventListener('input', (e) => {
      ipRoomSearchQuery = e.target.value.toLowerCase().trim();
      filterRoomsGrid();
    });

    document.getElementById('btnOpenAddRoomModal')?.addEventListener('click', () => {
      showAddRoomModal();
    });
  }

  async function loadRoomsData() {
    try {
      // 1. Load Summary
      const sumRes = await Api.get('/api/ip/summary');
      if (sumRes.ok && sumRes.data) {
        const s = sumRes.data;
        document.getElementById('sumTotalRooms').textContent = s.totalRooms || 0;
        document.getElementById('sumTotalBeds').textContent = s.totalBeds || 0;
        document.getElementById('sumOccupiedBeds').textContent = s.occupiedBeds || 0;
        document.getElementById('sumAvailableBeds').textContent = s.availableBeds || 0;
        document.getElementById('sumReservedBeds').textContent = s.reservedBeds || 0;
        document.getElementById('sumMaintenanceBeds').textContent = s.maintenanceBeds || 0;

        const occPct = s.totalBeds > 0 ? Math.round((s.occupiedBeds / s.totalBeds) * 100) : 0;
        const occLabel = document.getElementById('sumOccupancyPct');
        if (occLabel) occLabel.textContent = `${occPct}% Occupancy rate`;
      }

      // 2. Load Rooms
      const roomsRes = await Api.get('/api/ip/rooms');
      if (roomsRes.ok && roomsRes.data) {
        ipRoomsList = roomsRes.data;
        filterRoomsGrid();
      }
    } catch (e) {
      console.error('Error loading rooms data:', e);
      const grid = document.getElementById('ipRoomsGrid');
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#dc2626;">Error loading rooms and beds from MySQL.</div>';
    }
  }

  function filterRoomsGrid() {
    let filtered = ipRoomsList;

    // Filter by Category
    if (ipActiveRoomCategoryFilter !== 'ALL') {
      filtered = filtered.filter(r => (r.roomType || '').toUpperCase() === ipActiveRoomCategoryFilter);
    }

    // Filter by Availability Status
    if (ipActiveRoomStatusFilter === 'AVAILABLE_ONLY') {
      filtered = filtered.filter(r => (r.availableBedsCount || 0) > 0);
    } else if (ipActiveRoomStatusFilter === 'OCCUPIED_ONLY') {
      filtered = filtered.filter(r => (r.occupiedBedsCount || 0) > 0);
    } else if (ipActiveRoomStatusFilter === 'FULL_ONLY') {
      filtered = filtered.filter(r => (r.availableBedsCount || 0) === 0);
    }

    // Search query
    if (ipRoomSearchQuery) {
      filtered = filtered.filter(r => {
        const num = (r.roomNumber || '').toLowerCase();
        const type = (r.roomType || '').toLowerCase();
        const bedsMatch = (r.beds || []).some(b => (b.bedNumber || '').toLowerCase().includes(ipRoomSearchQuery));
        return num.includes(ipRoomSearchQuery) || type.includes(ipRoomSearchQuery) || bedsMatch;
      });
    }

    renderRoomsGrid(filtered);
  }

  function renderRoomsGrid(rooms) {
    const grid = document.getElementById('ipRoomsGrid');
    if (!grid) return;

    if (!rooms || rooms.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:3rem 1rem; color:var(--cv-text-muted); background:var(--cv-surface); border:1px dashed var(--cv-border); border-radius:var(--cv-radius-lg);">
          <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.35rem;">No Rooms Match Filters</div>
          <div style="font-size:0.85rem;">Adjust the category or availability filters above, or click "+ Configure New Room" to add a new ward.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = rooms.map(room => {
      const typeKey = (room.roomType || 'GENERAL_WARD').toLowerCase();
      const typeClass = `cv-type-${typeKey}`;
      const typeLabel = room.roomType ? room.roomType.replace('_', ' ') : 'General Ward';
      const occPct = room.totalBedsCount > 0 ? Math.round((room.occupiedBedsCount / room.totalBedsCount) * 100) : 0;

      return `
        <div class="cv-room-card">
          <div class="cv-room-card-head">
            <div class="cv-room-title-wrap">
              <span class="cv-room-num">Room ${escapeHtml(room.roomNumber)}</span>
              <span class="cv-room-type-badge ${typeClass}">${escapeHtml(typeLabel)}</span>
            </div>
            <div class="cv-room-price">&#8377;${formatCurrency(room.dailyPrice)}/day</div>
          </div>

          <div class="cv-room-occ-bar-wrap">
            <div class="cv-room-occ-label">
              <span>Beds: <strong>${room.totalBedsCount} Total</strong></span>
              <span><strong>${room.occupiedBedsCount}</strong> Occ &bull; <strong style="color:#059669;">${room.availableBedsCount}</strong> Avail</span>
            </div>
            <div class="cv-progress-bar">
              <div class="cv-progress-fill" style="width:${occPct}%;"></div>
            </div>
          </div>

          <!-- Beds Chips inside Room (Section 10 & 27) -->
          <div class="cv-room-beds-grid">
            ${(room.beds || []).map(bed => {
              const bStatus = (bed.status || 'AVAILABLE').toUpperCase();
              let bClass = 'cv-bed-avail';
              let statusLabel = 'AVAILABLE';

              if (bStatus === 'OCCUPIED') {
                bClass = 'cv-bed-occ';
                statusLabel = 'OCCUPIED';
              } else if (bStatus === 'RESERVED') {
                bClass = 'cv-bed-res';
                statusLabel = 'RESERVED';
              } else if (bStatus === 'MAINTENANCE') {
                bClass = 'cv-bed-maint';
                statusLabel = 'MAINTENANCE';
              }

              return `
                <div class="cv-bed-chip ${bClass}" ${bStatus === 'OCCUPIED' && bed.admissionId ? `style="cursor:pointer;" onclick="Admin.showBedPaymentModal(${bed.id}, ${bed.admissionId})"` : ''} title="${bStatus === 'OCCUPIED' ? 'Click to view / collect bed payment' : ''}">
                  <div class="cv-bed-head">
                    <span>Bed ${escapeHtml(bed.bedNumber)}</span>
                    <span style="font-size:0.7rem;">${statusLabel}</span>
                  </div>
                  ${bStatus === 'OCCUPIED' && bed.assignedPatientName ? `
                    <div class="cv-bed-patient-text" title="Patient: ${escapeHtml(bed.assignedPatientName)}">
                      &bull; ${escapeHtml(bed.assignedPatientName)}
                    </div>
                    ${(bed.balanceAmount != null && bed.balanceAmount > 0) ? `
                      <div style="margin-top:4px; font-size:0.72rem; color:#dc2626; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                        <span>Due: &#8377;${formatCurrency(bed.balanceAmount)}</span>
                        <span class="cv-btn-primary" style="padding:1px 6px; font-size:0.68rem; border-radius:3px; line-height:1.2;">Collect</span>
                      </div>
                    ` : `
                      <div style="margin-top:2px; font-size:0.7rem; color:#059669; font-weight:600;">
                        Paid (&#8377;0 Due)
                      </div>
                    `}
                  ` : `
                    <div class="cv-bed-price-text">&#8377;${formatCurrency(bed.dailyPrice)}/day</div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // ====================================================================
  // IP ROOM / BED PAYMENT COLLECTION (Phase 4)
  // Integrates payment confirmation modal + real MySQL update + print
  // ====================================================================
  async function showBedPaymentModal(bedId, admissionId) {
    if (!admissionId) {
      alert('No active inpatient admission found for this bed.');
      return;
    }

    try {
      const res = await Api.get(`/api/ip/admissions/${admissionId}`);
      if (!res || !res.ok || !res.data) {
        alert('Could not fetch inpatient billing details for bed.');
        return;
      }
      const adm = res.data;
      const roomBed = (Number(adm.roomPrice || 0) + Number(adm.bedPrice || 0));
      const totalCharges = (Number(adm.totalCharges || 0) > 0) ? Number(adm.totalCharges) : (roomBed > 0 ? roomBed : Number(adm.depositAmount || 0));
      const paidAmount = adm.paidAmount != null ? Number(adm.paidAmount) :
        (adm.paymentStatus === 'PAID' ? totalCharges : (adm.depositAmount != null ? Number(adm.depositAmount) : 0));
      const balanceAmount = adm.balanceAmount != null ? Number(adm.balanceAmount) : Math.max(0, totalCharges - paidAmount);

      if (balanceAmount <= 0) {
        alert(`This inpatient admission (${adm.ipId}) has already been fully paid (Balance: ₹0.00).`);
        return;
      }

      const prev = document.getElementById('cvBedPaymentBackdrop');
      if (prev) prev.remove();

      const backdrop = document.createElement('div');
      backdrop.className = 'cv-modal-backdrop show';
      backdrop.id = 'cvBedPaymentBackdrop';
      backdrop.style.zIndex = '1040';

      backdrop.innerHTML = `
        <div class="cv-modal" style="max-width: 480px; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.22); border:1px solid #cbd5e1; background:#ffffff;">
          <div class="cv-modal-header" style="background:#f8fafc; padding: 1.1rem 1.4rem; border-bottom: 1px solid var(--cv-border);">
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <span style="width:32px; height:32px; border-radius:8px; background:rgba(2, 132, 199, 0.12); color:var(--cv-primary); display:flex; align-items:center; justify-content:center;">
                <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </span>
              <h3 class="cv-modal-title" style="margin:0; font-size:1.1rem; font-weight:700; color:#0f172a;">IP Room / Bed Payment Collection</h3>
            </div>
            <button type="button" class="cv-modal-close" id="btnBedPayClose" style="cursor:pointer;" aria-label="Close">&times;</button>
          </div>

          <div class="cv-modal-body" style="padding: 1.4rem;">
            <!-- Patient & Bed Details Summary -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.9rem 1.15rem; margin-bottom:1.15rem; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">Patient:</span>
                <strong style="color:#0f172a;">${escapeHtml(adm.patientName)} <span style="font-family:monospace; color:var(--cv-primary);">(${escapeHtml(adm.uhid || '—')})</span></strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">IP ID:</span>
                <strong style="font-family:monospace; color:#0f172a;">${escapeHtml(adm.ipId)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">Room / Bed:</span>
                <strong style="color:#0f172a;">Room ${escapeHtml(adm.roomNumber)} &bull; Bed ${escapeHtml(adm.bedNumber)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">Total Charges:</span>
                <strong style="color:#0f172a;">₹${formatCurrency(totalCharges)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">Amount Paid So Far:</span>
                <strong style="color:#059669;">₹${formatCurrency(paidAmount)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:0.4rem; margin-top:0.4rem;">
                <span style="color:#64748b; font-weight:700;">Outstanding Balance:</span>
                <strong style="color:var(--cv-danger); font-size:1.05rem;">₹${formatCurrency(balanceAmount)}</strong>
              </div>
            </div>

            <!-- Amount Paid Input & Payment Method -->
            <div style="margin-bottom:1rem;">
              <label for="bedPayAmountInput" style="display:block; font-size:0.8rem; font-weight:700; color:#334155; text-transform:uppercase; margin-bottom:0.35rem;">
                Amount Paid / Enter Amount <span style="color:#dc2626;">*</span>
              </label>
              <div style="position:relative;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-weight:700; color:#64748b;">₹</span>
                <input type="number" id="bedPayAmountInput" class="cv-form-input" style="padding-left:1.8rem; height:42px; font-size:1.05rem; font-weight:700;" placeholder="0.00" value="${balanceAmount}" min="0.01" max="${balanceAmount}" step="any">
              </div>
            </div>

            <div style="margin-bottom:0.5rem;">
              <label for="bedPayMethodSelect" style="display:block; font-size:0.8rem; font-weight:700; color:#334155; text-transform:uppercase; margin-bottom:0.35rem;">
                Payment Method
              </label>
              <select id="bedPayMethodSelect" class="cv-form-select" style="height:40px; font-size:0.88rem;">
                <option value="CASH">Cash</option>
                <option value="CARD">Credit/Debit Card</option>
                <option value="UPI">UPI / Digital Payment</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div class="cv-modal-footer" style="padding: 0.9rem 1.4rem; background:#f8fafc; border-top:1px solid var(--cv-border); display:flex; justify-content:flex-end; gap:0.75rem;">
            <button type="button" class="cv-btn-secondary" id="btnBedPayCancel" style="padding:0.5rem 1.1rem; font-size:0.88rem; font-weight:600;">
              Cancel
            </button>
            <button type="button" class="cv-btn-primary" id="btnBedPaySubmit" style="padding:0.5rem 1.3rem; font-size:0.88rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
              Submit
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      const closeBedModal = () => backdrop.remove();
      document.getElementById('btnBedPayClose')?.addEventListener('click', closeBedModal);
      document.getElementById('btnBedPayCancel')?.addEventListener('click', closeBedModal);

      document.getElementById('btnBedPaySubmit')?.addEventListener('click', () => {
        const amtInput = document.getElementById('bedPayAmountInput');
        const rawVal = amtInput ? amtInput.value : '';
        const method = document.getElementById('bedPayMethodSelect')?.value || 'CASH';

        if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
          alert('Please enter a payment amount.');
          return;
        }
        const enteredAmt = parseFloat(rawVal);
        if (isNaN(enteredAmt) || enteredAmt <= 0) {
          alert('Payment amount must be a valid positive number greater than 0.');
          return;
        }
        if (enteredAmt > balanceAmount + 0.001) {
          alert(`Payment amount cannot exceed the remaining balance of ₹${formatCurrency(balanceAmount)}.`);
          return;
        }

        const remBal = Math.max(0, parseFloat((balanceAmount - enteredAmt).toFixed(2)));

        // Hide bed pay modal while confirmation is open
        backdrop.style.display = 'none';

        showPaymentConfirmationModal({
          title: 'Confirm Room / Bed Payment',
          billRef: 'IP Bill: ' + (adm.ipId || 'IP-' + admissionId),
          paymentAmount: enteredAmt,
          remainingBalance: remBal,
          moduleType: 'IP',
          printButtonLabel: 'Print Bill',
          onCancel: () => {
            // Restore bed payment modal
            backdrop.style.display = 'flex';
          },
          onConfirm: async (showSuccessState, unlockBtn) => {
            try {
              const payRes = await Api.post('/api/billing/payment', {
                moduleType: 'IP',
                billId: admissionId,
                billNumber: adm.ipId,
                paymentAmount: enteredAmt,
                paymentMethod: method,
                notes: 'IP room/bed payment collected'
              });

              if (payRes && payRes.ok && payRes.data) {
                backdrop.remove();
                showSuccessState(payRes.data);
                loadRoomsData();
                if (document.getElementById('ipInpatientsTableBody')) {
                  loadCurrentInpatients();
                }
              } else {
                unlockBtn();
                alert(payRes?.message || 'Payment processing failed.');
                backdrop.style.display = 'flex';
              }
            } catch (err) {
              unlockBtn();
              alert('Error processing payment: ' + (err.message || err));
              backdrop.style.display = 'flex';
            }
          },
          onPrint: (resultData) => {
            const updatedAdm = {
              ...adm,
              paidAmount: resultData?.amountPaid != null ? resultData.amountPaid : (paidAmount + enteredAmt),
              depositAmount: resultData?.amountPaid != null ? resultData.amountPaid : (paidAmount + enteredAmt),
              balanceAmount: resultData?.balanceAmount != null ? resultData.balanceAmount : remBal,
              paymentStatus: resultData?.paymentStatus || (remBal <= 0 ? 'PAID' : 'PARTIALLY PAID'),
              paymentMethod: method
            };
            openBillPrintWindow(buildIpBillPrintHtml({
              fullName: adm.patientName,
              uhid: adm.uhid,
              phone: adm.phone
            }, updatedAdm));
          }
        });
      });

    } catch (e) {
      console.error(e);
      alert('Error fetching inpatient admission details.');
    }
  }

  // ====================================================================
  // MODALS: DISCHARGE, VIEW DETAILS, ADD ROOM
  // ====================================================================
  async function showDischargeModal(admissionId) {
    const modalHost = document.getElementById('ipModalHost');
    if (!modalHost) return;

    try {
      const res = await Api.get(`/api/ip/admissions/${admissionId}`);
      if (!res.ok || !res.data) {
        alert('Could not fetch admission details for discharge.');
        return;
      }
      const adm = res.data;
      const now = new Date();
      const dischargeDateStr = formatDDMMYYYY(now);
      const dischargeTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      modalHost.innerHTML = `
        <div class="cv-op-modal-backdrop" id="ipDischargeBackdrop">
          <div class="cv-op-modal-box" style="max-width:560px;">
            <div class="cv-op-modal-header">
              <div class="cv-op-modal-title">Patient Discharge &amp; Bed Release</div>
              <button type="button" class="cv-btn-secondary" id="btnCloseDischargeX" style="padding:0.3rem 0.6rem; font-size:1rem;">&times;</button>
            </div>
            <div class="cv-op-modal-body">
              <div style="background:var(--cv-bg); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); padding:1rem; margin-bottom:1rem;">
                <div style="font-size:1.05rem; font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(adm.patientName)}</div>
                <div style="font-size:0.82rem; color:var(--cv-text-muted); margin-top:0.25rem;">
                  IP ID: <strong>${escapeHtml(adm.ipId)}</strong> &bull; UHID: <strong>${escapeHtml(adm.uhid || 'N/A')}</strong>
                </div>
                <div style="font-size:0.82rem; margin-top:0.35rem;">
                  Room <strong>${escapeHtml(adm.roomNumber)}</strong> &bull; Bed <strong>${escapeHtml(adm.bedNumber)}</strong> &bull; Attending: <strong>Dr. ${escapeHtml(adm.doctorName)}</strong>
                </div>
                <div style="font-size:0.8rem; color:var(--cv-text-secondary); margin-top:0.35rem;">
                  Admitted On: <strong>${escapeHtml(adm.admissionDate)} ${escapeHtml(adm.admissionTime || '')}</strong>
                </div>
              </div>

              <div id="dischargeAlert" class="cv-alert cv-alert-danger" style="display:none; margin-bottom:1rem;"></div>

              <form id="dischargeForm">
                <div class="cv-op-fields-row">
                  <div class="cv-form-group">
                    <label class="cv-form-label">Discharge Date *</label>
                    <input type="text" class="cv-input cv-op-input-readonly" readonly value="${dischargeDateStr}">
                  </div>
                  <div class="cv-form-group">
                    <label class="cv-form-label">Discharge Time *</label>
                    <input type="text" class="cv-input cv-op-input-readonly" readonly value="${dischargeTimeStr}">
                  </div>
                </div>

                <div class="cv-op-fields-row">
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="disAdditionalCharges">Additional / Settlement Charges (&#8377;)</label>
                    <input type="number" id="disAdditionalCharges" class="cv-input" placeholder="0.00" min="0" value="0.00">
                  </div>
                  <div class="cv-form-group">
                    <label class="cv-form-label" for="disPaymentMethod">Settlement Payment Mode</label>
                    <select id="disPaymentMethod" class="cv-input">
                      <option value="CASH">Cash</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="UPI">UPI / Digital QR</option>
                      <option value="INSURANCE">Insurance TPA</option>
                    </select>
                  </div>
                </div>

                <div class="cv-form-group" style="margin-bottom:0;">
                  <label class="cv-form-label" for="disNotes">Discharge Summary &amp; Clinical Advice</label>
                  <textarea id="disNotes" class="cv-input" rows="3" placeholder="Condition at discharge, medication advice, follow-up instructions..." style="resize:vertical;"></textarea>
                </div>
              </form>
            </div>
            <div class="cv-op-modal-footer">
              <button type="button" class="cv-btn-secondary" id="btnCancelDischarge">Cancel</button>
              <button type="button" class="cv-btn-primary" id="btnConfirmDischarge" style="background:#dc2626; border-color:#dc2626;">
                Confirm Discharge &amp; Release Bed
              </button>
            </div>
          </div>
        </div>
      `;

      const close = () => { modalHost.innerHTML = ''; };
      document.getElementById('btnCloseDischargeX')?.addEventListener('click', close);
      document.getElementById('btnCancelDischarge')?.addEventListener('click', close);

      document.getElementById('btnConfirmDischarge')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnConfirmDischarge');
        const alertBox = document.getElementById('dischargeAlert');
        btn.disabled = true;
        btn.textContent = 'Releasing Bed & Processing...';

        const additionalChargesStr = document.getElementById('disAdditionalCharges')?.value.trim();
        const additionalCharges = additionalChargesStr ? parseFloat(additionalChargesStr) : 0.0;
        const finalPaymentMethod = document.getElementById('disPaymentMethod')?.value || 'CASH';
        const dischargeNotes = document.getElementById('disNotes')?.value.trim();

        try {
          const dRes = await Api.post(`/api/ip/admissions/${admissionId}/discharge`, {
            dischargeNotes,
            additionalCharges,
            finalPaymentMethod
          });

          if (dRes.ok) {
            alert(`Patient ${adm.patientName} discharged successfully.\nBed ${adm.bedNumber} released back to AVAILABLE.`);
            close();
            loadCurrentInpatients();
          } else {
            btn.disabled = false;
            btn.textContent = 'Confirm Discharge & Release Bed';
            if (alertBox) {
              alertBox.style.display = 'block';
              alertBox.textContent = dRes.message || 'Error processing discharge.';
            }
          }
        } catch (e) {
          console.error(e);
          btn.disabled = false;
          btn.textContent = 'Confirm Discharge & Release Bed';
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.textContent = 'Network error while attempting discharge.';
          }
        }
      });
    } catch (e) {
      console.error(e);
      alert('Error fetching admission data.');
    }
  }

  async function showIpDetailsModal(admissionId) {
    const modalHost = document.getElementById('ipModalHost');
    if (!modalHost) return;

    try {
      const res = await Api.get(`/api/ip/admissions/${admissionId}`);
      if (!res.ok || !res.data) {
        alert('Failed to retrieve IP admission details.');
        return;
      }
      const adm = res.data;
      const isDischarged = (adm.status === 'DISCHARGED');

      modalHost.innerHTML = `
        <div class="cv-op-modal-backdrop" id="ipDetailsModalBackdrop">
          <div class="cv-op-modal-box" style="max-width:680px;">
            <div class="cv-op-modal-header">
              <div class="cv-op-modal-title">Inpatient Admission Record</div>
              <button type="button" class="cv-btn-secondary" id="btnCloseDetailsX" style="padding:0.3rem 0.6rem; font-size:1rem;">&times;</button>
            </div>
            <div class="cv-op-modal-body">
              <div class="cv-receipt-sheet cv-receipt-printable">
                <div class="cv-receipt-header">
                  <div class="cv-receipt-brand">CareVista HMS</div>
                  <div class="cv-receipt-hosp-name">${escapeHtml(currentUser?.hospitalName || 'Hospital Center')}</div>
                  <div class="cv-receipt-hosp-sub">Inpatient (IP) Management &bull; Patient Stay &amp; Medical Summary</div>
                  <div>
                    <span class="cv-receipt-title-badge">${isDischarged ? 'DISCHARGE SUMMARY SHEET' : 'INPATIENT ADMISSION SLIP'}</span>
                  </div>
                </div>

                <div class="cv-receipt-grid">
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Admission ID (IP ID)</span>
                    <span class="cv-receipt-val" style="font-family:monospace; color:var(--cv-primary); font-weight:700;">${escapeHtml(adm.ipId)}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Patient UHID</span>
                    <span class="cv-receipt-val" style="font-family:monospace;">${escapeHtml(adm.uhid || 'N/A')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Admission Date &amp; Time</span>
                    <span class="cv-receipt-val">${escapeHtml(adm.admissionDate)} ${escapeHtml(adm.admissionTime || '')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Status</span>
                    <span class="cv-receipt-val" style="color:${isDischarged ? '#64748b' : '#2563eb'}; font-weight:700;">${escapeHtml(adm.status)}</span>
                  </div>
                </div>

                <div class="cv-receipt-divider"></div>

                <div class="cv-receipt-grid">
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Patient Name</span>
                    <span class="cv-receipt-val">${escapeHtml(adm.patientName)}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Age / Gender</span>
                    <span class="cv-receipt-val">${adm.age || 'N/A'} Yrs / ${escapeHtml(adm.gender || 'N/A')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Phone</span>
                    <span class="cv-receipt-val">${escapeHtml(adm.phone || 'N/A')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Attending Doctor</span>
                    <span class="cv-receipt-val">Dr. ${escapeHtml(adm.doctorName)}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Department</span>
                    <span class="cv-receipt-val">${escapeHtml(adm.department || 'General')}</span>
                  </div>
                  <div class="cv-receipt-item">
                    <span class="cv-receipt-label">Room &amp; Bed</span>
                    <span class="cv-receipt-val">Room ${escapeHtml(adm.roomNumber)} &bull; Bed ${escapeHtml(adm.bedNumber)}</span>
                  </div>
                </div>

                <div style="margin-top:0.75rem; background:var(--cv-bg); padding:0.75rem 1rem; border-radius:var(--cv-radius-md); border:1px solid var(--cv-border);">
                  <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">Reason for Admission</div>
                  <div style="margin-top:0.2rem; font-size:0.86rem; color:var(--cv-text-primary);">${escapeHtml(adm.reasonForAdmission || 'Clinical admission')}</div>

                  ${adm.diagnosis ? `
                    <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase; margin-top:0.5rem;">Clinical Diagnosis</div>
                    <div style="margin-top:0.2rem; font-size:0.86rem; color:var(--cv-text-primary);">${escapeHtml(adm.diagnosis)}</div>
                  ` : ''}

                  ${adm.dischargeNotes ? `
                    <div style="font-size:0.75rem; font-weight:700; color:#dc2626; text-transform:uppercase; margin-top:0.5rem;">Discharge Summary &amp; Advice</div>
                    <div style="margin-top:0.2rem; font-size:0.86rem; color:var(--cv-text-primary);">${escapeHtml(adm.dischargeNotes)}</div>
                  ` : ''}
                </div>

                <div class="cv-receipt-fee-box" style="margin-top:1rem;">
                  <div>
                    <div class="cv-receipt-fee-label">Deposit &amp; Hospitalization Charges</div>
                    <div style="font-size:0.75rem; color:var(--cv-text-muted);">
                      Room: &#8377;${formatCurrency(adm.roomPrice)}/day &bull; Bed: &#8377;${formatCurrency(adm.bedPrice)}/day &bull; Mode: <strong>${escapeHtml(adm.paymentMethod || 'CASH')}</strong>
                    </div>
                  </div>
                  <div class="cv-receipt-fee-amount">&#8377;${formatCurrency(adm.totalCharges || adm.depositAmount || 0)}</div>
                </div>

                <div class="cv-receipt-footer">
                  <p>Computer-generated hospital inpatient admission summary verified with MySQL database persistence.</p>
                </div>
              </div>
            </div>
            <div class="cv-op-modal-footer">
              <button type="button" class="cv-btn-secondary" id="btnCloseDetailsModalBtn">Close</button>
              <button type="button" class="cv-btn-primary" id="btnPrintIpSummary" style="display:flex; align-items:center; gap:0.4rem;">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                Print IP Summary
              </button>
            </div>
          </div>
        </div>
      `;

      const close = () => { modalHost.innerHTML = ''; };
      document.getElementById('btnCloseDetailsX')?.addEventListener('click', close);
      document.getElementById('btnCloseDetailsModalBtn')?.addEventListener('click', close);
      document.getElementById('btnPrintIpSummary')?.addEventListener('click', () => {
        window.print();
      });
    } catch (e) {
      console.error(e);
      alert('Error fetching details.');
    }
  }

  function showAddRoomModal() {
    const modalHost = document.getElementById('ipModalHost');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="cv-op-modal-backdrop" id="ipAddRoomBackdrop">
        <div class="cv-op-modal-box" style="max-width:560px;">
          <div class="cv-op-modal-header">
            <div class="cv-op-modal-title">Configure New Room &amp; Beds</div>
            <button type="button" class="cv-btn-secondary" id="btnCloseAddRoomX" style="padding:0.3rem 0.6rem; font-size:1rem;">&times;</button>
          </div>
          <div class="cv-op-modal-body">
            <div id="addRoomAlert" class="cv-alert cv-alert-danger" style="display:none; margin-bottom:1rem;"></div>

            <form id="addRoomForm">
              <div class="cv-op-fields-row">
                <div class="cv-form-group">
                  <label class="cv-form-label" for="addRoomNumber">Room Number / Name *</label>
                  <input type="text" id="addRoomNumber" class="cv-input" placeholder="e.g. 104, ICU-B" required>
                </div>
                <div class="cv-form-group">
                  <label class="cv-form-label" for="addRoomType">Room Category *</label>
                  <select id="addRoomType" class="cv-input" required>
                    <option value="GENERAL_WARD">General Ward</option>
                    <option value="ICU">ICU (Intensive Care)</option>
                    <option value="VIP">VIP Suite</option>
                    <option value="DELUXE">Deluxe Room</option>
                    <option value="SEMI_PRIVATE">Semi-Private Ward</option>
                  </select>
                </div>
              </div>

              <div class="cv-op-fields-row">
                <div class="cv-form-group">
                  <label class="cv-form-label" for="addRoomFloor">Floor Location</label>
                  <input type="text" id="addRoomFloor" class="cv-input" placeholder="e.g. 1st Floor, 2nd Floor" value="1st Floor">
                </div>
                <div class="cv-form-group">
                  <label class="cv-form-label" for="addNumBeds">Number of Beds to Initialize *</label>
                  <input type="number" id="addNumBeds" class="cv-input" min="1" max="50" value="4" required>
                </div>
              </div>

              <div class="cv-op-fields-row">
                <div class="cv-form-group">
                  <label class="cv-form-label" for="addRoomPrice">Room Daily Price (&#8377;) *</label>
                  <input type="number" id="addRoomPrice" class="cv-input" placeholder="e.g. 1500" min="0" value="1500" required>
                </div>
                <div class="cv-form-group">
                  <label class="cv-form-label" for="addBedPrice">Bed Daily Price (&#8377;) *</label>
                  <input type="number" id="addBedPrice" class="cv-input" placeholder="e.g. 350" min="0" value="350" required>
                </div>
              </div>

              <div class="cv-form-group" style="margin-bottom:0;">
                <label class="cv-form-label" for="addRoomNotes">Room Notes / Description</label>
                <input type="text" id="addRoomNotes" class="cv-input" placeholder="e.g. Equipped with central oxygen and cardiac monitors">
              </div>
            </form>
          </div>
          <div class="cv-op-modal-footer">
            <button type="button" class="cv-btn-secondary" id="btnCancelAddRoom">Cancel</button>
            <button type="button" class="cv-btn-primary" id="btnSaveNewRoom">
              Save Room &amp; Configure Beds
            </button>
          </div>
        </div>
      </div>
    `;

    const close = () => { modalHost.innerHTML = ''; };
    document.getElementById('btnCloseAddRoomX')?.addEventListener('click', close);
    document.getElementById('btnCancelAddRoom')?.addEventListener('click', close);

    document.getElementById('btnSaveNewRoom')?.addEventListener('click', async () => {
      const roomNumber = document.getElementById('addRoomNumber')?.value.trim();
      const roomType = document.getElementById('addRoomType')?.value;
      const floor = document.getElementById('addRoomFloor')?.value.trim() || '1st Floor';
      const numBeds = parseInt(document.getElementById('addNumBeds')?.value, 10);
      const roomPrice = parseFloat(document.getElementById('addRoomPrice')?.value);
      const bedPrice = parseFloat(document.getElementById('addBedPrice')?.value);
      const notes = document.getElementById('addRoomNotes')?.value.trim();

      const alertBox = document.getElementById('addRoomAlert');

      if (!roomNumber) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.textContent = 'Room number is required.';
        }
        return;
      }

      if (isNaN(numBeds) || numBeds < 1) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.textContent = 'Please enter at least 1 bed.';
        }
        return;
      }

      const btn = document.getElementById('btnSaveNewRoom');
      btn.disabled = true;
      btn.textContent = 'Saving Room & Beds...';

      try {
        const res = await Api.post('/api/ip/rooms/create', {
          roomNumber,
          roomType,
          floor,
          numberOfBeds: numBeds,
          dailyPrice: roomPrice || 0,
          bedPrice: bedPrice || 0,
          notes: notes || null
        });

        if (res.ok) {
          alert(`Room ${roomNumber} (${numBeds} beds) configured successfully in MySQL.`);
          close();
          loadRoomsData();
        } else {
          btn.disabled = false;
          btn.textContent = 'Save Room & Configure Beds';
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.textContent = res.message || 'Failed to create room.';
          }
        }
      } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.textContent = 'Save Room & Configure Beds';
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.textContent = 'Network error while creating room.';
        }
      }
    });
  }

  // ====================================================================
  // UTILITIES & LEAP YEAR VALIDATION (Section 61)
  // ====================================================================
  function getDaysInMonth(month, year) {
    // strict leap year validation per Section 61
    if (month === 1) { // February
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      return isLeap ? 29 : 28;
    }
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[month];
  }

  function formatDDMMYYYY(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // ====================================================================
  // PHARMACY & MEDICINE BILLING MODULE
  // ====================================================================
  let pharActiveTab = 'billing'; // 'billing', 'history', 'inventory'
  let pharSelectedPatient = null;
  let pharMedicinesCatalog = [];
  let pharBillItems = [];
  let pharPatientSearchDebounce = null;
  let pharAllSalesHistory = [];

  async function cvFetch(url, options = {}) {
    if (options.method === 'POST') {
      const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      return await Api.post(url, body);
    }
    return await Api.get(url);
  }

function renderPharmacyModule(activeTab = 'billing') {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    pharActiveTab = activeTab;
    mainContent.classList.add('cv-pharmacy-mode');

    mainContent.innerHTML = `
      <div class="cv-pharmacy-wrapper">
        <!-- Topbar -->
        <div class="cv-pharmacy-topbar">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            ${renderBackArrowHtml('Back')}
            <div>
              <h1 class="cv-page-title" style="display:flex; align-items:center; gap:0.6rem;">
                <svg style="width:26px; height:26px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Pharmacy Management &amp; Billing
              </h1>
              <p class="cv-page-subtitle">Hospital: ${escapeHtml(currentUser?.hospitalName || 'City Care Super Speciality Hospital')}</p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div class="cv-pharmacy-nav-tabs">
              <button type="button" class="cv-pharmacy-tab-btn ${pharActiveTab === 'billing' ? 'active' : ''}" id="tabBtnPharBilling">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Sales &amp; Billing
              </button>
              <button type="button" class="cv-pharmacy-tab-btn ${pharActiveTab === 'history' ? 'active' : ''}" id="tabBtnPharHistory">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Sales History
              </button>
              <button type="button" class="cv-pharmacy-tab-btn ${pharActiveTab === 'inventory' ? 'active' : ''}" id="tabBtnPharInventory">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Medicine Master &amp; Stock
              </button>
            </div>

            <button type="button" class="cv-btn-secondary" id="btnPharBackDashboard" style="padding:0.5rem 0.9rem; font-size:0.85rem;">
              Back to Dashboard
            </button>
          </div>
        </div>

        <!-- Main Tab Mount Container -->
        <div id="pharTabContent"></div>

        <!-- Modal Host -->
        <div id="pharModalHost"></div>
      </div>
    `;

    document.getElementById('btnPharBackDashboard')?.addEventListener('click', () => {
      mainContent.classList.remove('cv-pharmacy-mode');
      navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
    });

    document.getElementById('tabBtnPharBilling')?.addEventListener('click', () => switchPharTab('billing', true));
    document.getElementById('tabBtnPharHistory')?.addEventListener('click', () => switchPharTab('history', true));
    document.getElementById('tabBtnPharInventory')?.addEventListener('click', () => switchPharTab('inventory', true));

    switchPharTab(pharActiveTab, false);
  }

  function executePharTab(tab) {
    const container = document.getElementById('pharTabContent');
    if (!container) {
      renderPharmacyModule(tab);
      return;
    }
    pharActiveTab = tab;
    document.querySelectorAll('.cv-pharmacy-tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'billing') {
      document.getElementById('tabBtnPharBilling')?.classList.add('active');
      renderPharmacyBillingTab();
    } else if (tab === 'history') {
      document.getElementById('tabBtnPharHistory')?.classList.add('active');
      renderPharmacyHistoryTab();
    } else if (tab === 'inventory') {
      document.getElementById('tabBtnPharInventory')?.classList.add('active');
      renderPharmacyInventoryTab();
    }
  }

  function switchPharTab(tab, recordHistory = true) {
    if (recordHistory) {
      navigateTo('pharmacy', tab, () => executePharTab(tab), true);
    } else {
      executePharTab(tab);
    }
  }

  // ------------------------------------------------------------------
  // TAB 1: MEDICINE SALES & BILLING
  // ------------------------------------------------------------------
  async function renderPharmacyBillingTab() {
    const container = document.getElementById('pharTabContent');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; min-height:220px;">
        <div class="cv-loading-spinner"></div>
      </div>
    `;

    // Load available medicines from backend
    try {
      const res = await cvFetch('/api/pharmacy/medicines');
      if (res && res.success && Array.isArray(res.data)) {
        pharMedicinesCatalog = res.data;
      } else {
        pharMedicinesCatalog = [];
      }
    } catch (err) {
      console.error('Failed to load pharmacy medicines:', err);
      pharMedicinesCatalog = [];
    }

    container.innerHTML = `
      
      <div class="cv-pharmacy-flow">
        <!-- 1. Patient Details & Search Card -->
        <div class="cv-pharmacy-card">
          <div class="cv-pharmacy-card-header">
            <div class="cv-pharmacy-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              1. Patient Details &amp; Search
            </div>
            <span style="font-size:0.75rem; color:var(--cv-text-muted); font-weight:600;">Real MySQL Records</span>
          </div>

          <div class="cv-patient-search-row">
            <div class="cv-patient-search-container">
              <div class="cv-search-icon-input">
                <i class="fas fa-search">
                  <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </i>
                <input type="text" id="pharPatientSearchInput" placeholder="Search by Patient Name, Phone Number, UHID, OP ID, or IP ID" autocomplete="off">
              </div>
              <div id="pharPatientDropdown" class="cv-patient-dropdown" style="display:none;"></div>
            </div>

            <div id="pharPatientAutofillContainer" class="cv-patient-autofill-wrapper">
              ${renderPatientAutofillHtml(pharSelectedPatient)}
            </div>
          </div>
        </div>

        <!-- 2. Medicine Selection & Dispensing Card -->
        <div class="cv-pharmacy-card">
          <div class="cv-pharmacy-card-header">
            <div class="cv-pharmacy-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              2. Medicine Selection &amp; Dispensing
            </div>
            <div id="pharStockStatusPill">
              <span class="cv-stock-info-pill cv-stock-in">Select a medicine to view stock</span>
            </div>
          </div>

          <!-- Medicine Search (Name, Medicine ID, Batch Number) -->
          <div style="margin-bottom:0.75rem; position:relative;">
            <label for="pharMedicineSearchInput" style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.25rem; letter-spacing:0.02em;">
              <svg style="width:14px; height:14px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              MEDICINE SEARCH
            </label>
            <div style="position:relative; width:100%;">
              <input type="text" id="pharMedicineSearchInput" class="cv-form-input" placeholder="Search medicine / medicine ID / batch number" autocomplete="off" style="height:38px; font-size:0.86rem; width:100%;">
              <div id="pharMedicineDropdown" class="cv-patient-dropdown" style="display:none; max-height:280px; overflow-y:auto; width:100%; z-index:100; position:absolute; top:calc(100% + 4px); left:0; right:0; box-shadow:var(--cv-shadow-lg); background:var(--cv-surface); border:1px solid var(--cv-border); border-radius:var(--cv-radius-md);"></div>
            </div>
          </div>

          <div class="cv-medicine-add-grid">
            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">
                MEDICINE MASTER <span style="color:var(--cv-danger);">*</span>
              </label>
              <select id="pharMedicineSelect" class="cv-form-select" style="height:38px; font-size:0.86rem; width:100%;">
                <option value="">-- Search &amp; Select Medicine --</option>
                ${pharMedicinesCatalog.map(m => `
                  <option value="${m.id}" data-code="${escapeHtml(m.medicineCode)}" data-name="${escapeHtml(m.name)}" data-batch="${escapeHtml(m.batchNumber)}" data-price="${m.unitPrice}" data-stock="${m.stockQuantity}" data-exp="${escapeHtml(m.expiryDate || '')}">
                    ${escapeHtml(m.name)} (${escapeHtml(m.medicineCode)}) | Batch: ${escapeHtml(m.batchNumber)} | Stock: ${m.stockQuantity} | ₹${m.unitPrice}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">BATCH NO</label>
              <input type="text" id="pharMedicineBatch" class="cv-form-input" style="height:38px; font-size:0.84rem; background:#f8fafc;" readonly placeholder="Batch">
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">EXPIRY</label>
              <input type="text" id="pharMedicineExpiry" class="cv-form-input" style="height:38px; font-size:0.84rem; background:#f8fafc;" readonly placeholder="YYYY-MM-DD">
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">
                QTY <span style="color:var(--cv-danger);">*</span>
              </label>
              <input type="number" id="pharMedicineQty" class="cv-form-input" min="1" value="1" style="height:38px; font-weight:700; text-align:center;">
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">UNIT PRICE (₹)</label>
              <input type="number" id="pharMedicineUnitPrice" class="cv-form-input" min="0" step="0.01" value="0.00" style="height:38px; font-weight:700; text-align:right;">
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">AMOUNT (₹)</label>
              <input type="text" id="pharMedicineAmount" class="cv-form-input" style="height:38px; font-weight:700; text-align:right; background:#f8fafc;" readonly value="0.00">
            </div>

            <div>
              <button type="button" class="cv-btn-primary" id="btnPharAddMedicine" style="height:38px; padding:0 1.2rem; font-size:0.85rem; font-weight:700; white-space:nowrap; display:inline-flex; align-items:center; gap:0.4rem;">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                + Add to Bill
              </button>
            </div>
          </div>

          <div id="pharStockErrorHint" style="display:none; color:var(--cv-danger); font-size:0.78rem; font-weight:600; margin-top:0.4rem;"></div>
        </div>

        <!-- 3. Selected Medicines / Bill Table Card (Full Width) -->
        <div class="cv-pharmacy-card">
          <div class="cv-pharmacy-card-header">
            <div class="cv-pharmacy-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              3. Selected Medicines / Bill Table
              <span id="pharItemCountBadge" style="font-size:0.75rem; background:#e0f2fe; color:#0369a1; padding:0.12rem 0.5rem; border-radius:12px; margin-left:0.5rem; font-weight:700;">
                ${pharBillItems.length} items
              </span>
            </div>
            ${pharBillItems.length > 0 ? `
              <button type="button" class="cv-btn-secondary" id="btnPharClearAllItems" style="padding:0.25rem 0.65rem; font-size:0.75rem; color:var(--cv-danger);">
                Clear All
              </button>
            ` : ''}
          </div>

          <div class="cv-bill-table-wrapper">
            <table class="cv-bill-table" id="pharBillTable">
              <thead>
                <tr>
                  <th style="width:45px; text-align:center;">#</th>
                  <th>Medicine</th>
                  <th style="width:130px;">Batch</th>
                  <th style="width:115px;">Expiry</th>
                  <th style="width:95px; text-align:center;">Qty</th>
                  <th style="width:125px; text-align:right;">Unit Price (₹)</th>
                  <th style="width:125px; text-align:right;">Amount (₹)</th>
                  <th style="width:70px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody id="pharBillTableBody">
                ${renderBillItemsTableBodyHtml()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. Billing & Payment Summary Card (Positioned Directly Below Bill Table) -->
        <div class="cv-pharmacy-card cv-pharmacy-summary-card">
          <div class="cv-pharmacy-card-header" style="margin-bottom:0.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.35rem;">
            <div class="cv-pharmacy-card-title" style="font-size:0.88rem;">
              <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              4. Billing &amp; Payment Summary
            </div>
            <span style="font-size:0.75rem; color:var(--cv-text-muted); font-weight:600;">Tax Invoice &amp; Settlement</span>
          </div>
          
          <div class="cv-pharmacy-summary-grid">
            
            <!-- Left Column: Bill & Tax Calculation -->
            <div class="cv-summary-calc-col">
              <div class="cv-calc-row">
                <span class="cv-calc-label">Subtotal</span>
                <span id="pharSummarySubtotal" class="cv-calc-value">₹0.00</span>
              </div>
              
              <div class="cv-calc-row">
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span class="cv-calc-label">Discount</span>
                  <div style="display:inline-flex; align-items:center; gap:0.2rem;">
                    <input type="number" id="pharDiscountPct" class="cv-calc-input" min="0" max="100" step="0.5" value="0">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted);">%</span>
                  </div>
                </div>
                <span id="pharDiscountAmount" style="font-weight:700; color:var(--cv-danger); font-size:0.86rem;">- ₹0.00</span>
              </div>
              
              <div class="cv-calc-row">
                <span class="cv-calc-label">Net Taxable Amount</span>
                <span id="pharNetAmount" class="cv-calc-value">₹0.00</span>
              </div>
              
              <div class="cv-calc-row">
                <span class="cv-calc-label">GSTIN / GST Number</span>
                <input type="text" id="pharGstNumber" class="cv-form-input" style="height:26px; width:155px; font-size:0.74rem; font-family:monospace; text-transform:uppercase; text-align:right;" placeholder="22AAAAA0000A1Z5" value="22AAAAA0000A1Z5">
              </div>

              <div class="cv-calc-row">
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span class="cv-calc-label">GST</span>
                  <div style="display:inline-flex; align-items:center; gap:0.2rem;">
                    <input type="number" id="pharGstPct" class="cv-calc-input" min="0" max="28" step="0.5" value="5.0">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted);">%</span>
                  </div>
                </div>
                <span id="pharGstAmount" style="font-weight:700; color:#0369a1; font-size:0.86rem;">+ ₹0.00</span>
              </div>
              
              <div class="final-total-highlight">
                <div>
                  <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--cv-primary); font-weight:800;">Amount Payable</div>
                  <div style="font-size:0.95rem; font-weight:800; color:#0f172a; line-height:1.1;">FINAL TOTAL</div>
                </div>
                <span id="pharFinalTotal" class="cv-final-total-amount">₹0.00</span>
              </div>
            </div>

            <!-- Right Column: Payment & Settlement -->
            <div class="cv-summary-pay-col">
              
              <div class="cv-calc-row">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span class="cv-calc-label" style="font-weight:700; color:#0f172a;">Amount Paid (₹) <span style="color:var(--cv-danger);">*</span></span>
                  <button type="button" id="btnPharPayFull" class="cv-link-btn" title="Set paid amount equal to total">Pay Full</button>
                </div>
                <input type="number" id="pharPaidAmount" class="cv-form-input" min="0" step="0.01" value="0.00" style="height:26px; width:110px; font-weight:700; font-size:0.9rem; text-align:right; color:#0f172a;">
              </div>

              <div class="cv-calc-row">
                <span class="cv-calc-label">Balance Due</span>
                <span id="pharBalanceAmount" style="font-size:1.05rem; font-weight:800; color:var(--cv-danger);">₹0.00</span>
              </div>

              <div class="cv-calc-row">
                <span class="cv-calc-label">Payment Status</span>
                <span id="pharPaymentStatusBadge" class="cv-payment-balance-badge cv-badge-paid" style="font-size:0.68rem; padding:0.12rem 0.55rem;">PAID</span>
              </div>

              <div class="cv-calc-row">
                <span class="cv-calc-label">Payment Method</span>
                <select id="pharPaymentMethod" class="cv-form-select" style="height:26px; width:155px; font-size:0.78rem; padding:0.1rem 0.35rem;">
                  <option value="CASH">Cash Payment</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="INSURANCE">Insurance TPA</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div class="cv-calc-row">
                <span class="cv-calc-label">Dispensing Notes</span>
                <input type="text" id="pharNotes" class="cv-form-input" style="height:26px; width:180px; font-size:0.78rem; padding:0.1rem 0.4rem;" placeholder="Prescription ref / notes...">
              </div>

              <!-- Action Buttons -->
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <button type="button" class="cv-btn-secondary" id="btnPharResetBill" style="flex:1; height:32px; font-weight:600; font-size:0.82rem; padding:0 0.5rem;">
                  Reset
                </button>
                <button type="button" class="cv-btn-primary" id="btnPharGenerateBill" style="flex:2; height:32px; font-weight:700; font-size:0.84rem; display:inline-flex; align-items:center; justify-content:center; gap:0.4rem; box-shadow:0 1px 4px rgba(37, 99, 235, 0.2);">
                  <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Generate &amp; Save Bill
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

`;

    // Setup interactive events
    setupPharmacyBillingEvents();
    recalculatePharmacyBill();
  }

  function renderPatientAutofillHtml(patient) {
    if (!patient) {
      return `
        <div class="cv-walkin-box">
          <div class="cv-walkin-label">
            <svg style="width:15px; height:15px; color:var(--cv-primary); flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span>Or Walk-in Patient:</span>
          </div>
          <div class="cv-walkin-inputs">
            <input type="text" id="pharWalkinName" class="cv-form-input" placeholder="Walk-in Patient Name">
            <input type="text" id="pharWalkinPhone" class="cv-form-input" placeholder="Phone Number">
          </div>
        </div>
      `;
    }

    return `
      <div class="cv-autofill-banner">
        <div class="cv-autofill-grid">
          <div class="cv-autofill-item">
            <label>Patient Name</label>
            <span>${escapeHtml(patient.fullName || patient.name || '')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>UHID</label>
            <span style="font-family:monospace; color:var(--cv-primary);">${escapeHtml(patient.uhid || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>OP ID</label>
            <span style="font-family:monospace;">${escapeHtml(patient.opId || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>IP ID</label>
            <span style="font-family:monospace;">${escapeHtml(patient.ipId || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Phone Number</label>
            <span>${escapeHtml(patient.phone || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Age &bull; Gender</label>
            <span>${patient.age ? patient.age + ' yrs' : 'N/A'} &bull; ${escapeHtml(patient.gender || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Consulting Doctor</label>
            <span>${escapeHtml(patient.doctorName || 'Dr. On Duty')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Department</label>
            <span>${escapeHtml(patient.department || 'General Medicine')}</span>
          </div>
        </div>
        <button type="button" class="cv-btn-secondary" id="btnPharClearPatient" style="padding:0.3rem 0.6rem; font-size:0.75rem; white-space:nowrap; align-self:center;">
          Change Patient
        </button>
      </div>
    `;
  }

  function renderBillItemsTableBodyHtml() {
    if (!pharBillItems || pharBillItems.length === 0) {
      return `
        <tr>
          <td colspan="8" style="text-align:center; padding:1.25rem; color:var(--cv-text-muted); font-size:0.85rem;">
            No medicines added to bill yet. Select a medicine from above and click <strong>+ Add to Bill</strong>.
          </td>
        </tr>
      `;
    }

    return pharBillItems.map((item, idx) => `
      <tr data-index="${idx}">
        <td style="color:var(--cv-text-muted); font-weight:600;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:var(--cv-text-main);">${escapeHtml(item.medicineName)}</div>
          <div style="font-size:0.72rem; color:var(--cv-text-muted); font-family:monospace;">${escapeHtml(item.medicineCode)}</div>
        </td>
        <td><span style="font-family:monospace; font-size:0.8rem; background:#f1f5f9; padding:0.15rem 0.4rem; border-radius:4px;">${escapeHtml(item.batchNumber)}</span></td>
        <td style="font-size:0.78rem; color:var(--cv-text-muted);">${escapeHtml(item.expiryDate || 'N/A')}</td>
        <td style="text-align:center;">
          <input type="number" class="cv-bill-input-qty phar-item-qty" data-index="${idx}" min="1" max="${item.maxStock}" value="${item.quantity}">
        </td>
        <td style="text-align:right;">
          <input type="number" class="cv-bill-input-rate phar-item-rate" data-index="${idx}" min="0" step="0.01" value="${Number(item.unitPrice).toFixed(2)}">
        </td>
        <td style="text-align:right; font-weight:700; color:#0f172a;">
          ₹${formatCurrency(item.amount)}
        </td>
        <td style="text-align:center;">
          <button type="button" class="cv-btn-icon-danger btn-remove-phar-item" data-index="${idx}" title="Remove item" style="background:none; border:none; cursor:pointer; color:var(--cv-danger); padding:4px;">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function setupPharmacyBillingEvents() {
    // 1. Patient search autocomplete
    const searchInput = document.getElementById('pharPatientSearchInput');
    const dropdown = document.getElementById('pharPatientDropdown');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (pharPatientSearchDebounce) clearTimeout(pharPatientSearchDebounce);

        if (q.length < 2) {
          dropdown.style.display = 'none';
          dropdown.innerHTML = '';
          return;
        }

        pharPatientSearchDebounce = setTimeout(async () => {
          try {
            const res = await cvFetch(`/api/pharmacy/patients/search?q=${encodeURIComponent(q)}`);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
              const sorted = sortByStartsWith(res.data, q);
              dropdown.innerHTML = sorted.map(p => `
                <div class="cv-patient-dropdown-item" data-patient='${JSON.stringify(p).replace(/'/g, "&apos;")}'>
                  <div>
                    <div style="font-weight:700; color:var(--cv-text-main); font-size:0.9rem;">
                      ${escapeHtml(p.fullName)}
                    </div>
                    <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; gap:0.5rem; margin-top:0.15rem;">
                      <span>UHID: <strong style="color:var(--cv-primary); font-family:monospace;">${escapeHtml(p.uhid)}</strong></span>
                      ${p.opId ? `<span>OP: <strong style="font-family:monospace;">${escapeHtml(p.opId)}</strong></span>` : ''}
                      ${p.ipId ? `<span>IP: <strong style="font-family:monospace;">${escapeHtml(p.ipId)}</strong></span>` : ''}
                      <span>Phone: ${escapeHtml(p.phone || 'N/A')}</span>
                    </div>
                  </div>
                  <div>
                    <span style="font-size:0.72rem; background:#dbeafe; color:#1e40af; padding:0.2rem 0.5rem; border-radius:12px; font-weight:700;">Select</span>
                  </div>
                </div>
              `).join('');
              dropdown.style.display = 'block';

              dropdown.querySelectorAll('.cv-patient-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                  try {
                    const pData = JSON.parse(item.getAttribute('data-patient'));
                    selectPharmacyPatient(pData);
                  } catch (err) {
                    console.error('Error selecting patient:', err);
                  }
                });
              });
            } else {
              dropdown.innerHTML = `<div style="padding:0.75rem 1rem; color:var(--cv-text-muted); font-size:0.85rem;">No matching patients found.</div>`;
              dropdown.style.display = 'block';
            }
          } catch (err) {
            console.error('Patient search error:', err);
          }
        }, 250);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    }

    // Clear patient button
    document.getElementById('btnPharClearPatient')?.addEventListener('click', clearPharmacyPatient);

    // Medicine Search autocomplete (Name, Medicine ID, Batch Number)
    const medSearchInput = document.getElementById('pharMedicineSearchInput');
    const medDropdown = document.getElementById('pharMedicineDropdown');
    const medSelect = document.getElementById('pharMedicineSelect');
    let medSearchDebounce = null;

    if (medSearchInput && medDropdown) {
      medSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (medSearchDebounce) clearTimeout(medSearchDebounce);

        if (q.length < 2) {
          medDropdown.style.display = 'none';
          medDropdown.innerHTML = '';
          return;
        }

        medSearchDebounce = setTimeout(async () => {
          try {
            const res = await cvFetch(`/api/pharmacy/medicines?q=${encodeURIComponent(q)}`);
            let items = [];
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
              items = res.data;
            } else if (pharMedicinesCatalog && pharMedicinesCatalog.length > 0) {
              const lowerQ = q.toLowerCase();
              items = pharMedicinesCatalog.filter(m =>
                (m.name && m.name.toLowerCase().includes(lowerQ)) ||
                (m.medicineCode && m.medicineCode.toLowerCase().includes(lowerQ)) ||
                (m.batchNumber && m.batchNumber.toLowerCase().includes(lowerQ)) ||
                (m.genericName && m.genericName.toLowerCase().includes(lowerQ))
              );
            }

            if (items.length > 0) {
              const sorted = sortByStartsWith(items, q, 'name');
              medDropdown.innerHTML = sorted.map(m => `
                <div class="cv-patient-dropdown-item cv-med-result-item" data-id="${m.id}" data-name="${escapeHtml(m.name)}" data-batch="${escapeHtml(m.batchNumber || '')}">
                  <div style="flex:1;">
                    <div style="font-weight:700; color:var(--cv-text-main); font-size:0.88rem;">
                      ${escapeHtml(m.name)}
                      <span style="font-size:0.75rem; color:var(--cv-primary); font-family:monospace; margin-left:0.35rem;">(${escapeHtml(m.medicineCode || '')})</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; gap:0.65rem; margin-top:0.2rem; flex-wrap:wrap;">
                      <span>Batch: <strong style="font-family:monospace; color:var(--cv-text-primary);">${escapeHtml(m.batchNumber || 'N/A')}</strong></span>
                      <span>Stock: <strong style="color:${m.stockQuantity <= 0 ? 'var(--cv-danger)' : (m.stockQuantity <= 15 ? 'var(--cv-warning)' : 'var(--cv-success)')};">${m.stockQuantity}</strong></span>
                      <span>Price: <strong>₹${formatCurrency(m.unitPrice)}</strong></span>
                      <span>Expiry: ${escapeHtml(m.expiryDate || 'N/A')}</span>
                    </div>
                  </div>
                  <div>
                    <span style="font-size:0.72rem; background:#dbeafe; color:#1e40af; padding:0.2rem 0.5rem; border-radius:12px; font-weight:700;">Select</span>
                  </div>
                </div>
              `).join('');
              medDropdown.style.display = 'block';

              medDropdown.querySelectorAll('.cv-med-result-item').forEach(el => {
                el.addEventListener('click', () => {
                  const medId = el.getAttribute('data-id');
                  const medName = el.getAttribute('data-name');
                  const medBatch = el.getAttribute('data-batch');
                  if (medSelect) {
                    medSelect.value = medId;
                    medSelect.dispatchEvent(new Event('change'));
                  }
                  medSearchInput.value = `${medName} (Batch: ${medBatch})`;
                  medDropdown.style.display = 'none';
                });
              });
            } else {
              medDropdown.innerHTML = `<div style="padding:0.75rem 1rem; color:var(--cv-text-muted); font-size:0.85rem; text-align:center;">No medicines found matching "<strong>${escapeHtml(q)}</strong>".</div>`;
              medDropdown.style.display = 'block';
            }
          } catch (err) {
            console.error('Medicine search error:', err);
          }
        }, 200);
      });

      document.addEventListener('click', (e) => {
        if (!medSearchInput.contains(e.target) && !medDropdown.contains(e.target)) {
          medDropdown.style.display = 'none';
        }
      });
    }

    // 2. Medicine selection change
    const batchInput = document.getElementById('pharMedicineBatch');
    const expInput = document.getElementById('pharMedicineExpiry');
    const qtyInput = document.getElementById('pharMedicineQty');
    const priceInput = document.getElementById('pharMedicineUnitPrice');
    const amtInput = document.getElementById('pharMedicineAmount');
    const stockPill = document.getElementById('pharStockStatusPill');
    const stockHint = document.getElementById('pharStockErrorHint');

    function updateMedicineInputAmount() {
      const q = parseInt(qtyInput?.value) || 0;
      const p = parseFloat(priceInput?.value) || 0;
      if (amtInput) amtInput.value = (q * p).toFixed(2);

      // Validate stock
      const opt = medSelect?.selectedOptions?.[0];
      if (opt && opt.value) {
        const stock = parseInt(opt.getAttribute('data-stock')) || 0;
        if (q > stock) {
          if (stockHint) {
            stockHint.textContent = `Only ${stock} units are available in stock.`;
            stockHint.style.display = 'block';
          }
        } else {
          if (stockHint) stockHint.style.display = 'none';
        }
      }
    }

    if (medSelect) {
      medSelect.addEventListener('change', () => {
        const opt = medSelect.selectedOptions[0];
        if (opt && opt.value) {
          const batch = opt.getAttribute('data-batch') || '';
          const exp = opt.getAttribute('data-exp') || '';
          const price = parseFloat(opt.getAttribute('data-price')) || 0;
          const stock = parseInt(opt.getAttribute('data-stock')) || 0;

          if (batchInput) batchInput.value = batch;
          if (expInput) expInput.value = exp;
          if (priceInput) priceInput.value = price.toFixed(2);
          if (qtyInput) qtyInput.value = 1;

          if (stockPill) {
            if (stock <= 0) {
              stockPill.innerHTML = `<span class="cv-stock-info-pill cv-stock-out">OUT OF STOCK (0 units)</span>`;
            } else if (stock <= 15) {
              stockPill.innerHTML = `<span class="cv-stock-info-pill cv-stock-low">LOW STOCK (${stock} units available)</span>`;
            } else {
              stockPill.innerHTML = `<span class="cv-stock-info-pill cv-stock-in">${stock} units available in stock</span>`;
            }
          }
          updateMedicineInputAmount();
        } else {
          if (batchInput) batchInput.value = '';
          if (expInput) expInput.value = '';
          if (priceInput) priceInput.value = '0.00';
          if (amtInput) amtInput.value = '0.00';
          if (stockPill) stockPill.innerHTML = `<span class="cv-stock-info-pill cv-stock-in">Select a medicine to view stock</span>`;
          if (stockHint) stockHint.style.display = 'none';
        }
      });
    }

    qtyInput?.addEventListener('input', updateMedicineInputAmount);
    priceInput?.addEventListener('input', updateMedicineInputAmount);

    // 3. Add to Bill button
    document.getElementById('btnPharAddMedicine')?.addEventListener('click', addMedicineToBill);

    // 4. Clear all items
    document.getElementById('btnPharClearAllItems')?.addEventListener('click', () => {
      pharBillItems = [];
      refreshBillTable();
    });

    // 5. Table Inline edits (Quantity, Rate, Remove)
    wireBillTableInputs();

    // 6. Summary Card dynamic calculation inputs
    document.getElementById('pharDiscountPct')?.addEventListener('input', recalculatePharmacyBill);
    document.getElementById('pharGstPct')?.addEventListener('input', recalculatePharmacyBill);
    document.getElementById('pharPaidAmount')?.addEventListener('input', recalculatePharmacyBill);

    // Pay Full shortcut button
    document.getElementById('btnPharPayFull')?.addEventListener('click', () => {
      const finalTotalStr = document.getElementById('pharFinalTotal')?.textContent.replace(/[^0-9.]/g, '') || '0';
      const paidInput = document.getElementById('pharPaidAmount');
      if (paidInput) {
        paidInput.value = parseFloat(finalTotalStr).toFixed(2);
        recalculatePharmacyBill();
      }
    });

    // 7. Reset bill button
    document.getElementById('btnPharResetBill')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset this bill? All selected medicines will be cleared.')) {
        pharBillItems = [];
        clearPharmacyPatient();
        renderPharmacyBillingTab();
      }
    });

    // 8. Generate & Save Bill
    document.getElementById('btnPharGenerateBill')?.addEventListener('click', generatePharmacyBill);
  }

  function selectPharmacyPatient(p) {
    pharSelectedPatient = p;
    const searchInput = document.getElementById('pharPatientSearchInput');
    const dropdown = document.getElementById('pharPatientDropdown');
    const container = document.getElementById('pharPatientAutofillContainer');

    if (searchInput) searchInput.value = `${p.fullName} (${p.uhid})`;
    if (dropdown) dropdown.style.display = 'none';
    if (container) {
      container.innerHTML = renderPatientAutofillHtml(pharSelectedPatient);
      document.getElementById('btnPharClearPatient')?.addEventListener('click', clearPharmacyPatient);
    }
  }

  function clearPharmacyPatient() {
    pharSelectedPatient = null;
    const searchInput = document.getElementById('pharPatientSearchInput');
    const container = document.getElementById('pharPatientAutofillContainer');
    if (searchInput) searchInput.value = '';
    if (container) {
      container.innerHTML = renderPatientAutofillHtml(null);
    }
  }

  function addMedicineToBill() {
    const medSelect = document.getElementById('pharMedicineSelect');
    const opt = medSelect?.selectedOptions?.[0];
    if (!opt || !opt.value) {
      alert('Please select a medicine to add to bill.');
      return;
    }

    const medId = parseInt(opt.value);
    const medCode = opt.getAttribute('data-code');
    const medName = opt.getAttribute('data-name');
    const batch = opt.getAttribute('data-batch');
    const exp = opt.getAttribute('data-exp');
    const maxStock = parseInt(opt.getAttribute('data-stock')) || 0;

    const qty = parseInt(document.getElementById('pharMedicineQty')?.value) || 0;
    const unitPrice = parseFloat(document.getElementById('pharMedicineUnitPrice')?.value) || 0;

    if (qty <= 0) {
      alert('Please enter a valid quantity of 1 or more.');
      return;
    }

    // Stock validation
    if (maxStock <= 0) {
      alert('This medicine is out of stock.');
      return;
    }

    const existingIdx = pharBillItems.findIndex(i => i.medicineId === medId && i.batchNumber === batch);
    const alreadyAddedQty = existingIdx >= 0 ? pharBillItems[existingIdx].quantity : 0;
    const totalRequested = alreadyAddedQty + qty;

    if (totalRequested > maxStock) {
      alert(`Only ${maxStock} units are available.`);
      return;
    }

    if (existingIdx >= 0) {
      pharBillItems[existingIdx].quantity = totalRequested;
      pharBillItems[existingIdx].unitPrice = unitPrice;
      pharBillItems[existingIdx].amount = parseFloat((totalRequested * unitPrice).toFixed(2));
    } else {
      pharBillItems.push({
        medicineId: medId,
        medicineCode: medCode,
        medicineName: medName,
        batchNumber: batch,
        expiryDate: exp,
        quantity: qty,
        unitPrice: unitPrice,
        amount: parseFloat((qty * unitPrice).toFixed(2)),
        maxStock: maxStock
      });
    }

    // Reset inputs
    medSelect.value = '';
    document.getElementById('pharMedicineBatch').value = '';
    document.getElementById('pharMedicineExpiry').value = '';
    document.getElementById('pharMedicineUnitPrice').value = '0.00';
    document.getElementById('pharMedicineAmount').value = '0.00';
    document.getElementById('pharMedicineQty').value = '1';
    document.getElementById('pharStockStatusPill').innerHTML = `<span class="cv-stock-info-pill cv-stock-in">Select a medicine to view stock</span>`;
    document.getElementById('pharStockErrorHint').style.display = 'none';

    refreshBillTable();
  }

  function refreshBillTable() {
    const tbody = document.getElementById('pharBillTableBody');
    const countBadge = document.getElementById('pharItemCountBadge');
    if (tbody) tbody.innerHTML = renderBillItemsTableBodyHtml();
    if (countBadge) countBadge.textContent = `${pharBillItems.length} items`;

    wireBillTableInputs();
    recalculatePharmacyBill();
  }

  function wireBillTableInputs() {
    // Quantity inline edit
    document.querySelectorAll('.phar-item-qty').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const item = pharBillItems[idx];
        if (!item) return;

        let newQty = parseInt(e.target.value) || 1;
        if (newQty <= 0) newQty = 1;

        if (newQty > item.maxStock) {
          alert(`Only ${item.maxStock} units are available.`);
          newQty = item.maxStock;
          e.target.value = newQty;
        }

        item.quantity = newQty;
        item.amount = parseFloat((newQty * item.unitPrice).toFixed(2));
        refreshBillTable();
      });
    });

    // Rate inline edit
    document.querySelectorAll('.phar-item-rate').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const item = pharBillItems[idx];
        if (!item) return;

        let newRate = parseFloat(e.target.value) || 0;
        if (newRate < 0) newRate = 0;

        item.unitPrice = newRate;
        item.amount = parseFloat((item.quantity * newRate).toFixed(2));
        refreshBillTable();
      });
    });

    // Remove buttons
    document.querySelectorAll('.btn-remove-phar-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnElem = e.currentTarget;
        const idx = parseInt(btnElem.getAttribute('data-index'));
        if (idx >= 0 && idx < pharBillItems.length) {
          pharBillItems.splice(idx, 1);
          refreshBillTable();
        }
      });
    });
  }

  function recalculatePharmacyBill() {
    let subtotal = 0;
    pharBillItems.forEach(item => {
      const q = parseInt(item.quantity) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      item.amount = parseFloat((q * p).toFixed(2));
      subtotal += item.amount;
    });
    subtotal = parseFloat(subtotal.toFixed(2));

    const discountPct = parseFloat(document.getElementById('pharDiscountPct')?.value) || 0;
    const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
    const netAmount = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));

    const gstPct = parseFloat(document.getElementById('pharGstPct')?.value) || 0;
    const gstAmount = parseFloat(((netAmount * gstPct) / 100).toFixed(2));
    const finalTotal = parseFloat((netAmount + gstAmount).toFixed(2));

    let paidAmount = parseFloat(document.getElementById('pharPaidAmount')?.value) || 0;
    if (paidAmount < 0) paidAmount = 0;

    let balance = parseFloat(Math.max(0, finalTotal - paidAmount).toFixed(2));

    let status = 'UNPAID';
    let statusClass = 'cv-badge-unpaid';

    if (finalTotal > 0) {
      if (paidAmount >= finalTotal) {
        status = 'PAID';
        statusClass = 'cv-badge-paid';
        balance = 0;
      } else if (paidAmount > 0) {
        status = 'PARTIALLY PAID';
        statusClass = 'cv-badge-partial';
      } else {
        status = 'UNPAID';
        statusClass = 'cv-badge-unpaid';
      }
    } else {
      status = 'PAID';
      statusClass = 'cv-badge-paid';
      balance = 0;
    }

    // Update DOM displays
    const subtotalElem = document.getElementById('pharSummarySubtotal');
    if (subtotalElem) subtotalElem.textContent = `₹${formatCurrency(subtotal)}`;

    const discountAmtElem = document.getElementById('pharDiscountAmount');
    if (discountAmtElem) discountAmtElem.textContent = `- ₹${formatCurrency(discountAmount)}`;

    const netAmountElem = document.getElementById('pharNetAmount');
    if (netAmountElem) netAmountElem.textContent = `₹${formatCurrency(netAmount)}`;

    const gstAmountElem = document.getElementById('pharGstAmount');
    if (gstAmountElem) gstAmountElem.textContent = `+ ₹${formatCurrency(gstAmount)}`;

    const finalTotalElem = document.getElementById('pharFinalTotal');
    if (finalTotalElem) finalTotalElem.textContent = `₹${formatCurrency(finalTotal)}`;

    const balanceElem = document.getElementById('pharBalanceAmount');
    if (balanceElem) balanceElem.textContent = `₹${formatCurrency(balance)}`;

    const statusBadge = document.getElementById('pharPaymentStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = status;
      statusBadge.className = `cv-payment-balance-badge ${statusClass}`;
    }
  }

  async function generatePharmacyBill() {
    // 1. Patient validation
    let patientName = '';
    let uhid = '';
    let phone = '';
    let opId = '';
    let ipId = '';
    let doctorName = '';
    let department = '';
    let patientId = null;

    if (pharSelectedPatient) {
      patientId = pharSelectedPatient.id;
      patientName = pharSelectedPatient.fullName || pharSelectedPatient.name || '';
      uhid = pharSelectedPatient.uhid || '';
      phone = pharSelectedPatient.phone || '';
      opId = pharSelectedPatient.opId || '';
      ipId = pharSelectedPatient.ipId || '';
      doctorName = pharSelectedPatient.doctorName || '';
      department = pharSelectedPatient.department || '';
    } else {
      const walkinName = document.getElementById('pharWalkinName')?.value?.trim();
      const walkinPhone = document.getElementById('pharWalkinPhone')?.value?.trim();
      if (!walkinName) {
        alert('Please search and select an existing patient, or enter a Walk-in patient name.');
        document.getElementById('pharPatientSearchInput')?.focus();
        return;
      }
      patientName = walkinName;
      phone = walkinPhone || '';
      uhid = 'WALKIN-' + Date.now().toString().slice(-6);
    }

    // 2. Medicines validation
    if (!pharBillItems || pharBillItems.length === 0) {
      alert('Please add at least one medicine to the bill.');
      return;
    }

    // 3. Stock validation
    for (const item of pharBillItems) {
      if (item.quantity <= 0) {
        alert(`Invalid quantity for medicine ${item.medicineName}.`);
        return;
      }
      if (item.quantity > item.maxStock) {
        alert(`Only ${item.maxStock} units are available for ${item.medicineName}.`);
        return;
      }
    }

    // Calculate financials
    const discountPct = parseFloat(document.getElementById('pharDiscountPct')?.value) || 0;
    const gstNumber = document.getElementById('pharGstNumber')?.value?.trim() || '22AAAAA0000A1Z5';
    const gstPct = parseFloat(document.getElementById('pharGstPct')?.value) || 0;
    const paidAmount = parseFloat(document.getElementById('pharPaidAmount')?.value) || 0;
    const paymentMethod = document.getElementById('pharPaymentMethod')?.value || 'CASH';
    const notes = document.getElementById('pharNotes')?.value?.trim() || '';

    // Calculate subtotal
    let subtotal = 0;
    const requestItems = pharBillItems.map(item => {
      const q = parseInt(item.quantity);
      const p = parseFloat(item.unitPrice);
      const tot = parseFloat((q * p).toFixed(2));
      subtotal += tot;
      return {
        medicineId: item.medicineId,
        medicineCode: item.medicineCode,
        medicineName: item.medicineName,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: q,
        unitPrice: p,
        totalPrice: tot
      };
    });

    const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
    const netAmount = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
    const gstAmount = parseFloat(((netAmount * gstPct) / 100).toFixed(2));

    const payload = {
      patientId: patientId,
      patientName: patientName,
      uhid: uhid,
      phone: phone,
      opId: opId,
      ipId: ipId,
      doctorName: doctorName,
      department: department,
      discountPercentage: discountPct,
      discountAmount: discountAmount,
      gstNumber: gstNumber,
      gstPercentage: gstPct,
      gstAmount: gstAmount,
      paidAmount: paidAmount,
      paymentMethod: paymentMethod,
      notes: notes,
      items: requestItems
    };

    const generateBtn = document.getElementById('btnPharGenerateBill');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = `<span class="cv-loading-spinner" style="width:16px; height:16px; border-width:2px; display:inline-block;"></span> Generating Bill...`;
    }

    try {
      const res = await cvFetch('/api/pharmacy/bills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.success && res.data) {
        alert('Pharmacy bill generated successfully.');

        const savedBill = res.data;

        // Clear current active bill
        pharBillItems = [];
        pharSelectedPatient = null;

        // Open Invoice Print Modal
        showPharmacyInvoiceModal(savedBill);

        // Re-render billing tab to refresh fresh stock balances
        renderPharmacyBillingTab();
      } else {
        alert(res?.message || 'Failed to generate pharmacy bill.');
      }
    } catch (err) {
      console.error('Error creating pharmacy bill:', err);
      alert('An error occurred while generating the pharmacy bill: ' + err.message);
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = `
          <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Generate &amp; Save Bill
        `;
      }
    }
  }

  // ------------------------------------------------------------------
  // TAB 2: PHARMACY SALES HISTORY
  // ------------------------------------------------------------------
  let pharHistoryPagination = null;

  async function renderPharmacyHistoryTab() {
    const container = document.getElementById('pharTabContent');
    if (!container) return;

    if (!pharHistoryPagination) {
      pharHistoryPagination = createHistoryPaginationController({
        defaultPageSize: 10,
        onPageChange: (pagedItems) => {
          document.getElementById('pharHistoryTableBody').innerHTML = renderHistoryTableBodyHtml(pagedItems);
          wireHistoryInvoiceButtons();
          const mount = document.getElementById('pharHistoryPaginationMount');
          if (mount) {
            mount.innerHTML = pharHistoryPagination.renderControlsHtml('pharHistory');
            pharHistoryPagination.bindEvents('pharHistory');
          }
        }
      });
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; min-height:220px;">
        <div class="cv-loading-spinner"></div>
      </div>
    `;

    try {
      const res = await cvFetch('/api/pharmacy/bills/history');
      if (res && res.success && Array.isArray(res.data)) {
        pharAllSalesHistory = res.data;
      } else {
        pharAllSalesHistory = [];
      }
    } catch (err) {
      console.error('Failed to load pharmacy history:', err);
      pharAllSalesHistory = [];
    }

    container.innerHTML = `
      <div class="cv-pharmacy-card cv-pharmacy-history-card">
        <div class="cv-pharmacy-card-header">
          <div>
            <div class="cv-pharmacy-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Pharmacy Sales &amp; Invoicing History
            </div>
            <p style="font-size:0.75rem; color:var(--cv-text-muted); margin-top:0.25rem;">
              Search across historical medicine sales, inspect line-items, and reprint dispensary tax invoices.
            </p>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <div class="cv-search-icon-input" style="width:320px;">
              <i class="fas fa-search">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </i>
              <input type="text" id="pharHistorySearchInput" placeholder="Search by Patient, UHID, OP ID, IP ID, Bill No..." autocomplete="off">
            </div>
            <button type="button" class="cv-btn-secondary" id="btnRefreshPharHistory" style="padding:0.5rem 0.85rem; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.35rem;">
              <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh
            </button>
          </div>
        </div>

        <div class="cv-bill-table-wrapper" style="margin-top:0;">
          <table class="cv-bill-table">
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Date &amp; Time</th>
                <th>Patient Details</th>
                <th>Doctor / Dept</th>
                <th>Medicines</th>
                <th style="text-align:right;">Total (₹)</th>
                <th style="text-align:right;">Paid (₹)</th>
                <th style="text-align:right;">Balance (₹)</th>
                <th style="text-align:center;">Payment Status</th>
                <th style="text-align:center;">Invoice</th>
              </tr>
            </thead>
            <tbody id="pharHistoryTableBody">
              <!-- Populated via pagination -->
            </tbody>
          </table>
        </div>
        <div id="pharHistoryPaginationMount"></div>
      </div>
    `;

    function updatePharHistoryView(preservePage = false) {
      const q = (document.getElementById('pharHistorySearchInput')?.value || '').toLowerCase().trim();
      let filtered = pharAllSalesHistory;
      if (q) {
        filtered = filtered.filter(b => {
          return (b.billNumber && b.billNumber.toLowerCase().includes(q)) ||
                 (b.patientName && b.patientName.toLowerCase().includes(q)) ||
                 (b.uhid && b.uhid.toLowerCase().includes(q)) ||
                 (b.opId && b.opId.toLowerCase().includes(q)) ||
                 (b.ipId && b.ipId.toLowerCase().includes(q)) ||
                 (b.phone && b.phone.toLowerCase().includes(q));
        });
      }
      const paged = pharHistoryPagination.setItems(filtered, preservePage);
      document.getElementById('pharHistoryTableBody').innerHTML = renderHistoryTableBodyHtml(paged);
      wireHistoryInvoiceButtons();
      const mount = document.getElementById('pharHistoryPaginationMount');
      if (mount) {
        mount.innerHTML = pharHistoryPagination.renderControlsHtml('pharHistory');
        pharHistoryPagination.bindEvents('pharHistory');
      }
    }

    // Filter event
    const searchInput = document.getElementById('pharHistorySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => updatePharHistoryView(false));
    }

    document.getElementById('btnRefreshPharHistory')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnRefreshPharHistory');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:4px;"></span> Refreshing...';
      }
      try {
        const res = await cvFetch('/api/pharmacy/bills/history');
        if (res && res.success && Array.isArray(res.data)) {
          pharAllSalesHistory = res.data;
        }
        updatePharHistoryView(true);
      } catch (e) {
        console.error('Error refreshing pharmacy history:', e);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Refresh';
        }
      }
    });

    updatePharHistoryView(false);
  }

  function renderHistoryTableBodyHtml(bills) {
    if (!bills || bills.length === 0) {
      return `
        <tr>
          <td colspan="10" style="text-align:center; padding:2.5rem; color:var(--cv-text-muted);">
            No pharmacy sales records found.
          </td>
        </tr>
      `;
    }

    return bills.map(b => {
      let statusBadgeClass = 'cv-badge-unpaid';
      if (b.paymentStatus === 'PAID') statusBadgeClass = 'cv-badge-paid';
      else if (b.paymentStatus === 'PARTIALLY PAID') statusBadgeClass = 'cv-badge-partial';

      const itemsSummary = (b.items && b.items.length > 0)
        ? `${b.items.length} meds (${b.items.map(i => i.medicineName).slice(0, 2).join(', ')}${b.items.length > 2 ? '...' : ''})`
        : 'Medicines Dispensed';

      return `
        <tr>
          <td>
            <strong style="color:var(--cv-primary); font-family:monospace;">${escapeHtml(b.billNumber)}</strong>
          </td>
          <td style="font-size:0.8rem; color:var(--cv-text-muted);">
            <div>${escapeHtml(b.billDate || '')}</div>
            <div style="font-size:0.72rem;">${escapeHtml(b.billTime || '')}</div>
          </td>
          <td>
            <div style="font-weight:700; color:var(--cv-text-main);">${escapeHtml(b.patientName)}</div>
            <div style="font-size:0.72rem; color:var(--cv-text-muted);">
              UHID: <span style="font-family:monospace; color:var(--cv-primary);">${escapeHtml(b.uhid || 'N/A')}</span>
              ${b.opId ? `&bull; OP: ${escapeHtml(b.opId)}` : ''}
              ${b.ipId ? `&bull; IP: ${escapeHtml(b.ipId)}` : ''}
            </div>
          </td>
          <td style="font-size:0.8rem;">
            <div>${escapeHtml(b.doctorName || 'Consultant')}</div>
            <div style="font-size:0.72rem; color:var(--cv-text-muted);">${escapeHtml(b.department || 'General')}</div>
          </td>
          <td style="font-size:0.8rem; color:var(--cv-text-main);">
            ${escapeHtml(itemsSummary)}
          </td>
          <td style="text-align:right; font-weight:700; color:#0f172a;">
            ₹${formatCurrency(b.finalTotal || b.totalAmount)}
          </td>
          <td style="text-align:right; font-weight:600; color:var(--cv-success);">
            ₹${formatCurrency(b.paidAmount)}
          </td>
          <td style="text-align:right; font-weight:700; color:${b.balanceAmount > 0 ? 'var(--cv-danger)' : 'var(--cv-text-muted)'};">
            ₹${formatCurrency(b.balanceAmount)}
          </td>
          <td style="text-align:center;">
            <span class="cv-payment-balance-badge ${statusBadgeClass}">
              ${escapeHtml(b.paymentStatus)}
            </span>
          </td>
          <td style="text-align:center;">
            <button type="button" class="cv-btn-secondary btn-view-phar-invoice" data-bill-id="${b.id}" style="padding:0.3rem 0.65rem; font-size:0.75rem; display:inline-flex; align-items:center; gap:0.3rem;">
              <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              Invoice
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function wireHistoryInvoiceButtons() {
    document.querySelectorAll('.btn-view-phar-invoice').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-bill-id');
        try {
          const res = await cvFetch(`/api/pharmacy/bills/${id}`);
          if (res && res.success && res.data) {
            showPharmacyInvoiceModal(res.data);
          } else {
            alert('Failed to load invoice details.');
          }
        } catch (err) {
          console.error('Error loading invoice:', err);
          alert('Could not retrieve invoice.');
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // TAB 3: MEDICINE MASTER & STOCK
  // ------------------------------------------------------------------
  async function renderPharmacyInventoryTab() {
    const container = document.getElementById('pharTabContent');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; min-height:220px;">
        <div class="cv-loading-spinner"></div>
      </div>
    `;

    let summary = { totalMedicines: 0, lowStockCount: 0, todayBillsCount: 0, todayRevenue: 0 };
    let medicines = [];

    try {
      const [sumRes, medRes] = await Promise.all([
        cvFetch('/api/pharmacy/summary'),
        cvFetch('/api/pharmacy/medicines')
      ]);

      if (sumRes && sumRes.success && sumRes.data) summary = sumRes.data;
      if (medRes && medRes.success && Array.isArray(medRes.data)) medicines = medRes.data;
    } catch (err) {
      console.error('Failed to load pharmacy summary/inventory:', err);
    }

    container.innerHTML = `
      <!-- Top Metrics Row -->
      <div class="cv-pharmacy-metrics-row">
        <div class="cv-metric-card">
          <div class="cv-metric-label">Medicine Master Items</div>
          <div class="cv-metric-value" style="color:var(--cv-primary);">${summary.totalMedicines}</div>
          <span class="cv-metric-badge" style="background:#e0f2fe; color:#0369a1;">Verified Inventory</span>
        </div>
        <div class="cv-metric-card">
          <div class="cv-metric-label">Low Stock Alerts</div>
          <div class="cv-metric-value" style="color:${summary.lowStockCount > 0 ? 'var(--cv-danger)' : 'var(--cv-success)'};">${summary.lowStockCount}</div>
          <span class="cv-metric-badge" style="background:${summary.lowStockCount > 0 ? '#fee2e2' : '#dcfce7'}; color:${summary.lowStockCount > 0 ? '#b91c1c' : '#15803d'};">
            ${summary.lowStockCount > 0 ? 'Reorder Needed' : 'Adequate Stock'}
          </span>
        </div>
        <div class="cv-metric-card">
          <div class="cv-metric-label">Today's Sales Count</div>
          <div class="cv-metric-value">${summary.todayBillsCount}</div>
          <span class="cv-metric-badge" style="background:#f0fdfa; color:#0d9488;">Dispensary Receipts</span>
        </div>
        <div class="cv-metric-card">
          <div class="cv-metric-label">Today's Pharmacy Revenue</div>
          <div class="cv-metric-value" style="color:var(--cv-deep-blue);">&#8377;${formatCurrency(summary.todayRevenue)}</div>
          <span class="cv-metric-badge" style="background:#ecfdf5; color:#047857;">Money Management</span>
        </div>
      </div>

      <!-- Medicine Master Table Card -->
      <div class="cv-pharmacy-card cv-pharmacy-inventory-card">
        <div class="cv-pharmacy-card-header">
          <div>
            <div class="cv-pharmacy-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Hospital Medicine Master &amp; Batch Stock
            </div>
            <p style="font-size:0.75rem; color:var(--cv-text-muted); margin-top:0.25rem;">
              Manage dispensary catalog, monitor real-time batch stocks, reorder levels, and expiration dates.
            </p>
          </div>
          <div style="display:flex; gap:0.6rem; align-items:center;">
            <div class="cv-search-icon-input" style="width:260px;">
              <i class="fas fa-search">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </i>
              <input type="text" id="pharInventorySearchInput" placeholder="Search medicines, generic, batch..." autocomplete="off">
            </div>
            <button type="button" class="cv-btn-primary" id="btnOpenAddMedicineModal" style="padding:0.5rem 1rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Medicine
            </button>
          </div>
        </div>

        <div class="cv-bill-table-wrapper" style="margin-top:0;">
          <table class="cv-bill-table">
            <thead>
              <tr>
                <th style="width:90px;">Medicine ID</th>
                <th>Medicine Name &amp; Generic</th>
                <th>Category &bull; Form</th>
                <th>Strength</th>
                <th>Batch</th>
                <th>Supplier / Agency</th>
                <th>Expiry Date</th>
                <th style="text-align:right;">Purchase Price (₹)</th>
                <th style="text-align:right;">Selling Price (₹)</th>
                <th style="text-align:center;">Stock Qty</th>
                <th style="text-align:center;">Reorder Level</th>
                <th style="text-align:center;">Stock Status</th>
                <th style="text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody id="pharInventoryTableBody">
              ${renderInventoryTableBodyHtml(medicines)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Filter event
    const searchInput = document.getElementById('pharInventorySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
          document.getElementById('pharInventoryTableBody').innerHTML = renderInventoryTableBodyHtml(medicines);
          return;
        }

        const filtered = medicines.filter(m => {
          return (m.name && m.name.toLowerCase().includes(q)) ||
                 (m.genericName && m.genericName.toLowerCase().includes(q)) ||
                 (m.medicineCode && m.medicineCode.toLowerCase().includes(q)) ||
                 (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
                 (m.category && m.category.toLowerCase().includes(q)) ||
                 (m.supplier && m.supplier.toLowerCase().includes(q)) ||
                 (m.manufacturer && m.manufacturer.toLowerCase().includes(q));
        });

        document.getElementById('pharInventoryTableBody').innerHTML = renderInventoryTableBodyHtml(filtered);
      });
    }

    document.getElementById('btnOpenAddMedicineModal')?.addEventListener('click', showAddMedicineModal);
  }

  function renderInventoryTableBodyHtml(medicines) {
    if (!medicines || medicines.length === 0) {
      return `
        <tr>
          <td colspan="13" style="text-align:center; padding:2.5rem; color:var(--cv-text-muted);">
            No medicines in inventory yet. Click <strong>Add Medicine</strong> to register new inventory.
          </td>
        </tr>
      `;
    }

    return medicines.map(m => {
      let stockPillHtml = `<span class="cv-stock-info-pill cv-stock-in">${m.stockQuantity} in stock</span>`;
      if (m.expired) {
        stockPillHtml = `<span class="cv-stock-info-pill cv-stock-out">EXPIRED</span>`;
      } else if (m.stockQuantity <= 0) {
        stockPillHtml = `<span class="cv-stock-info-pill cv-stock-out">OUT OF STOCK (0)</span>`;
      } else if (m.nearExpiry) {
        stockPillHtml = `<span class="cv-stock-info-pill cv-stock-low" style="background:#ffedd5; color:#c2410c;">NEAR EXPIRY</span>`;
      } else if (m.lowStock) {
        stockPillHtml = `<span class="cv-stock-info-pill cv-stock-low">LOW STOCK (${m.stockQuantity})</span>`;
      }

      return `
        <tr>
          <td><strong style="color:var(--cv-primary); font-family:monospace;">${escapeHtml(m.medicineCode)}</strong></td>
          <td>
            <div style="font-weight:700; color:var(--cv-text-main);">${escapeHtml(m.name)}</div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted); font-style:italic;">${escapeHtml(m.genericName || '')}</div>
          </td>
          <td><span style="font-size:0.75rem; background:#f1f5f9; padding:0.2rem 0.5rem; border-radius:4px; font-weight:600;">${escapeHtml(m.category || 'Tablet')} &bull; ${escapeHtml(m.medicineForm || m.category || 'Tablet')}</span></td>
          <td><span style="font-size:0.8rem; font-weight:600;">${escapeHtml(m.dosageStrength || '—')}</span></td>
          <td><span style="font-family:monospace; font-size:0.8rem; background:#f8fafc; padding:0.15rem 0.4rem; border:1px solid #e2e8f0; border-radius:4px;">${escapeHtml(m.batchNumber)}</span></td>
          <td style="font-size:0.8rem; color:var(--cv-text-main); font-weight:500;">${escapeHtml(m.supplier || 'Direct Supply')}</td>
          <td style="font-size:0.82rem; ${m.expired ? 'color:var(--cv-danger); font-weight:700;' : ''}">${escapeHtml(m.expiryDate || 'N/A')}</td>
          <td style="text-align:right; font-size:0.85rem; color:var(--cv-text-muted);">₹${formatCurrency(m.costPrice || 0)}</td>
          <td style="text-align:right; font-weight:700; color:#0f172a;">₹${formatCurrency(m.unitPrice)}</td>
          <td style="text-align:center; font-weight:800; font-size:0.95rem;">${m.stockQuantity}</td>
          <td style="text-align:center; font-weight:600; color:var(--cv-text-muted);">${m.reorderLevel}</td>
          <td style="text-align:center;">${stockPillHtml}</td>
          <td style="text-align:center;"><span style="font-size:0.7rem; font-weight:700; background:#e0f2fe; color:#0369a1; padding:0.15rem 0.45rem; border-radius:12px;">${m.status || 'ACTIVE'}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ------------------------------------------------------------------
  // ADD MEDICINE MODAL (COMPACT ONE-SCREEN LAYOUT)
  // ------------------------------------------------------------------
  async function showAddMedicineModal() {
    const modalHost = document.getElementById('pharModalHost') || document.body;
    if (!modalHost) return;

    // Fetch next code and suppliers
    let defaultCode = '';
    let existingSuppliers = [];

    try {
      const [codeRes, supRes] = await Promise.all([
        cvFetch('/api/pharmacy/medicines/next-code'),
        cvFetch('/api/pharmacy/suppliers')
      ]);
      if (codeRes && codeRes.success && codeRes.data) {
        defaultCode = codeRes.data;
      }
      if (supRes && supRes.success && Array.isArray(supRes.data)) {
        existingSuppliers = supRes.data;
      }
    } catch (err) {
      console.warn('Could not prefetch medicine code or suppliers:', err);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    modalHost.innerHTML = `
      <style>
        .cv-med-modal-compact {
          width: 890px;
          max-width: 95vw;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(15, 23, 42, 0.08);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: cvModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cv-med-compact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          column-gap: 0.85rem;
          row-gap: 0.48rem;
        }
        .cv-med-compact-grid .cv-form-input,
        .cv-med-compact-grid .cv-form-select {
          height: 32px !important;
          padding: 0.2rem 0.55rem !important;
          font-size: 0.8rem !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .cv-med-compact-grid .cv-form-input:focus,
        .cv-med-compact-grid .cv-form-select:focus {
          border-color: var(--cv-primary) !important;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15) !important;
          outline: none !important;
        }
        .cv-med-compact-grid label {
          font-size: 0.67rem !important;
          font-weight: 700 !important;
          color: #475569 !important;
          margin-bottom: 0.15rem !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          text-transform: uppercase !important;
          letter-spacing: 0.025em !important;
          line-height: 1.1 !important;
        }
        .cv-med-span-2 {
          grid-column: span 2;
        }
        @media (max-width: 768px) {
          .cv-med-modal-compact {
            max-height: 92vh !important;
          }
          .cv-med-compact-grid {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
          }
          .cv-med-span-2 {
            grid-column: span 1 !important;
          }
          #formAddMedicine {
            overflow-y: auto !important;
          }
        }
      </style>

      <div class="cv-modal-backdrop show" id="addMedBackdrop" style="padding:1rem;">
        <div class="cv-med-modal-compact" id="addMedModalInner">
          
          <!-- COMPACT HEADER -->
          <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.25rem; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <div style="background:#dbeafe; color:var(--cv-primary); width:30px; height:30px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg style="width:17px; height:17px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              </div>
              <div>
                <h3 style="margin:0; font-size:0.98rem; font-weight:800; color:#0f172a; line-height:1.2;">Add New Medicine</h3>
                <p style="margin:0; font-size:0.71rem; color:var(--cv-text-muted); line-height:1.2;">Medicine master record, batch inventory, pricing &amp; supplier</p>
              </div>
            </div>
            <button type="button" id="btnCloseAddMedModal" style="background:none; border:none; font-size:1.35rem; cursor:pointer; color:var(--cv-text-muted); line-height:1; padding:0.2rem 0.4rem;" title="Close">&times;</button>
          </div>

          <!-- COMPACT FORM (6 BALANCED ROWS) -->
          <form id="formAddMedicine" style="display:flex; flex-direction:column; padding:0.75rem 1.25rem 0.5rem 1.25rem; overflow-y:visible;">
            
            <div class="cv-med-compact-grid" id="addMedGrid">
              
              <!-- ROW 1: Name, Code, Generic -->
              <div>
                <label for="newMedName">
                  <span>MEDICINE NAME <span style="color:var(--cv-danger);">*</span></span>
                </label>
                <input type="text" id="newMedName" class="cv-form-input" required placeholder="e.g. Paracetamol 500mg">
              </div>

              <div>
                <label for="newMedCode">
                  <span>MEDICINE ID / CODE <span style="color:var(--cv-danger);">*</span></span>
                </label>
                <input type="text" id="newMedCode" class="cv-form-input" required placeholder="e.g. MED-0001" value="${escapeHtml(defaultCode)}" style="font-family:monospace; font-weight:700; text-transform:uppercase;">
              </div>

              <div>
                <label for="newMedGeneric">
                  <span>GENERIC NAME</span>
                </label>
                <input type="text" id="newMedGeneric" class="cv-form-input" placeholder="e.g. Paracetamol IP">
              </div>

              <!-- ROW 2: Category, Form, Strength -->
              <div>
                <label for="newMedCategory">
                  <span>CATEGORY</span>
                </label>
                <select id="newMedCategory" class="cv-form-select">
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Cream">Cream</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Drops">Drops</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label for="newMedForm">
                  <span>MEDICINE FORM</span>
                </label>
                <select id="newMedForm" class="cv-form-select">
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Liquid / Syrup">Liquid / Syrup</option>
                  <option value="Injection / Ampoule">Injection / Ampoule</option>
                  <option value="Cream / Gel">Cream / Gel</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Eye / Ear Drops">Eye / Ear Drops</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Powder">Powder</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label for="newMedDosage">
                  <span>STRENGTH / DOSAGE</span>
                </label>
                <input type="text" id="newMedDosage" class="cv-form-input" placeholder="e.g. 500 mg, 5 ml">
              </div>

              <!-- ROW 3: Manufacturer, Agency/Supplier, Batch -->
              <div>
                <label for="newMedManufacturer">
                  <span>MANUFACTURER</span>
                </label>
                <input type="text" id="newMedManufacturer" class="cv-form-input" placeholder="e.g. Cipla Ltd, Sun Pharma">
              </div>

              <div>
                <label for="newMedSupplier">
                  <span>AGENCY / SUPPLIER</span>
                </label>
                <input type="text" id="newMedSupplier" list="pharSupplierDatalist" class="cv-form-input" placeholder="Select or enter supplier">
                <datalist id="pharSupplierDatalist">
                  ${existingSuppliers.map(s => `<option value="${escapeHtml(s)}">`).join('')}
                </datalist>
              </div>

              <div>
                <label for="newMedBatch">
                  <span>BATCH NUMBER <span style="color:var(--cv-danger);">*</span></span>
                </label>
                <input type="text" id="newMedBatch" class="cv-form-input" required placeholder="e.g. BATCH-2026-01" style="font-family:monospace; font-weight:600;">
              </div>

              <!-- ROW 4: Purchase Date, Expiry Date, Quantity -->
              <div>
                <label for="newMedPurchaseDate">
                  <span>PURCHASE DATE</span>
                </label>
                <input type="date" id="newMedPurchaseDate" class="cv-form-input" value="${todayStr}">
              </div>

              <div>
                <label for="newMedExpiry">
                  <span>EXPIRY DATE <span style="color:var(--cv-danger);">*</span></span>
                  <span id="newMedExpiryWarning" style="display:none; color:var(--cv-danger); font-size:0.65rem; font-weight:800; text-transform:none;">Expired!</span>
                </label>
                <input type="date" id="newMedExpiry" class="cv-form-input" required>
              </div>

              <div>
                <label for="newMedStock">
                  <span>OPENING QUANTITY <span style="color:var(--cv-danger);">*</span></span>
                </label>
                <input type="number" id="newMedStock" class="cv-form-input" min="0" required value="100" style="font-weight:700; text-align:right;">
              </div>

              <!-- ROW 5: Purchase Price, Selling Price, Reorder Level -->
              <div>
                <label for="newMedCostPrice">
                  <span>PURCHASE PRICE (₹)</span>
                </label>
                <input type="number" id="newMedCostPrice" class="cv-form-input" min="0" step="0.01" value="12.00" style="font-weight:600; text-align:right;">
              </div>

              <div>
                <label for="newMedUnitPrice">
                  <span>SELLING PRICE (₹) <span style="color:var(--cv-danger);">*</span></span>
                </label>
                <input type="number" id="newMedUnitPrice" class="cv-form-input" min="0" step="0.01" required value="20.00" style="font-weight:700; text-align:right;">
              </div>

              <div>
                <label for="newMedReorder">
                  <span>REORDER LEVEL</span>
                </label>
                <input type="number" id="newMedReorder" class="cv-form-input" min="1" value="20" style="text-align:right;">
              </div>

              <!-- ROW 6: GST %, Description / Notes (Spans 2 columns) -->
              <div>
                <label for="newMedGst">
                  <span>GST %</span>
                </label>
                <select id="newMedGst" class="cv-form-select">
                  <option value="0">0% (Nil)</option>
                  <option value="5" selected>5% (Standard GST)</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>

              <div class="cv-med-span-2">
                <label for="newMedNotes">
                  <span>DESCRIPTION / NOTES</span>
                </label>
                <input type="text" id="newMedNotes" class="cv-form-input" placeholder="Storage guidelines, prescription notes, shelf instructions...">
              </div>

            </div>

            <!-- COMPACT INLINE ERROR ALERT -->
            <div id="addMedFormError" style="display:none; background:#fee2e2; border:1px solid #fecaca; color:#b91c1c; padding:0.35rem 0.75rem; border-radius:6px; font-size:0.78rem; font-weight:600; margin-top:0.4rem;"></div>

            <!-- COMPACT FOOTER ACTIONS -->
            <div style="display:flex; justify-content:flex-end; gap:0.6rem; padding-top:0.55rem; margin-top:0.45rem; border-top:1px solid #f1f5f9;">
              <button type="button" class="cv-btn-secondary" id="btnCancelAddMed" style="padding:0.4rem 1.15rem; font-size:0.82rem; font-weight:600;">Cancel</button>
              <button type="submit" class="cv-btn-primary" id="btnSubmitAddMed" style="padding:0.4rem 1.35rem; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem; box-shadow:0 2px 8px rgba(37,99,235,0.25);">
                <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Save Medicine
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('formAddMedicine');
    const expiryInput = document.getElementById('newMedExpiry');
    const expiryWarn = document.getElementById('newMedExpiryWarning');
    const errorBox = document.getElementById('addMedFormError');
    const submitBtn = document.getElementById('btnSubmitAddMed');
    const backdrop = document.getElementById('addMedBackdrop');

    const closeModal = () => {
      modalHost.innerHTML = '';
      document.removeEventListener('keydown', onEscKey);
    };

    const onEscKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onEscKey);

    // Click outside to dismiss
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Expiry live validation
    expiryInput?.addEventListener('change', () => {
      const val = expiryInput.value;
      if (val && val < todayStr) {
        if (expiryWarn) expiryWarn.style.display = 'inline';
        expiryInput.style.borderColor = 'var(--cv-danger)';
      } else {
        if (expiryWarn) expiryWarn.style.display = 'none';
        expiryInput.style.borderColor = '';
      }
    });

    document.getElementById('btnCloseAddMedModal')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelAddMed')?.addEventListener('click', closeModal);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorBox) errorBox.style.display = 'none';

      const expVal = expiryInput?.value;
      if (expVal && expVal < todayStr) {
        if (errorBox) {
          errorBox.textContent = 'Cannot add medicine with past expiry date. Medicine is already expired.';
          errorBox.style.display = 'block';
        }
        return;
      }

      const payload = {
        name: document.getElementById('newMedName')?.value?.trim(),
        medicineCode: document.getElementById('newMedCode')?.value?.trim().toUpperCase(),
        genericName: document.getElementById('newMedGeneric')?.value?.trim(),
        category: document.getElementById('newMedCategory')?.value,
        medicineForm: document.getElementById('newMedForm')?.value,
        dosageStrength: document.getElementById('newMedDosage')?.value?.trim(),
        manufacturer: document.getElementById('newMedManufacturer')?.value?.trim(),
        supplier: document.getElementById('newMedSupplier')?.value?.trim(),
        batchNumber: document.getElementById('newMedBatch')?.value?.trim(),
        purchaseDate: document.getElementById('newMedPurchaseDate')?.value || todayStr,
        expiryDate: expVal,
        costPrice: parseFloat(document.getElementById('newMedCostPrice')?.value) || 0,
        unitPrice: parseFloat(document.getElementById('newMedUnitPrice')?.value) || 0,
        stockQuantity: parseInt(document.getElementById('newMedStock')?.value) || 0,
        reorderLevel: parseInt(document.getElementById('newMedReorder')?.value) || 10,
        gstPercentage: parseFloat(document.getElementById('newMedGst')?.value) || 5.0,
        notes: document.getElementById('newMedNotes')?.value?.trim()
      };

      if (!payload.name) {
        alert('Medicine name is required.');
        return;
      }
      if (!payload.medicineCode) {
        alert('Medicine ID / Code is required.');
        return;
      }
      if (!payload.batchNumber) {
        alert('Batch number is required.');
        return;
      }
      if (!payload.expiryDate) {
        alert('Expiry date is required.');
        return;
      }

      // Show loading state
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display:inline-block; width:13px; height:13px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:cvSpin 0.6s linear infinite; margin-right:5px;"></span>
        Saving medicine...
      `;

      try {
        const res = await cvFetch('/api/pharmacy/medicines/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res && res.success) {
          alert('Medicine added successfully.');
          closeModal();
          renderPharmacyInventoryTab();
        } else {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
          if (errorBox) {
            errorBox.textContent = res?.message || 'Failed to save medicine.';
            errorBox.style.display = 'block';
          } else {
            alert(res?.message || 'Failed to save medicine.');
          }
        }
      } catch (err) {
        console.error('Error adding medicine:', err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        if (errorBox) {
          errorBox.textContent = 'Failed to add medicine: ' + err.message;
          errorBox.style.display = 'block';
        } else {
          alert('Failed to add medicine: ' + err.message);
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // PRINTABLE PHARMACY INVOICE MODAL
  // ------------------------------------------------------------------
  function showPharmacyInvoiceModal(bill) {
    if (!bill) return;

    const modalHost = document.getElementById('pharModalHost') || document.body;

    const modalDiv = document.createElement('div');
    modalDiv.className = 'cv-modal-backdrop';
    modalDiv.id = 'pharInvoiceModalBackdrop';

    const items = bill.items || [];
    let itemsRowsHtml = items.map((it, idx) => `
      <tr>
        <td style="padding:0.4rem 0.5rem; border-bottom:1px solid #e2e8f0; font-size:0.82rem; text-align:center;">${idx + 1}</td>
        <td style="padding:0.4rem 0.5rem; border-bottom:1px solid #e2e8f0; font-size:0.85rem; font-weight:600;">
          ${escapeHtml(it.medicineName)}
          <span style="font-size:0.7rem; color:#64748b; font-family:monospace; display:block;">${escapeHtml(it.medicineCode || '')}</span>
        </td>
        <td style="padding:0.4rem 0.5rem; border-bottom:1px solid #e2e8f0; font-size:0.8rem; font-family:monospace;">${escapeHtml(it.batchNumber || '')}</td>
        <td style="padding:0.4rem 0.5rem; border-bottom:1px solid #e2e8f0; font-size:0.8rem; color:#64748b;">${escapeHtml(it.expiryDate || 'N/A')}</td>
        <td style="padding:0.4rem 0.5rem; border-bottom:1px solid #e2e8f0; font-size:0.85rem; text-align:center; font-weight:700;">${it.quantity}</td>
        <td style="padding:0.4rem 0.5rem; border-bottom:1px solid #e2e8f0; font-size:0.85rem; text-align:right;">₹${formatCurrency(it.unitPrice)}</td>
        <td style="padding:0.4rem 0.5rem; border-bottom:1px solid #e2e8f0; font-size:0.85rem; text-align:right; font-weight:700;">₹${formatCurrency(it.totalPrice)}</td>
      </tr>
    `).join('');

    if (items.length === 0) {
      itemsRowsHtml = `<tr><td colspan="7" style="text-align:center; padding:1rem; color:#64748b;">No itemized details.</td></tr>`;
    }

    modalDiv.innerHTML = `
      <div style="background:#ffffff; border-radius:12px; max-width:720px; width:95%; max-height:90vh; overflow-y:auto; box-shadow:0 20px 40px rgba(0,0,0,0.2); margin:2rem auto; position:relative;">
        
        <!-- Header Actions (Hidden on Print) -->
        <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; border-bottom:1px solid #e2e8f0; background:#f8fafc; border-top-left-radius:12px; border-top-right-radius:12px;">
          <div style="font-weight:700; color:var(--cv-text-main); font-size:0.95rem;">
            Pharmacy Tax Invoice &bull; ${escapeHtml(bill.billNumber)}
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button type="button" class="cv-btn-primary" id="btnPrintPharBill" style="padding:0.4rem 0.9rem; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Print Bill
            </button>
            <button type="button" class="cv-modal-close" id="btnClosePharInvoice" style="position:static; font-size:1.5rem;">&times;</button>
          </div>
        </div>

        <!-- Printable Bill Paper -->
        <div class="cv-invoice-paper" id="pharPrintablePaper">
          <!-- Hospital Header -->
          <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:0.75rem; margin-bottom:1rem;">
            <div style="font-size:0.7rem; font-weight:800; letter-spacing:0.1em; color:#0284c7; text-transform:uppercase;">
              CAREVISTA HOSPITAL MANAGEMENT SAAS
            </div>
            <h1 style="font-size:1.4rem; font-weight:800; color:#0f172a; margin:0.25rem 0;">
              ${escapeHtml(bill.hospitalName || currentUser?.hospitalName || 'CareVista Multispeciality Hospital')}
            </h1>
            <div style="font-size:0.78rem; color:#475569;">
              Pharmacy Dispensary &bull; Central Drug Store &bull; Licensed Medical Unit
            </div>
            <div style="font-size:0.75rem; color:#475569; margin-top:0.2rem;">
              <strong>GSTIN:</strong> ${escapeHtml(bill.gstNumber || '22AAAAA0000A1Z5')}
            </div>
          </div>

          <!-- Bill & Patient Metadata Grid -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem; padding:0.75rem; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:0.82rem;">
            <div>
              <div style="margin-bottom:0.35rem;">
                <span style="color:#64748b; font-weight:600;">Bill No:</span>
                <strong style="color:#0f172a; font-family:monospace; margin-left:0.25rem;">${escapeHtml(bill.billNumber)}</strong>
              </div>
              <div style="margin-bottom:0.35rem;">
                <span style="color:#64748b; font-weight:600;">Date &amp; Time:</span>
                <span style="color:#0f172a; margin-left:0.25rem;">${escapeHtml(bill.billDate)} ${escapeHtml(bill.billTime || '')}</span>
              </div>
              <div>
                <span style="color:#64748b; font-weight:600;">Payment Mode:</span>
                <strong style="color:#0f172a; margin-left:0.25rem;">${escapeHtml(bill.paymentMethod || 'CASH')}</strong>
              </div>
            </div>

            <div>
              <div style="margin-bottom:0.35rem;">
                <span style="color:#64748b; font-weight:600;">Patient Name:</span>
                <strong style="color:#0f172a; margin-left:0.25rem;">${escapeHtml(bill.patientName)}</strong>
              </div>
              <div style="margin-bottom:0.35rem;">
                <span style="color:#64748b; font-weight:600;">UHID:</span>
                <strong style="color:#0284c7; font-family:monospace; margin-left:0.25rem;">${escapeHtml(bill.uhid || 'N/A')}</strong>
                ${bill.opId ? `<span style="margin-left:0.5rem; color:#64748b;">OP: ${escapeHtml(bill.opId)}</span>` : ''}
                ${bill.ipId ? `<span style="margin-left:0.5rem; color:#64748b;">IP: ${escapeHtml(bill.ipId)}</span>` : ''}
              </div>
              <div>
                <span style="color:#64748b; font-weight:600;">Doctor / Dept:</span>
                <span style="color:#0f172a; margin-left:0.25rem;">${escapeHtml(bill.doctorName || 'Consultant')} (${escapeHtml(bill.department || 'General')})</span>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width:100%; border-collapse:collapse; margin-bottom:1rem;">
            <thead>
              <tr style="background:#f1f5f9; border-top:1px solid #cbd5e1; border-bottom:1px solid #cbd5e1;">
                <th style="padding:0.45rem 0.5rem; font-size:0.75rem; text-align:center; color:#475569; width:30px;">#</th>
                <th style="padding:0.45rem 0.5rem; font-size:0.75rem; text-align:left; color:#475569;">Medicine Description</th>
                <th style="padding:0.45rem 0.5rem; font-size:0.75rem; text-align:left; color:#475569;">Batch</th>
                <th style="padding:0.45rem 0.5rem; font-size:0.75rem; text-align:left; color:#475569;">Exp</th>
                <th style="padding:0.45rem 0.5rem; font-size:0.75rem; text-align:center; color:#475569;">Qty</th>
                <th style="padding:0.45rem 0.5rem; font-size:0.75rem; text-align:right; color:#475569;">Rate (₹)</th>
                <th style="padding:0.45rem 0.5rem; font-size:0.75rem; text-align:right; color:#475569;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <!-- Financial Breakdown -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:1rem; padding-top:0.75rem; border-top:1px solid #e2e8f0;">
            <div style="font-size:0.78rem; color:#64748b; max-width:320px;">
              <p style="margin:0 0 0.35rem 0;"><strong>Payment Status:</strong> <span style="font-weight:700; color:#0f172a;">${escapeHtml(bill.paymentStatus)}</span></p>
              ${bill.notes ? `<p style="margin:0 0 0.35rem 0;"><strong>Notes:</strong> ${escapeHtml(bill.notes)}</p>` : ''}
              <p style="margin:0.5rem 0 0 0; font-size:0.72rem; color:#94a3b8;">
                * Computer generated pharmacy dispensary tax invoice. Valid for healthcare reimbursement.
              </p>
            </div>

            <div style="width:260px; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">Subtotal:</span>
                <span style="font-weight:600;">₹${formatCurrency(bill.subtotal)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">Discount (${bill.discountPercentage || 0}%):</span>
                <span style="font-weight:600; color:#dc2626;">- ₹${formatCurrency(bill.discountAmount)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
                <span style="color:#64748b;">GST (${bill.gstPercentage || 0}%):</span>
                <span style="font-weight:600; color:#0284c7;">+ ₹${formatCurrency(bill.gstAmount)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding-top:0.5rem; margin-top:0.5rem; border-top:2px solid #0f172a; font-size:1.05rem; font-weight:800; color:#0f172a;">
                <span>FINAL TOTAL:</span>
                <span style="color:#0284c7;">₹${formatCurrency(bill.finalTotal)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:0.35rem;">
                <span style="color:#64748b;">Amount Paid:</span>
                <span style="font-weight:700; color:#16a34a;">₹${formatCurrency(bill.paidAmount)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:0.25rem;">
                <span style="color:#64748b;">Balance Due:</span>
                <span style="font-weight:700; color:${bill.balanceAmount > 0 ? '#dc2626' : '#64748b'};">₹${formatCurrency(bill.balanceAmount)}</span>
              </div>
            </div>
          </div>

          <!-- Signature row -->
          <div style="display:flex; justify-content:space-between; margin-top:2.5rem; padding-top:1.5rem; font-size:0.78rem; color:#475569;">
            <div style="border-top:1px solid #cbd5e1; padding-top:0.35rem; width:180px; text-align:center;">
              Customer / Attendant Signature
            </div>
            <div style="border-top:1px solid #cbd5e1; padding-top:0.35rem; width:180px; text-align:center;">
              Authorized Pharmacist Stamp
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);

    document.getElementById('btnClosePharInvoice')?.addEventListener('click', () => {
      modalDiv.remove();
    });

    document.getElementById('btnPrintPharBill')?.addEventListener('click', () => {
      window.print();
    });

    modalDiv.addEventListener('click', (e) => {
      if (e.target === modalDiv) modalDiv.remove();
    });
  }


  // ====================================================================
  // LABORATORY & DIAGNOSTIC PATHOLOGY MODULE (CareVista HMS)
  // ====================================================================
  let labActiveTab = 'orders'; // 'orders' | 'processing'
  let labSelectedPatient = null;
  let labTestCatalog = [];
  let labOrderItems = []; // [{ testId, testCode, testName, category, sampleType, price, referenceRange, unit }]
  let labPatientSearchDebounce = null;
  let labProcessingSearchDebounce = null;
  let labProcessingOrders = [];
  let labActiveFilter = 'ALL';
  let labCurrentProcessingSearch = '';

  function renderLaboratoryModule(activeTab = 'orders') {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    labActiveTab = activeTab;
    mainContent.classList.remove('cv-pharmacy-mode');
    mainContent.classList.add('cv-laboratory-mode');

    mainContent.innerHTML = `
      <div class="cv-lab-wrapper">
        <!-- Topbar -->
        <div class="cv-lab-topbar">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            ${renderBackArrowHtml('Back')}
            <div>
              <h1 class="cv-page-title" style="display:flex; align-items:center; gap:0.6rem;">
                <svg style="width:26px; height:26px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Laboratory Management &amp; Diagnostics
              </h1>
              <p class="cv-page-subtitle">Hospital: ${escapeHtml(currentUser?.hospitalName || 'City Care Super Speciality Hospital')}</p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div class="cv-lab-nav-tabs">
              <button type="button" class="cv-lab-tab-btn ${labActiveTab === 'orders' ? 'active' : ''}" id="tabBtnLabOrders">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                1. Lab Order &amp; Payment
              </button>
              <button type="button" class="cv-lab-tab-btn ${labActiveTab === 'processing' ? 'active' : ''}" id="tabBtnLabProcessing">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                2. Laboratory Processing
              </button>
            </div>

            <button type="button" class="cv-btn-secondary" id="btnLabBackDashboard" style="padding:0.5rem 0.9rem; font-size:0.85rem;">
              Back to Dashboard
            </button>
          </div>
        </div>

        <!-- Main Tab Mount Container -->
        <div id="labTabContent"></div>

        <!-- Modal Host -->
        <div id="labModalHost"></div>
      </div>
    `;

    document.getElementById('btnLabBackDashboard')?.addEventListener('click', () => {
      mainContent.classList.remove('cv-laboratory-mode');
      navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
    });

    document.getElementById('tabBtnLabOrders')?.addEventListener('click', () => switchLabTab('orders', true));
    document.getElementById('tabBtnLabProcessing')?.addEventListener('click', () => switchLabTab('processing', true));

    switchLabTab(labActiveTab, false);
  }

  function executeLabTab(tab) {
    const container = document.getElementById('labTabContent');
    if (!container) {
      renderLaboratoryModule(tab);
      return;
    }
    labActiveTab = tab;
    document.querySelectorAll('.cv-lab-tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'orders') {
      document.getElementById('tabBtnLabOrders')?.classList.add('active');
      renderLabOrdersTab();
    } else if (tab === 'processing' || tab === 'history') {
      document.getElementById('tabBtnLabProcessing')?.classList.add('active');
      renderLabProcessingTab();
    }
  }

  function switchLabTab(tab, recordHistory = true) {
    if (recordHistory) {
      navigateTo('laboratory', tab, () => executeLabTab(tab), true);
    } else {
      executeLabTab(tab);
    }
  }

  // ------------------------------------------------------------------
  // TAB 1: LAB ORDER & PAYMENT
  // ------------------------------------------------------------------
  async function renderLabOrdersTab() {
    const container = document.getElementById('labTabContent');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; min-height:220px;">
        <div class="cv-loading-spinner"></div>
      </div>
    `;

    try {
      const res = await Api.get('/api/laboratory/tests');
      if (res && res.success && Array.isArray(res.data)) {
        labTestCatalog = res.data;
      } else {
        labTestCatalog = [];
      }
    } catch (err) {
      console.error('Failed to load laboratory tests catalog:', err);
      labTestCatalog = [];
    }

    container.innerHTML = `
      <div class="cv-lab-flow">
        <!-- 1. Patient Details & Search Card -->
        <div class="cv-lab-card">
          <div class="cv-lab-card-header">
            <div class="cv-lab-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              1. Patient Details &amp; Search
            </div>
            <span style="font-size:0.75rem; color:var(--cv-text-muted); font-weight:600;">Real MySQL Patient Records</span>
          </div>

          <div class="cv-patient-search-row">
            <div class="cv-patient-search-container">
              <div class="cv-search-icon-input">
                <i class="fas fa-search">
                  <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </i>
                <input type="text" id="labPatientSearchInput" placeholder="Search by Patient Name, Phone Number, UHID, OP ID, or IP ID" autocomplete="off">
              </div>
              <div id="labPatientDropdown" class="cv-patient-dropdown" style="display:none;"></div>
            </div>

            <div id="labPatientAutofillContainer" class="cv-patient-autofill-wrapper">
              ${renderLabPatientAutofillHtml(labSelectedPatient)}
            </div>
          </div>
        </div>

        <!-- 2. Lab Test Master Selection Card -->
        <div class="cv-lab-card">
          <div class="cv-lab-card-header">
            <div class="cv-lab-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              2. Lab Test Master / Test Selection
            </div>
            <div id="labTestCategoryPill">
              <span class="cv-stock-info-pill cv-stock-in">Select a test from catalog</span>
            </div>
          </div>

          <div class="cv-lab-test-grid">
            <div style="grid-column: span 2;">
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">
                LAB TEST MASTER <span style="color:var(--cv-danger);">*</span>
              </label>
              <select id="labTestSelect" class="cv-form-select" style="height:38px; font-size:0.86rem; width:100%;">
                <option value="">-- Search &amp; Select Laboratory Test --</option>
                ${labTestCatalog.map(t => `
                  <option value="${t.id}" data-code="${escapeHtml(t.testCode)}" data-name="${escapeHtml(t.testName)}" data-cat="${escapeHtml(t.category)}" data-price="${t.price}" data-sample="${escapeHtml(t.sampleType || '')}" data-range="${escapeHtml(t.referenceRange || '')}" data-unit="${escapeHtml(t.unit || '')}">
                    ${escapeHtml(t.testName)} (${escapeHtml(t.testCode)}) | ${escapeHtml(t.category)} | Sample: ${escapeHtml(t.sampleType || 'Blood')} | ₹${formatCurrency(t.price)}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">SAMPLE TYPE</label>
              <input type="text" id="labTestSampleType" class="cv-form-input" style="height:38px; font-size:0.84rem; background:#f8fafc;" readonly placeholder="Sample Type">
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">NORMAL RANGE</label>
              <input type="text" id="labTestRefRange" class="cv-form-input" style="height:38px; font-size:0.84rem; background:#f8fafc;" readonly placeholder="Ref Range / Unit">
            </div>

            <div>
              <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">PRICE (₹) <span style="color:var(--cv-danger);">*</span></label>
              <input type="number" id="labTestUnitPrice" class="cv-form-input" min="0" step="0.01" value="0.00" style="height:38px; font-weight:700; text-align:right;">
            </div>

            <div style="display:flex; align-items:flex-end;">
              <button type="button" class="cv-btn-primary" id="btnLabAddTest" style="height:38px; padding:0 1.25rem; font-size:0.85rem; font-weight:700; white-space:nowrap; display:inline-flex; align-items:center; gap:0.4rem; width:100%; justify-content:center;">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                + Add Test to Order
              </button>
            </div>
          </div>
        </div>

        <!-- 3. Selected Tests / Order Items Table Card -->
        <div class="cv-lab-card">
          <div class="cv-lab-card-header">
            <div class="cv-lab-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              3. Selected Tests / Order Table
              <span id="labItemCountBadge" style="font-size:0.75rem; background:#e0f2fe; color:#0369a1; padding:0.12rem 0.5rem; border-radius:12px; margin-left:0.5rem; font-weight:700;">
                ${labOrderItems.length} tests
              </span>
            </div>
            ${labOrderItems.length > 0 ? `
              <button type="button" class="cv-btn-secondary" id="btnLabClearAllTests" style="padding:0.25rem 0.65rem; font-size:0.75rem; color:var(--cv-danger);">
                Clear All
              </button>
            ` : ''}
          </div>

          <div class="cv-bill-table-wrapper">
            <table class="cv-bill-table" id="labOrderTable">
              <thead>
                <tr>
                  <th style="width:40px;">#</th>
                  <th>Test Code &amp; Name</th>
                  <th style="width:140px;">Category</th>
                  <th style="width:120px;">Sample Type</th>
                  <th style="width:160px;">Reference Interval</th>
                  <th style="width:120px; text-align:right;">Price (₹)</th>
                  <th style="width:70px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody id="labOrderTableBody">
                ${renderLabOrderTableBodyHtml()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. Billing, Discount, GST & Payment Summary Card -->
        <div class="cv-lab-card">
          <div class="cv-lab-card-header">
            <div class="cv-lab-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              4. Billing, Discount, GST &amp; Payment Collection
            </div>
            <span style="font-size:0.75rem; color:var(--cv-text-muted); font-weight:600;">Integrated Central Billing &amp; MySQL Ledger</span>
          </div>

          <div class="cv-pharmacy-summary-grid">
            <!-- Left Side: Calculation -->
            <div class="cv-summary-calc-col">
              <div class="cv-calc-row">
                <span class="cv-calc-label">Subtotal</span>
                <span id="labSummarySubtotal" class="cv-calc-value font-mono">₹0.00</span>
              </div>

              <!-- Discount Input Row -->
              <div class="cv-calc-row">
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span class="cv-calc-label">Discount (%)</span>
                  <input type="number" id="labDiscountPct" class="cv-calc-input" min="0" max="100" step="0.5" value="0">
                </div>
                <span id="labDiscountAmount" class="cv-calc-value font-mono" style="color:var(--cv-danger);">- ₹0.00</span>
              </div>

              <div class="cv-calc-row">
                <span class="cv-calc-label">Net Amount</span>
                <span id="labNetAmount" class="cv-calc-value font-mono">₹0.00</span>
              </div>

              <!-- GSTIN & GST % Row -->
              <div class="cv-calc-row">
                <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                  <span class="cv-calc-label">GSTIN:</span>
                  <input type="text" id="labGstinInput" class="cv-form-input" style="width:115px; height:28px; font-size:0.75rem; text-transform:uppercase;" placeholder="29ABCDE1234F">
                  <span class="cv-calc-label" style="margin-left:0.25rem;">GST (%)</span>
                  <input type="number" id="labGstPct" class="cv-calc-input" min="0" max="28" step="1" value="0">
                </div>
                <span id="labGstAmount" class="cv-calc-value font-mono" style="color:var(--cv-primary);">+ ₹0.00</span>
              </div>

              <div class="final-total-highlight">
                <div>
                  <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--cv-primary); font-weight:800;">Amount Payable</div>
                  <div style="font-size:1.05rem; font-weight:800; color:#0f172a;">FINAL TOTAL</div>
                </div>
                <span id="labFinalTotal" class="cv-final-total-amount">₹0.00</span>
              </div>
            </div>

            <!-- Right Side: Payment & Collection -->
            <div class="cv-summary-pay-col">
              <div style="display:grid; grid-template-columns: 1.1fr 1fr; gap:0.75rem; align-items:stretch;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
                    <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); letter-spacing:0.02em;">
                      AMOUNT PAID (₹) <span style="color:var(--cv-danger);">*</span>
                    </label>
                    <button type="button" id="btnLabPayFull" class="cv-link-btn" title="Set paid amount equal to final total">
                      Pay Full Amount
                    </button>
                  </div>
                  <input type="number" id="labPaidAmount" class="cv-form-input" min="0" step="0.01" value="0.00" style="height:38px; font-weight:700; font-size:1.1rem; text-align:right; color:#0f172a;">
                </div>

                <div class="cv-balance-card">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.68rem; color:var(--cv-text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">Balance Due</span>
                    <span id="labPaymentStatusBadge" class="cv-payment-balance-badge cv-badge-paid" style="font-size:0.65rem; padding:0.12rem 0.45rem;">PAID</span>
                  </div>
                  <div id="labBalanceAmount" style="font-size:1.25rem; font-weight:800; color:var(--cv-danger); text-align:right; line-height:1.2;">₹0.00</div>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1.3fr; gap:0.75rem;">
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">
                    PAYMENT METHOD
                  </label>
                  <select id="labPaymentMethod" class="cv-form-select" style="height:36px; font-size:0.84rem;">
                    <option value="CASH">Cash Payment</option>
                    <option value="UPI">UPI / Digital QR</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="INSURANCE">Insurance TPA</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.2rem; letter-spacing:0.02em;">
                    CLINICAL / ORDER NOTES
                  </label>
                  <input type="text" id="labNotes" class="cv-form-input" style="height:36px; font-size:0.84rem;" placeholder="Clinical indication / fasting notes...">
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display:flex; gap:0.75rem; margin-top:0.35rem;">
                <button type="button" class="cv-btn-secondary" id="btnLabResetOrder" style="flex:1; height:40px; font-weight:600; font-size:0.86rem;">
                  Reset
                </button>
                <button type="button" class="cv-btn-primary" id="btnLabCreateOrder" style="flex:2; height:40px; font-weight:700; font-size:0.9rem; display:inline-flex; align-items:center; justify-content:center; gap:0.5rem; box-shadow:0 2px 8px rgba(37, 99, 235, 0.25);">
                  <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Create Lab Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    setupLabOrderEvents();
    recalculateLabBill();
  }

  function renderLabPatientAutofillHtml(patient) {
    if (!patient) {
      return `
        <div class="cv-walkin-box">
          <div class="cv-walkin-label">
            <svg style="width:15px; height:15px; color:var(--cv-primary); flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span>Or Walk-in / Direct Patient:</span>
          </div>
          <div class="cv-walkin-inputs" style="display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr; gap:0.5rem;">
            <input type="text" id="labWalkinName" class="cv-form-input" placeholder="Patient Name *">
            <input type="text" id="labWalkinPhone" class="cv-form-input" placeholder="Phone Number">
            <input type="text" id="labWalkinDoctor" class="cv-form-input" placeholder="Doctor / Ref">
            <input type="text" id="labWalkinDept" class="cv-form-input" placeholder="Department">
          </div>
        </div>
      `;
    }

    return `
      <div class="cv-autofill-banner">
        <div class="cv-autofill-grid">
          <div class="cv-autofill-item">
            <label>Patient Name</label>
            <span>${escapeHtml(patient.fullName || patient.name || '')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>UHID</label>
            <span style="font-family:monospace; color:var(--cv-primary);">${escapeHtml(patient.uhid || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>OP ID</label>
            <span style="font-family:monospace;">${escapeHtml(patient.opId || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>IP ID</label>
            <span style="font-family:monospace;">${escapeHtml(patient.ipId || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Phone Number</label>
            <span>${escapeHtml(patient.phone || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Age &bull; Gender</label>
            <span>${patient.age ? patient.age + ' yrs' : 'N/A'} &bull; ${escapeHtml(patient.gender || 'N/A')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Consulting Doctor</label>
            <span>${escapeHtml(patient.doctorName || 'Dr. On Duty')}</span>
          </div>
          <div class="cv-autofill-item">
            <label>Department</label>
            <span>${escapeHtml(patient.department || 'Diagnostics')}</span>
          </div>
        </div>
        <button type="button" class="cv-btn-secondary" id="btnLabClearPatient" style="padding:0.3rem 0.6rem; font-size:0.75rem; white-space:nowrap; align-self:center;">
          Change Patient
        </button>
      </div>
    `;
  }

  function renderLabOrderTableBodyHtml() {
    if (!labOrderItems || labOrderItems.length === 0) {
      return `
        <tr>
          <td colspan="7" style="text-align:center; padding:1.25rem; color:var(--cv-text-muted); font-size:0.85rem;">
            No laboratory tests added yet. Select a test from above and click <strong>+ Add Test to Order</strong>.
          </td>
        </tr>
      `;
    }

    return labOrderItems.map((item, idx) => `
      <tr data-index="${idx}">
        <td style="color:var(--cv-text-muted); font-weight:600;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:var(--cv-text-main);">${escapeHtml(item.testName)}</div>
          <div style="font-size:0.72rem; color:var(--cv-text-muted); font-family:monospace;">${escapeHtml(item.testCode)}</div>
        </td>
        <td><span style="font-size:0.8rem; background:#f1f5f9; padding:0.15rem 0.4rem; border-radius:4px; font-weight:600;">${escapeHtml(item.category || 'General')}</span></td>
        <td><span style="font-size:0.8rem; background:#e0f2fe; color:#0369a1; padding:0.15rem 0.45rem; border-radius:4px; font-weight:600;">${escapeHtml(item.sampleType || 'Blood')}</span></td>
        <td style="font-size:0.78rem; color:var(--cv-text-muted); font-family:monospace;">${escapeHtml(item.referenceRange || 'N/A')} ${escapeHtml(item.unit || '')}</td>
        <td style="text-align:right;">
          <input type="number" class="cv-form-input lab-item-rate" data-index="${idx}" min="0" step="0.01" value="${Number(item.price).toFixed(2)}" style="height:32px; width:100px; text-align:right; font-weight:700; display:inline-block;">
        </td>
        <td style="text-align:center;">
          <button type="button" class="btn-remove-lab-item" data-index="${idx}" title="Remove test" style="background:none; border:none; cursor:pointer; color:var(--cv-danger); padding:4px;">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function setupLabOrderEvents() {
    // 1. Patient search autocomplete
    const searchInput = document.getElementById('labPatientSearchInput');
    const dropdown = document.getElementById('labPatientDropdown');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (labPatientSearchDebounce) clearTimeout(labPatientSearchDebounce);

        if (q.length < 2) {
          dropdown.style.display = 'none';
          dropdown.innerHTML = '';
          return;
        }

        labPatientSearchDebounce = setTimeout(async () => {
          try {
            const res = await Api.get(`/api/laboratory/patients/search?q=${encodeURIComponent(q)}`);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
              const sorted = sortByStartsWith(res.data, q);
              dropdown.innerHTML = sorted.map(p => `
                <div class="cv-patient-dropdown-item" data-patient='${JSON.stringify(p).replace(/'/g, "&apos;")}'>
                  <div>
                    <div style="font-weight:700; color:var(--cv-text-main); font-size:0.9rem;">
                      ${escapeHtml(p.fullName)}
                    </div>
                    <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; gap:0.5rem; margin-top:0.15rem;">
                      <span>UHID: <strong style="color:var(--cv-primary); font-family:monospace;">${escapeHtml(p.uhid)}</strong></span>
                      ${p.opId ? `<span>OP: <strong style="font-family:monospace;">${escapeHtml(p.opId)}</strong></span>` : ''}
                      ${p.ipId ? `<span>IP: <strong style="font-family:monospace;">${escapeHtml(p.ipId)}</strong></span>` : ''}
                      <span>Phone: ${escapeHtml(p.phone || 'N/A')}</span>
                    </div>
                  </div>
                  <div>
                    <span style="font-size:0.72rem; background:#dbeafe; color:#1e40af; padding:0.2rem 0.5rem; border-radius:12px; font-weight:700;">Select</span>
                  </div>
                </div>
              `).join('');
              dropdown.style.display = 'block';

              dropdown.querySelectorAll('.cv-patient-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                  try {
                    const pData = JSON.parse(item.getAttribute('data-patient'));
                    selectLabPatient(pData);
                  } catch (err) {
                    console.error('Error selecting lab patient:', err);
                  }
                });
              });
            } else {
              dropdown.innerHTML = `<div style="padding:0.75rem 1rem; color:var(--cv-text-muted); font-size:0.85rem;">No matching patients found.</div>`;
              dropdown.style.display = 'block';
            }
          } catch (err) {
            console.error('Patient search error:', err);
          }
        }, 250);
      });

      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    }

    // 2. Test Selector Change
    const testSelect = document.getElementById('labTestSelect');
    if (testSelect) {
      testSelect.addEventListener('change', () => {
        const opt = testSelect.selectedOptions?.[0];
        if (opt && opt.value) {
          const sample = opt.getAttribute('data-sample') || 'Blood';
          const range = opt.getAttribute('data-range') || 'N/A';
          const unit = opt.getAttribute('data-unit') || '';
          const price = parseFloat(opt.getAttribute('data-price')) || 0;
          const cat = opt.getAttribute('data-cat') || 'Diagnostic';

          document.getElementById('labTestSampleType').value = sample;
          document.getElementById('labTestRefRange').value = `${range} ${unit}`.trim();
          document.getElementById('labTestUnitPrice').value = price.toFixed(2);

          const pill = document.getElementById('labTestCategoryPill');
          if (pill) {
            pill.innerHTML = `<span class="cv-stock-info-pill cv-stock-in">${escapeHtml(cat)} &bull; ${escapeHtml(sample)}</span>`;
          }
        } else {
          document.getElementById('labTestSampleType').value = '';
          document.getElementById('labTestRefRange').value = '';
          document.getElementById('labTestUnitPrice').value = '0.00';
          const pill = document.getElementById('labTestCategoryPill');
          if (pill) {
            pill.innerHTML = `<span class="cv-stock-info-pill cv-stock-in">Select a test from catalog</span>`;
          }
        }
      });
    }

    // 3. Add Test to Order
    document.getElementById('btnLabAddTest')?.addEventListener('click', addTestToLabOrder);

    // 4. Clear All Tests
    document.getElementById('btnLabClearAllTests')?.addEventListener('click', () => {
      if (confirm('Clear all selected laboratory tests?')) {
        labOrderItems = [];
        refreshLabOrderTable();
      }
    });

    // 5. Discount, GST, Paid Amount calculation triggers
    document.getElementById('labDiscountPct')?.addEventListener('input', recalculateLabBill);
    document.getElementById('labGstPct')?.addEventListener('input', recalculateLabBill);
    document.getElementById('labPaidAmount')?.addEventListener('input', recalculateLabBill);

    // 6. Pay Full Amount button
    document.getElementById('btnLabPayFull')?.addEventListener('click', () => {
      const finalTotalStr = document.getElementById('labFinalTotal')?.textContent?.replace('₹', '')?.replace(/,/g, '')?.trim();
      const finalTotal = parseFloat(finalTotalStr) || 0;
      const paidInput = document.getElementById('labPaidAmount');
      if (paidInput) {
        paidInput.value = finalTotal.toFixed(2);
        recalculateLabBill();
      }
    });

    // 7. Reset Order
    document.getElementById('btnLabResetOrder')?.addEventListener('click', () => {
      if (confirm('Reset the laboratory order form?')) {
        labOrderItems = [];
        labSelectedPatient = null;
        renderLabOrdersTab();
      }
    });

    // 8. Create Lab Order
    document.getElementById('btnLabCreateOrder')?.addEventListener('click', createLabOrder);

    // Bind table events
    bindLabTableEvents();
  }

  function bindLabTableEvents() {
    // Rate inline edit
    document.querySelectorAll('.lab-item-rate').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const item = labOrderItems[idx];
        if (!item) return;

        let newRate = parseFloat(e.target.value) || 0;
        if (newRate < 0) newRate = 0;
        item.price = newRate;
        refreshLabOrderTable();
      });
    });

    // Remove buttons
    document.querySelectorAll('.btn-remove-lab-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        if (idx >= 0 && idx < labOrderItems.length) {
          labOrderItems.splice(idx, 1);
          refreshLabOrderTable();
        }
      });
    });
  }

  function selectLabPatient(p) {
    labSelectedPatient = p;
    const searchInput = document.getElementById('labPatientSearchInput');
    const dropdown = document.getElementById('labPatientDropdown');
    const container = document.getElementById('labPatientAutofillContainer');

    if (searchInput) searchInput.value = `${p.fullName} (${p.uhid})`;
    if (dropdown) dropdown.style.display = 'none';
    if (container) {
      container.innerHTML = renderLabPatientAutofillHtml(labSelectedPatient);
      document.getElementById('btnLabClearPatient')?.addEventListener('click', clearLabPatient);
    }
  }

  function clearLabPatient() {
    labSelectedPatient = null;
    const searchInput = document.getElementById('labPatientSearchInput');
    const container = document.getElementById('labPatientAutofillContainer');
    if (searchInput) searchInput.value = '';
    if (container) {
      container.innerHTML = renderLabPatientAutofillHtml(null);
    }
  }

  function addTestToLabOrder() {
    const testSelect = document.getElementById('labTestSelect');
    const opt = testSelect?.selectedOptions?.[0];
    if (!opt || !opt.value) {
      alert('Please select a laboratory test to add.');
      return;
    }

    const testId = parseInt(opt.value);
    const testCode = opt.getAttribute('data-code');
    const testName = opt.getAttribute('data-name');
    const category = opt.getAttribute('data-cat');
    const sampleType = opt.getAttribute('data-sample');
    const referenceRange = opt.getAttribute('data-range');
    const unit = opt.getAttribute('data-unit');
    const price = parseFloat(document.getElementById('labTestUnitPrice')?.value) || 0;

    const existingIdx = labOrderItems.findIndex(i => i.testId === testId);
    if (existingIdx >= 0) {
      alert(`The test "${testName}" is already added to this order.`);
      return;
    }

    labOrderItems.push({
      testId: testId,
      testCode: testCode,
      testName: testName,
      category: category,
      sampleType: sampleType,
      referenceRange: referenceRange,
      unit: unit,
      price: price
    });

    testSelect.value = '';
    document.getElementById('labTestSampleType').value = '';
    document.getElementById('labTestRefRange').value = '';
    document.getElementById('labTestUnitPrice').value = '0.00';

    refreshLabOrderTable();
  }

  function refreshLabOrderTable() {
    const tbody = document.getElementById('labOrderTableBody');
    if (tbody) tbody.innerHTML = renderLabOrderTableBodyHtml();

    const badge = document.getElementById('labItemCountBadge');
    if (badge) badge.textContent = `${labOrderItems.length} tests`;

    bindLabTableEvents();
    recalculateLabBill();
  }

  function recalculateLabBill() {
    let subtotal = 0;
    labOrderItems.forEach(item => {
      subtotal += parseFloat(item.price) || 0;
    });
    subtotal = parseFloat(subtotal.toFixed(2));

    const discountPct = parseFloat(document.getElementById('labDiscountPct')?.value) || 0;
    const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
    const netAmount = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));

    const gstPct = parseFloat(document.getElementById('labGstPct')?.value) || 0;
    const gstAmount = parseFloat(((netAmount * gstPct) / 100).toFixed(2));
    const finalTotal = parseFloat((netAmount + gstAmount).toFixed(2));

    let paidAmount = parseFloat(document.getElementById('labPaidAmount')?.value) || 0;
    if (paidAmount < 0) paidAmount = 0;

    let balance = parseFloat(Math.max(0, finalTotal - paidAmount).toFixed(2));

    let status = 'UNPAID';
    let statusClass = 'cv-badge-unpaid';

    if (finalTotal > 0) {
      if (paidAmount >= finalTotal) {
        status = 'PAID';
        statusClass = 'cv-badge-paid';
        balance = 0;
      } else if (paidAmount > 0) {
        status = 'PARTIALLY PAID';
        statusClass = 'cv-badge-partial';
      } else {
        status = 'UNPAID';
        statusClass = 'cv-badge-unpaid';
      }
    } else {
      status = 'PAID';
      statusClass = 'cv-badge-paid';
      balance = 0;
    }

    // Update DOM
    const subtotalElem = document.getElementById('labSummarySubtotal');
    if (subtotalElem) subtotalElem.textContent = `₹${formatCurrency(subtotal)}`;

    const discountAmtElem = document.getElementById('labDiscountAmount');
    if (discountAmtElem) discountAmtElem.textContent = `- ₹${formatCurrency(discountAmount)}`;

    const netAmountElem = document.getElementById('labNetAmount');
    if (netAmountElem) netAmountElem.textContent = `₹${formatCurrency(netAmount)}`;

    const gstAmountElem = document.getElementById('labGstAmount');
    if (gstAmountElem) gstAmountElem.textContent = `+ ₹${formatCurrency(gstAmount)}`;

    const finalTotalElem = document.getElementById('labFinalTotal');
    if (finalTotalElem) finalTotalElem.textContent = `₹${formatCurrency(finalTotal)}`;

    const balanceElem = document.getElementById('labBalanceAmount');
    if (balanceElem) balanceElem.textContent = `₹${formatCurrency(balance)}`;

    const statusBadge = document.getElementById('labPaymentStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = status;
      statusBadge.className = `cv-payment-balance-badge ${statusClass}`;
    }
  }

  async function createLabOrder() {
    let patientName = '';
    let uhid = '';
    let phone = '';
    let opId = '';
    let ipId = '';
    let doctorName = '';
    let department = '';
    let patientId = null;

    if (labSelectedPatient) {
      patientId = labSelectedPatient.id;
      patientName = labSelectedPatient.fullName || labSelectedPatient.name || '';
      uhid = labSelectedPatient.uhid || '';
      phone = labSelectedPatient.phone || '';
      opId = labSelectedPatient.opId || '';
      ipId = labSelectedPatient.ipId || '';
      doctorName = labSelectedPatient.doctorName || '';
      department = labSelectedPatient.department || '';
    } else {
      const walkinName = document.getElementById('labWalkinName')?.value?.trim();
      const walkinPhone = document.getElementById('labWalkinPhone')?.value?.trim();
      const walkinDoctor = document.getElementById('labWalkinDoctor')?.value?.trim();
      const walkinDept = document.getElementById('labWalkinDept')?.value?.trim();

      if (!walkinName) {
        alert('Please search and select an existing patient, or enter a Walk-in patient name.');
        document.getElementById('labPatientSearchInput')?.focus();
        return;
      }
      patientName = walkinName;
      phone = walkinPhone || '';
      doctorName = walkinDoctor || 'Dr. On Duty';
      department = walkinDept || 'Diagnostics';
      uhid = 'WALKIN-' + Date.now().toString().slice(-6);
    }

    if (!labOrderItems || labOrderItems.length === 0) {
      alert('Please add at least one laboratory test to the order.');
      return;
    }

    const discountPercentage = parseFloat(document.getElementById('labDiscountPct')?.value) || 0;
    const gstPercentage = parseFloat(document.getElementById('labGstPct')?.value) || 0;
    const gstin = document.getElementById('labGstinInput')?.value?.trim() || '';
    const paidAmount = parseFloat(document.getElementById('labPaidAmount')?.value) || 0;
    const paymentMethod = document.getElementById('labPaymentMethod')?.value || 'CASH';
    const notes = document.getElementById('labNotes')?.value?.trim() || '';

    const btn = document.getElementById('btnLabCreateOrder');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="cv-spinner" style="display:inline-block; margin-right:0.4rem;"></span> Creating Order...`;
    }

    const payload = {
      patientId: patientId,
      patientName: patientName,
      uhid: uhid,
      phone: phone,
      opId: opId,
      ipId: ipId,
      doctorName: doctorName,
      department: department,
      discountPercentage: discountPercentage,
      gstPercentage: gstPercentage,
      gstin: gstin,
      paidAmount: paidAmount,
      paymentMethod: paymentMethod,
      notes: notes,
      items: labOrderItems.map(item => ({
        testId: item.testId,
        testCode: item.testCode,
        testName: item.testName,
        category: item.category,
        sampleType: item.sampleType,
        price: item.price,
        referenceRange: item.referenceRange,
        unit: item.unit
      }))
    };

    try {
      const res = await Api.post('/api/laboratory/orders', payload);
      if (res && res.success && res.data) {
        const createdOrder = res.data;
        alert(`Laboratory order created successfully!\n\nLab Order ID: ${createdOrder.orderNumber}\nTotal Amount: ₹${formatCurrency(createdOrder.finalTotal)}\nPayment Status: ${createdOrder.paymentStatus}`);

        labOrderItems = [];
        labSelectedPatient = null;
        renderLabOrdersTab();

        if (confirm(`Lab Order ${createdOrder.orderNumber} created. Would you like to view it in Laboratory Processing now?`)) {
          switchLabTab('processing');
        }
      } else {
        alert(res?.message || 'Failed to create laboratory order.');
      }
    } catch (err) {
      console.error('Error creating lab order:', err);
      alert('Network or server error while creating laboratory order.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Create Lab Order`;
      }
    }
  }

  // ------------------------------------------------------------------
  // TAB 2: LABORATORY PROCESSING
  // ------------------------------------------------------------------
  let labProcessingPagination = null;

  async function renderLabProcessingTab() {
    const container = document.getElementById('labTabContent');
    if (!container) return;

    if (!labProcessingPagination) {
      labProcessingPagination = createHistoryPaginationController({
        defaultPageSize: 10,
        onPageChange: (pagedItems) => {
          renderLabProcessingRows(pagedItems);
          const mount = document.getElementById('labProcessingPaginationMount');
          if (mount) {
            mount.innerHTML = labProcessingPagination.renderControlsHtml('labProcessing');
            labProcessingPagination.bindEvents('labProcessing');
          }
        }
      });
    }

    container.innerHTML = `
      <div class="cv-lab-processing-wrapper">
        <!-- Filter and Search Toolbar -->
        <div class="cv-lab-processing-toolbar">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <div class="cv-filter-pills" id="labStatusFilterPills">
              <button type="button" class="cv-filter-pill ${labActiveFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All Orders</button>
              <button type="button" class="cv-filter-pill ${labActiveFilter === 'ORDERED' ? 'active' : ''}" data-filter="ORDERED">Ordered</button>
              <button type="button" class="cv-filter-pill ${labActiveFilter === 'SAMPLE_COLLECTED' ? 'active' : ''}" data-filter="SAMPLE_COLLECTED">Sample Collected</button>
              <button type="button" class="cv-filter-pill ${labActiveFilter === 'PROCESSING' ? 'active' : ''}" data-filter="PROCESSING">Processing</button>
              <button type="button" class="cv-filter-pill ${labActiveFilter === 'COMPLETED' ? 'active' : ''}" data-filter="COMPLETED">Completed</button>
              <button type="button" class="cv-filter-pill ${labActiveFilter === 'CANCELLED' ? 'active' : ''}" data-filter="CANCELLED">Cancelled</button>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem;">
            <div class="cv-search-icon-input" style="width:300px;">
              <i class="fas fa-search">
                <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </i>
              <input type="text" id="labProcessingSearchInput" placeholder="Search by Order ID, Patient, UHID, OP, Test..." value="${escapeHtml(labCurrentProcessingSearch)}">
            </div>
            <button type="button" class="cv-btn-secondary" id="btnLabRefreshOrders" title="Refresh List" style="height:36px; padding:0 0.75rem; display:inline-flex; align-items:center; justify-content:center;">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>

        <!-- Processing Queue Table Card -->
        <div class="cv-lab-card" style="margin-top:0.75rem;">
          <div class="cv-bill-table-wrapper" style="min-height:380px;">
            <div id="labProcessingLoading" style="display:none; text-align:center; padding:2rem;">
              <div class="cv-loading-spinner"></div>
            </div>
            <table class="cv-bill-table" id="labProcessingTable">
              <thead>
                <tr>
                  <th style="width:140px;">Lab Order ID</th>
                  <th>Patient Details</th>
                  <th>Tests &amp; Category</th>
                  <th style="width:120px;">Doctor &amp; Dept</th>
                  <th style="width:160px; text-align:right;">Financial Details</th>
                  <th style="width:110px; text-align:center;">Lab Status</th>
                  <th style="width:230px; text-align:center;">Actions</th>
                </tr>
              </thead>
              <tbody id="labProcessingTableBody">
                <!-- Populated dynamically via pagination -->
              </tbody>
            </table>
          </div>
          <div id="labProcessingPaginationMount"></div>
        </div>
      </div>
    `;

    setupLabProcessingEvents();
    loadLabProcessingOrders(false);
  }

  function setupLabProcessingEvents() {
    // Filter Pills
    document.querySelectorAll('#labStatusFilterPills .cv-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#labStatusFilterPills .cv-filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        labActiveFilter = btn.getAttribute('data-filter') || 'ALL';
        loadLabProcessingOrders(false);
      });
    });

    // Search Input
    const searchInput = document.getElementById('labProcessingSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        labCurrentProcessingSearch = e.target.value.trim();
        if (labProcessingSearchDebounce) clearTimeout(labProcessingSearchDebounce);
        labProcessingSearchDebounce = setTimeout(() => {
          loadLabProcessingOrders(false);
        }, 300);
      });
    }

    // Refresh button
    document.getElementById('btnLabRefreshOrders')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnLabRefreshOrders');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle;"></span>';
      }
      try {
        await loadLabProcessingOrders(true);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
        }
      }
    });
  }

  async function loadLabProcessingOrders(preservePage = false) {
    const tbody = document.getElementById('labProcessingTableBody');
    const loader = document.getElementById('labProcessingLoading');
    if (!tbody) return;

    if (loader) loader.style.display = 'block';

    try {
      let url = `/api/laboratory/orders?`;
      if (labActiveFilter && labActiveFilter !== 'ALL') {
        url += `status=${encodeURIComponent(labActiveFilter)}&`;
      }
      if (labCurrentProcessingSearch) {
        url += `search=${encodeURIComponent(labCurrentProcessingSearch)}&`;
      }

      const res = await Api.get(url);
      if (loader) loader.style.display = 'none';

      if (res && res.success && Array.isArray(res.data)) {
        labProcessingOrders = res.data;
        if (!labProcessingPagination) {
          labProcessingPagination = createHistoryPaginationController({
            defaultPageSize: 10,
            onPageChange: (pagedItems) => {
              renderLabProcessingRows(pagedItems);
              const mount = document.getElementById('labProcessingPaginationMount');
              if (mount) {
                mount.innerHTML = labProcessingPagination.renderControlsHtml('labProcessing');
                labProcessingPagination.bindEvents('labProcessing');
              }
            }
          });
        }
        const paged = labProcessingPagination.setItems(labProcessingOrders, preservePage);
        renderLabProcessingRows(paged);
        const mount = document.getElementById('labProcessingPaginationMount');
        if (mount) {
          mount.innerHTML = labProcessingPagination.renderControlsHtml('labProcessing');
          labProcessingPagination.bindEvents('labProcessing');
        }
      } else {
        labProcessingOrders = [];
        renderLabProcessingRows([]);
        const mount = document.getElementById('labProcessingPaginationMount');
        if (mount) mount.innerHTML = '';
      }
    } catch (err) {
      if (loader) loader.style.display = 'none';
      console.error('Failed to load lab processing orders:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2rem; color:var(--cv-danger);">
            Error loading laboratory orders from server.
          </td>
        </tr>
      `;
    }
  }

  function renderLabProcessingRows(orders) {
    const tbody = document.getElementById('labProcessingTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2rem; color:var(--cv-text-muted); font-size:0.9rem;">
            No laboratory orders matching the current filter/search.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const testsHtml = (order.items || []).map(i => `
        <span style="display:inline-block; font-size:0.75rem; background:#f1f5f9; padding:0.12rem 0.45rem; border-radius:4px; margin:0.1rem; font-weight:600; color:#334155;">
          ${escapeHtml(i.testName)}
          ${i.sampleType ? `<strong style="color:var(--cv-primary); font-size:0.7rem;">(${escapeHtml(i.sampleType)})</strong>` : ''}
        </span>
      `).join('');

      let statusBadgeClass = 'cv-badge-lab-ordered';
      if (order.orderStatus === 'SAMPLE_COLLECTED') statusBadgeClass = 'cv-badge-lab-sample';
      else if (order.orderStatus === 'PROCESSING') statusBadgeClass = 'cv-badge-lab-processing';
      else if (order.orderStatus === 'COMPLETED') statusBadgeClass = 'cv-badge-lab-completed';
      else if (order.orderStatus === 'CANCELLED') statusBadgeClass = 'cv-badge-lab-cancelled';

      let payBadgeClass = 'cv-badge-paid';
      if (order.paymentStatus === 'PARTIALLY PAID') payBadgeClass = 'cv-badge-partial';
      else if (order.paymentStatus === 'UNPAID') payBadgeClass = 'cv-badge-unpaid';

      return `
        <tr>
          <td>
            <div style="font-family:monospace; font-weight:800; color:var(--cv-primary); font-size:0.88rem;">${escapeHtml(order.orderNumber)}</div>
            <div style="font-size:0.72rem; color:var(--cv-text-muted); margin-top:0.15rem;">
              ${escapeHtml(order.orderDate || '')} ${escapeHtml(order.orderTime || '')}
            </div>
          </td>
          <td>
            <div style="font-weight:700; color:var(--cv-text-main); font-size:0.9rem;">${escapeHtml(order.patientName)}</div>
            <div style="font-size:0.74rem; color:var(--cv-text-muted); display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:0.15rem;">
              <span>UHID: <strong style="font-family:monospace; color:var(--cv-primary);">${escapeHtml(order.uhid || 'N/A')}</strong></span>
              ${order.opId ? `<span>OP: <strong style="font-family:monospace;">${escapeHtml(order.opId)}</strong></span>` : ''}
              ${order.ipId ? `<span>IP: <strong style="font-family:monospace;">${escapeHtml(order.ipId)}</strong></span>` : ''}
              <span>${escapeHtml(order.phone || '')}</span>
            </div>
          </td>
          <td>
            <div style="display:flex; flex-wrap:wrap; max-width:240px;">
              ${testsHtml || '<span style="color:var(--cv-text-muted); font-size:0.75rem;">No tests</span>'}
            </div>
          </td>
          <td>
            <div style="font-size:0.84rem; font-weight:600; color:var(--cv-text-main);">${escapeHtml(order.doctorName || 'Dr. On Duty')}</div>
            <div style="font-size:0.74rem; color:var(--cv-text-muted);">${escapeHtml(order.department || 'Diagnostics')}</div>
          </td>
          <td style="text-align:right;">
            <div style="font-weight:700; color:#0f172a; font-size:0.9rem;">₹${formatCurrency(order.finalTotal)}</div>
            <div style="font-size:0.72rem; color:var(--cv-text-muted); margin-top:0.15rem;">
              Paid: <span style="font-weight:600; color:#15803d;">₹${formatCurrency(order.paidAmount)}</span> &bull; 
              Bal: <span style="font-weight:600; color:${order.balanceAmount > 0 ? '#dc2626' : '#64748b'};">₹${formatCurrency(order.balanceAmount)}</span>
            </div>
            <div style="margin-top:0.25rem;">
              <span class="cv-payment-balance-badge ${payBadgeClass}" style="font-size:0.65rem; padding:0.1rem 0.4rem;">
                ${escapeHtml(order.paymentStatus)}
              </span>
            </div>
          </td>
          <td style="text-align:center;">
            <span class="cv-payment-balance-badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.2rem 0.55rem; text-transform:uppercase;">
              ${escapeHtml(order.orderStatus.replace('_', ' '))}
            </span>
          </td>
          <td style="text-align:center;">
            <div style="display:flex; gap:0.35rem; justify-content:center; flex-wrap:wrap;">
              <button type="button" class="cv-btn-secondary btn-lab-results" data-id="${order.id}" style="padding:0.25rem 0.55rem; font-size:0.75rem; font-weight:600;">
                Enter Results
              </button>
              ${order.orderStatus !== 'COMPLETED' && order.orderStatus !== 'CANCELLED' ? `
                <button type="button" class="cv-btn-primary btn-lab-complete" data-id="${order.id}" data-num="${escapeHtml(order.orderNumber)}" style="padding:0.25rem 0.55rem; font-size:0.75rem; font-weight:700; background:#059669; border-color:#059669;">
                  Complete
                </button>
              ` : ''}
              <button type="button" class="cv-btn-secondary btn-lab-print" data-id="${order.id}" style="padding:0.25rem 0.55rem; font-size:0.75rem; font-weight:600;">
                Report
              </button>
              <button type="button" class="cv-btn-secondary btn-lab-details" data-id="${order.id}" style="padding:0.25rem 0.45rem; font-size:0.75rem;" title="View Details">
                &hellip;
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind row action buttons
    tbody.querySelectorAll('.btn-lab-results').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showLabResultsModal(id);
      });
    });

    tbody.querySelectorAll('.btn-lab-complete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const num = btn.getAttribute('data-num');
        markLabOrderCompleted(id, num);
      });
    });

    tbody.querySelectorAll('.btn-lab-print').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showPrintableLabReportModal(id);
      });
    });

    tbody.querySelectorAll('.btn-lab-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showLabOrderDetailsModal(id);
      });
    });
  }

  // ------------------------------------------------------------------
  // RESULTS ENTRY & VERIFICATION MODAL
  // ------------------------------------------------------------------
  async function showLabResultsModal(orderId) {
    const modalHost = document.getElementById('labModalHost');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="cv-lab-report-modal" id="labResultsModalOverlay">
        <div style="background:#ffffff; border-radius:var(--cv-radius-lg); max-width:850px; width:100%; box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow:hidden;">
          <div style="padding:1.25rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
            <div>
              <h3 style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:800;">
                Laboratory Test Results Entry &amp; Verification
              </h3>
              <p style="margin:0.2rem 0 0 0; font-size:0.8rem; color:#64748b;">Loading order parameters from MySQL...</p>
            </div>
            <button type="button" class="cv-btn-secondary" id="btnCloseResultsModal" style="padding:0.3rem 0.6rem; font-size:0.8rem;">&times; Close</button>
          </div>
          <div style="padding:2rem; text-align:center;">
            <div class="cv-loading-spinner"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnCloseResultsModal')?.addEventListener('click', () => {
      modalHost.innerHTML = '';
    });

    try {
      const res = await Api.get(`/api/laboratory/orders/${orderId}`);
      if (!res || !res.success || !res.data) {
        alert('Failed to load laboratory order details.');
        modalHost.innerHTML = '';
        return;
      }

      const order = res.data;
      const items = order.items || [];

      modalHost.innerHTML = `
        <div class="cv-lab-report-modal" id="labResultsModalOverlay">
          <div style="background:#ffffff; border-radius:var(--cv-radius-lg); max-width:900px; width:100%; box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow:hidden; max-height:92vh; display:flex; flex-direction:column;">
            
            <!-- Modal Header -->
            <div style="padding:1rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
              <div>
                <h3 style="margin:0; font-size:1.05rem; color:#0f172a; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
                  <span>Enter Diagnostic Results</span>
                  <span style="font-family:monospace; color:var(--cv-primary); font-size:0.95rem;">${escapeHtml(order.orderNumber)}</span>
                </h3>
                <div style="margin-top:0.2rem; font-size:0.78rem; color:#64748b; display:flex; gap:0.6rem;">
                  <span>Patient: <strong>${escapeHtml(order.patientName)}</strong></span>
                  <span>UHID: <strong style="font-family:monospace;">${escapeHtml(order.uhid)}</strong></span>
                  <span>Doctor: <strong>${escapeHtml(order.doctorName || 'Dr. On Duty')}</strong></span>
                  <span>Status: <strong style="color:var(--cv-primary); text-transform:uppercase;">${escapeHtml(order.orderStatus)}</strong></span>
                </div>
              </div>
              <button type="button" class="cv-btn-secondary" id="btnCloseResultsModal" style="padding:0.3rem 0.6rem; font-size:0.85rem;">&times; Close</button>
            </div>

            <!-- Modal Body (Scrollable) -->
            <div style="padding:1.25rem 1.5rem; overflow-y:auto; flex:1;">
              <table class="cv-bill-table" style="width:100%;">
                <thead>
                  <tr>
                    <th>Test Name &amp; Code</th>
                    <th style="width:110px;">Sample</th>
                    <th style="width:140px;">Observed Result <span style="color:var(--cv-danger);">*</span></th>
                    <th style="width:90px;">Unit</th>
                    <th style="width:140px;">Reference Interval</th>
                    <th>Clinical Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr data-item-id="${item.id}">
                      <td>
                        <div style="font-weight:700; color:#0f172a; font-size:0.88rem;">${escapeHtml(item.testName)}</div>
                        <div style="font-size:0.72rem; color:#64748b; font-family:monospace;">${escapeHtml(item.testCode)}</div>
                      </td>
                      <td>
                        <span style="font-size:0.75rem; background:#e0f2fe; color:#0369a1; padding:0.12rem 0.4rem; border-radius:4px; font-weight:600;">
                          ${escapeHtml(item.sampleType || 'Blood')}
                        </span>
                      </td>
                      <td>
                        <input type="text" class="cv-form-input item-result-val" data-item-id="${item.id}" value="${escapeHtml(item.resultValue || '')}" placeholder="Result..." style="height:32px; font-weight:700; color:#0f172a; font-size:0.86rem;">
                      </td>
                      <td>
                        <input type="text" class="cv-form-input item-result-unit" data-item-id="${item.id}" value="${escapeHtml(item.unit || '')}" placeholder="Unit" style="height:32px; font-size:0.82rem;">
                      </td>
                      <td>
                        <input type="text" class="cv-form-input item-result-range" data-item-id="${item.id}" value="${escapeHtml(item.referenceRange || '')}" placeholder="Ref range" style="height:32px; font-size:0.82rem;">
                      </td>
                      <td>
                        <input type="text" class="cv-form-input item-result-notes" data-item-id="${item.id}" value="${escapeHtml(item.resultNotes || '')}" placeholder="Normal / Abnormal notes..." style="height:32px; font-size:0.82rem;">
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="margin-top:1.25rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem; background:#f8fafc; padding:0.85rem 1rem; border-radius:var(--cv-radius-md); border:1px solid #e2e8f0;">
                <div>
                  <label style="font-size:0.74rem; font-weight:700; color:#475569; display:block; margin-bottom:0.25rem;">
                    LAB TECHNICIAN / PATHOLOGIST NAME <span style="color:var(--cv-danger);">*</span>
                  </label>
                  <input type="text" id="labResultsTechnicianName" class="cv-form-input" style="height:36px; font-size:0.85rem;" value="${escapeHtml(order.technicianName || currentUser?.fullName || currentUser?.username || 'Medical Laboratory Technologist')}">
                </div>
                <div>
                  <label style="font-size:0.74rem; font-weight:700; color:#475569; display:block; margin-bottom:0.25rem;">
                    OVERALL CLINICAL INTERPRETATION / SUMMARY
                  </label>
                  <input type="text" id="labResultsOverallNotes" class="cv-form-input" style="height:36px; font-size:0.85rem;" placeholder="Clinical summary for printable report...">
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div style="padding:0.85rem 1.5rem; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#ffffff;">
              <button type="button" class="cv-btn-secondary" id="btnCancelResultsModal" style="padding:0.45rem 1rem; font-size:0.85rem;">Cancel</button>
              <div style="display:flex; gap:0.6rem;">
                <button type="button" class="cv-btn-secondary" id="btnSaveResultsDraft" style="padding:0.45rem 1rem; font-size:0.85rem; font-weight:600;">
                  Save Results Draft
                </button>
                <button type="button" class="cv-btn-primary" id="btnSaveAndCompleteOrder" style="padding:0.45rem 1.25rem; font-size:0.85rem; font-weight:700; background:#059669; border-color:#059669;">
                  Verify &amp; Mark Completed
                </button>
              </div>
            </div>

          </div>
        </div>
      `;

      document.getElementById('btnCloseResultsModal')?.addEventListener('click', () => {
        modalHost.innerHTML = '';
      });
      document.getElementById('btnCancelResultsModal')?.addEventListener('click', () => {
        modalHost.innerHTML = '';
      });

      // Save Draft
      document.getElementById('btnSaveResultsDraft')?.addEventListener('click', async () => {
        await saveLabResults(orderId, items, 'PROCESSING', false);
      });

      // Verify and Mark Completed
      document.getElementById('btnSaveAndCompleteOrder')?.addEventListener('click', async () => {
        await saveLabResults(orderId, items, 'COMPLETED', true);
      });

    } catch (err) {
      console.error('Error opening lab results modal:', err);
      modalHost.innerHTML = '';
      alert('Error fetching order details.');
    }
  }

  async function saveLabResults(orderId, items, targetStatus, alsoComplete) {
    const technician = document.getElementById('labResultsTechnicianName')?.value?.trim() || 'Laboratory Technologist';
    const overallNotes = document.getElementById('labResultsOverallNotes')?.value?.trim() || '';

    const resultsPayload = {
      orderStatus: targetStatus,
      technicianName: technician,
      notes: overallNotes,
      items: items.map(item => {
        const resVal = document.querySelector(`.item-result-val[data-item-id="${item.id}"]`)?.value?.trim() || '';
        const unit = document.querySelector(`.item-result-unit[data-item-id="${item.id}"]`)?.value?.trim() || '';
        const range = document.querySelector(`.item-result-range[data-item-id="${item.id}"]`)?.value?.trim() || '';
        const notes = document.querySelector(`.item-result-notes[data-item-id="${item.id}"]`)?.value?.trim() || '';

        return {
          itemId: item.id,
          resultValue: resVal,
          unit: unit,
          referenceRange: range,
          resultNotes: notes,
          status: resVal ? 'COMPLETED' : 'PROCESSING',
          technicianName: technician
        };
      })
    };

    try {
      const res = await Api.put(`/api/laboratory/orders/${orderId}/results`, resultsPayload);
      if (res && res.success) {
        if (alsoComplete) {
          const compRes = await Api.post(`/api/laboratory/orders/${orderId}/complete`, {
            completedBy: currentUser?.username || 'admin',
            technicianName: technician
          });
          if (compRes && compRes.success) {
            alert("Laboratory order marked as completed.");
          } else {
            alert(compRes?.message || 'Results saved, but failed to complete order.');
          }
        } else {
          alert("Laboratory test results saved successfully.");
        }

        document.getElementById('labModalHost').innerHTML = '';
        loadLabProcessingOrders();
      } else {
        alert(res?.message || 'Failed to save test results.');
      }
    } catch (err) {
      console.error('Error saving lab results:', err);
      alert('Error saving results to database.');
    }
  }

  async function markLabOrderCompleted(orderId, orderNumber) {
    if (!confirm(`Are you sure you want to mark Laboratory Order ${orderNumber} as COMPLETED?`)) {
      return;
    }

    const technician = prompt("Enter Lab Technician / Verifier Name:", currentUser?.fullName || currentUser?.username || "Medical Laboratory Technologist");
    if (technician === null) return;

    try {
      const res = await Api.post(`/api/laboratory/orders/${orderId}/complete`, {
        completedBy: currentUser?.username || 'admin',
        technicianName: technician || 'Medical Laboratory Technologist'
      });

      if (res && res.success) {
        alert("Laboratory order marked as completed.");
        loadLabProcessingOrders();
      } else {
        alert(res?.message || 'Failed to complete order.');
      }
    } catch (err) {
      console.error('Error completing lab order:', err);
      alert('Server error while marking lab order completed.');
    }
  }

  // ------------------------------------------------------------------
  // PRINTABLE LAB REPORT MODAL
  // ------------------------------------------------------------------
  async function showPrintableLabReportModal(orderId) {
    const modalHost = document.getElementById('labModalHost');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="cv-lab-report-modal" id="labReportModalOverlay">
        <div style="background:#ffffff; border-radius:var(--cv-radius-lg); padding:2rem; text-align:center;">
          <div class="cv-loading-spinner"></div>
          <p style="margin-top:0.75rem; color:#64748b; font-size:0.85rem;">Generating diagnostic lab report from MySQL...</p>
        </div>
      </div>
    `;

    try {
      const res = await Api.get(`/api/laboratory/orders/${orderId}`);
      if (!res || !res.success || !res.data) {
        alert('Failed to load lab order report details.');
        modalHost.innerHTML = '';
        return;
      }

      const order = res.data;
      const items = order.items || [];
      const hospitalName = currentUser?.hospitalName || 'CareVista Super Speciality Hospital';

      modalHost.innerHTML = `
        <div class="cv-lab-report-modal" id="labReportModalOverlay">
          <div style="display:flex; flex-direction:column; gap:1rem; align-items:center; width:100%; max-width:800px;">
            
            <!-- Action Toolbar (Hidden during print) -->
            <div class="no-print" style="width:100%; display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:0.75rem 1.25rem; border-radius:var(--cv-radius-md); box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="font-weight:700; color:#0f172a; font-size:0.95rem;">Diagnostic Laboratory Report Preview</div>
              <div style="display:flex; gap:0.6rem;">
                <button type="button" class="cv-btn-secondary" id="btnCloseLabReport" style="padding:0.4rem 0.85rem; font-size:0.85rem;">Close</button>
                <button type="button" class="cv-btn-primary" id="btnPrintLabReport" style="padding:0.4rem 1.25rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
                  <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print Report
                </button>
              </div>
            </div>

            <!-- Printable Pathology Paper -->
            <div class="cv-lab-report-paper">
              
              <!-- Hospital Letterhead -->
              <div style="border-bottom:2px solid #0f172a; padding-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:1.35rem; font-weight:900; color:var(--cv-deep-blue); letter-spacing:-0.02em;">
                    ${escapeHtml(hospitalName.toUpperCase())}
                  </div>
                  <div style="font-size:0.82rem; font-weight:700; color:var(--cv-primary); text-transform:uppercase; letter-spacing:0.04em; margin-top:0.15rem;">
                    Department of Clinical Pathology, Biochemistry &amp; Diagnostics
                  </div>
                  <div style="font-size:0.75rem; color:#64748b; margin-top:0.2rem;">
                    NABL &amp; ISO 15189 Certified Clinical Laboratory &bull; Automated Diagnostic Services
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="display:inline-block; border:1px solid #cbd5e1; border-radius:6px; padding:0.35rem 0.75rem; background:#f8fafc; font-size:0.72rem; color:#475569;">
                    <div><strong>LAB REPORT</strong></div>
                    <div style="font-family:monospace; font-weight:700; color:var(--cv-primary); font-size:0.85rem;">${escapeHtml(order.orderNumber)}</div>
                  </div>
                </div>
              </div>

              <!-- Report Header Banner -->
              <div style="background:#f1f5f9; border-radius:4px; padding:0.4rem 0.75rem; margin:0.85rem 0; text-align:center; font-weight:800; font-size:0.88rem; color:#0f172a; text-transform:uppercase; letter-spacing:0.06em;">
                Clinical Laboratory Investigation Report
              </div>

              <!-- Patient & Sample Meta Grid -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:0.85rem; font-size:0.82rem; margin-bottom:1.25rem;">
                <div>
                  <div style="margin-bottom:0.25rem;"><strong>Patient Name:</strong> ${escapeHtml(order.patientName)}</div>
                  <div style="margin-bottom:0.25rem;"><strong>UHID:</strong> <span style="font-family:monospace; font-weight:700;">${escapeHtml(order.uhid)}</span></div>
                  <div style="margin-bottom:0.25rem;"><strong>Age &bull; Gender:</strong> ${order.age ? order.age + ' yrs' : 'N/A'} &bull; ${escapeHtml(order.gender || 'N/A')}</div>
                  <div><strong>Phone:</strong> ${escapeHtml(order.phone || 'N/A')}</div>
                </div>
                <div>
                  <div style="margin-bottom:0.25rem;"><strong>Order ID:</strong> <span style="font-family:monospace; font-weight:700; color:var(--cv-primary);">${escapeHtml(order.orderNumber)}</span></div>
                  <div style="margin-bottom:0.25rem;"><strong>Ref. Doctor:</strong> ${escapeHtml(order.doctorName || 'Dr. On Duty')} (${escapeHtml(order.department || 'Diagnostics')})</div>
                  <div style="margin-bottom:0.25rem;"><strong>Date &amp; Time:</strong> ${escapeHtml(order.orderDate || '')} ${escapeHtml(order.orderTime || '')}</div>
                  <div><strong>Verification Status:</strong> <span style="font-weight:700; color:${order.orderStatus === 'COMPLETED' ? '#15803d' : '#b45309'};">${escapeHtml(order.orderStatus.replace('_', ' '))}</span></div>
                </div>
              </div>

              <!-- Test Results Table -->
              <table style="width:100%; border-collapse:collapse; font-size:0.84rem; margin-bottom:1.5rem;">
                <thead>
                  <tr style="background:#f8fafc; border-top:1.5px solid #cbd5e1; border-bottom:1.5px solid #cbd5e1;">
                    <th style="text-align:left; padding:0.6rem 0.5rem; font-weight:800; color:#334155;">Test / Investigation</th>
                    <th style="text-align:left; padding:0.6rem 0.5rem; font-weight:800; color:#334155; width:90px;">Sample</th>
                    <th style="text-align:right; padding:0.6rem 0.5rem; font-weight:800; color:#0f172a; width:120px;">Observed Value</th>
                    <th style="text-align:center; padding:0.6rem 0.5rem; font-weight:800; color:#334155; width:90px;">Unit</th>
                    <th style="text-align:left; padding:0.6rem 0.5rem; font-weight:800; color:#334155; width:140px;">Biological Reference Interval</th>
                    <th style="text-align:left; padding:0.6rem 0.5rem; font-weight:800; color:#334155; width:120px;">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, idx) => `
                    <tr style="border-bottom:1px solid #f1f5f9; ${idx % 2 === 1 ? 'background:#fafafa;' : ''}">
                      <td style="padding:0.6rem 0.5rem;">
                        <div style="font-weight:700; color:#0f172a;">${escapeHtml(item.testName)}</div>
                        <div style="font-size:0.72rem; color:#64748b; font-family:monospace;">${escapeHtml(item.testCode)} &bull; ${escapeHtml(item.category || 'Clinical')}</div>
                      </td>
                      <td style="padding:0.6rem 0.5rem; color:#475569; font-size:0.8rem;">
                        ${escapeHtml(item.sampleType || 'Blood')}
                      </td>
                      <td style="padding:0.6rem 0.5rem; text-align:right; font-weight:800; font-size:0.92rem; color:#0f172a;">
                        ${escapeHtml(item.resultValue || 'Under Processing')}
                      </td>
                      <td style="padding:0.6rem 0.5rem; text-align:center; color:#475569; font-size:0.8rem;">
                        ${escapeHtml(item.unit || '')}
                      </td>
                      <td style="padding:0.6rem 0.5rem; color:#334155; font-size:0.8rem; font-family:monospace;">
                        ${escapeHtml(item.referenceRange || 'N/A')}
                      </td>
                      <td style="padding:0.6rem 0.5rem; font-size:0.78rem; color:#64748b;">
                        ${escapeHtml(item.resultNotes || 'Normal')}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              ${order.notes ? `
                <div style="margin-bottom:1.5rem; padding:0.6rem 0.85rem; background:#f8fafc; border-left:3px solid var(--cv-primary); border-radius:2px; font-size:0.78rem; color:#475569;">
                  <strong>Clinical Remarks / Interpretation:</strong> ${escapeHtml(order.notes)}
                </div>
              ` : ''}

              <!-- End of report notice -->
              <div style="text-align:center; font-size:0.72rem; color:#94a3b8; margin:1.25rem 0; letter-spacing:0.04em;">
                *** END OF DIAGNOSTIC PATHOLOGY REPORT &bull; VERIFIED IN CAREVISTA HMS SAAS ***
              </div>

              <!-- Sign-off signatures block -->
              <div style="display:flex; justify-content:space-between; margin-top:3rem; padding-top:1.5rem; font-size:0.78rem; color:#334155;">
                <div style="border-top:1px solid #94a3b8; padding-top:0.35rem; width:200px; text-align:center;">
                  <div style="font-weight:700;">${escapeHtml(order.technicianName || 'Medical Technologist')}</div>
                  <div style="font-size:0.72rem; color:#64748b;">Medical Laboratory Technologist</div>
                </div>
                <div style="border-top:1px solid #94a3b8; padding-top:0.35rem; width:200px; text-align:center;">
                  <div style="font-weight:700;">${escapeHtml(order.completedBy ? 'Dr. ' + order.completedBy : 'Consultant Pathologist')}</div>
                  <div style="font-size:0.72rem; color:#64748b;">Authorized Consultant Pathologist</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      `;

      document.getElementById('btnCloseLabReport')?.addEventListener('click', () => {
        modalHost.innerHTML = '';
      });

      document.getElementById('btnPrintLabReport')?.addEventListener('click', () => {
        window.print();
      });

      document.getElementById('labReportModalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'labReportModalOverlay') modalHost.innerHTML = '';
      });

    } catch (err) {
      console.error('Error generating printable lab report:', err);
      modalHost.innerHTML = '';
      alert('Error loading printable report.');
    }
  }

  // ------------------------------------------------------------------
  // ORDER DETAILS MODAL
  // ------------------------------------------------------------------
  async function showLabOrderDetailsModal(orderId) {
    const modalHost = document.getElementById('labModalHost');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="cv-lab-report-modal" id="labDetailsModalOverlay">
        <div style="background:#ffffff; border-radius:var(--cv-radius-lg); padding:2rem; text-align:center;">
          <div class="cv-loading-spinner"></div>
        </div>
      </div>
    `;

    try {
      const res = await Api.get(`/api/laboratory/orders/${orderId}`);
      if (!res || !res.success || !res.data) {
        modalHost.innerHTML = '';
        return;
      }
      const order = res.data;

      modalHost.innerHTML = `
        <div class="cv-lab-report-modal" id="labDetailsModalOverlay">
          <div style="background:#ffffff; border-radius:var(--cv-radius-lg); max-width:650px; width:100%; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); overflow:hidden;">
            <div style="padding:1rem 1.25rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
              <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#0f172a;">Laboratory Order #${escapeHtml(order.orderNumber)}</h3>
              <button type="button" class="cv-btn-secondary" id="btnCloseDetailsModal" style="padding:0.25rem 0.5rem; font-size:0.8rem;">&times;</button>
            </div>
            <div style="padding:1.25rem; font-size:0.84rem; display:flex; flex-direction:column; gap:0.75rem;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; background:#f8fafc; padding:0.75rem; border-radius:6px;">
                <div><strong>Patient:</strong> ${escapeHtml(order.patientName)}</div>
                <div><strong>UHID:</strong> <span style="font-family:monospace;">${escapeHtml(order.uhid)}</span></div>
                <div><strong>Phone:</strong> ${escapeHtml(order.phone || 'N/A')}</div>
                <div><strong>Doctor:</strong> ${escapeHtml(order.doctorName || 'N/A')}</div>
                <div><strong>Order Date:</strong> ${escapeHtml(order.orderDate)} ${escapeHtml(order.orderTime)}</div>
                <div><strong>Status:</strong> <span style="font-weight:700; text-transform:uppercase;">${escapeHtml(order.orderStatus)}</span></div>
              </div>

              <div>
                <div style="font-weight:700; margin-bottom:0.35rem; color:#0f172a;">Tests Ordered:</div>
                <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                  <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                    <thead>
                      <tr style="background:#f1f5f9;">
                        <th style="padding:0.4rem 0.5rem; text-align:left;">Test</th>
                        <th style="padding:0.4rem 0.5rem; text-align:left;">Sample</th>
                        <th style="padding:0.4rem 0.5rem; text-align:right;">Price</th>
                        <th style="padding:0.4rem 0.5rem; text-align:right;">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(order.items || []).map(i => `
                        <tr style="border-top:1px solid #f1f5f9;">
                          <td style="padding:0.4rem 0.5rem; font-weight:600;">${escapeHtml(i.testName)}</td>
                          <td style="padding:0.4rem 0.5rem;">${escapeHtml(i.sampleType || 'Blood')}</td>
                          <td style="padding:0.4rem 0.5rem; text-align:right;">₹${formatCurrency(i.price)}</td>
                          <td style="padding:0.4rem 0.5rem; text-align:right; font-weight:700;">${escapeHtml(i.resultValue || 'Pending')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style="background:#f8fafc; padding:0.75rem; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div><strong>Payment:</strong> <span style="font-weight:700;">${escapeHtml(order.paymentStatus)}</span> (${escapeHtml(order.paymentMethod)})</div>
                  <div style="font-size:0.75rem; color:#64748b;">Subtotal: ₹${formatCurrency(order.subtotal)} &bull; Disc: ${order.discountPercentage || 0}% &bull; GST: ${order.gstPercentage || 0}%</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:1.1rem; font-weight:800; color:var(--cv-primary);">₹${formatCurrency(order.finalTotal)}</div>
                  <div style="font-size:0.75rem; color:#15803d;">Paid: ₹${formatCurrency(order.paidAmount)} | Bal: ₹${formatCurrency(order.balanceAmount)}</div>
                </div>
              </div>
            </div>
            <div style="padding:0.75rem 1.25rem; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:0.5rem; background:#f8fafc;">
              <button type="button" class="cv-btn-secondary" id="btnCloseDetailsModal2" style="padding:0.35rem 0.85rem; font-size:0.82rem;">Close</button>
              <button type="button" class="cv-btn-primary" id="btnOpenReportFromDetails" style="padding:0.35rem 0.85rem; font-size:0.82rem;">View Report</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btnCloseDetailsModal')?.addEventListener('click', () => modalHost.innerHTML = '');
      document.getElementById('btnCloseDetailsModal2')?.addEventListener('click', () => modalHost.innerHTML = '');
      document.getElementById('btnOpenReportFromDetails')?.addEventListener('click', () => {
        showPrintableLabReportModal(orderId);
      });
      document.getElementById('labDetailsModalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'labDetailsModalOverlay') modalHost.innerHTML = '';
      });
    } catch (err) {
      modalHost.innerHTML = '';
    }
  }


  function formatCurrency(num) {
    if (num === null || num === undefined) return '0.00';
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }  // ==========================================================
  // CENTRAL BILLING MODULE (TWO-SECTION STRUCTURE + INVOICE)
  // ==========================================================
  let billingMainTab = 'billing'; // 'billing' or 'main'
  let billingCategoryTab = 'op'; // 'op', 'ip', 'pharmacy', 'laboratory'
  let mainBillingSubView = 'new'; // 'new' or 'history'

  // Active selected patient across Central Billing or per category
  let activeBillingPatient = null;
  let activeOpRecord = null;
  let activeIpRecord = null;
  let activePhRecord = null;
  let activeLabRecord = null;

  let cbConsolidatedData = {
    patientId: null,
    patientName: '',
    uhid: '',
    opId: '',
    ipId: '',
    phone: '',
    age: null,
    gender: '',
    doctorName: '',
    department: '',
    existingInvoiceNumber: null,
    existingBillNumber: null,
    existingBillId: null,
    opCharges: [],
    ipCharges: [],
    pharmacyCharges: [],
    labCharges: [],
    opSubtotal: 0,
    ipSubtotal: 0,
    pharmacySubtotal: 0,
    labSubtotal: 0,
    overallSubtotal: 0
  };
  let cbCachedSummary = null;
  let cbDatePeriodFilter = 'ALL';

  function filterRecordsByPeriod(records, dateField, period) {
    if (!records || !Array.isArray(records) || !period || period === 'ALL') return records || [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return records.filter(item => {
      let rawDate = item[dateField];
      if (!rawDate) return true;
      let dObj = null;
      if (typeof rawDate === 'string' && rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          dObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
      if (!dObj) {
        dObj = new Date(rawDate);
      }
      if (isNaN(dObj.getTime())) return true;

      if (period === 'TODAY') {
        return dObj >= startOfToday;
      } else if (period === 'WEEK') {
        return dObj >= sevenDaysAgo;
      } else if (period === 'MONTH') {
        return dObj >= startOfMonth;
      } else if (period === 'YEAR') {
        return dObj >= startOfYear;
      }
      return true;
    });
  }

  function updateBillingKpiValues() {
    const stats = cbCachedSummary ? cbCachedSummary[billingCategoryTab] : null;
    const recEl = document.getElementById('cbKpiTotalRecords');
    const billedEl = document.getElementById('cbKpiGrossBilled');
    const paidEl = document.getElementById('cbKpiTotalCollected');
    const balEl = document.getElementById('cbKpiOutstanding');
    if (recEl) recEl.textContent = stats ? String(stats.count) : '—';
    if (billedEl) billedEl.textContent = '₹' + (stats ? formatCurrency(stats.billed) : '0.00');
    if (paidEl) paidEl.textContent = '₹' + (stats ? formatCurrency(stats.paid) : '0.00');
    if (balEl) balEl.textContent = '₹' + (stats ? formatCurrency(stats.balance) : '0.00');
  }

  async function loadBillingSummaryData() {
    try {
      const res = await Api.get('/api/billing/categories/summary');
      if (res && res.success) {
        cbCachedSummary = res.data;
        updateBillingKpiValues();
      }
    } catch (e) {
      console.warn('Could not load billing summary stats', e);
    }
  }

  async function renderBillingModule(mainTab = 'billing', categoryTab = 'op') {
    billingMainTab = mainTab;
    if (categoryTab) billingCategoryTab = categoryTab;
    const container = document.getElementById('dashboardMain');
    if (!container) return;

    // Background prefetch Money Management data to eliminate navigation delay
    setTimeout(() => {
      Api.get('/api/admin/money/dashboard?period=ONE_MONTH')
        .then(r => { if (r && r.success && r.data) currentMoneyData = r.data; })
        .catch(() => {});
    }, 150);

    await loadBillingSummaryData();

    container.innerHTML = `
      <div class="cv-billing-wrapper">
        <!-- Top Header & Primary Navigation Tabs -->
        <div class="cv-billing-topbar">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            ${renderBackArrowHtml('Back')}
            <div>
              <h1 class="cv-page-title" style="display:flex; align-items:center; gap:0.6rem;">
                <svg style="width:26px; height:26px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                Central Billing &amp; Invoicing
              </h1>
              <p class="cv-page-subtitle">Hospital: ${escapeHtml(currentUser?.hospitalName || 'CareVista Multispeciality Hospital')} &bull; Real-time MySQL Financial Ledger</p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem;">
            <!-- TWO MAIN SECTIONS TABS -->
            <div class="cv-main-nav-tabs">
              <button type="button" class="cv-main-tab-btn ${billingMainTab === 'billing' ? 'active' : ''}" id="mainTabBillingBtn">
                <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                BILLING
              </button>
              <button type="button" class="cv-main-tab-btn ${billingMainTab === 'main' ? 'active' : ''}" id="mainTabMainBillingBtn">
                <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                MAIN BILLING
              </button>
            </div>

            <button type="button" class="cv-btn-secondary" id="btnBillingBackDashboard" style="padding:0.5rem 0.9rem; font-size:0.85rem;">
              Back to Dashboard
            </button>
          </div>
        </div>

        <!-- Section Content Mount Point -->
        <div id="centralBillingSectionContent"></div>
      </div>
    `;

    document.getElementById('btnBillingBackDashboard')?.addEventListener('click', () => {
      navigateTo('dashboard', 'main', () => renderDashboardLayout(false));
    });

    document.getElementById('mainTabBillingBtn')?.addEventListener('click', () => {
      switchBillingTab('billing', billingCategoryTab || 'op', true);
    });

    document.getElementById('mainTabMainBillingBtn')?.addEventListener('click', () => {
      switchBillingTab('main', null, true);
    });

    if (billingMainTab === 'billing') {
      renderSection1Billing();
    } else {
      renderSection2MainBilling();
    }
  }

  function switchBillingTab(mainTab, categoryTab = 'op', recordHistory = true) {
    const sub = mainTab === 'main' ? 'main-billing' : (categoryTab || 'op');
    if (recordHistory) {
      navigateTo('billing', sub, () => {
        billingMainTab = mainTab;
        billingCategoryTab = categoryTab || 'op';
        renderBillingModule(billingMainTab, billingCategoryTab);
      }, true);
    } else {
      billingMainTab = mainTab;
      billingCategoryTab = categoryTab || 'op';
      renderBillingModule(billingMainTab, billingCategoryTab);
    }
  }

  // ==========================================================
  // SECTION 1 — BILLING (CATEGORY-WISE BILLING RECORDS)
  // ==========================================================
  function renderSection1Billing() {
    const mount = document.getElementById('centralBillingSectionContent');
    if (!mount) return;

    const stats = cbCachedSummary ? cbCachedSummary[billingCategoryTab] : null;

    mount.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Sub Tabs for 4 Billing Categories -->
        <div class="cv-sub-nav-tabs">
          <button type="button" class="cv-sub-tab-btn ${billingCategoryTab === 'op' ? 'active' : ''}" id="catTabOp">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            OP BILLING
          </button>
          <button type="button" class="cv-sub-tab-btn ${billingCategoryTab === 'ip' ? 'active' : ''}" id="catTabIp">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            IP BILLING
          </button>
          <button type="button" class="cv-sub-tab-btn ${billingCategoryTab === 'pharmacy' ? 'active' : ''}" id="catTabPharmacy">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            PHARMACY BILLING
          </button>
          <button type="button" class="cv-sub-tab-btn ${billingCategoryTab === 'laboratory' ? 'active' : ''}" id="catTabLaboratory">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            LABORATORY BILLING
          </button>
        </div>

        <!-- KPI Statistic Cards for Selected Category -->
        <div class="cv-billing-kpi-grid">
          <div class="cv-billing-kpi-card">
            <div class="cv-kpi-icon-wrap" style="background:#eff6ff; color:var(--cv-primary);">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">Total Records</div>
              <div style="font-size:1.35rem; font-weight:800; color:var(--cv-text-primary);" id="cbKpiTotalRecords">${stats ? stats.count : '—'}</div>
            </div>
          </div>

          <div class="cv-billing-kpi-card">
            <div class="cv-kpi-icon-wrap" style="background:#f0fdf4; color:#16a34a;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">Gross Billed</div>
              <div style="font-size:1.35rem; font-weight:800; color:var(--cv-text-primary);" id="cbKpiGrossBilled">₹${stats ? formatCurrency(stats.billed) : '0.00'}</div>
            </div>
          </div>

          <div class="cv-billing-kpi-card">
            <div class="cv-kpi-icon-wrap" style="background:#ecfdf5; color:#059669;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">Total Collected</div>
              <div style="font-size:1.35rem; font-weight:800; color:#059669;" id="cbKpiTotalCollected">₹${stats ? formatCurrency(stats.paid) : '0.00'}</div>
            </div>
          </div>

          <div class="cv-billing-kpi-card">
            <div class="cv-kpi-icon-wrap" style="background:#fef2f2; color:var(--cv-danger);">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
              <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">Outstanding Balance</div>
              <div style="font-size:1.35rem; font-weight:800; color:var(--cv-danger);" id="cbKpiOutstanding">₹${stats ? formatCurrency(stats.balance) : '0.00'}</div>
            </div>
          </div>
        </div>

        <!-- Category View Mount -->
        <div id="billingCategoryViewMount"></div>
      </div>
    `;

    document.getElementById('catTabOp')?.addEventListener('click', () => { switchBillingCategory('op', true); });
    document.getElementById('catTabIp')?.addEventListener('click', () => { switchBillingCategory('ip', true); });
    document.getElementById('catTabPharmacy')?.addEventListener('click', () => { switchBillingCategory('pharmacy', true); });
    document.getElementById('catTabLaboratory')?.addEventListener('click', () => { switchBillingCategory('laboratory', true); });

    if (billingCategoryTab === 'op') renderOpCategoryView();
    else if (billingCategoryTab === 'ip') renderIpCategoryView();
    else if (billingCategoryTab === 'pharmacy') renderPharmacyCategoryView();
    else if (billingCategoryTab === 'laboratory') renderLaboratoryCategoryView();
  }

  function switchBillingCategory(cat, recordHistory = true) {
    if (recordHistory) {
      navigateTo('billing', cat, () => {
        billingCategoryTab = cat;
        renderSection1Billing();
      }, true);
    } else {
      billingCategoryTab = cat;
      renderSection1Billing();
    }
  }

  // Common Patient Search Bar Helper for Category Billing & Central Billing
  function setupPatientSearchWidget(inputId, dropdownId, onSelectCallback) {
    const searchInput = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!searchInput || !dropdown) return;

    let debounceTimer = null;
    let lastQuery = '';
    let currentReqId = 0;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      if (!query || query.length < 1) {
        lastQuery = '';
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }
      if (query === lastQuery) return;
      lastQuery = query;

      debounceTimer = setTimeout(async () => {
        const reqId = ++currentReqId;
        try {
          const res = await Api.get(`/api/billing/patients/search?q=${encodeURIComponent(query)}`);
          if (reqId !== currentReqId) return;

          if (res && res.success && res.data && res.data.length > 0) {
            const sorted = sortByStartsWith(res.data, query);
            dropdown.innerHTML = sorted.map(p => `
              <div class="cv-patient-dropdown-item" data-id="${p.id}" style="padding:0.6rem 0.85rem; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                <div style="font-weight:700; color:var(--cv-text-primary);">
                  ${escapeHtml(p.fullName)} 
                  <span style="font-size:0.75rem; color:var(--cv-primary); font-family:monospace; margin-left:0.35rem;">(${escapeHtml(p.uhid || 'No UHID')})</span>
                </div>
                <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; gap:0.75rem; margin-top:0.2rem; flex-wrap:wrap;">
                  <span>Phone: ${escapeHtml(p.phone || '—')}</span>
                  ${p.latestOpId ? `<span style="color:#2563eb; font-weight:600;">OP: ${escapeHtml(p.latestOpId)}</span>` : ''}
                  ${p.latestIpId ? `<span style="color:#7c3aed; font-weight:600;">IP: ${escapeHtml(p.latestIpId)}</span>` : ''}
                  ${p.gender ? `<span>${escapeHtml(p.gender)} / ${p.age || '—'} yrs</span>` : ''}
                </div>
              </div>
            `).join('');
            dropdown.style.display = 'block';

            dropdown.querySelectorAll('.cv-patient-dropdown-item').forEach(itemEl => {
              itemEl.addEventListener('click', () => {
                const pid = itemEl.getAttribute('data-id');
                const pat = res.data.find(x => String(x.id) === String(pid));
                if (pat) {
                  onSelectCallback(pat);
                }
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                searchInput.value = '';
                lastQuery = '';
              });
            });
          } else {
            dropdown.innerHTML = '<div style="padding:0.75rem; text-align:center; color:var(--cv-text-muted); font-size:0.82rem;">No matching patients found.</div>';
            dropdown.style.display = 'block';
          }
        } catch (err) {
          if (reqId !== currentReqId) return;
          console.error('Error querying patients for billing', err);
          dropdown.innerHTML = '<div style="padding:0.75rem; text-align:center; color:var(--cv-danger); font-size:0.8rem;">Unable to search patients. Please try again.</div>';
          dropdown.style.display = 'block';
        }
      }, 150);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Patient Banner HTML for category views
  function renderCategoryPatientBanner(p, onClear, onViewAllLedger) {
    const opDisplay = p.latestOpId || p.opId || '—';
    const ipDisplay = p.latestIpId || p.ipId || '—';
    return `
      <div class="cv-patient-banner" style="margin-bottom:1.25rem;">
        <div class="cv-patient-banner-item">
          <span class="cv-patient-banner-label">Patient Name</span>
          <span class="cv-patient-banner-val">${escapeHtml(p.fullName)}</span>
        </div>
        <div class="cv-patient-banner-item">
          <span class="cv-patient-banner-label">UHID</span>
          <span class="cv-patient-banner-val" style="font-family:monospace; color:var(--cv-primary);">${escapeHtml(p.uhid || '—')}</span>
        </div>
        <div class="cv-patient-banner-item">
          <span class="cv-patient-banner-label">OP ID</span>
          <span class="cv-patient-banner-val" style="font-family:monospace; color:#2563eb;">${escapeHtml(opDisplay)}</span>
        </div>
        <div class="cv-patient-banner-item">
          <span class="cv-patient-banner-label">IP ID</span>
          <span class="cv-patient-banner-val" style="font-family:monospace; color:#7c3aed;">${escapeHtml(ipDisplay)}</span>
        </div>
        <div class="cv-patient-banner-item">
          <span class="cv-patient-banner-label">Phone Number</span>
          <span class="cv-patient-banner-val">${escapeHtml(p.phone || '—')}</span>
        </div>
        <div class="cv-patient-banner-item">
          <span class="cv-patient-banner-label">Doctor &amp; Department</span>
          <span class="cv-patient-banner-val">${escapeHtml(p.doctorName || 'Doctor')} (${escapeHtml(p.department || 'General')})</span>
        </div>
        <div class="cv-patient-banner-item">
          <span class="cv-patient-banner-label">Age &amp; Gender</span>
          <span class="cv-patient-banner-val">${p.age ? p.age + ' yrs' : '—'} / ${escapeHtml(p.gender || '—')}</span>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; align-items:center;">
          <button type="button" class="cv-btn-secondary" id="btnCatChangePatient" style="padding:0.4rem 0.8rem; font-size:0.78rem;">
            Change Patient
          </button>
          ${onViewAllLedger ? `
            <button type="button" class="cv-btn-secondary" id="btnCatViewAllLedger" style="padding:0.4rem 0.8rem; font-size:0.78rem;">
              View All Ledger
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ====================================================================
  // DEDICATED CENTRAL BILLING PRINT ARCHITECTURE (Single Document, Zero Duplication)
  // ====================================================================

  function printDedicatedDocument(documentHtml) {
    let container = document.getElementById('cvDedicatedPrintContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cvDedicatedPrintContainer';
      container.className = 'cv-print-only';
      document.body.appendChild(container);
    }
    container.innerHTML = documentHtml;
    document.body.classList.add('cv-printing-active');

    const cleanup = () => {
      document.body.classList.remove('cv-printing-active');
      if (container) container.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    setTimeout(() => {
      window.removeEventListener('afterprint', cleanup);
      document.body.classList.remove('cv-printing-active');
      if (container) container.innerHTML = '';
    }, 60000);

    window.print();
  }

  function buildHospitalPrintHeader(docTitle, docNumberLabel, docNumberVal, billDate, billTime, statusBadgeText, isPaid, gstin) {
    const hospName = currentUser?.hospitalName || 'CareVista Multispeciality Hospital';
    const displayGst = gstin || '29AABCU9603R1ZM';
    return `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0284c7; padding-bottom:8px; margin-bottom:12px;">
        <div>
          <div style="font-size:9.5px; font-weight:800; color:#0284c7; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:2px;">
            CAREVISTA HOSPITAL MANAGEMENT SAAS
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
            <div style="width:32px; height:32px; background:#0284c7; border-radius:5px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:14px;">CV</div>
            <h2 style="margin:0; font-size:16px; font-weight:800; color:#0f172a; letter-spacing:-0.3px;">${escapeHtml(hospName.toUpperCase())}</h2>
          </div>
          <div style="color:#64748b; font-size:10px;">NABH Accredited Multi-Speciality Tertiary Care Hospital</div>
          <div style="color:#64748b; font-size:10px;">Emergency: +91 8000 123 456 &bull; Email: billing@carevista.com</div>
          <div style="color:#0369a1; font-size:10px; font-weight:700; margin-top:2px;">GSTIN: ${escapeHtml(displayGst)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px; font-weight:800; color:#0284c7; text-transform:uppercase; letter-spacing:0.04em;">${escapeHtml(docTitle)}</div>
          <div style="margin-top:3px; font-size:10.5px; line-height:1.4;">
            <div><span style="color:#64748b;">${escapeHtml(docNumberLabel)}:</span> <strong style="font-family:monospace; color:#0f172a;">${escapeHtml(docNumberVal)}</strong></div>
            <div><span style="color:#64748b;">Date &amp; Time:</span> <strong>${escapeHtml(billDate || '')} ${escapeHtml(billTime || '')}</strong></div>
            <div style="margin-top:3px;">
              <span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:800; border-radius:4px; text-transform:uppercase; background:${isPaid ? '#dcfce7' : '#fee2e2'}; color:${isPaid ? '#166534' : '#991b1b'};">
                ${escapeHtml(statusBadgeText || (isPaid ? 'PAID' : 'UNPAID'))}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildHospitalPrintFooter(termsText) {
    return `
      <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #cbd5e1; padding-top:10px; margin-top:12px; font-size:9.5px; color:#64748b;">
        <div>
          <div>${escapeHtml(termsText || 'This is a computer-generated billing document from CareVista Hospital Management SaaS.')}</div>
          <div style="color:#94a3b8; margin-top:2px;">Multi-Tenant Isolation &amp; Audit Log Verified &bull; carevista.com</div>
        </div>
        <div style="text-align:right;">
          <div style="width:160px; border-bottom:1px solid #0f172a; margin-bottom:4px;"></div>
          <div style="font-weight:700; color:#0f172a; font-size:10px;">Authorized Signatory</div>
          <div style="font-size:9px; color:#64748b;">Hospital Billing Operations</div>
        </div>
      </div>
    `;
  }

  function buildOpBillPrintHtml(patient, op) {
    const isPaid = (op.paymentStatus || 'PAID').toUpperCase() === 'PAID';
    const fee = op.consultationFee || 0;
    const paid = isPaid ? fee : 0;
    const bal = fee - paid;
    const headerHtml = buildHospitalPrintHeader('OP CONSULTATION BILL', 'Bill / OP ID', op.opId, op.visitDate, op.registrationTime, op.paymentStatus || 'PAID', isPaid);

    return `
      <div class="cv-print-sheet">
        ${headerHtml}

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:12px; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:10.5px;">
          <div><span style="color:#64748b;">Patient Name:</span> <strong style="color:#0f172a;">${escapeHtml(patient?.fullName || op.patientName || 'Walk-in Patient')}</strong></div>
          <div><span style="color:#64748b;">UHID:</span> <strong style="font-family:monospace; color:#0284c7;">${escapeHtml(patient?.uhid || op.uhid || '—')}</strong></div>
          <div><span style="color:#64748b;">Phone:</span> <strong>${escapeHtml(patient?.phone || op.phone || '—')}</strong></div>
          <div><span style="color:#64748b;">Payment Method:</span> <strong>${escapeHtml(op.paymentMethod || 'CASH')}</strong></div>
          <div><span style="color:#64748b;">OP ID:</span> <strong style="font-family:monospace;">${escapeHtml(op.opId)}</strong></div>
          <div><span style="color:#64748b;">Doctor:</span> <strong>${escapeHtml(op.doctorName || 'Consultant')}</strong></div>
          <div><span style="color:#64748b;">Department:</span> <strong>${escapeHtml(op.department || 'General Medicine')}</strong></div>
          <div><span style="color:#64748b;">Visit Date:</span> <strong>${escapeHtml(op.visitDate || '—')}</strong></div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
          <thead>
            <tr style="background:#0284c7; color:#fff;">
              <th style="padding:6px 8px; text-align:center; width:6%; border-top-left-radius:4px; border-bottom-left-radius:4px;">#</th>
              <th style="padding:6px 8px; text-align:left; width:44%;">Service Description</th>
              <th style="padding:6px 8px; text-align:left; width:25%;">Department &amp; Doctor</th>
              <th style="padding:6px 8px; text-align:right; width:25%; border-top-right-radius:4px; border-bottom-right-radius:4px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:7px 8px; text-align:center; color:#64748b;">1</td>
              <td style="padding:7px 8px;"><strong>OP Consultation &amp; Primary Assessment</strong><br><span style="font-size:9.5px; color:#64748b;">Outpatient medical consultation, triage check &amp; doctor diagnosis</span></td>
              <td style="padding:7px 8px;">${escapeHtml(op.department || 'General')} &bull; ${escapeHtml(op.doctorName || 'Doctor')}</td>
              <td style="padding:7px 8px; text-align:right; font-weight:800; color:#0f172a;">₹${formatCurrency(fee)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:grid; grid-template-columns: 1.3fr 1fr; gap:12px; margin-bottom:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; font-size:10px;">
            <div style="font-weight:700; color:#475569; margin-bottom:3px;">Remarks &amp; Clinical Notes:</div>
            <div>Outpatient consultation fee settlement. Valid for follow-up review as per hospital policy.</div>
            <div style="margin-top:6px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:4px;">
              1. Receipt valid subject to payment realization.<br>
              2. Please quote OP ID ${escapeHtml(op.opId)} for prescriptions and investigations.
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Subtotal:</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹${formatCurrency(fee)}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Discount (0%):</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹0.00</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">GST (0%):</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹0.00</td></tr>
            <tr style="background:#eff6ff; font-weight:800; color:#0369a1;"><td style="padding:5px 6px; font-size:12px;">TOTAL:</td><td style="padding:5px 6px; text-align:right; font-size:13px;">₹${formatCurrency(fee)}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Amount Paid:</td><td style="padding:3px 6px; text-align:right; font-weight:700; color:#059669;">₹${formatCurrency(paid)}</td></tr>
            <tr><td style="padding:3px 6px; font-weight:700; color:${bal <= 0 ? '#059669' : '#dc2626'};">Balance Due:</td><td style="padding:3px 6px; text-align:right; font-weight:800; color:${bal <= 0 ? '#059669' : '#dc2626'};">₹${formatCurrency(bal)}</td></tr>
          </table>
        </div>

        ${buildHospitalPrintFooter()}
      </div>
    `;
  }

  function buildIpBillPrintHtml(patient, ip) {
    const isPaid = (ip.paymentStatus || 'PAID').toUpperCase() === 'PAID';
    const roomChg = ip.roomPrice || 0;
    const bedChg = ip.bedPrice || 0;
    const baseChg = roomChg + bedChg;
    const totalChg = (ip.totalCharges && ip.totalCharges > 0) ? ip.totalCharges : baseChg;
    const ipServices = Math.max(0, totalChg - baseChg);
    const paidAmt = isPaid ? totalChg : (ip.depositAmount || 0);
    const balAmt = Math.max(0, totalChg - paidAmt);
    const headerHtml = buildHospitalPrintHeader('INPATIENT (IP) BILL & SETTLEMENT', 'Bill / IP ID', ip.ipId, ip.admissionDate, ip.admissionTime, ip.paymentStatus || 'PAID', isPaid);

    return `
      <div class="cv-print-sheet">
        ${headerHtml}

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:12px; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:10.5px;">
          <div><span style="color:#64748b;">Patient Name:</span> <strong style="color:#0f172a;">${escapeHtml(patient?.fullName || ip.patientName || 'Inpatient')}</strong></div>
          <div><span style="color:#64748b;">UHID:</span> <strong style="font-family:monospace; color:#0284c7;">${escapeHtml(patient?.uhid || ip.uhid || '—')}</strong></div>
          <div><span style="color:#64748b;">OP ID:</span> <strong>${escapeHtml(ip.opId || '—')}</strong></div>
          <div><span style="color:#64748b;">IP ID:</span> <strong style="font-family:monospace;">${escapeHtml(ip.ipId)}</strong></div>
          <div><span style="color:#64748b;">Ward / Room / Bed:</span> <strong>${escapeHtml(ip.wardName || 'Ward')} &bull; Rm ${escapeHtml(ip.roomNumber || '—')} / Bed ${escapeHtml(ip.bedNumber || '—')}</strong></div>
          <div><span style="color:#64748b;">Attending Doctor:</span> <strong>${escapeHtml(ip.doctorName || 'Doctor')}</strong></div>
          <div><span style="color:#64748b;">Department:</span> <strong>${escapeHtml(ip.department || 'General Medicine')}</strong></div>
          <div><span style="color:#64748b;">Payment Method:</span> <strong>${escapeHtml(ip.paymentMethod || 'CASH')}</strong></div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
          <thead>
            <tr style="background:#0284c7; color:#fff;">
              <th style="padding:6px 8px; text-align:center; width:6%; border-top-left-radius:4px; border-bottom-left-radius:4px;">#</th>
              <th style="padding:6px 8px; text-align:left; width:44%;">Particulars / Charge Head</th>
              <th style="padding:6px 8px; text-align:left; width:25%;">Occupancy / Facility Details</th>
              <th style="padding:6px 8px; text-align:right; width:25%; border-top-right-radius:4px; border-bottom-right-radius:4px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:6px 8px; text-align:center; color:#64748b;">1</td>
              <td style="padding:6px 8px;"><strong>Room Occupancy Charges</strong></td>
              <td style="padding:6px 8px;">Room ${escapeHtml(ip.roomNumber || 'Standard')} (${escapeHtml(ip.wardName || 'General Ward')})</td>
              <td style="padding:6px 8px; text-align:right; font-weight:700;">₹${formatCurrency(roomChg)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:6px 8px; text-align:center; color:#64748b;">2</td>
              <td style="padding:6px 8px;"><strong>Bed Charges</strong></td>
              <td style="padding:6px 8px;">Bed ${escapeHtml(ip.bedNumber || 'Assigned')}</td>
              <td style="padding:6px 8px; text-align:right; font-weight:700;">₹${formatCurrency(bedChg)}</td>
            </tr>
            ${ipServices > 0 ? `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:6px 8px; text-align:center; color:#64748b;">3</td>
                <td style="padding:6px 8px;"><strong>Inpatient Nursing &amp; Clinical Care</strong></td>
                <td style="padding:6px 8px;">Inpatient care, monitoring &amp; doctor rounds</td>
                <td style="padding:6px 8px; text-align:right; font-weight:700;">₹${formatCurrency(ipServices)}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <div style="display:grid; grid-template-columns: 1.3fr 1fr; gap:12px; margin-bottom:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; font-size:10px;">
            <div style="font-weight:700; color:#475569; margin-bottom:3px;">Inpatient Remarks &amp; Settlement:</div>
            <div>Inpatient admission settlement. Charges cover room accommodation, nursing supervision, and attending doctor rounds.</div>
            <div style="margin-top:6px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:4px;">
              1. Final settlement bill &bull; Please quote IP ID ${escapeHtml(ip.ipId)} for queries.<br>
              2. All deposits and advance payments have been credited against total charges.
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Subtotal:</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹${formatCurrency(totalChg)}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Discount:</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹0.00</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">GST (0%):</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹0.00</td></tr>
            <tr style="background:#eff6ff; font-weight:800; color:#0369a1;"><td style="padding:5px 6px; font-size:12px;">TOTAL IP BILL:</td><td style="padding:5px 6px; text-align:right; font-size:13px;">₹${formatCurrency(totalChg)}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Paid / Deposit:</td><td style="padding:3px 6px; text-align:right; font-weight:700; color:#059669;">₹${formatCurrency(paidAmt)}</td></tr>
            <tr><td style="padding:3px 6px; font-weight:700; color:${balAmt <= 0 ? '#059669' : '#dc2626'};">Balance Due:</td><td style="padding:3px 6px; text-align:right; font-weight:800; color:${balAmt <= 0 ? '#059669' : '#dc2626'};">₹${formatCurrency(balAmt)}</td></tr>
          </table>
        </div>

        ${buildHospitalPrintFooter()}
      </div>
    `;
  }

  function buildPharmacyBillPrintHtml(patient, ph) {
    const isPaid = (ph.paymentStatus || 'PAID').toUpperCase() === 'PAID';
    const items = ph.items || [];
    const headerHtml = buildHospitalPrintHeader('PHARMACY DISPENSARY BILL', 'Bill Number', ph.billNumber, ph.billDate, ph.billTime, ph.paymentStatus || 'PAID', isPaid, ph.gstNumber);

    return `
      <div class="cv-print-sheet">
        ${headerHtml}

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:12px; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:10.5px;">
          <div><span style="color:#64748b;">Patient Name:</span> <strong style="color:#0f172a;">${escapeHtml(patient?.fullName || ph.patientName || 'Pharmacy Customer')}</strong></div>
          <div><span style="color:#64748b;">UHID:</span> <strong style="font-family:monospace; color:#0284c7;">${escapeHtml(patient?.uhid || ph.uhid || '—')}</strong></div>
          <div><span style="color:#64748b;">Reference (OP/IP):</span> <strong>${escapeHtml(ph.opId || ph.ipId || '—')}</strong></div>
          <div><span style="color:#64748b;">Pharmacy Bill No:</span> <strong style="font-family:monospace;">${escapeHtml(ph.billNumber)}</strong></div>
          <div><span style="color:#64748b;">Prescribing Doctor:</span> <strong>${escapeHtml(ph.doctorName || 'Doctor')}</strong></div>
          <div><span style="color:#64748b;">Department:</span> <strong>${escapeHtml(ph.department || 'General')}</strong></div>
          <div><span style="color:#64748b;">GSTIN:</span> <strong style="font-family:monospace; color:#0369a1;">${escapeHtml(ph.gstNumber || '29AABCU9603R1ZM')}</strong></div>
          <div><span style="color:#64748b;">Payment Method:</span> <strong>${escapeHtml(ph.paymentMethod || 'CASH')}</strong></div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
          <thead>
            <tr style="background:#0284c7; color:#fff;">
              <th style="padding:6px 8px; text-align:center; width:5%; border-top-left-radius:4px; border-bottom-left-radius:4px;">#</th>
              <th style="padding:6px 8px; text-align:left; width:35%;">Medicine Name</th>
              <th style="padding:6px 8px; text-align:left; width:15%;">Batch No.</th>
              <th style="padding:6px 8px; text-align:center; width:12%;">Quantity</th>
              <th style="padding:6px 8px; text-align:right; width:16%;">Unit Price (₹)</th>
              <th style="padding:6px 8px; text-align:right; width:17%; border-top-right-radius:4px; border-bottom-right-radius:4px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map((it, idx) => `
              <tr style="border-bottom:1px solid #e2e8f0; background:${idx % 2 === 1 ? '#f8fafc' : '#fff'};">
                <td style="padding:5px 8px; text-align:center; color:#64748b;">${idx + 1}</td>
                <td style="padding:5px 8px;"><strong>${escapeHtml(it.medicineName || 'Medicine')}</strong> ${it.medicineCode ? `<span style="font-size:9.5px; color:#64748b;">(${escapeHtml(it.medicineCode)})</span>` : ''}</td>
                <td style="padding:5px 8px; font-family:monospace;">${escapeHtml(it.batchNumber || '—')}</td>
                <td style="padding:5px 8px; text-align:center; font-weight:700;">${it.quantity || 1}</td>
                <td style="padding:5px 8px; text-align:right;">₹${formatCurrency(it.unitPrice || 0)}</td>
                <td style="padding:5px 8px; text-align:right; font-weight:700; color:#0f172a;">₹${formatCurrency(it.totalPrice || 0)}</td>
              </tr>
            `).join('') : `
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:5px 8px; text-align:center;">1</td>
                <td style="padding:5px 8px;"><strong>Dispensed Pharmaceuticals</strong></td>
                <td style="padding:5px 8px;">—</td>
                <td style="padding:5px 8px; text-align:center;">1</td>
                <td style="padding:5px 8px; text-align:right;">₹${formatCurrency(ph.subtotal)}</td>
                <td style="padding:5px 8px; text-align:right; font-weight:700;">₹${formatCurrency(ph.subtotal)}</td>
              </tr>
            `}
          </tbody>
        </table>

        <div style="display:grid; grid-template-columns: 1.3fr 1fr; gap:12px; margin-bottom:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; font-size:10px;">
            <div style="font-weight:700; color:#475569; margin-bottom:3px;">Terms &amp; Dispensary Conditions:</div>
            <div>Original dispensary bill for prescribed medications. Store medicines in cool, dry place away from sunlight.</div>
            <div style="margin-top:6px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:4px;">
              1. Goods &amp; medicines once dispensed cannot be returned or refunded.<br>
              2. Check expiry and batch numbers before accepting medications.
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Subtotal:</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹${formatCurrency(ph.subtotal)}</td></tr>
            ${(ph.discountAmount && ph.discountAmount > 0) ? `
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Discount (${ph.discountPercentage || 0}%):</td><td style="padding:3px 6px; text-align:right; font-weight:600; color:#dc2626;">- ₹${formatCurrency(ph.discountAmount)}</td></tr>
            ` : ''}
            ${(ph.gstAmount && ph.gstAmount > 0) ? `
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">GST (${ph.gstPercentage || 0}%):</td><td style="padding:3px 6px; text-align:right; font-weight:600; color:#0369a1;">+ ₹${formatCurrency(ph.gstAmount)}</td></tr>
            ` : ''}
            <tr style="background:#eff6ff; font-weight:800; color:#0369a1;"><td style="padding:5px 6px; font-size:12px;">TOTAL BILL:</td><td style="padding:5px 6px; text-align:right; font-size:13px;">₹${formatCurrency(ph.totalAmount)}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Amount Paid:</td><td style="padding:3px 6px; text-align:right; font-weight:700; color:#059669;">₹${formatCurrency(ph.paidAmount)}</td></tr>
            <tr><td style="padding:3px 6px; font-weight:700; color:${(ph.balanceAmount || 0) <= 0 ? '#059669' : '#dc2626'};">Balance Due:</td><td style="padding:3px 6px; text-align:right; font-weight:800; color:${(ph.balanceAmount || 0) <= 0 ? '#059669' : '#dc2626'};">₹${formatCurrency(ph.balanceAmount || 0)}</td></tr>
          </table>
        </div>

        ${buildHospitalPrintFooter('Pharmacist Dispensary Signature &bull; CareVista Multi-Tenant Healthcare SaaS')}
      </div>
    `;
  }

  function buildLabBillPrintHtml(patient, lab) {
    const isPaid = (lab.paymentStatus || 'PAID').toUpperCase() === 'PAID';
    const subtotal = lab.subtotal || lab.testPrice || 0;
    const total = lab.totalAmount || subtotal;
    const paid = lab.paidAmount || (isPaid ? total : 0);
    const bal = lab.balanceAmount !== undefined ? lab.balanceAmount : Math.max(0, total - paid);
    const headerHtml = buildHospitalPrintHeader('DIAGNOSTIC LABORATORY BILL', 'Lab Order No', lab.orderNumber, lab.orderDate, lab.orderTime || '', lab.paymentStatus || 'PAID', isPaid);

    return `
      <div class="cv-print-sheet">
        ${headerHtml}

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:12px; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:10.5px;">
          <div><span style="color:#64748b;">Patient Name:</span> <strong style="color:#0f172a;">${escapeHtml(patient?.fullName || lab.patientName || 'Lab Patient')}</strong></div>
          <div><span style="color:#64748b;">UHID:</span> <strong style="font-family:monospace; color:#0284c7;">${escapeHtml(patient?.uhid || lab.uhid || '—')}</strong></div>
          <div><span style="color:#64748b;">Reference (OP/IP):</span> <strong>${escapeHtml(lab.opId || lab.ipId || '—')}</strong></div>
          <div><span style="color:#64748b;">Lab Order ID:</span> <strong style="font-family:monospace;">${escapeHtml(lab.orderNumber)}</strong></div>
          <div><span style="color:#64748b;">Referring Doctor:</span> <strong>${escapeHtml(lab.doctorName || 'Doctor')}</strong></div>
          <div><span style="color:#64748b;">Department:</span> <strong>${escapeHtml(lab.department || 'General')}</strong></div>
          <div><span style="color:#64748b;">Diagnostic Category:</span> <strong>${escapeHtml(lab.category || 'General Diagnostics')}</strong></div>
          <div><span style="color:#64748b;">Payment Method:</span> <strong>${escapeHtml(lab.paymentMethod || 'CASH')}</strong></div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
          <thead>
            <tr style="background:#0284c7; color:#fff;">
              <th style="padding:6px 8px; text-align:center; width:6%; border-top-left-radius:4px; border-bottom-left-radius:4px;">#</th>
              <th style="padding:6px 8px; text-align:left; width:44%;">Investigation / Test Name</th>
              <th style="padding:6px 8px; text-align:left; width:25%;">Diagnostic Section &amp; Ref</th>
              <th style="padding:6px 8px; text-align:right; width:25%; border-top-right-radius:4px; border-bottom-right-radius:4px;">Price (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:6px 8px; text-align:center; color:#64748b;">1</td>
              <td style="padding:6px 8px;"><strong>${escapeHtml(lab.testName || 'Diagnostic Investigation')}</strong></td>
              <td style="padding:6px 8px;">${escapeHtml(lab.category || 'Clinical Pathology')} &bull; <span style="font-family:monospace;">${escapeHtml(lab.orderNumber)}</span></td>
              <td style="padding:6px 8px; text-align:right; font-weight:800; color:#0f172a;">₹${formatCurrency(subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:grid; grid-template-columns: 1.3fr 1fr; gap:12px; margin-bottom:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; font-size:10px;">
            <div style="font-weight:700; color:#475569; margin-bottom:3px;">Diagnostic Remarks:</div>
            <div>Order Status: <strong>${escapeHtml(lab.orderStatus || 'COMPLETED')}</strong>. Results verified by authorized Pathologist / Biochemist.</div>
            <div style="margin-top:6px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:4px;">
              1. Report can be collected using Order No ${escapeHtml(lab.orderNumber)}.<br>
              2. Clinical correlation with attending physician is recommended.
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Subtotal:</td><td style="padding:3px 6px; text-align:right; font-weight:600;">₹${formatCurrency(subtotal)}</td></tr>
            ${(lab.discountAmount && lab.discountAmount > 0) ? `
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Discount:</td><td style="padding:3px 6px; text-align:right; font-weight:600; color:#dc2626;">- ₹${formatCurrency(lab.discountAmount)}</td></tr>
            ` : ''}
            ${(lab.gstAmount && lab.gstAmount > 0) ? `
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">GST:</td><td style="padding:3px 6px; text-align:right; font-weight:600; color:#0369a1;">+ ₹${formatCurrency(lab.gstAmount)}</td></tr>
            ` : ''}
            <tr style="background:#eff6ff; font-weight:800; color:#0369a1;"><td style="padding:5px 6px; font-size:12px;">TOTAL BILL:</td><td style="padding:5px 6px; text-align:right; font-size:13px;">₹${formatCurrency(total)}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 6px; color:#64748b;">Amount Paid:</td><td style="padding:3px 6px; text-align:right; font-weight:700; color:#059669;">₹${formatCurrency(paid)}</td></tr>
            <tr><td style="padding:3px 6px; font-weight:700; color:${bal <= 0 ? '#059669' : '#dc2626'};">Balance Due:</td><td style="padding:3px 6px; text-align:right; font-weight:800; color:${bal <= 0 ? '#059669' : '#dc2626'};">₹${formatCurrency(bal)}</td></tr>
          </table>
        </div>

        ${buildHospitalPrintFooter('Laboratory Technician &bull; CareVista Diagnostics')}
      </div>
    `;
  }

  function buildCentralInvoicePrintHtml(bill) {
    const isPaid = (bill.paymentStatus || 'PAID').toUpperCase() === 'PAID';
    const invoiceNum = bill.invoiceNumber || bill.billNumber;
    const headerHtml = buildHospitalPrintHeader('CONSOLIDATED TAX INVOICE', 'Invoice No', invoiceNum, bill.billDate, bill.billTime, bill.paymentStatus || 'PAID', isPaid, bill.gstNumber);

    const opRecords = bill.opRecords || [];
    const ipRecords = bill.ipRecords || [];
    const pharmacyBills = bill.pharmacyBills || [];
    const labOrders = bill.labOrders || [];

    // Calculate section totals
    let opSubtotal = 0;
    opRecords.forEach(o => { opSubtotal += (o.consultationFee || 0); });

    let ipSubtotal = 0;
    ipRecords.forEach(ip => {
      const roomP = ip.roomPrice || 0;
      const bedP = ip.bedPrice || 0;
      const tot = ip.totalCharges || 0;
      const dep = ip.depositAmount || 0;
      if (tot > 0) {
        ipSubtotal += tot;
      } else if (roomP > 0 || bedP > 0) {
        ipSubtotal += (roomP + bedP);
      } else if (dep > 0) {
        ipSubtotal += dep;
      }
    });

    let pharSubtotal = 0;
    pharmacyBills.forEach(pb => {
      pharSubtotal += (pb.totalAmount != null ? pb.totalAmount : (pb.subtotal || 0));
    });

    let labSubtotal = 0;
    labOrders.forEach(lo => {
      labSubtotal += (lo.totalAmount != null ? lo.totalAmount : (lo.testPrice || 0));
    });

    // Check for any other items not in OP, IP, PHARMACY, LABORATORY
    const otherItems = (bill.items || []).filter(it => {
      const mod = (it.moduleType || '').toUpperCase();
      return mod !== 'OP' && mod !== 'IP' && mod !== 'PHARMACY' && mod !== 'LABORATORY' && mod !== 'CONSOLIDATED';
    });
    let otherSubtotal = 0;
    otherItems.forEach(it => { otherSubtotal += (it.amount || 0); });

    // Derive display Doctor and Department
    const displayDoctor = bill.doctorName || (opRecords[0] ? opRecords[0].doctorName : (ipRecords[0] ? ipRecords[0].doctorName : '—'));
    const displayDept = bill.department || (opRecords[0] ? opRecords[0].department : (ipRecords[0] ? ipRecords[0].department : 'General Medicine'));
    const displayOpId = bill.opId || (opRecords[0] ? opRecords[0].opId : '—');
    const displayIpId = bill.ipId || (ipRecords[0] ? ipRecords[0].ipId : '—');

    return `
      <div class="cv-print-sheet">
        ${headerHtml}

        <!-- Patient & Invoice Metadata Grid -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:12px; display:grid; grid-template-columns: repeat(4, 1fr); gap:6px 12px; font-size:10px;">
          <div><span style="color:#64748b;">Patient Name:</span> <strong style="color:#0f172a; font-size:11px;">${escapeHtml(bill.patientName || bill.patient?.fullName || 'Walk-in Patient')}</strong></div>
          <div><span style="color:#64748b;">UHID:</span> <strong style="font-family:monospace; color:#0284c7;">${escapeHtml(bill.uhid || '—')}</strong></div>
          <div><span style="color:#64748b;">Phone Number:</span> <strong>${escapeHtml(bill.phone || '—')}</strong></div>
          <div><span style="color:#64748b;">Payment Method:</span> <strong>${escapeHtml(bill.paymentMethod || 'CASH')}</strong></div>
          <div><span style="color:#64748b;">OP ID:</span> <strong>${escapeHtml(displayOpId)}</strong></div>
          <div><span style="color:#64748b;">IP ID:</span> <strong>${escapeHtml(displayIpId)}</strong></div>
          <div><span style="color:#64748b;">Doctor:</span> <strong>${escapeHtml(displayDoctor)}</strong></div>
          <div><span style="color:#64748b;">Department:</span> <strong>${escapeHtml(displayDept)}</strong></div>
          <div><span style="color:#64748b;">Invoice Number:</span> <strong style="font-family:monospace; color:#0f172a;">${escapeHtml(invoiceNum)}</strong></div>
          <div><span style="color:#64748b;">Central Bill No:</span> <strong style="font-family:monospace;">${escapeHtml(bill.billNumber || '—')}</strong></div>
          <div><span style="color:#64748b;">Invoice Date:</span> <strong>${escapeHtml(bill.billDate || '')}</strong></div>
          <div><span style="color:#64748b;">Invoice Time:</span> <strong>${escapeHtml(bill.billTime || '')}</strong></div>
        </div>

        <!-- 1. OP BILLING SECTION -->
        <div class="cv-print-section" style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
          <div style="background:#0284c7; color:#fff; padding:5px 10px; font-weight:700; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
            <span>1. OP SERVICES / OP BILLING</span>
            <span>OP SUBTOTAL: ₹${formatCurrency(opSubtotal)}</span>
          </div>
          ${opRecords.length > 0 ? opRecords.map(o => `
            <div style="padding:6px 10px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:10px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
              <div><strong>OP ID:</strong> <span style="font-family:monospace; color:#0369a1;">${escapeHtml(o.opId)}</span> &bull; <strong>OP DATE:</strong> ${escapeHtml(o.visitDate || '—')} &bull; <strong>OP TIME:</strong> ${escapeHtml(o.registrationTime || '—')}</div>
              <div><strong>Doctor:</strong> ${escapeHtml(o.doctorName || 'Consultant')} &bull; <strong>Department:</strong> ${escapeHtml(o.department || 'General')}</div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:10px;">
              <thead>
                <tr style="background:#f1f5f9; color:#475569; border-bottom:1px solid #cbd5e1;">
                  <th style="padding:4px 8px; text-align:left; width:50%;">ITEM / SERVICE</th>
                  <th style="padding:4px 8px; text-align:center; width:20%;">DATE</th>
                  <th style="padding:4px 8px; text-align:center; width:15%;">TIME</th>
                  <th style="padding:4px 8px; text-align:right; width:15%;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:4px 8px; font-weight:600;">Consultation &amp; Primary Clinical Assessment</td>
                  <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(o.visitDate || '—')}</td>
                  <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(o.registrationTime || '—')}</td>
                  <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(o.consultationFee || 0)}</td>
                </tr>
              </tbody>
            </table>
          `).join('') : `
            <div style="padding:6px 10px; font-size:10px; color:#64748b; font-style:italic;">No Outpatient (OP) consultation records found for this patient.</div>
          `}
          <div style="background:#f8fafc; padding:4px 10px; border-top:1px solid #e2e8f0; text-align:right; font-size:10.5px; font-weight:700; color:#0369a1;">
            OP SUBTOTAL: ₹${formatCurrency(opSubtotal)}
          </div>
        </div>

        <!-- 2. IP BILLING SECTION -->
        <div class="cv-print-section" style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
          <div style="background:#0284c7; color:#fff; padding:5px 10px; font-weight:700; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
            <span>2. IP SERVICES / IP BILLING</span>
            <span>IP SUBTOTAL: ₹${formatCurrency(ipSubtotal)}</span>
          </div>
          ${ipRecords.length > 0 ? ipRecords.map(ip => {
            const roomP = ip.roomPrice || 0;
            const bedP = ip.bedPrice || 0;
            const tot = ip.totalCharges || 0;
            const dep = ip.depositAmount || 0;
            const remain = tot > (roomP + bedP) ? (tot - roomP - bedP) : 0;
            const admDate = ip.admissionDate || '—';
            const admTime = ip.admissionTime || '—';
            const disDate = ip.dischargeDate || '';
            const disTime = ip.dischargeTime || '';
            const disDisplay = disDate ? `${disDate} ${disTime}` : 'Currently Admitted';
            return `
              <div style="padding:6px 10px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:10px; display:grid; grid-template-columns: repeat(4, 1fr); gap:4px 8px;">
                <div><strong>IP ID:</strong> <span style="font-family:monospace; color:#0369a1;">${escapeHtml(ip.ipId)}</span></div>
                <div><strong>ADMISSION DATE:</strong> ${escapeHtml(admDate)}</div>
                <div><strong>ADMISSION TIME:</strong> ${escapeHtml(admTime)}</div>
                <div><strong>DISCHARGE:</strong> ${escapeHtml(disDisplay)}</div>
                <div><strong>DOCTOR:</strong> ${escapeHtml(ip.doctorName || 'Consultant')}</div>
                <div><strong>DEPARTMENT:</strong> ${escapeHtml(ip.department || 'General Medicine')}</div>
                <div><strong>ROOM:</strong> ${escapeHtml(ip.roomNumber || 'Standard')}</div>
                <div><strong>BED:</strong> ${escapeHtml(ip.bedNumber || 'Standard')}</div>
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:10px;">
                <thead>
                  <tr style="background:#f1f5f9; color:#475569; border-bottom:1px solid #cbd5e1;">
                    <th style="padding:4px 8px; text-align:left; width:50%;">ITEM / SERVICE</th>
                    <th style="padding:4px 8px; text-align:center; width:20%;">DATE</th>
                    <th style="padding:4px 8px; text-align:center; width:15%;">TIME</th>
                    <th style="padding:4px 8px; text-align:right; width:15%;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  ${roomP > 0 ? `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600;">Room Charge (${escapeHtml(ip.roomNumber || 'Room')} - ${escapeHtml(ip.wardName || 'Ward')})</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admDate)}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admTime)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(roomP)}</td>
                    </tr>
                  ` : ''}
                  ${bedP > 0 ? `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600;">Bed Charge (Bed ${escapeHtml(ip.bedNumber || 'Standard')})</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admDate)}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admTime)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(bedP)}</td>
                    </tr>
                  ` : ''}
                  ${remain > 0 ? `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600;">Doctor Service &amp; Inpatient Clinical Care</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admDate)}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admTime)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(remain)}</td>
                    </tr>
                  ` : ''}
                  ${(!roomP && !bedP && tot > 0) ? `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600;">IP Admission &amp; Inpatient Care Charges</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admDate)}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admTime)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(tot)}</td>
                    </tr>
                  ` : ''}
                  ${(!roomP && !bedP && !tot && dep > 0) ? `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600;">IP Admission Deposit &amp; Initial Clinical Charges</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admDate)}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(admTime)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(dep)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            `;
          }).join('') : `
            <div style="padding:6px 10px; font-size:10px; color:#64748b; font-style:italic;">No Inpatient (IP) admission records found for this patient.</div>
          `}
          <div style="background:#f8fafc; padding:4px 10px; border-top:1px solid #e2e8f0; text-align:right; font-size:10.5px; font-weight:700; color:#0369a1;">
            IP SUBTOTAL: ₹${formatCurrency(ipSubtotal)}
          </div>
        </div>

        <!-- 3. PHARMACY SECTION -->
        <div class="cv-print-section" style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
          <div style="background:#0284c7; color:#fff; padding:5px 10px; font-weight:700; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
            <span>3. PHARMACY</span>
            <span>PHARMACY SUBTOTAL: ₹${formatCurrency(pharSubtotal)}</span>
          </div>
          ${pharmacyBills.length > 0 ? pharmacyBills.map(pb => {
            const items = pb.items || [];
            return `
              <div style="padding:6px 10px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:10px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
                <div><strong>Pharmacy Bill:</strong> <span style="font-family:monospace; color:#0369a1;">${escapeHtml(pb.billNumber)}</span> &bull; <strong>DATE:</strong> ${escapeHtml(pb.billDate || '—')} &bull; <strong>TIME:</strong> ${escapeHtml(pb.billTime || '—')}</div>
                <div>${pb.doctorName ? `<strong>Prescribed By:</strong> ${escapeHtml(pb.doctorName)} &bull; ` : ''}<strong>Bill Total:</strong> ₹${formatCurrency(pb.totalAmount != null ? pb.totalAmount : (pb.subtotal || 0))}</div>
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:10px;">
                <thead>
                  <tr style="background:#f1f5f9; color:#475569; border-bottom:1px solid #cbd5e1;">
                    <th style="padding:4px 8px; text-align:left; width:35%;">ITEM / MEDICINE</th>
                    <th style="padding:4px 8px; text-align:center; width:15%;">BATCH</th>
                    <th style="padding:4px 8px; text-align:center; width:15%;">DATE</th>
                    <th style="padding:4px 8px; text-align:center; width:10%;">TIME</th>
                    <th style="padding:4px 8px; text-align:center; width:8%;">QTY</th>
                    <th style="padding:4px 8px; text-align:right; width:8%;">RATE</th>
                    <th style="padding:4px 8px; text-align:right; width:9%;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.length > 0 ? items.map(it => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600; color:#0f172a;">${escapeHtml(it.medicineName || 'Medicine')} ${it.medicineCode ? `<span style="font-size:8.5px; color:#64748b;">(${escapeHtml(it.medicineCode)})</span>` : ''}</td>
                      <td style="padding:4px 8px; text-align:center; font-family:monospace; color:#475569;">${escapeHtml(it.batchNumber || '—')}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(pb.billDate || '—')}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(pb.billTime || '—')}</td>
                      <td style="padding:4px 8px; text-align:center; font-weight:700;">${escapeHtml(String(it.quantity || 1))}</td>
                      <td style="padding:4px 8px; text-align:right;">₹${formatCurrency(it.unitPrice || 0)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(it.totalPrice != null ? it.totalPrice : ((it.quantity || 1) * (it.unitPrice || 0)))}</td>
                    </tr>
                  `).join('') : `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600;">Dispensed Pharmacy Medicines</td>
                      <td style="padding:4px 8px; text-align:center;">—</td>
                      <td style="padding:4px 8px; text-align:center;">${escapeHtml(pb.billDate || '—')}</td>
                      <td style="padding:4px 8px; text-align:center;">${escapeHtml(pb.billTime || '—')}</td>
                      <td style="padding:4px 8px; text-align:center;">1</td>
                      <td style="padding:4px 8px; text-align:right;">₹${formatCurrency(pb.totalAmount || pb.subtotal || 0)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(pb.totalAmount || pb.subtotal || 0)}</td>
                    </tr>
                  `}
                </tbody>
              </table>
            `;
          }).join('') : `
            <div style="padding:6px 10px; font-size:10px; color:#64748b; font-style:italic;">No Pharmacy dispensary transactions found for this patient.</div>
          `}
          <div style="background:#f8fafc; padding:4px 10px; border-top:1px solid #e2e8f0; text-align:right; font-size:10.5px; font-weight:700; color:#0369a1;">
            PHARMACY SUBTOTAL: ₹${formatCurrency(pharSubtotal)}
          </div>
        </div>

        <!-- 4. LABORATORY SECTION -->
        <div class="cv-print-section" style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
          <div style="background:#0284c7; color:#fff; padding:5px 10px; font-weight:700; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
            <span>4. LABORATORY</span>
            <span>LAB SUBTOTAL: ₹${formatCurrency(labSubtotal)}</span>
          </div>
          ${labOrders.length > 0 ? labOrders.map(lo => {
            const subItems = lo.items || [];
            const timeStr = lo.orderTime || (lo.createdAt ? new Date(lo.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—');
            return `
              <div style="padding:6px 10px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:10px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
                <div><strong>LAB ORDER ID:</strong> <span style="font-family:monospace; color:#0369a1;">${escapeHtml(lo.orderNumber)}</span> &bull; <strong>ORDER DATE:</strong> ${escapeHtml(lo.orderDate || '—')} &bull; <strong>ORDER TIME:</strong> ${escapeHtml(timeStr)}</div>
                <div>${lo.doctorName ? `<strong>Doctor:</strong> ${escapeHtml(lo.doctorName)} &bull; ` : ''}<strong>Status:</strong> ${escapeHtml(lo.paymentStatus || 'PAID')}</div>
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:10px;">
                <thead>
                  <tr style="background:#f1f5f9; color:#475569; border-bottom:1px solid #cbd5e1;">
                    <th style="padding:4px 8px; text-align:left; width:45%;">TEST / EXAMINATION</th>
                    <th style="padding:4px 8px; text-align:left; width:20%;">CATEGORY</th>
                    <th style="padding:4px 8px; text-align:center; width:15%;">DATE</th>
                    <th style="padding:4px 8px; text-align:center; width:10%;">TIME</th>
                    <th style="padding:4px 8px; text-align:right; width:10%;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  ${subItems.length > 0 ? subItems.map(si => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600; color:#0f172a;">${escapeHtml(si.testName || 'Diagnostic Test')}</td>
                      <td style="padding:4px 8px; color:#475569;">${escapeHtml(lo.category || 'DIAGNOSTIC')}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(lo.orderDate || '—')}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(timeStr)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(si.testPrice || si.amount || 0)}</td>
                    </tr>
                  `).join('') : `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:4px 8px; font-weight:600; color:#0f172a;">${escapeHtml(lo.testName || 'Diagnostic Examination')}</td>
                      <td style="padding:4px 8px; color:#475569;">${escapeHtml(lo.category || 'GENERAL')}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(lo.orderDate || '—')}</td>
                      <td style="padding:4px 8px; text-align:center; color:#64748b;">${escapeHtml(timeStr)}</td>
                      <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(lo.totalAmount != null ? lo.totalAmount : (lo.testPrice || 0))}</td>
                    </tr>
                  `}
                </tbody>
              </table>
            `;
          }).join('') : `
            <div style="padding:6px 10px; font-size:10px; color:#64748b; font-style:italic;">No Laboratory diagnostic orders found for this patient.</div>
          `}
          <div style="background:#f8fafc; padding:4px 10px; border-top:1px solid #e2e8f0; text-align:right; font-size:10.5px; font-weight:700; color:#0369a1;">
            LAB SUBTOTAL: ₹${formatCurrency(labSubtotal)}
          </div>
        </div>

        ${otherItems.length > 0 ? `
          <!-- 5. OTHER SERVICES SECTION -->
          <div class="cv-print-section" style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
            <div style="background:#0284c7; color:#fff; padding:5px 10px; font-weight:700; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
              <span>5. OTHER SERVICES</span>
              <span>Subtotal: ₹${formatCurrency(otherSubtotal)}</span>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:10px;">
              <thead>
                <tr style="background:#f1f5f9; color:#475569; border-bottom:1px solid #cbd5e1;">
                  <th style="padding:4px 8px; text-align:left; width:60%;">DESCRIPTION / SERVICE</th>
                  <th style="padding:4px 8px; text-align:center; width:25%;">REFERENCE</th>
                  <th style="padding:4px 8px; text-align:right; width:15%;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${otherItems.map(it => `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:4px 8px;">${escapeHtml(it.description || 'Service')}</td>
                    <td style="padding:4px 8px; text-align:center; font-family:monospace; color:#64748b;">${escapeHtml(it.referenceId || '—')}</td>
                    <td style="padding:4px 8px; text-align:right; font-weight:700;">₹${formatCurrency(it.amount || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- 6. OVERALL BILLING SUMMARY & FINANCIAL TOTALS -->
        <div class="cv-print-summary-box" style="display:grid; grid-template-columns: 1.25fr 1fr; gap:12px; margin-bottom:12px;">
          <!-- Left: Terms & Signatory -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px; font-size:9.5px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="font-weight:700; color:#334155; margin-bottom:4px; font-size:10px;">Consolidated Settlement &amp; Terms:</div>
              <div style="color:#475569; line-height:1.4;">${escapeHtml(bill.consolidatedNotes || 'Settlement of consolidated patient charges across Outpatient (OP), Inpatient (IP), Pharmacy Dispensary, and Laboratory Diagnostics.')}</div>
              <div style="margin-top:8px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:6px; line-height:1.45;">
                1. Payment receipt is valid subject to realization of funds.<br>
                2. Quote Invoice No <strong>${escapeHtml(invoiceNum)}</strong> and Central Bill No <strong>${escapeHtml(bill.billNumber || '—')}</strong> for all inquiries.<br>
                3. Pharmacy items once dispensed cannot be returned or exchanged.<br>
                4. This is a computer-generated consolidated tax invoice from CareVista HMS.
              </div>
            </div>
            <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end;">
              <div style="color:#64748b; font-size:9px;">
                Generated: ${escapeHtml(bill.billDate || '')} ${escapeHtml(bill.billTime || '')}<br>
                System Verified &bull; Tenant Isolation Active
              </div>
              <div style="text-align:center; min-width:130px; border-top:1px solid #0f172a; padding-top:4px;">
                <div style="font-weight:700; color:#0f172a; font-size:9.5px;">Authorized Signatory</div>
                <div style="color:#64748b; font-size:8.5px;">Accounts &amp; Billing Dept</div>
              </div>
            </div>
          </div>

          <!-- Right: Detailed Totals Grid (Section 10 Layout) -->
          <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
            <div style="background:#0f172a; color:#fff; padding:5px 8px; font-weight:700; font-size:10.5px; text-transform:uppercase; letter-spacing:0.5px;">
              OVERALL BILLING SUMMARY
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#475569;">OP TOTAL</td><td style="padding:3px 8px; text-align:right; font-weight:600;">₹${formatCurrency(opSubtotal)}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#475569;">IP TOTAL</td><td style="padding:3px 8px; text-align:right; font-weight:600;">₹${formatCurrency(ipSubtotal)}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#475569;">PHARMACY TOTAL</td><td style="padding:3px 8px; text-align:right; font-weight:600;">₹${formatCurrency(pharSubtotal)}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#475569;">LABORATORY TOTAL</td><td style="padding:3px 8px; text-align:right; font-weight:600;">₹${formatCurrency(labSubtotal)}</td></tr>
              ${otherSubtotal > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#475569;">OTHER SERVICES</td><td style="padding:3px 8px; text-align:right; font-weight:600;">₹${formatCurrency(otherSubtotal)}</td></tr>
              ` : ''}
              <tr style="border-top:1px solid #cbd5e1; border-bottom:1px solid #f1f5f9; background:#f8fafc;"><td style="padding:4px 8px; font-weight:700; color:#0f172a;">SUBTOTAL</td><td style="padding:4px 8px; text-align:right; font-weight:700; color:#0f172a;">₹${formatCurrency(bill.subtotal || (opSubtotal + ipSubtotal + pharSubtotal + labSubtotal + otherSubtotal))}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#dc2626;">OVERALL DISCOUNT</td><td style="padding:3px 8px; text-align:right; font-weight:600; color:#dc2626;">${(bill.discountAmount && bill.discountAmount > 0) ? `- ₹${formatCurrency(bill.discountAmount)}` : '₹0.00'}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#475569;">NET AMOUNT</td><td style="padding:3px 8px; text-align:right; font-weight:600;">₹${formatCurrency(bill.netAmount || (bill.subtotal - (bill.discountAmount || 0)))}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#0369a1;">GST %</td><td style="padding:3px 8px; text-align:right; font-weight:600; color:#0369a1;">${bill.gstPct || 0}%</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:3px 8px; color:#0369a1;">GST AMOUNT</td><td style="padding:3px 8px; text-align:right; font-weight:600; color:#0369a1;">+ ₹${formatCurrency(bill.gstAmount || 0)}</td></tr>
              <tr style="background:#eff6ff; border-top:1.5px solid #0284c7; border-bottom:1.5px solid #0284c7;"><td style="padding:6px 8px; font-weight:800; color:#0369a1; font-size:12px;">FINAL TOTAL</td><td style="padding:6px 8px; text-align:right; font-weight:800; font-size:13px; color:#0369a1;">₹${formatCurrency(bill.finalTotal)}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:4px 8px; color:#475569;">AMOUNT PAID</td><td style="padding:4px 8px; text-align:right; font-weight:700; color:#059669;">₹${formatCurrency(bill.amountPaid || 0)}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:4px 8px; font-weight:700; color:${(bill.balance || 0) <= 0 ? '#059669' : '#dc2626'};">BALANCE DUE</td><td style="padding:4px 8px; text-align:right; font-weight:800; color:${(bill.balance || 0) <= 0 ? '#059669' : '#dc2626'};">₹${formatCurrency(bill.balance || 0)}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9; background:#f8fafc;"><td style="padding:3px 8px; color:#64748b; font-size:9.5px;">PAYMENT STATUS</td><td style="padding:3px 8px; text-align:right; font-weight:700; font-size:9.5px; color:${isPaid ? '#059669' : '#dc2626'};">${escapeHtml(bill.paymentStatus || 'PAID')}</td></tr>
              <tr style="background:#f8fafc;"><td style="padding:3px 8px; color:#64748b; font-size:9.5px;">PAYMENT METHOD</td><td style="padding:3px 8px; text-align:right; font-weight:700; font-size:9.5px; color:#334155;">${escapeHtml(bill.paymentMethod || 'CASH')}</td></tr>
            </table>
          </div>
        </div>

        ${buildHospitalPrintFooter()}
      </div>
    `;
  }

  async function printDedicatedCentralInvoice(billId) {
    if (!billId) {
      alert("No invoice generated yet for this patient. Click 'Generate Consolidated Bill & Invoice' first.");
      return;
    }
    try {
      const res = await Api.get('/api/billing/central/' + billId);
      if (!res || !res.success || !res.data) {
        alert('Could not fetch Central Invoice details for printing.');
        return;
      }
      const bill = res.data;

      // Resilient enrichment: if any detail lists are empty, fetch from patient category endpoints
      const patientId = bill.patientId || (bill.patient && bill.patient.id);
      if (patientId) {
        const promises = [];
        if (!bill.opRecords || bill.opRecords.length === 0) {
          promises.push(Api.get('/api/billing/op/patient/' + patientId).then(r => { if (r && r.success) bill.opRecords = r.data || []; }));
        }
        if (!bill.ipRecords || bill.ipRecords.length === 0) {
          promises.push(Api.get('/api/billing/ip/patient/' + patientId).then(r => { if (r && r.success) bill.ipRecords = r.data || []; }));
        }
        if (!bill.pharmacyBills || bill.pharmacyBills.length === 0) {
          promises.push(Api.get('/api/billing/pharmacy/patient/' + patientId).then(r => { if (r && r.success) bill.pharmacyBills = r.data || []; }));
        }
        if (!bill.labOrders || bill.labOrders.length === 0) {
          promises.push(Api.get('/api/billing/laboratory/patient/' + patientId).then(r => { if (r && r.success) bill.labOrders = r.data || []; }));
        }
        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
      }

      const invoiceHtml = buildCentralInvoicePrintHtml(bill);
      printDedicatedDocument(invoiceHtml);
    } catch (e) {
      console.error('Error in printDedicatedCentralInvoice:', e);
      alert('Error fetching invoice for print.');
    }
  }

  // ----------------------------------------------------------
  // CENTRALIZED BILL PAYMENT ENGINE ("PAYMENT DONE" ACTION)
  // Enforces Backend Authority, Zero Double-Click, Validation & Modal
  // ----------------------------------------------------------
  async function executeBillPayment(options) {
    const {
      moduleType,
      billId,
      billNumber,
      amount,
      balance,
      paymentMethod,
      notes,
      buttonEl,
      onSuccess
    } = options;

    // Check button state for double-click prevention
    if (buttonEl) {
      if (buttonEl.disabled || buttonEl.dataset.processing === 'true') {
        return;
      }
    }

    // Input Validation (Item 5 in User Request)
    if (amount === undefined || amount === null || String(amount).trim() === '') {
      showToast('Payment amount is required.', 'danger');
      return;
    }
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast('Please enter a valid positive payment amount.', 'danger');
      return;
    }
    if (balance !== undefined && balance !== null && numAmt > parseFloat(balance) + 0.001) {
      showToast('Payment amount cannot exceed the outstanding balance.', 'danger');
      return;
    }

    let origHtml = '';
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.dataset.processing = 'true';
      origHtml = buttonEl.innerHTML;
      buttonEl.innerHTML = `<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; margin-right:4px;"></span> Processing...`;
    }

    try {
      const res = await Api.post('/api/billing/payment', {
        moduleType: moduleType,
        billId: billId,
        billNumber: billNumber,
        paymentAmount: numAmt,
        paymentMethod: paymentMethod || 'CASH',
        notes: notes || ''
      });

      if (res && res.success) {
        showToast(res.message || `Payment of ₹${formatCurrency(numAmt)} recorded successfully. Bill updated.`, 'success');
        if (typeof onSuccess === 'function') {
          await onSuccess(res.data);
        }
      } else {
        showToast((res && res.message) ? res.message : 'Payment failed. Please check the amount and try again.', 'danger');
        if (buttonEl) {
          buttonEl.disabled = false;
          delete buttonEl.dataset.processing;
          buttonEl.innerHTML = origHtml;
        }
      }
    } catch (err) {
      showToast(err.message || 'Payment processing error.', 'danger');
      if (buttonEl) {
        buttonEl.disabled = false;
        delete buttonEl.dataset.processing;
        buttonEl.innerHTML = origHtml;
      }
    }
  }

  function openPaymentDoneModal() {
    // Deprecated: Separate Paid / Payment Done modal removed in favor of direct Amount Paid + Submit flow
  }

  // ----------------------------------------------------------
  // CENTRAL BILLING PAYMENT CONFIRMATION & PRINT MODAL ENGINE
  // Shows clean confirmation popup before saving to MySQL.
  // After confirmation, shows success state with optional Print.
  // Cancel preserves all data unchanged.
  // ----------------------------------------------------------
  function showPaymentConfirmationModal(config) {
    const {
      title = 'Confirm Payment',
      billRef = '',
      paymentAmount = 0,
      remainingBalance = 0,
      moduleType = 'BILLING',
      printButtonLabel = 'Print Bill',
      onCancel,
      onConfirm,
      onPrint
    } = config;

    const prev = document.getElementById('cvPaymentConfirmBackdrop');
    if (prev) prev.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'cv-modal-backdrop show';
    backdrop.id = 'cvPaymentConfirmBackdrop';
    backdrop.style.zIndex = '1050';

    const billRefHtml = billRef ? `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; padding-bottom:0.5rem; border-bottom:1px dashed #cbd5e1;">
        <span style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Reference:</span>
        <strong style="font-size:0.92rem; font-family:monospace; color:#0f172a;">${escapeHtml(billRef)}</strong>
      </div>
    ` : '';

    backdrop.innerHTML = `
      <div class="cv-modal" style="max-width: 440px; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.22); border:1px solid #cbd5e1; background:#ffffff;">
        <div class="cv-modal-header" style="background:#f8fafc; padding: 1.1rem 1.4rem; border-bottom: 1px solid var(--cv-border);">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span style="width:32px; height:32px; border-radius:8px; background:rgba(2, 132, 199, 0.12); color:var(--cv-primary); display:flex; align-items:center; justify-content:center;">
              <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </span>
            <h3 class="cv-modal-title" style="margin:0; font-size:1.1rem; font-weight:700; color:#0f172a;" id="cvPaymentConfirmTitle">${escapeHtml(title)}</h3>
          </div>
          <button type="button" class="cv-modal-close" id="btnPaymentConfirmClose" style="cursor:pointer;" aria-label="Close">&times;</button>
        </div>

        <div class="cv-modal-body" id="cvPaymentConfirmBody" style="padding: 1.4rem 1.4rem 1rem 1.4rem;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.9rem 1.15rem; margin-bottom:1.15rem;">
            ${billRefHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span style="font-size:0.85rem; font-weight:600; color:#475569;">Payment Amount:</span>
              <strong style="font-size:1.15rem; color:#0f172a;">₹${formatCurrency(paymentAmount)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.85rem; font-weight:600; color:#475569;">Remaining Balance:</span>
              <strong style="font-size:1.15rem; color:${remainingBalance <= 0 ? '#059669' : 'var(--cv-danger)'};">₹${formatCurrency(remainingBalance)}</strong>
            </div>
          </div>

          <p style="font-size:0.92rem; color:#334155; margin:0; text-align:center; font-weight:500;">
            Are you sure you want to confirm this payment?
          </p>
        </div>

        <div class="cv-modal-footer" id="cvPaymentConfirmFooter" style="padding: 0.9rem 1.4rem; background:#f8fafc; border-top:1px solid var(--cv-border); display:flex; justify-content:flex-end; gap:0.75rem;">
          <button type="button" class="cv-btn-secondary" id="btnCancelPaymentConfirm" style="padding:0.5rem 1.1rem; font-size:0.88rem; font-weight:600;">
            Cancel
          </button>
          <button type="button" class="cv-btn-primary" id="btnProceedPaymentConfirm" style="padding:0.5rem 1.3rem; font-size:0.88rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
            Confirm
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeModal = () => {
      backdrop.remove();
      if (typeof onCancel === 'function') onCancel();
    };

    document.getElementById('btnPaymentConfirmClose')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelPaymentConfirm')?.addEventListener('click', closeModal);

    const confirmBtn = document.getElementById('btnProceedPaymentConfirm');
    const cancelBtn = document.getElementById('btnCancelPaymentConfirm');

    confirmBtn?.addEventListener('click', async () => {
      if (confirmBtn.disabled || confirmBtn.dataset.processing === 'true') return;

      confirmBtn.disabled = true;
      confirmBtn.dataset.processing = 'true';
      if (cancelBtn) cancelBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; margin-right:4px;"></span> Processing...';

      const showSuccessState = (resultData) => {
        const bodyEl = document.getElementById('cvPaymentConfirmBody');
        const footerEl = document.getElementById('cvPaymentConfirmFooter');
        const titleEl = document.getElementById('cvPaymentConfirmTitle');
        if (titleEl) titleEl.textContent = 'Payment Confirmed';

        const status = resultData?.paymentStatus || (remainingBalance <= 0 ? 'PAID' : 'PARTIALLY PAID');
        const isNowPaid = (status === 'PAID');
        const curPaid = resultData?.amountPaid != null ? resultData.amountPaid : paymentAmount;
        const curBal = resultData?.balanceAmount != null ? resultData.balanceAmount : remainingBalance;
        const refNo = resultData?.invoiceNumber || resultData?.billNumber || billRef;

        if (bodyEl) {
          bodyEl.innerHTML = `
            <div style="text-align:center; padding:0.5rem 0.25rem;">
              <div style="width:48px; height:48px; border-radius:50%; background:#dcfce7; color:#16a34a; display:inline-flex; align-items:center; justify-content:center; margin-bottom:0.75rem;">
                <svg style="width:26px; height:26px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h4 style="margin:0 0 0.35rem 0; font-size:1.15rem; font-weight:800; color:#0f172a;">Payment Confirmed</h4>
              <div style="display:inline-block; font-size:0.8rem; font-weight:700; padding:0.25rem 0.75rem; border-radius:9999px; background:${isNowPaid ? '#dcfce7' : '#fef3c7'}; color:${isNowPaid ? '#15803d' : '#b45309'}; margin-bottom:1rem;">
                Payment Status: ${escapeHtml(status)}
              </div>

              <div style="background:#f8fafc; border:1px solid var(--cv-border); border-radius:8px; padding:0.85rem 1.15rem; text-align:left; margin-bottom:0.25rem; font-size:0.85rem;">
                ${refNo ? `<div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;"><span style="color:#64748b;">${moduleType === 'MAIN' || moduleType === 'CENTRAL' ? 'Invoice' : 'Bill'} Number:</span><strong style="font-family:monospace; color:#0f172a;">${escapeHtml(refNo)}</strong></div>` : ''}
                <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;"><span style="color:#64748b;">Total Paid:</span><strong style="color:#0f172a;">₹${formatCurrency(curPaid)}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span style="color:#64748b;">Outstanding Balance:</span><strong style="color:${curBal <= 0 ? '#059669' : 'var(--cv-danger)'};">₹${formatCurrency(curBal)}</strong></div>
              </div>
            </div>
          `;
        }

        if (footerEl) {
          footerEl.innerHTML = `
            <div style="display:flex; justify-content:flex-end; gap:0.65rem; width:100%;">
              <button type="button" class="cv-btn-secondary" id="btnDonePaymentConfirm" style="padding:0.45rem 1.1rem; font-size:0.85rem; font-weight:600;">
                Close
              </button>
              <button type="button" class="cv-btn-primary" id="btnPrintAfterPaymentConfirm" style="padding:0.45rem 1.25rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
                <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                ${escapeHtml(printButtonLabel)}
              </button>
            </div>
          `;

          document.getElementById('btnDonePaymentConfirm')?.addEventListener('click', () => backdrop.remove());
          document.getElementById('btnPrintAfterPaymentConfirm')?.addEventListener('click', () => {
            backdrop.remove();
            if (typeof onPrint === 'function') onPrint(resultData);
          });
        }
      };

      if (typeof onConfirm === 'function') {
        try {
          await onConfirm(showSuccessState, () => {
            confirmBtn.disabled = false;
            delete confirmBtn.dataset.processing;
            if (cancelBtn) cancelBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirm';
          });
        } catch (e) {
          confirmBtn.disabled = false;
          delete confirmBtn.dataset.processing;
          if (cancelBtn) cancelBtn.disabled = false;
          confirmBtn.innerHTML = 'Confirm';
        }
      }
    });
  }

  async function refreshCurrentBillingCategory() {
    await loadBillingSummaryData();
    updateBillingKpiValues();
    if (billingMainTab === 'billing') {
      if (billingCategoryTab === 'op') {
        if (opViewMode === 'all') renderOpAllLedgerTable(false);
        else if (activeBillingPatient) loadAndRenderPatientOpBilling(activeBillingPatient);
      } else if (billingCategoryTab === 'ip') {
        if (ipViewMode === 'all') renderIpAllLedgerTable(false);
        else if (activeBillingPatient) loadAndRenderPatientIpBilling(activeBillingPatient);
      } else if (billingCategoryTab === 'pharmacy') {
        if (phViewMode === 'all') renderPharmacyAllLedgerTable(false);
        else if (activeBillingPatient) loadAndRenderPatientPhBilling(activeBillingPatient);
      } else if (billingCategoryTab === 'laboratory') {
        if (labViewMode === 'all') renderLaboratoryAllLedgerTable(false);
        else if (activeBillingPatient) loadAndRenderPatientLabBilling(activeBillingPatient);
      }
    } else {
      if (mainBillingSubView === 'history') renderMainBillingHistoryView();
      else if (activeBillingPatient) fetchCbConsolidatedCharges(activeBillingPatient.id);
    }
  }

  // ----------------------------------------------------------
  // 1. OP BILLING — AUTO RETRIEVAL & LEDGER
  // ----------------------------------------------------------
  let opViewMode = 'auto'; // 'auto' (patient auto-retrieval) or 'all' (all ledger)
  async function renderOpCategoryView() {
    const mount = document.getElementById('billingCategoryViewMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="cv-pharmacy-card">
        <div class="cv-pharmacy-card-header" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="cv-pharmacy-card-title">
            <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            OP Billing &bull; Outpatient Charges Auto-Retrieval
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button type="button" class="cv-btn-secondary ${opViewMode === 'all' ? 'active' : ''}" id="btnToggleOpAllLedger" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              ${opViewMode === 'all' ? 'Back to Patient Search' : 'View Complete OP Ledger'}
            </button>
          </div>
        </div>

        <!-- Search Bar Area + Date Period Filter -->
        <div style="display:flex; gap:0.75rem; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap;">
          <div style="position:relative; flex:1; min-width:280px;">
            <svg style="position:absolute; left:12px; top:11px; width:18px; height:18px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="opPatientSearchInput" class="cv-form-input" style="padding-left:2.5rem; height:40px; font-size:0.88rem;" placeholder="Search patient by Name, UHID, OP ID, IP ID, or Phone..." autocomplete="off">
            <div id="opPatientDropdown" class="cv-patient-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); box-shadow:var(--cv-shadow-lg); z-index:50; max-height:260px; overflow-y:auto;"></div>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem; white-space:nowrap;">
            <label style="font-size:0.8rem; font-weight:700; color:var(--cv-text-muted);">Date:</label>
            <select id="opDatePeriodFilter" class="cv-form-input" style="height:40px; width:auto; font-size:0.84rem; font-weight:600;">
              <option value="ALL" ${cbDatePeriodFilter === 'ALL' ? 'selected' : ''}>All Time</option>
              <option value="TODAY" ${cbDatePeriodFilter === 'TODAY' ? 'selected' : ''}>Today</option>
              <option value="WEEK" ${cbDatePeriodFilter === 'WEEK' ? 'selected' : ''}>This Week</option>
              <option value="MONTH" ${cbDatePeriodFilter === 'MONTH' ? 'selected' : ''}>This Month</option>
              <option value="YEAR" ${cbDatePeriodFilter === 'YEAR' ? 'selected' : ''}>This Year</option>
            </select>
          </div>
        </div>

        <div id="opCategoryMainContent"></div>
      </div>
    `;

    setupPatientSearchWidget('opPatientSearchInput', 'opPatientDropdown', (patient) => {
      activeBillingPatient = patient;
      opViewMode = 'auto';
      activeOpRecord = null;
      loadAndRenderPatientOpBilling(patient);
    });

    document.getElementById('opDatePeriodFilter')?.addEventListener('change', (e) => {
      cbDatePeriodFilter = e.target.value;
      if (activeBillingPatient) {
        activeOpRecord = null;
        loadAndRenderPatientOpBilling(activeBillingPatient);
      } else if (opViewMode === 'all') {
        renderOpAllLedgerTable();
      }
    });

    document.getElementById('btnToggleOpAllLedger')?.addEventListener('click', () => {
      opViewMode = (opViewMode === 'all') ? 'auto' : 'all';
      if (opViewMode === 'all') {
        renderOpAllLedgerTable();
      } else {
        if (activeBillingPatient) {
          loadAndRenderPatientOpBilling(activeBillingPatient);
        } else {
          renderOpCategoryView();
        }
      }
    });

    if (opViewMode === 'all') {
      renderOpAllLedgerTable();
    } else if (activeBillingPatient) {
      loadAndRenderPatientOpBilling(activeBillingPatient);
    } else {
      renderOpAllLedgerTable(true);
    }
  }

  async function loadAndRenderPatientOpBilling(patient) {
    const contentMount = document.getElementById('opCategoryMainContent');
    if (!contentMount) return;

    contentMount.innerHTML = `
      <div id="opBannerMount">
        ${renderCategoryPatientBanner(patient, () => {
          activeBillingPatient = null;
          activeOpRecord = null;
          renderOpCategoryView();
        }, true)}
      </div>
      <div id="opPatientRecordsArea">
        <div class="cv-spinner" style="margin:2rem auto;"></div>
        <p style="text-align:center; color:var(--cv-primary); font-weight:600; font-size:0.9rem;">Loading patient billing information...</p>
      </div>
    `;

    document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
      activeBillingPatient = null;
      activeOpRecord = null;
      renderOpCategoryView();
    });

    document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
      opViewMode = 'all';
      renderOpAllLedgerTable();
    });

    const recordsArea = document.getElementById('opPatientRecordsArea');

    try {
      const res = await Api.get(`/api/billing/op/patient/${patient.id}`);
      const rawOps = (res && res.success) ? res.data : [];
      const ops = filterRecordsByPeriod(rawOps, 'visitDate', cbDatePeriodFilter);

      if (!ops || ops.length === 0) {
        recordsArea.innerHTML = `
          <div class="cv-alert" style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:1.25rem; border-radius:8px; display:flex; align-items:center; gap:0.75rem;">
            <svg style="width:24px; height:24px; flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <div style="font-weight:700; font-size:0.98rem;">No OP billing records found.</div>
              <div style="font-size:0.84rem; color:#7f1d1d; margin-top:0.2rem;">Patient ${escapeHtml(patient.fullName)} (${escapeHtml(patient.uhid || 'No UHID')}) has no OP billing records in MySQL${cbDatePeriodFilter !== 'ALL' ? ' for the selected date filter' : ''}.</div>
            </div>
          </div>
        `;
        return;
      }

      if (activeOpRecord) {
        activeOpRecord = ops.find(o => o.id === activeOpRecord.id) || ops[0];
      } else {
        activeOpRecord = ops[0] || null;
      }

      // Auto-fill metadata if missing on patient
      if (activeOpRecord) {
        if (!patient.doctorName && activeOpRecord.doctorName) patient.doctorName = activeOpRecord.doctorName;
        if (!patient.department && activeOpRecord.department) patient.department = activeOpRecord.department;
        if (!patient.latestOpId && activeOpRecord.opId) patient.latestOpId = activeOpRecord.opId;
        const bannerMount = document.getElementById('opBannerMount');
        if (bannerMount) {
          bannerMount.innerHTML = renderCategoryPatientBanner(patient, () => {
            activeBillingPatient = null;
            activeOpRecord = null;
            renderOpCategoryView();
          }, true);
          document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
            activeBillingPatient = null;
            activeOpRecord = null;
            renderOpCategoryView();
          });
          document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
            opViewMode = 'all';
            renderOpAllLedgerTable();
          });
        }
      }

      let selectorHtml = '';
      if (ops.length > 1) {
        selectorHtml = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.75rem 1rem; margin-bottom:1.25rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase; margin-bottom:0.5rem;">
              OP Billing History (${ops.length} records found) &bull; Select Bill Record:
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              ${ops.map((o, idx) => `
                <button type="button" class="cv-sub-tab-btn ${o.id === activeOpRecord.id ? 'active' : ''}" data-opid="${o.id}" style="font-size:0.8rem; padding:0.4rem 0.8rem;">
                  ${escapeHtml(o.opId)} | ${escapeHtml(o.visitDate || '')} | ₹${formatCurrency(o.consultationFee || 0)}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      }

      const o = activeOpRecord;
      const fee = o.consultationFee || 0;
      const discount = o.discount || 0;
      const gst = o.gst || 0;
      const totalAmt = (fee - discount) + gst;
      const isPaid = (o.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const paidAmt = isPaid ? totalAmt : (o.paidAmount != null ? o.paidAmount : 0);
      const balAmt = o.balanceAmount != null ? o.balanceAmount : Math.max(0, totalAmt - paidAmt);
      const payStatus = isPaid ? 'PAID' : (paidAmt > 0 ? 'PARTIALLY PAID' : 'UNPAID');

      recordsArea.innerHTML = `
        ${selectorHtml}
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:1.4rem; box-shadow:var(--cv-shadow-xs);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem; margin-bottom:1.25rem;">
            <div>
              <span class="cv-badge-unpaid" style="background:#e0e7ff; color:#3730a3; padding:0.2rem 0.5rem; font-size:0.75rem; font-weight:700; margin-right:0.5rem;">OP BILLING RECORD</span>
              <strong style="font-size:1.15rem; color:#0f172a;">${escapeHtml(o.opId)}</strong>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paidAmt > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
                ${escapeHtml(payStatus)}
              </span>
              <button type="button" class="cv-btn-secondary" id="btnViewOpDetailsModal" style="padding:0.35rem 0.75rem; font-size:0.78rem;">
                View Raw Details
              </button>
              <button type="button" class="cv-btn-primary" id="btnPrintOpBill" style="padding:0.35rem 0.85rem; font-size:0.78rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                PRINT BILL
              </button>
            </div>
          </div>

          <!-- Metadata & Financial Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Bill Date (Visit Date)</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(o.visitDate || '—')}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Bill Time</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(o.registrationTime || '—')}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Doctor &amp; Department</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(o.doctorName || 'Doctor')} (${escapeHtml(o.department || 'General')})</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Bill Number / OP ID</span>
              <span style="font-weight:700; font-family:monospace; color:var(--cv-primary);">${escapeHtml(o.opId)}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Invoice Number</span>
              <span style="font-weight:700; font-family:monospace; color:#0284c7;">${escapeHtml(o.invoiceNumber || activeBillingPatient?.existingInvoiceNumber || '—')}</span>
            </div>
          </div>

          <!-- Services & Charges Table -->
          <div class="cv-bill-table-wrapper" style="margin-bottom:1.25rem;">
            <table class="cv-bill-table">
              <thead>
                <tr>
                  <th>OP Services / Description</th>
                  <th>Department</th>
                  <th>Consulting Doctor</th>
                  <th style="text-align:right;">Charge Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>OP Consultation &amp; Primary Clinical Assessment</strong></td>
                  <td>${escapeHtml(o.department || 'General Medicine')}</td>
                  <td>${escapeHtml(o.doctorName || 'Consultant')}</td>
                  <td style="text-align:right; font-weight:800; color:#0f172a;">₹${formatCurrency(fee)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bottom Financial Summary Row -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:0.75rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:0.9rem 1.1rem;">
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">Subtotal</div>
              <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">₹${formatCurrency(fee)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">Discount</div>
              <div style="font-size:1.1rem; font-weight:800; color:var(--cv-text-muted);">₹${formatCurrency(discount)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">GST (0%)</div>
              <div style="font-size:1.1rem; font-weight:800; color:var(--cv-text-muted);">₹${formatCurrency(gst)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">Total Amount</div>
              <div style="font-size:1.25rem; font-weight:800; color:var(--cv-primary);">₹${formatCurrency(totalAmt)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">Amount Paid</div>
              <div id="opSummaryPaid_${o.id}" style="font-size:1.1rem; font-weight:800; color:#059669;">₹${formatCurrency(paidAmt)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">Balance</div>
              <div id="opSummaryBal_${o.id}" style="font-size:1.1rem; font-weight:800; color:${balAmt > 0 ? 'var(--cv-danger)' : '#059669'};">₹${formatCurrency(balAmt)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">Payment Status</div>
              <div><span id="opSummaryStatus_${o.id}" class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paidAmt > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">${escapeHtml(payStatus)}</span></div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#1e3a8a; text-transform:uppercase;">Payment Method</div>
              <div id="opSummaryMethod_${o.id}" style="font-size:0.95rem; font-weight:700; color:#0f172a;">${escapeHtml(o.paymentMethod || 'CASH')}</div>
            </div>
          </div>

          <div id="opPaymentArea_${o.id}">
          ${balAmt > 0 ? `
            <div style="margin-top:0.85rem; padding:0.75rem 1rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.6rem;">
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span style="font-size:0.8rem; font-weight:700; color:#475569; text-transform:uppercase;">Outstanding Balance:</span>
                <span id="opAreaBal_${o.id}" style="font-size:1.05rem; font-weight:800; color:var(--cv-danger);">₹${formatCurrency(balAmt)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <label for="opAmountPaid_${o.id}" style="font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; white-space:nowrap;">Amount Paid</label>
                  <input type="number" id="opAmountPaid_${o.id}" class="cv-form-input" style="height:36px; width:125px; font-size:0.9rem; font-weight:700; background:#fff; text-align:right;" placeholder="0.00" value="${balAmt}" min="0.01" max="${balAmt}" step="any">
                </div>
                <select id="opPaymentMethod_${o.id}" class="cv-form-select" style="height:36px; width:115px; font-size:0.82rem; background:#fff;">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
                <button type="button" class="cv-btn-primary" id="btnOpSubmitPayment_${o.id}" style="height:36px; padding:0 1.1rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                  <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  Submit
                </button>
              </div>
            </div>
          ` : ''}
          </div>

        </div>
      `;

      recordsArea.querySelectorAll('[data-opid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const selId = Number(btn.getAttribute('data-opid'));
          activeOpRecord = ops.find(x => x.id === selId) || activeOpRecord;
          loadAndRenderPatientOpBilling(patient);
        });
      });

      if (balAmt > 0) {
        document.getElementById(`btnOpSubmitPayment_${o.id}`)?.addEventListener('click', async () => {
          const amtInput = document.getElementById(`opAmountPaid_${o.id}`);
          const amtVal = amtInput?.value;
          const mthVal = document.getElementById(`opPaymentMethod_${o.id}`)?.value || 'CASH';
          const btn = document.getElementById(`btnOpSubmitPayment_${o.id}`);

          if (amtVal === undefined || amtVal === null || String(amtVal).trim() === '') {
            showToast('Please enter a payment amount.', 'danger');
            return;
          }
          const numAmt = parseFloat(amtVal);
          if (isNaN(numAmt) || numAmt <= 0) {
            showToast('Payment amount must be greater than zero.', 'danger');
            return;
          }
          const curBal = (o.balanceAmount != null ? o.balanceAmount : Math.max(0, totalAmt - paidAmt));
          if (numAmt > curBal + 0.001) {
            showToast('Payment amount cannot exceed the outstanding balance.', 'danger');
            return;
          }

          const remBal = Math.max(0, parseFloat((curBal - numAmt).toFixed(2)));

          showPaymentConfirmationModal({
            title: 'Confirm Payment',
            billRef: 'OP Bill: ' + o.opId,
            paymentAmount: numAmt,
            remainingBalance: remBal,
            moduleType: 'OP',
            printButtonLabel: 'Print Bill',
            onConfirm: async (showSuccessState) => {
              await executeBillPayment({
                moduleType: 'OP',
                billId: o.id,
                billNumber: o.opId,
                amount: numAmt,
                balance: curBal,
                paymentMethod: mthVal,
                buttonEl: btn,
                onSuccess: async (data) => {
                  o.paidAmount = data.amountPaid;
                  o.balanceAmount = data.balanceAmount;
                  o.paymentStatus = data.paymentStatus;
                  o.paymentMethod = data.paymentMethod;
                  if (activeOpRecord && activeOpRecord.id === o.id) {
                    activeOpRecord.paidAmount = data.amountPaid;
                    activeOpRecord.balanceAmount = data.balanceAmount;
                    activeOpRecord.paymentStatus = data.paymentStatus;
                    activeOpRecord.paymentMethod = data.paymentMethod;
                  }
                  const isNowPaid = (data.balanceAmount <= 0);
                  const paidEl = document.getElementById(`opSummaryPaid_${o.id}`);
                  const balEl = document.getElementById(`opSummaryBal_${o.id}`);
                  const statusEl = document.getElementById(`opSummaryStatus_${o.id}`);
                  const methodEl = document.getElementById(`opSummaryMethod_${o.id}`);
                  const payArea = document.getElementById(`opPaymentArea_${o.id}`);
                  if (paidEl) paidEl.textContent = '₹' + formatCurrency(data.amountPaid);
                  if (balEl) {
                    balEl.textContent = '₹' + formatCurrency(data.balanceAmount);
                    balEl.style.color = isNowPaid ? '#059669' : 'var(--cv-danger)';
                  }
                  if (statusEl) {
                    statusEl.textContent = data.paymentStatus;
                    statusEl.className = 'cv-payment-balance-badge ' + (isNowPaid ? 'cv-badge-paid' : 'cv-badge-part');
                  }
                  if (methodEl) methodEl.textContent = data.paymentMethod;
                  if (payArea) {
                    if (isNowPaid) {
                      payArea.innerHTML = '';
                    } else {
                      if (amtInput) {
                        amtInput.value = data.balanceAmount.toFixed(2);
                        amtInput.max = data.balanceAmount.toFixed(2);
                      }
                      const areaBal = document.getElementById(`opAreaBal_${o.id}`);
                      if (areaBal) areaBal.textContent = '₹' + formatCurrency(data.balanceAmount);
                    }
                  }
                  await loadBillingSummaryData();
                  updateBillingKpiValues();

                  showSuccessState(data);
                }
              });
            },
            onPrint: () => {
              printDedicatedDocument(buildOpBillPrintHtml(patient, o));
            }
          });
        });
      }

      document.getElementById('btnViewOpDetailsModal')?.addEventListener('click', () => {
        showGenericRecordDetailsModal('OP Consultation Bill: ' + o.opId, o);
      });

      document.getElementById('btnPrintOpBill')?.addEventListener('click', () => {
        printDedicatedDocument(buildOpBillPrintHtml(patient, o));
      });

    } catch (e) {
      recordsArea.innerHTML = '<div class="cv-alert cv-alert-error">Unable to retrieve billing information.</div>';
    }
  }

  async function renderOpAllLedgerTable(isPrompt = false) {
    const mount = document.getElementById('opCategoryMainContent');
    if (!mount) return;

    mount.innerHTML = `
      ${isPrompt ? `
        <div style="padding:0.75rem 1rem; background:#f8fafc; border:1px dashed var(--cv-border); border-radius:6px; margin-bottom:1rem; font-size:0.84rem; color:var(--cv-text-muted); display:flex; align-items:center; gap:0.5rem;">
          <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Search and select a patient above to automatically retrieve their OP billing details, or review the complete hospital OP ledger below:
        </div>
      ` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
        <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">All Hospital Outpatient Records</div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <input type="text" id="opFilterSearch" class="cv-form-input" style="height:34px; font-size:0.82rem; width:220px;" placeholder="Filter rows...">
          <select id="opFilterStatus" class="cv-form-select" style="height:34px; font-size:0.82rem; width:130px;">
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      <div class="cv-bill-table-wrapper">
        <table class="cv-bill-table" id="opBillingTable">
          <thead>
            <tr>
              <th>Bill / OP ID</th>
              <th>Date &amp; Time</th>
              <th>Patient Name</th>
              <th>UHID</th>
              <th>Doctor &amp; Dept</th>
              <th>OP Services</th>
              <th style="text-align:right;">Subtotal</th>
              <th style="text-align:right;">Discount</th>
              <th style="text-align:right;">GST</th>
              <th style="text-align:right;">Total</th>
              <th style="text-align:right;">Paid</th>
              <th style="text-align:right;">Balance</th>
              <th>Method</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="opBillingTableBody">
            <tr><td colspan="15" style="text-align:center; padding:1.5rem;"><div class="cv-spinner"></div></td></tr>
          </tbody>
        </table>
      </div>
    `;

    try {
      const res = await Api.get('/api/billing/op/history');
      const ops = (res && res.success) ? res.data : [];
      const filterInput = document.getElementById('opFilterSearch');
      const filterStatus = document.getElementById('opFilterStatus');
      const tableBody = document.getElementById('opBillingTableBody');

      function filterOpRows() {
        const q = filterInput?.value.toLowerCase().trim() || '';
        const st = filterStatus?.value.toUpperCase().trim() || '';
        const filtered = ops.filter(o => {
          const matchQ = !q ||
            (o.opId && o.opId.toLowerCase().includes(q)) ||
            (o.patient?.fullName && o.patient.fullName.toLowerCase().includes(q)) ||
            (o.patient?.uhid && o.patient.uhid.toLowerCase().includes(q)) ||
            (o.doctorName && o.doctorName.toLowerCase().includes(q)) ||
            (o.department && o.department.toLowerCase().includes(q));
          const matchSt = !st || (o.paymentStatus && o.paymentStatus.toUpperCase() === st);
          return matchQ && matchSt;
        });
        if (tableBody) tableBody.innerHTML = renderOpBillingRows(filtered);
      }

      filterInput?.addEventListener('input', filterOpRows);
      filterStatus?.addEventListener('change', filterOpRows);
      filterOpRows();

    } catch (e) {
      const tb = document.getElementById('opBillingTableBody');
      if (tb) tb.innerHTML = '<tr><td colspan="15" style="text-align:center; color:var(--cv-danger); padding:1rem;">Failed to load OP history from MySQL.</td></tr>';
    }
  }

  function renderOpBillingRows(ops) {
    if (!ops || ops.length === 0) {
      return '<tr><td colspan="15" style="text-align:center; padding:1.75rem; color:var(--cv-text-muted);">No OP billing records found in MySQL.</td></tr>';
    }
    return ops.map(o => {
      const fee = o.consultationFee || 0;
      const isPaid = (o.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const paidAmt = o.paidAmount != null ? o.paidAmount : (isPaid ? fee : 0);
      const balAmt = o.balanceAmount != null ? o.balanceAmount : Math.max(0, fee - paidAmt);

      return `
        <tr>
          <td><strong>${escapeHtml(o.opId)}</strong></td>
          <td>${escapeHtml(o.visitDate || '')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(o.registrationTime || '')}</span></td>
          <td><strong>${escapeHtml(o.patient?.fullName || 'Walk-in')}</strong></td>
          <td><span style="font-family:monospace; font-size:0.8rem;">${escapeHtml(o.patient?.uhid || '—')}</span></td>
          <td>${escapeHtml(o.doctorName || 'Consultant')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(o.department || 'General')}</span></td>
          <td>OP Consultation</td>
          <td style="text-align:right;">₹${formatCurrency(fee)}</td>
          <td style="text-align:right; color:var(--cv-text-muted);">₹0.00</td>
          <td style="text-align:right; color:var(--cv-text-muted);">₹0.00</td>
          <td style="text-align:right; font-weight:700;">₹${formatCurrency(fee)}</td>
          <td style="text-align:right; color:#059669; font-weight:600;">₹${formatCurrency(paidAmt)}</td>
          <td style="text-align:right; color:${balAmt > 0 ? 'var(--cv-danger)' : '#059669'}; font-weight:700;">₹${formatCurrency(balAmt)}</td>
          <td><span class="cv-badge-unpaid" style="background:#f1f5f9; color:#475569; padding:0.15rem 0.4rem; font-size:0.75rem;">${escapeHtml(o.paymentMethod || 'CASH')}</span></td>
          <td>
            <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paidAmt > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
              ${escapeHtml(o.paymentStatus || 'PAID')}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:0.3rem;">
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.selectPatientForOpCategory(${o.patient?.id})">Auto-Fill</button>
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.showGenericRecordDetailsModal('OP Consultation Bill: ' + '${escapeHtml(o.opId)}', ${JSON.stringify(o).replace(/"/g, '&quot;')})">View</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ----------------------------------------------------------
  // 2. IP BILLING — AUTO RETRIEVAL & LEDGER
  // ----------------------------------------------------------
  let ipViewMode = 'auto';
  async function renderIpCategoryView() {
    const mount = document.getElementById('billingCategoryViewMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="cv-pharmacy-card">
        <div class="cv-pharmacy-card-header" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="cv-pharmacy-card-title">
            <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            IP Billing &bull; Inpatient, Room &amp; Bed Charges Auto-Retrieval
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button type="button" class="cv-btn-secondary ${ipViewMode === 'all' ? 'active' : ''}" id="btnToggleIpAllLedger" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              ${ipViewMode === 'all' ? 'Back to Patient Search' : 'View Complete IP Ledger'}
            </button>
          </div>
        </div>

        <!-- Search Bar Area + Date Period Filter -->
        <div style="display:flex; gap:0.75rem; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap;">
          <div style="position:relative; flex:1; min-width:280px;">
            <svg style="position:absolute; left:12px; top:11px; width:18px; height:18px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="ipPatientSearchInput" class="cv-form-input" style="padding-left:2.5rem; height:40px; font-size:0.88rem;" placeholder="Search patient by Name, UHID, OP ID, IP ID, or Phone..." autocomplete="off">
            <div id="ipPatientDropdown" class="cv-patient-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); box-shadow:var(--cv-shadow-lg); z-index:50; max-height:260px; overflow-y:auto;"></div>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem; white-space:nowrap;">
            <label style="font-size:0.8rem; font-weight:700; color:var(--cv-text-muted);">Date:</label>
            <select id="ipDatePeriodFilter" class="cv-form-input" style="height:40px; width:auto; font-size:0.84rem; font-weight:600;">
              <option value="ALL" ${cbDatePeriodFilter === 'ALL' ? 'selected' : ''}>All Time</option>
              <option value="TODAY" ${cbDatePeriodFilter === 'TODAY' ? 'selected' : ''}>Today</option>
              <option value="WEEK" ${cbDatePeriodFilter === 'WEEK' ? 'selected' : ''}>This Week</option>
              <option value="MONTH" ${cbDatePeriodFilter === 'MONTH' ? 'selected' : ''}>This Month</option>
              <option value="YEAR" ${cbDatePeriodFilter === 'YEAR' ? 'selected' : ''}>This Year</option>
            </select>
          </div>
        </div>

        <div id="ipCategoryMainContent"></div>
      </div>
    `;

    setupPatientSearchWidget('ipPatientSearchInput', 'ipPatientDropdown', (patient) => {
      activeBillingPatient = patient;
      ipViewMode = 'auto';
      activeIpRecord = null;
      loadAndRenderPatientIpBilling(patient);
    });

    document.getElementById('ipDatePeriodFilter')?.addEventListener('change', (e) => {
      cbDatePeriodFilter = e.target.value;
      if (activeBillingPatient) {
        activeIpRecord = null;
        loadAndRenderPatientIpBilling(activeBillingPatient);
      } else if (ipViewMode === 'all') {
        renderIpAllLedgerTable();
      }
    });

    document.getElementById('btnToggleIpAllLedger')?.addEventListener('click', () => {
      ipViewMode = (ipViewMode === 'all') ? 'auto' : 'all';
      if (ipViewMode === 'all') {
        renderIpAllLedgerTable();
      } else {
        if (activeBillingPatient) {
          loadAndRenderPatientIpBilling(activeBillingPatient);
        } else {
          renderIpCategoryView();
        }
      }
    });

    if (ipViewMode === 'all') {
      renderIpAllLedgerTable();
    } else if (activeBillingPatient) {
      loadAndRenderPatientIpBilling(activeBillingPatient);
    } else {
      renderIpAllLedgerTable(true);
    }
  }

  async function loadAndRenderPatientIpBilling(patient) {
    const contentMount = document.getElementById('ipCategoryMainContent');
    if (!contentMount) return;

    contentMount.innerHTML = `
      <div id="ipBannerMount">
        ${renderCategoryPatientBanner(patient, () => {
          activeBillingPatient = null;
          activeIpRecord = null;
          renderIpCategoryView();
        }, true)}
      </div>
      <div id="ipPatientRecordsArea">
        <div class="cv-spinner" style="margin:2rem auto;"></div>
        <p style="text-align:center; color:var(--cv-primary); font-weight:600; font-size:0.9rem;">Loading patient billing information...</p>
      </div>
    `;

    document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
      activeBillingPatient = null;
      activeIpRecord = null;
      renderIpCategoryView();
    });

    document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
      ipViewMode = 'all';
      renderIpAllLedgerTable();
    });

    const recordsArea = document.getElementById('ipPatientRecordsArea');

    try {
      const res = await Api.get(`/api/billing/ip/patient/${patient.id}`);
      const rawIps = (res && res.success) ? res.data : [];
      const ips = filterRecordsByPeriod(rawIps, 'admissionDate', cbDatePeriodFilter);

      if (!ips || ips.length === 0) {
        recordsArea.innerHTML = `
          <div class="cv-alert" style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:1.25rem; border-radius:8px; display:flex; align-items:center; gap:0.75rem;">
            <svg style="width:24px; height:24px; flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <div style="font-weight:700; font-size:0.98rem;">No IP billing records found.</div>
              <div style="font-size:0.84rem; color:#7f1d1d; margin-top:0.2rem;">Patient ${escapeHtml(patient.fullName)} (${escapeHtml(patient.uhid || 'No UHID')}) has no IP billing records in MySQL${cbDatePeriodFilter !== 'ALL' ? ' for the selected date filter' : ''}.</div>
            </div>
          </div>
        `;
        return;
      }

      if (activeIpRecord) {
        activeIpRecord = ips.find(i => i.id === activeIpRecord.id) || ips[0];
      } else {
        activeIpRecord = ips[0] || null;
      }

      // Auto-fill metadata if missing on patient
      if (activeIpRecord) {
        if (!patient.doctorName && activeIpRecord.doctorName) patient.doctorName = activeIpRecord.doctorName;
        if (!patient.department && activeIpRecord.department) patient.department = activeIpRecord.department;
        if (!patient.latestIpId && activeIpRecord.ipId) patient.latestIpId = activeIpRecord.ipId;
        if (!patient.latestOpId && activeIpRecord.opId) patient.latestOpId = activeIpRecord.opId;
        const bannerMount = document.getElementById('ipBannerMount');
        if (bannerMount) {
          bannerMount.innerHTML = renderCategoryPatientBanner(patient, () => {
            activeBillingPatient = null;
            activeIpRecord = null;
            renderIpCategoryView();
          }, true);
          document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
            activeBillingPatient = null;
            activeIpRecord = null;
            renderIpCategoryView();
          });
          document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
            ipViewMode = 'all';
            renderIpAllLedgerTable();
          });
        }
      }

      const ip = activeIpRecord;
      const roomChg = ip.roomPrice || 0;
      const bedChg = ip.bedPrice || 0;
      const baseChg = roomChg + bedChg;
      const totalChg = (ip.totalCharges && ip.totalCharges > 0) ? ip.totalCharges : baseChg;
      const ipServices = Math.max(0, totalChg - baseChg);
      const isPaid = (ip.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const paidAmt = isPaid ? totalChg : (ip.paidAmount != null ? ip.paidAmount : (ip.depositAmount || 0));
      const balAmt = ip.balanceAmount != null ? ip.balanceAmount : Math.max(0, totalChg - paidAmt);
      const payStatus = isPaid ? 'PAID' : (paidAmt > 0 ? 'PARTIALLY PAID' : 'UNPAID');

      let selectorHtml = '';
      if (ips.length > 1) {
        selectorHtml = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.75rem 1rem; margin-bottom:1.25rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase; margin-bottom:0.5rem;">
              IP Admission History (${ips.length} admissions found) &bull; Select Bill Record:
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              ${ips.map((item, idx) => {
                const rP = item.roomPrice || 0;
                const bP = item.bedPrice || 0;
                const tP = (item.totalCharges && item.totalCharges > 0) ? item.totalCharges : (rP + bP);
                return `
                  <button type="button" class="cv-sub-tab-btn ${item.id === activeIpRecord.id ? 'active' : ''}" data-ipid="${item.id}" style="font-size:0.8rem; padding:0.4rem 0.8rem;">
                    ${escapeHtml(item.ipId)} | ${escapeHtml(item.admissionDate || '')} | ₹${formatCurrency(tP)}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      recordsArea.innerHTML = `
        ${selectorHtml}
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:1.4rem; box-shadow:var(--cv-shadow-xs);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem; margin-bottom:1.25rem;">
            <div>
              <span class="cv-badge-unpaid" style="background:#fce7f3; color:#9d174d; padding:0.2rem 0.5rem; font-size:0.75rem; font-weight:700; margin-right:0.5rem;">IP BILLING RECORD</span>
              <strong style="font-size:1.15rem; color:#0f172a;">${escapeHtml(ip.ipId)}</strong>
              ${ip.opId ? `<span style="font-size:0.8rem; color:#64748b; margin-left:0.5rem;">(Ref OP: ${escapeHtml(ip.opId)})</span>` : ''}
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paidAmt > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
                ${escapeHtml(payStatus)}
              </span>
              <button type="button" class="cv-btn-secondary" id="btnViewIpDetailsModal" style="padding:0.35rem 0.75rem; font-size:0.78rem;">
                View Admission Details
              </button>
              <button type="button" class="cv-btn-primary" id="btnPrintIpBill" style="padding:0.35rem 0.85rem; font-size:0.78rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                PRINT BILL
              </button>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Bill Date (Admission Date)</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(ip.admissionDate || '—')} ${escapeHtml(ip.admissionTime || '')}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Room &amp; Bed</span>
              <span style="font-weight:700; color:#0f172a;">Room ${escapeHtml(ip.roomNumber || '—')} &bull; Bed ${escapeHtml(ip.bedNumber || '—')} (${escapeHtml(ip.wardName || 'Ward')})</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Doctor &amp; Department</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(ip.doctorName || 'Doctor')} (${escapeHtml(ip.department || 'General')})</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Bill Number / IP ID</span>
              <span style="font-weight:700; font-family:monospace; color:var(--cv-primary);">${escapeHtml(ip.ipId)}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Invoice Number</span>
              <span style="font-weight:700; font-family:monospace; color:#0284c7;">${escapeHtml(ip.invoiceNumber || activeBillingPatient?.existingInvoiceNumber || '—')}</span>
            </div>
          </div>

          <!-- IP Services & Breakdown Table -->
          <div class="cv-bill-table-wrapper" style="margin-bottom:1.25rem;">
            <table class="cv-bill-table">
              <thead>
                <tr>
                  <th>Particulars / IP Services</th>
                  <th>Details</th>
                  <th style="text-align:right;">Charge Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Room Charges</strong></td>
                  <td>Room ${escapeHtml(ip.roomNumber || 'Standard')} (${escapeHtml(ip.wardName || 'General Ward')})</td>
                  <td style="text-align:right; font-weight:700;">₹${formatCurrency(roomChg)}</td>
                </tr>
                <tr>
                  <td><strong>Bed Charges</strong></td>
                  <td>Bed ${escapeHtml(ip.bedNumber || 'Assigned')}</td>
                  <td style="text-align:right; font-weight:700;">₹${formatCurrency(bedChg)}</td>
                </tr>
                ${ipServices > 0 ? `
                  <tr>
                    <td><strong>IP Services &amp; Nursing Care</strong></td>
                    <td>Inpatient medical observation, nursing care &amp; doctor rounds</td>
                    <td style="text-align:right; font-weight:700;">₹${formatCurrency(ipServices)}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <!-- Bottom Financial Summary Row -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:0.75rem; background:#fdf2f8; border:1px solid #fbcfe8; border-radius:6px; padding:0.9rem 1.1rem;">
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">Subtotal</div>
              <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">₹${formatCurrency(totalChg)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">Discount</div>
              <div style="font-size:1.1rem; font-weight:800; color:var(--cv-text-muted);">₹0.00</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">GST (0%)</div>
              <div style="font-size:1.1rem; font-weight:800; color:var(--cv-text-muted);">₹0.00</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">Total Amount</div>
              <div style="font-size:1.25rem; font-weight:800; color:#be185d;">₹${formatCurrency(totalChg)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">Amount Paid</div>
              <div id="ipSummaryPaid_${ip.id}" style="font-size:1.1rem; font-weight:800; color:#059669;">₹${formatCurrency(paidAmt)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">Balance</div>
              <div id="ipSummaryBal_${ip.id}" style="font-size:1.1rem; font-weight:800; color:${balAmt > 0 ? 'var(--cv-danger)' : '#059669'};">₹${formatCurrency(balAmt)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">Payment Status</div>
              <div><span id="ipSummaryStatus_${ip.id}" class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paidAmt > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">${escapeHtml(payStatus)}</span></div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#9d174d; text-transform:uppercase;">Payment Method</div>
              <div id="ipSummaryMethod_${ip.id}" style="font-size:0.95rem; font-weight:700; color:#0f172a;">${escapeHtml(ip.paymentMethod || 'CASH')}</div>
            </div>
          </div>

          <div id="ipPaymentArea_${ip.id}">
          ${balAmt > 0 ? `
            <div style="margin-top:0.85rem; padding:0.75rem 1rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.6rem;">
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span style="font-size:0.8rem; font-weight:700; color:#475569; text-transform:uppercase;">Outstanding Balance:</span>
                <span id="ipAreaBal_${ip.id}" style="font-size:1.05rem; font-weight:800; color:var(--cv-danger);">₹${formatCurrency(balAmt)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <label for="ipAmountPaid_${ip.id}" style="font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; white-space:nowrap;">Amount Paid</label>
                  <input type="number" id="ipAmountPaid_${ip.id}" class="cv-form-input" style="height:36px; width:125px; font-size:0.9rem; font-weight:700; background:#fff; text-align:right;" placeholder="0.00" value="${balAmt}" min="0.01" max="${balAmt}" step="any">
                </div>
                <select id="ipPaymentMethod_${ip.id}" class="cv-form-select" style="height:36px; width:115px; font-size:0.82rem; background:#fff;">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
                <button type="button" class="cv-btn-primary" id="btnIpSubmitPayment_${ip.id}" style="height:36px; padding:0 1.1rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                  <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  Submit
                </button>
              </div>
            </div>
          ` : ''}
          </div>

        </div>
      `;

      recordsArea.querySelectorAll('[data-ipid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const selId = Number(btn.getAttribute('data-ipid'));
          activeIpRecord = ips.find(x => x.id === selId) || activeIpRecord;
          loadAndRenderPatientIpBilling(patient);
        });
      });

      if (balAmt > 0) {
        document.getElementById(`btnIpSubmitPayment_${ip.id}`)?.addEventListener('click', async () => {
          const amtInput = document.getElementById(`ipAmountPaid_${ip.id}`);
          const amtVal = amtInput?.value;
          const mthVal = document.getElementById(`ipPaymentMethod_${ip.id}`)?.value || 'CASH';
          const btn = document.getElementById(`btnIpSubmitPayment_${ip.id}`);

          if (amtVal === undefined || amtVal === null || String(amtVal).trim() === '') {
            showToast('Please enter a payment amount.', 'danger');
            return;
          }
          const numAmt = parseFloat(amtVal);
          if (isNaN(numAmt) || numAmt <= 0) {
            showToast('Payment amount must be greater than zero.', 'danger');
            return;
          }
          const curBal = (ip.balanceAmount != null ? ip.balanceAmount : Math.max(0, totalChg - paidAmt));
          if (numAmt > curBal + 0.001) {
            showToast('Payment amount cannot exceed the outstanding balance.', 'danger');
            return;
          }

          const remBal = Math.max(0, parseFloat((curBal - numAmt).toFixed(2)));

          showPaymentConfirmationModal({
            title: 'Confirm Payment',
            billRef: 'IP Admission: ' + ip.ipId,
            paymentAmount: numAmt,
            remainingBalance: remBal,
            moduleType: 'IP',
            printButtonLabel: 'Print Bill',
            onConfirm: async (showSuccessState) => {
              await executeBillPayment({
                moduleType: 'IP',
                billId: ip.id,
                billNumber: ip.ipId,
                amount: numAmt,
                balance: curBal,
                paymentMethod: mthVal,
                buttonEl: btn,
                onSuccess: async (data) => {
                  ip.paidAmount = data.amountPaid;
                  ip.depositAmount = data.amountPaid;
                  ip.balanceAmount = data.balanceAmount;
                  ip.paymentStatus = data.paymentStatus;
                  ip.paymentMethod = data.paymentMethod;
                  if (activeIpRecord && activeIpRecord.id === ip.id) {
                    activeIpRecord.paidAmount = data.amountPaid;
                    activeIpRecord.depositAmount = data.amountPaid;
                    activeIpRecord.balanceAmount = data.balanceAmount;
                    activeIpRecord.paymentStatus = data.paymentStatus;
                    activeIpRecord.paymentMethod = data.paymentMethod;
                  }
                  const isNowPaid = (data.balanceAmount <= 0);
                  const paidEl = document.getElementById(`ipSummaryPaid_${ip.id}`);
                  const balEl = document.getElementById(`ipSummaryBal_${ip.id}`);
                  const statusEl = document.getElementById(`ipSummaryStatus_${ip.id}`);
                  const methodEl = document.getElementById(`ipSummaryMethod_${ip.id}`);
                  const payArea = document.getElementById(`ipPaymentArea_${ip.id}`);
                  if (paidEl) paidEl.textContent = '₹' + formatCurrency(data.amountPaid);
                  if (balEl) {
                    balEl.textContent = '₹' + formatCurrency(data.balanceAmount);
                    balEl.style.color = isNowPaid ? '#059669' : 'var(--cv-danger)';
                  }
                  if (statusEl) {
                    statusEl.textContent = data.paymentStatus;
                    statusEl.className = 'cv-payment-balance-badge ' + (isNowPaid ? 'cv-badge-paid' : 'cv-badge-part');
                  }
                  if (methodEl) methodEl.textContent = data.paymentMethod;
                  if (payArea) {
                    if (isNowPaid) {
                      payArea.innerHTML = '';
                    } else {
                      if (amtInput) {
                        amtInput.value = data.balanceAmount.toFixed(2);
                        amtInput.max = data.balanceAmount.toFixed(2);
                      }
                      const areaBal = document.getElementById(`ipAreaBal_${ip.id}`);
                      if (areaBal) areaBal.textContent = '₹' + formatCurrency(data.balanceAmount);
                    }
                  }
                  await loadBillingSummaryData();
                  updateBillingKpiValues();

                  showSuccessState(data);
                }
              });
            },
            onPrint: () => {
              printDedicatedDocument(buildIpBillPrintHtml(patient, ip));
            }
          });
        });
      }

      document.getElementById('btnViewIpDetailsModal')?.addEventListener('click', () => {
        showIpDetailsModal(ip.id);
      });

      document.getElementById('btnPrintIpBill')?.addEventListener('click', () => {
        printDedicatedDocument(buildIpBillPrintHtml(patient, ip));
      });

    } catch (e) {
      recordsArea.innerHTML = '<div class="cv-alert cv-alert-error">Unable to retrieve billing information.</div>';
    }
  }

  async function renderIpAllLedgerTable(isPrompt = false) {
    const mount = document.getElementById('ipCategoryMainContent');
    if (!mount) return;

    mount.innerHTML = `
      ${isPrompt ? `
        <div style="padding:0.75rem 1rem; background:#f8fafc; border:1px dashed var(--cv-border); border-radius:6px; margin-bottom:1rem; font-size:0.84rem; color:var(--cv-text-muted); display:flex; align-items:center; gap:0.5rem;">
          <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Search and select a patient above to automatically retrieve their IP billing details, or review the complete hospital IP ledger below:
        </div>
      ` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
        <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">All Hospital Inpatient Records</div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <input type="text" id="ipFilterSearch" class="cv-form-input" style="height:34px; font-size:0.82rem; width:220px;" placeholder="Filter rows...">
          <select id="ipFilterStatus" class="cv-form-select" style="height:34px; font-size:0.82rem; width:130px;">
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      <div class="cv-bill-table-wrapper">
        <table class="cv-bill-table" id="ipBillingTable">
          <thead>
            <tr>
              <th>Bill / IP ID</th>
              <th>Admission Date</th>
              <th>Patient Name</th>
              <th>UHID &amp; OP ID</th>
              <th>Doctor &amp; Dept</th>
              <th>Room &amp; Bed</th>
              <th style="text-align:right;">Room Chg</th>
              <th style="text-align:right;">Bed Chg</th>
              <th style="text-align:right;">IP Services</th>
              <th style="text-align:right;">Total Chg</th>
              <th style="text-align:right;">Paid / Dep</th>
              <th style="text-align:right;">Balance</th>
              <th>Method</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="ipBillingTableBody">
            <tr><td colspan="15" style="text-align:center; padding:1.5rem;"><div class="cv-spinner"></div></td></tr>
          </tbody>
        </table>
      </div>
    `;

    try {
      const res = await Api.get('/api/billing/ip/history');
      const ips = (res && res.success) ? res.data : [];
      const filterInput = document.getElementById('ipFilterSearch');
      const filterStatus = document.getElementById('ipFilterStatus');
      const tableBody = document.getElementById('ipBillingTableBody');

      function filterIpRows() {
        const q = filterInput?.value.toLowerCase().trim() || '';
        const st = filterStatus?.value.toUpperCase().trim() || '';
        const filtered = ips.filter(ip => {
          const matchQ = !q ||
            (ip.ipId && ip.ipId.toLowerCase().includes(q)) ||
            (ip.patient?.fullName && ip.patient.fullName.toLowerCase().includes(q)) ||
            (ip.patient?.uhid && ip.patient.uhid.toLowerCase().includes(q)) ||
            (ip.doctorName && ip.doctorName.toLowerCase().includes(q)) ||
            (ip.roomNumber && ip.roomNumber.toLowerCase().includes(q)) ||
            (ip.bedNumber && ip.bedNumber.toLowerCase().includes(q));
          const matchSt = !st || (ip.paymentStatus && ip.paymentStatus.toUpperCase() === st);
          return matchQ && matchSt;
        });
        if (tableBody) tableBody.innerHTML = renderIpBillingRows(filtered);
      }

      filterInput?.addEventListener('input', filterIpRows);
      filterStatus?.addEventListener('change', filterIpRows);
      filterIpRows();

    } catch (e) {
      const tb = document.getElementById('ipBillingTableBody');
      if (tb) tb.innerHTML = '<tr><td colspan="15" style="text-align:center; color:var(--cv-danger); padding:1rem;">Failed to load IP history from MySQL.</td></tr>';
    }
  }

  function renderIpBillingRows(ips) {
    if (!ips || ips.length === 0) {
      return '<tr><td colspan="15" style="text-align:center; padding:1.75rem; color:var(--cv-text-muted);">No IP billing records found in MySQL.</td></tr>';
    }
    return ips.map(ip => {
      const roomChg = ip.roomPrice || 0;
      const bedChg = ip.bedPrice || 0;
      const baseChg = roomChg + bedChg;
      const totalChg = (ip.totalCharges && ip.totalCharges > 0) ? ip.totalCharges : baseChg;
      const ipServices = Math.max(0, totalChg - baseChg);
      const isPaid = (ip.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const paidAmt = isPaid ? totalChg : (ip.paidAmount != null ? ip.paidAmount : (ip.depositAmount || 0));
      const balAmt = ip.balanceAmount != null ? ip.balanceAmount : Math.max(0, totalChg - paidAmt);

      return `
        <tr>
          <td><strong>${escapeHtml(ip.ipId)}</strong></td>
          <td>${escapeHtml(ip.admissionDate || '')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(ip.admissionTime || '')}</span></td>
          <td><strong>${escapeHtml(ip.patient?.fullName || 'Patient')}</strong></td>
          <td><span style="font-family:monospace; font-size:0.8rem;">${escapeHtml(ip.patient?.uhid || '—')}</span><br><span style="font-size:0.72rem; color:var(--cv-text-muted);">OP: ${escapeHtml(ip.opId || '—')}</span></td>
          <td>${escapeHtml(ip.doctorName || 'Attending')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(ip.department || 'General')}</span></td>
          <td>${escapeHtml(ip.roomNumber ? 'Room ' + ip.roomNumber : ip.wardName || 'General Ward')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">Bed: ${escapeHtml(ip.bedNumber || '—')}</span></td>
          <td style="text-align:right;">₹${formatCurrency(roomChg)}</td>
          <td style="text-align:right;">₹${formatCurrency(bedChg)}</td>
          <td style="text-align:right;">₹${formatCurrency(ipServices)}</td>
          <td style="text-align:right; font-weight:700;">₹${formatCurrency(totalChg)}</td>
          <td style="text-align:right; color:#059669; font-weight:600;">₹${formatCurrency(paidAmt)}</td>
          <td style="text-align:right; color:${balAmt > 0 ? 'var(--cv-danger)' : '#059669'}; font-weight:700;">₹${formatCurrency(balAmt)}</td>
          <td><span class="cv-badge-unpaid" style="background:#f1f5f9; color:#475569; padding:0.15rem 0.4rem; font-size:0.75rem;">${escapeHtml(ip.paymentMethod || 'CASH')}</span></td>
          <td>
            <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paidAmt > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
              ${escapeHtml(ip.paymentStatus || 'PAID')}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:0.3rem;">
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.selectPatientForIpCategory(${ip.patient?.id})">Auto-Fill</button>
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.showGenericRecordDetailsModal('IP Admission Bill: ' + '${escapeHtml(ip.ipId)}', ${JSON.stringify(ip).replace(/"/g, '&quot;')})">View</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ----------------------------------------------------------
  // 3. PHARMACY BILLING — AUTO RETRIEVAL & LEDGER
  // ----------------------------------------------------------
  let phViewMode = 'auto';
  async function renderPharmacyCategoryView() {
    const mount = document.getElementById('billingCategoryViewMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="cv-pharmacy-card">
        <div class="cv-pharmacy-card-header" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="cv-pharmacy-card-title">
            <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            Pharmacy Billing &bull; Dispensed Medicines &amp; Taxes Auto-Retrieval
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button type="button" class="cv-btn-secondary ${phViewMode === 'all' ? 'active' : ''}" id="btnTogglePhAllLedger" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              ${phViewMode === 'all' ? 'Back to Patient Search' : 'View Complete Pharmacy Ledger'}
            </button>
          </div>
        </div>

        <!-- Search Bar Area + Date Period Filter -->
        <div style="display:flex; gap:0.75rem; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap;">
          <div style="position:relative; flex:1; min-width:280px;">
            <svg style="position:absolute; left:12px; top:11px; width:18px; height:18px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="phPatientSearchInput" class="cv-form-input" style="padding-left:2.5rem; height:40px; font-size:0.88rem;" placeholder="Search patient by Name, UHID, OP ID, IP ID, or Phone..." autocomplete="off">
            <div id="phPatientDropdown" class="cv-patient-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); box-shadow:var(--cv-shadow-lg); z-index:50; max-height:260px; overflow-y:auto;"></div>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem; white-space:nowrap;">
            <label style="font-size:0.8rem; font-weight:700; color:var(--cv-text-muted);">Date:</label>
            <select id="phDatePeriodFilter" class="cv-form-input" style="height:40px; width:auto; font-size:0.84rem; font-weight:600;">
              <option value="ALL" ${cbDatePeriodFilter === 'ALL' ? 'selected' : ''}>All Time</option>
              <option value="TODAY" ${cbDatePeriodFilter === 'TODAY' ? 'selected' : ''}>Today</option>
              <option value="WEEK" ${cbDatePeriodFilter === 'WEEK' ? 'selected' : ''}>This Week</option>
              <option value="MONTH" ${cbDatePeriodFilter === 'MONTH' ? 'selected' : ''}>This Month</option>
              <option value="YEAR" ${cbDatePeriodFilter === 'YEAR' ? 'selected' : ''}>This Year</option>
            </select>
          </div>
        </div>

        <div id="phCategoryMainContent"></div>
      </div>
    `;

    setupPatientSearchWidget('phPatientSearchInput', 'phPatientDropdown', (patient) => {
      activeBillingPatient = patient;
      phViewMode = 'auto';
      activePhRecord = null;
      loadAndRenderPatientPhBilling(patient);
    });

    document.getElementById('phDatePeriodFilter')?.addEventListener('change', (e) => {
      cbDatePeriodFilter = e.target.value;
      if (activeBillingPatient) {
        activePhRecord = null;
        loadAndRenderPatientPhBilling(activeBillingPatient);
      } else if (phViewMode === 'all') {
        renderPharmacyAllLedgerTable();
      }
    });

    document.getElementById('btnTogglePhAllLedger')?.addEventListener('click', () => {
      phViewMode = (phViewMode === 'all') ? 'auto' : 'all';
      if (phViewMode === 'all') {
        renderPharmacyAllLedgerTable();
      } else {
        if (activeBillingPatient) {
          loadAndRenderPatientPhBilling(activeBillingPatient);
        } else {
          renderPharmacyCategoryView();
        }
      }
    });

    if (phViewMode === 'all') {
      renderPharmacyAllLedgerTable();
    } else if (activeBillingPatient) {
      loadAndRenderPatientPhBilling(activeBillingPatient);
    } else {
      renderPharmacyAllLedgerTable(true);
    }
  }

  async function loadAndRenderPatientPhBilling(patient) {
    const contentMount = document.getElementById('phCategoryMainContent');
    if (!contentMount) return;

    contentMount.innerHTML = `
      <div id="phBannerMount">
        ${renderCategoryPatientBanner(patient, () => {
          activeBillingPatient = null;
          activePhRecord = null;
          renderPharmacyCategoryView();
        }, true)}
      </div>
      <div id="phPatientRecordsArea">
        <div class="cv-spinner" style="margin:2rem auto;"></div>
        <p style="text-align:center; color:var(--cv-primary); font-weight:600; font-size:0.9rem;">Loading patient billing information...</p>
      </div>
    `;

    document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
      activeBillingPatient = null;
      activePhRecord = null;
      renderPharmacyCategoryView();
    });

    document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
      phViewMode = 'all';
      renderPharmacyAllLedgerTable();
    });

    const recordsArea = document.getElementById('phPatientRecordsArea');

    try {
      const res = await Api.get(`/api/billing/pharmacy/patient/${patient.id}`);
      const rawBills = (res && res.success) ? res.data : [];
      const bills = filterRecordsByPeriod(rawBills, 'billDate', cbDatePeriodFilter);

      if (!bills || bills.length === 0) {
        recordsArea.innerHTML = `
          <div class="cv-alert" style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:1.25rem; border-radius:8px; display:flex; align-items:center; gap:0.75rem;">
            <svg style="width:24px; height:24px; flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <div style="font-weight:700; font-size:0.98rem;">No Pharmacy billing records found.</div>
              <div style="font-size:0.84rem; color:#7f1d1d; margin-top:0.2rem;">Patient ${escapeHtml(patient.fullName)} (${escapeHtml(patient.uhid || 'No UHID')}) has no Pharmacy billing records in MySQL${cbDatePeriodFilter !== 'ALL' ? ' for the selected date filter' : ''}.</div>
            </div>
          </div>
        `;
        return;
      }

      if (activePhRecord) {
        activePhRecord = bills.find(b => b.id === activePhRecord.id) || bills[0];
      } else {
        activePhRecord = bills[0];
      }

      // Auto-fill metadata if missing on patient
      if (activePhRecord) {
        if (!patient.doctorName && activePhRecord.doctorName) patient.doctorName = activePhRecord.doctorName;
        if (!patient.department && activePhRecord.department) patient.department = activePhRecord.department;
        if (!patient.latestOpId && activePhRecord.opId) patient.latestOpId = activePhRecord.opId;
        if (!patient.latestIpId && activePhRecord.ipId) patient.latestIpId = activePhRecord.ipId;
        const bannerMount = document.getElementById('phBannerMount');
        if (bannerMount) {
          bannerMount.innerHTML = renderCategoryPatientBanner(patient, () => {
            activeBillingPatient = null;
            activePhRecord = null;
            renderPharmacyCategoryView();
          }, true);
          document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
            activeBillingPatient = null;
            activePhRecord = null;
            renderPharmacyCategoryView();
          });
          document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
            phViewMode = 'all';
            renderPharmacyAllLedgerTable();
          });
        }
      }

      const b = activePhRecord;
      const isPaid = (b.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const items = b.items || [];
      const payStatus = isPaid ? 'PAID' : ((b.paidAmount || 0) > 0 ? 'PARTIALLY PAID' : 'UNPAID');

      let selectorHtml = '';
      if (bills.length > 1) {
        selectorHtml = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.75rem 1rem; margin-bottom:1.25rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase; margin-bottom:0.5rem;">
              Pharmacy Bills History (${bills.length} bills found) &bull; Select Bill Record:
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              ${bills.map((item, idx) => `
                <button type="button" class="cv-sub-tab-btn ${item.id === activePhRecord.id ? 'active' : ''}" data-phid="${item.id}" style="font-size:0.8rem; padding:0.4rem 0.8rem;">
                  ${escapeHtml(item.billNumber)} | ${escapeHtml(item.billDate || '')} | ₹${formatCurrency(item.totalAmount || 0)}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      }

      recordsArea.innerHTML = `
        ${selectorHtml}
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:1.4rem; box-shadow:var(--cv-shadow-xs);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem; margin-bottom:1.25rem;">
            <div>
              <span class="cv-badge-unpaid" style="background:#dcfce7; color:#166534; padding:0.2rem 0.5rem; font-size:0.75rem; font-weight:700; margin-right:0.5rem;">PHARMACY BILL</span>
              <strong style="font-size:1.15rem; color:#0f172a;">${escapeHtml(b.billNumber)}</strong>
              ${b.opId || b.ipId ? `<span style="font-size:0.8rem; color:#64748b; margin-left:0.5rem;">(Ref: ${escapeHtml(b.opId || b.ipId)})</span>` : ''}
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : ((b.paidAmount || 0) > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
                ${escapeHtml(payStatus)}
              </span>
              <button type="button" class="cv-btn-secondary" id="btnViewPhInvoiceModal" style="padding:0.35rem 0.75rem; font-size:0.78rem;">
                View Pharmacy Invoice
              </button>
              <button type="button" class="cv-btn-primary" id="btnPrintPhBill" style="padding:0.35rem 0.85rem; font-size:0.78rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                PRINT BILL
              </button>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Bill Date &amp; Time</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(b.billDate || '—')} ${escapeHtml(b.billTime || '')}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Pharmacy Bill Number</span>
              <span style="font-weight:700; font-family:monospace; color:var(--cv-primary);">${escapeHtml(b.billNumber)}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">GSTIN / GST Number</span>
              <span style="font-weight:700; font-family:monospace; color:#0369a1;">${escapeHtml(b.gstNumber || '29AABCU9603R1ZM')}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Doctor &amp; Department</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(b.doctorName || 'Doctor')} (${escapeHtml(b.department || 'General')})</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Invoice Number</span>
              <span style="font-weight:700; font-family:monospace; color:#0284c7;">${escapeHtml(b.invoiceNumber || activeBillingPatient?.existingInvoiceNumber || '—')}</span>
            </div>
          </div>

          <!-- Itemized Dispensed Medicines Table -->
          <div class="cv-bill-table-wrapper" style="margin-bottom:1.25rem;">
            <table class="cv-bill-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicines</th>
                  <th>Batch</th>
                  <th style="text-align:center;">Quantity</th>
                  <th style="text-align:right;">Unit Price (₹)</th>
                  <th style="text-align:right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${items.length > 0 ? items.map((it, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${escapeHtml(it.medicineName || 'Medicine')}</strong> <span style="font-family:monospace; font-size:0.75rem; color:var(--cv-text-muted);">(${escapeHtml(it.medicineCode || '—')})</span></td>
                    <td>${escapeHtml(it.batchNumber || '—')}</td>
                    <td style="text-align:center; font-weight:700;">${it.quantity || 1}</td>
                    <td style="text-align:right;">₹${formatCurrency(it.unitPrice || 0)}</td>
                    <td style="text-align:right; font-weight:700;">₹${formatCurrency(it.totalPrice || 0)}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>1</td>
                    <td><strong>Medicines Dispensed</strong></td>
                    <td>—</td>
                    <td style="text-align:center;">1</td>
                    <td style="text-align:right;">₹${formatCurrency(b.subtotal)}</td>
                    <td style="text-align:right; font-weight:700;">₹${formatCurrency(b.subtotal)}</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Bottom Financial Summary Row -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:0.75rem; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:0.9rem 1.1rem;">
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">Subtotal</div>
              <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">₹${formatCurrency(b.subtotal)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">Discount (${b.discountPercentage || 0}%)</div>
              <div style="font-size:1.1rem; font-weight:800; color:var(--cv-danger);">- ₹${formatCurrency(b.discountAmount)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">GST (${b.gstPercentage || 0}%)</div>
              <div style="font-size:1.1rem; font-weight:800; color:#0369a1;">+ ₹${formatCurrency(b.gstAmount)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">Total Amount</div>
              <div style="font-size:1.25rem; font-weight:800; color:#15803d;">₹${formatCurrency(b.totalAmount)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">Amount Paid</div>
              <div id="phSummaryPaid_${b.id}" style="font-size:1.1rem; font-weight:800; color:#059669;">₹${formatCurrency(b.paidAmount)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">Balance</div>
              <div id="phSummaryBal_${b.id}" style="font-size:1.1rem; font-weight:800; color:${(b.balanceAmount || 0) > 0 ? 'var(--cv-danger)' : '#059669'};">₹${formatCurrency(b.balanceAmount)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">Payment Status</div>
              <div><span id="phSummaryStatus_${b.id}" class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : ((b.paidAmount || 0) > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">${escapeHtml(payStatus)}</span></div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#166534; text-transform:uppercase;">Payment Method</div>
              <div id="phSummaryMethod_${b.id}" style="font-size:0.95rem; font-weight:700; color:#0f172a;">${escapeHtml(b.paymentMethod || 'CASH')}</div>
            </div>
          </div>

          <div id="phPaymentArea_${b.id}">
          ${(b.balanceAmount || 0) > 0 ? `
            <div style="margin-top:0.85rem; padding:0.75rem 1rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.6rem;">
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span style="font-size:0.8rem; font-weight:700; color:#475569; text-transform:uppercase;">Outstanding Balance:</span>
                <span id="phAreaBal_${b.id}" style="font-size:1.05rem; font-weight:800; color:var(--cv-danger);">₹${formatCurrency(b.balanceAmount)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <label for="phAmountPaid_${b.id}" style="font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; white-space:nowrap;">Amount Paid</label>
                  <input type="number" id="phAmountPaid_${b.id}" class="cv-form-input" style="height:36px; width:125px; font-size:0.9rem; font-weight:700; background:#fff; text-align:right;" placeholder="0.00" value="${b.balanceAmount}" min="0.01" max="${b.balanceAmount}" step="any">
                </div>
                <select id="phPaymentMethod_${b.id}" class="cv-form-select" style="height:36px; width:115px; font-size:0.82rem; background:#fff;">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
                <button type="button" class="cv-btn-primary" id="btnPhSubmitPayment_${b.id}" style="height:36px; padding:0 1.1rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                  <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  Submit
                </button>
              </div>
            </div>
          ` : ''}
          </div>

        </div>
      `;

      recordsArea.querySelectorAll('[data-phid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const selId = Number(btn.getAttribute('data-phid'));
          activePhRecord = bills.find(x => x.id === selId) || activePhRecord;
          loadAndRenderPatientPhBilling(patient);
        });
      });

      if ((b.balanceAmount || 0) > 0) {
        document.getElementById(`btnPhSubmitPayment_${b.id}`)?.addEventListener('click', async () => {
          const amtInput = document.getElementById(`phAmountPaid_${b.id}`);
          const amtVal = amtInput?.value;
          const mthVal = document.getElementById(`phPaymentMethod_${b.id}`)?.value || 'CASH';
          const btn = document.getElementById(`btnPhSubmitPayment_${b.id}`);

          if (amtVal === undefined || amtVal === null || String(amtVal).trim() === '') {
            showToast('Please enter a payment amount.', 'danger');
            return;
          }
          const numAmt = parseFloat(amtVal);
          if (isNaN(numAmt) || numAmt <= 0) {
            showToast('Payment amount must be greater than zero.', 'danger');
            return;
          }
          const curBal = (b.balanceAmount != null ? b.balanceAmount : Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0)));
          if (numAmt > curBal + 0.001) {
            showToast('Payment amount cannot exceed the outstanding balance.', 'danger');
            return;
          }

          const remBal = Math.max(0, parseFloat((curBal - numAmt).toFixed(2)));

          showPaymentConfirmationModal({
            title: 'Confirm Payment',
            billRef: 'Pharmacy Bill: ' + b.billNumber,
            paymentAmount: numAmt,
            remainingBalance: remBal,
            moduleType: 'PHARMACY',
            printButtonLabel: 'Print Bill',
            onConfirm: async (showSuccessState) => {
              await executeBillPayment({
                moduleType: 'PHARMACY',
                billId: b.id,
                billNumber: b.billNumber,
                amount: numAmt,
                balance: curBal,
                paymentMethod: mthVal,
                buttonEl: btn,
                onSuccess: async (data) => {
                  b.paidAmount = data.amountPaid;
                  b.balanceAmount = data.balanceAmount;
                  b.paymentStatus = data.paymentStatus;
                  b.paymentMethod = data.paymentMethod;
                  if (activePhRecord && activePhRecord.id === b.id) {
                    activePhRecord.paidAmount = data.amountPaid;
                    activePhRecord.balanceAmount = data.balanceAmount;
                    activePhRecord.paymentStatus = data.paymentStatus;
                    activePhRecord.paymentMethod = data.paymentMethod;
                  }
                  const isNowPaid = (data.balanceAmount <= 0);
                  const paidEl = document.getElementById(`phSummaryPaid_${b.id}`);
                  const balEl = document.getElementById(`phSummaryBal_${b.id}`);
                  const statusEl = document.getElementById(`phSummaryStatus_${b.id}`);
                  const methodEl = document.getElementById(`phSummaryMethod_${b.id}`);
                  const payArea = document.getElementById(`phPaymentArea_${b.id}`);
                  if (paidEl) paidEl.textContent = '₹' + formatCurrency(data.amountPaid);
                  if (balEl) {
                    balEl.textContent = '₹' + formatCurrency(data.balanceAmount);
                    balEl.style.color = isNowPaid ? '#059669' : 'var(--cv-danger)';
                  }
                  if (statusEl) {
                    statusEl.textContent = data.paymentStatus;
                    statusEl.className = 'cv-payment-balance-badge ' + (isNowPaid ? 'cv-badge-paid' : 'cv-badge-part');
                  }
                  if (methodEl) methodEl.textContent = data.paymentMethod;
                  if (payArea) {
                    if (isNowPaid) {
                      payArea.innerHTML = '';
                    } else {
                      if (amtInput) {
                        amtInput.value = data.balanceAmount.toFixed(2);
                        amtInput.max = data.balanceAmount.toFixed(2);
                      }
                      const areaBal = document.getElementById(`phAreaBal_${b.id}`);
                      if (areaBal) areaBal.textContent = '₹' + formatCurrency(data.balanceAmount);
                    }
                  }
                  await loadBillingSummaryData();
                  updateBillingKpiValues();

                  showSuccessState(data);
                }
              });
            },
            onPrint: () => {
              printDedicatedDocument(buildPharmacyBillPrintHtml(patient, b));
            }
          });
        });
      }

      document.getElementById('btnViewPhInvoiceModal')?.addEventListener('click', () => {
        showPharmacyInvoiceModal(b.id);
      });

      document.getElementById('btnPrintPhBill')?.addEventListener('click', () => {
        printDedicatedDocument(buildPharmacyBillPrintHtml(patient, b));
      });

    } catch (e) {
      recordsArea.innerHTML = '<div class="cv-alert cv-alert-error">Unable to retrieve billing information.</div>';
    }
  }

  async function renderPharmacyAllLedgerTable(isPrompt = false) {
    const mount = document.getElementById('phCategoryMainContent');
    if (!mount) return;

    mount.innerHTML = `
      ${isPrompt ? `
        <div style="padding:0.75rem 1rem; background:#f8fafc; border:1px dashed var(--cv-border); border-radius:6px; margin-bottom:1rem; font-size:0.84rem; color:var(--cv-text-muted); display:flex; align-items:center; gap:0.5rem;">
          <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Search and select a patient above to automatically retrieve their Pharmacy sales records, or review the complete hospital Pharmacy ledger below:
        </div>
      ` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
        <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">All Hospital Pharmacy Bills</div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <input type="text" id="phFilterSearch" class="cv-form-input" style="height:34px; font-size:0.82rem; width:220px;" placeholder="Filter rows...">
          <select id="phFilterStatus" class="cv-form-select" style="height:34px; font-size:0.82rem; width:130px;">
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      <div class="cv-bill-table-wrapper">
        <table class="cv-bill-table" id="phBillingTable">
          <thead>
            <tr>
              <th>Bill Number</th>
              <th>Date &amp; Time</th>
              <th>Patient Name</th>
              <th>UHID</th>
              <th>OP / IP ID</th>
              <th>Medicines Dispensed</th>
              <th style="text-align:right;">Subtotal</th>
              <th style="text-align:right;">Discount</th>
              <th style="text-align:right;">GST</th>
              <th style="text-align:right;">Total</th>
              <th style="text-align:right;">Paid</th>
              <th style="text-align:right;">Balance</th>
              <th>Method</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="phBillingTableBody">
            <tr><td colspan="15" style="text-align:center; padding:1.5rem;"><div class="cv-spinner"></div></td></tr>
          </tbody>
        </table>
      </div>
    `;

    try {
      const res = await Api.get('/api/billing/pharmacy/history');
      const bills = (res && res.success) ? res.data : [];
      const filterInput = document.getElementById('phFilterSearch');
      const filterStatus = document.getElementById('phFilterStatus');
      const tableBody = document.getElementById('phBillingTableBody');

      function filterPhRows() {
        const q = filterInput?.value.toLowerCase().trim() || '';
        const st = filterStatus?.value.toUpperCase().trim() || '';
        const filtered = bills.filter(b => {
          const matchQ = !q ||
            (b.billNumber && b.billNumber.toLowerCase().includes(q)) ||
            (b.patientName && b.patientName.toLowerCase().includes(q)) ||
            (b.uhid && b.uhid.toLowerCase().includes(q)) ||
            (b.opId && b.opId.toLowerCase().includes(q)) ||
            (b.ipId && b.ipId.toLowerCase().includes(q));
          const matchSt = !st || (b.paymentStatus && b.paymentStatus.toUpperCase() === st);
          return matchQ && matchSt;
        });
        if (tableBody) tableBody.innerHTML = renderPharmacyBillingRows(filtered);
      }

      filterInput?.addEventListener('input', filterPhRows);
      filterStatus?.addEventListener('change', filterPhRows);
      filterPhRows();

    } catch (e) {
      const tb = document.getElementById('phBillingTableBody');
      if (tb) tb.innerHTML = '<tr><td colspan="15" style="text-align:center; color:var(--cv-danger); padding:1rem;">Failed to load Pharmacy history from MySQL.</td></tr>';
    }
  }

  function renderPharmacyBillingRows(bills) {
    if (!bills || bills.length === 0) {
      return '<tr><td colspan="15" style="text-align:center; padding:1.75rem; color:var(--cv-text-muted);">No Pharmacy bills found in MySQL.</td></tr>';
    }
    return bills.map(b => {
      const isPaid = (b.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const medSummary = b.items && b.items.length > 0
        ? b.items.length + ' items (' + b.items.map(it => it.medicineName || '').filter(s => s).slice(0, 2).join(', ') + (b.items.length > 2 ? '...' : '') + ')'
        : 'Medicines Dispensed';

      return `
        <tr>
          <td><strong>${escapeHtml(b.billNumber)}</strong></td>
          <td>${escapeHtml(b.billDate || '')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(b.billTime || '')}</span></td>
          <td><strong>${escapeHtml(b.patientName || b.patient?.fullName || 'Walk-in')}</strong></td>
          <td><span style="font-family:monospace; font-size:0.8rem;">${escapeHtml(b.uhid || '—')}</span></td>
          <td>${escapeHtml(b.opId || b.ipId || '—')}</td>
          <td>${escapeHtml(medSummary)}</td>
          <td style="text-align:right;">₹${formatCurrency(b.subtotal)}</td>
          <td style="text-align:right; color:var(--cv-danger);">- ₹${formatCurrency(b.discountAmount)}</td>
          <td style="text-align:right; color:#0369a1;">+ ₹${formatCurrency(b.gstAmount)}</td>
          <td style="text-align:right; font-weight:700;">₹${formatCurrency(b.totalAmount)}</td>
          <td style="text-align:right; color:#059669; font-weight:600;">₹${formatCurrency(b.paidAmount)}</td>
          <td style="text-align:right; color:${(b.balanceAmount || 0) > 0 ? 'var(--cv-danger)' : '#059669'}; font-weight:700;">₹${formatCurrency(b.balanceAmount)}</td>
          <td><span class="cv-badge-unpaid" style="background:#f1f5f9; color:#475569; padding:0.15rem 0.4rem; font-size:0.75rem;">${escapeHtml(b.paymentMethod || 'CASH')}</span></td>
          <td>
            <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : ((b.paidAmount || 0) > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
              ${escapeHtml(b.paymentStatus || 'PAID')}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:0.3rem;">
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.selectPatientForPhCategory(${b.patient?.id})">Auto-Fill</button>
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.showPharmacyInvoiceModal(${b.id})">Invoice</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ----------------------------------------------------------
  // 4. LABORATORY BILLING — AUTO RETRIEVAL & LEDGER
  // ----------------------------------------------------------
  let labViewMode = 'auto';
  async function renderLaboratoryCategoryView() {
    const mount = document.getElementById('billingCategoryViewMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="cv-pharmacy-card">
        <div class="cv-pharmacy-card-header" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="cv-pharmacy-card-title">
            <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            Laboratory Billing &bull; Diagnostic Orders &amp; Tests Auto-Retrieval
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button type="button" class="cv-btn-secondary ${labViewMode === 'all' ? 'active' : ''}" id="btnToggleLabAllLedger" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              ${labViewMode === 'all' ? 'Back to Patient Search' : 'View Complete Lab Ledger'}
            </button>
          </div>
        </div>

        <!-- Search Bar Area + Date Period Filter -->
        <div style="display:flex; gap:0.75rem; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap;">
          <div style="position:relative; flex:1; min-width:280px;">
            <svg style="position:absolute; left:12px; top:11px; width:18px; height:18px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="labPatientSearchInput" class="cv-form-input" style="padding-left:2.5rem; height:40px; font-size:0.88rem;" placeholder="Search patient by Name, UHID, OP ID, IP ID, Phone, or Lab Order ID..." autocomplete="off">
            <div id="labPatientDropdown" class="cv-patient-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); box-shadow:var(--cv-shadow-lg); z-index:50; max-height:260px; overflow-y:auto;"></div>
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem; white-space:nowrap;">
            <label style="font-size:0.8rem; font-weight:700; color:var(--cv-text-muted);">Date:</label>
            <select id="labDatePeriodFilter" class="cv-form-input" style="height:40px; width:auto; font-size:0.84rem; font-weight:600;">
              <option value="ALL" ${cbDatePeriodFilter === 'ALL' ? 'selected' : ''}>All Time</option>
              <option value="TODAY" ${cbDatePeriodFilter === 'TODAY' ? 'selected' : ''}>Today</option>
              <option value="WEEK" ${cbDatePeriodFilter === 'WEEK' ? 'selected' : ''}>This Week</option>
              <option value="MONTH" ${cbDatePeriodFilter === 'MONTH' ? 'selected' : ''}>This Month</option>
              <option value="YEAR" ${cbDatePeriodFilter === 'YEAR' ? 'selected' : ''}>This Year</option>
            </select>
          </div>
        </div>

        <div id="labCategoryMainContent"></div>
      </div>
    `;

    setupPatientSearchWidget('labPatientSearchInput', 'labPatientDropdown', (patient) => {
      activeBillingPatient = patient;
      labViewMode = 'auto';
      activeLabRecord = null;
      loadAndRenderPatientLabBilling(patient);
    });

    document.getElementById('labDatePeriodFilter')?.addEventListener('change', (e) => {
      cbDatePeriodFilter = e.target.value;
      if (activeBillingPatient) {
        activeLabRecord = null;
        loadAndRenderPatientLabBilling(activeBillingPatient);
      } else if (labViewMode === 'all') {
        renderLaboratoryAllLedgerTable();
      }
    });

    document.getElementById('btnToggleLabAllLedger')?.addEventListener('click', () => {
      labViewMode = (labViewMode === 'all') ? 'auto' : 'all';
      if (labViewMode === 'all') {
        renderLaboratoryAllLedgerTable();
      } else {
        if (activeBillingPatient) {
          loadAndRenderPatientLabBilling(activeBillingPatient);
        } else {
          renderLaboratoryCategoryView();
        }
      }
    });

    if (labViewMode === 'all') {
      renderLaboratoryAllLedgerTable();
    } else if (activeBillingPatient) {
      loadAndRenderPatientLabBilling(activeBillingPatient);
    } else {
      renderLaboratoryAllLedgerTable(true);
    }
  }

  async function loadAndRenderPatientLabBilling(patient) {
    const contentMount = document.getElementById('labCategoryMainContent');
    if (!contentMount) return;

    contentMount.innerHTML = `
      <div id="labBannerMount">
        ${renderCategoryPatientBanner(patient, () => {
          activeBillingPatient = null;
          activeLabRecord = null;
          renderLaboratoryCategoryView();
        }, true)}
      </div>
      <div id="labPatientRecordsArea">
        <div class="cv-spinner" style="margin:2rem auto;"></div>
        <p style="text-align:center; color:var(--cv-primary); font-weight:600; font-size:0.9rem;">Loading patient billing information...</p>
      </div>
    `;

    document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
      activeBillingPatient = null;
      activeLabRecord = null;
      renderLaboratoryCategoryView();
    });

    document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
      labViewMode = 'all';
      renderLaboratoryAllLedgerTable();
    });

    const recordsArea = document.getElementById('labPatientRecordsArea');

    try {
      const res = await Api.get(`/api/billing/laboratory/patient/${patient.id}`);
      const rawOrders = (res && res.success) ? res.data : [];
      const orders = filterRecordsByPeriod(rawOrders, 'orderDate', cbDatePeriodFilter);

      if (!orders || orders.length === 0) {
        recordsArea.innerHTML = `
          <div class="cv-alert" style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:1.25rem; border-radius:8px; display:flex; align-items:center; gap:0.75rem;">
            <svg style="width:24px; height:24px; flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <div style="font-weight:700; font-size:0.98rem;">No Laboratory billing records found.</div>
              <div style="font-size:0.84rem; color:#7f1d1d; margin-top:0.2rem;">Patient ${escapeHtml(patient.fullName)} (${escapeHtml(patient.uhid || 'No UHID')}) has no Laboratory billing records in MySQL${cbDatePeriodFilter !== 'ALL' ? ' for the selected date filter' : ''}.</div>
            </div>
          </div>
        `;
        return;
      }

      if (activeLabRecord) {
        activeLabRecord = orders.find(l => l.id === activeLabRecord.id) || orders[0];
      } else {
        activeLabRecord = orders[0];
      }

      // Auto-fill metadata if missing on patient
      if (activeLabRecord) {
        if (!patient.doctorName && activeLabRecord.doctorName) patient.doctorName = activeLabRecord.doctorName;
        if (!patient.department && activeLabRecord.department) patient.department = activeLabRecord.department;
        if (!patient.latestOpId && activeLabRecord.opId) patient.latestOpId = activeLabRecord.opId;
        if (!patient.latestIpId && activeLabRecord.ipId) patient.latestIpId = activeLabRecord.ipId;
        const bannerMount = document.getElementById('labBannerMount');
        if (bannerMount) {
          bannerMount.innerHTML = renderCategoryPatientBanner(patient, () => {
            activeBillingPatient = null;
            activeLabRecord = null;
            renderLaboratoryCategoryView();
          }, true);
          document.getElementById('btnCatChangePatient')?.addEventListener('click', () => {
            activeBillingPatient = null;
            activeLabRecord = null;
            renderLaboratoryCategoryView();
          });
          document.getElementById('btnCatViewAllLedger')?.addEventListener('click', () => {
            labViewMode = 'all';
            renderLaboratoryAllLedgerTable();
          });
        }
      }

      const l = activeLabRecord;
      const isPaid = (l.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const subtotal = l.subtotal || l.testPrice || 0;
      const discount = l.discountAmount || 0;
      const gst = l.gstAmount || 0;
      const total = l.totalAmount || (subtotal - discount + gst);
      const paid = l.paidAmount != null ? l.paidAmount : (isPaid ? total : 0);
      const bal = l.balanceAmount !== undefined ? l.balanceAmount : Math.max(0, total - paid);
      const payStatus = isPaid ? 'PAID' : (paid > 0 ? 'PARTIALLY PAID' : 'UNPAID');

      let selectorHtml = '';
      if (orders.length > 1) {
        selectorHtml = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.75rem 1rem; margin-bottom:1.25rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase; margin-bottom:0.5rem;">
              Laboratory Orders History (${orders.length} orders found) &bull; Select Bill Record:
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              ${orders.map((item, idx) => `
                <button type="button" class="cv-sub-tab-btn ${item.id === activeLabRecord.id ? 'active' : ''}" data-labid="${item.id}" style="font-size:0.8rem; padding:0.4rem 0.8rem;">
                  ${escapeHtml(item.orderNumber)} | ${escapeHtml(item.orderDate || '')} | ₹${formatCurrency(item.totalAmount || item.testPrice || 0)}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      }

      recordsArea.innerHTML = `
        ${selectorHtml}
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:1.4rem; box-shadow:var(--cv-shadow-xs);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem; margin-bottom:1.25rem;">
            <div>
              <span class="cv-badge-unpaid" style="background:#fef3c7; color:#92400e; padding:0.2rem 0.5rem; font-size:0.75rem; font-weight:700; margin-right:0.5rem;">LABORATORY ORDER</span>
              <strong style="font-size:1.15rem; color:#0f172a;">${escapeHtml(l.orderNumber)}</strong>
              ${l.opId || l.ipId ? `<span style="font-size:0.8rem; color:#64748b; margin-left:0.5rem;">(Ref: ${escapeHtml(l.opId || l.ipId)})</span>` : ''}
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paid > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
                ${escapeHtml(payStatus)}
              </span>
              <button type="button" class="cv-btn-secondary" id="btnViewLabOrderModal" style="padding:0.35rem 0.75rem; font-size:0.78rem;">
                View Order Details
              </button>
              <button type="button" class="cv-btn-primary" id="btnPrintLabBill" style="padding:0.35rem 0.85rem; font-size:0.78rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                PRINT BILL
              </button>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Bill Date (Order Date)</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(l.orderDate || '—')} ${escapeHtml(l.orderTime || (l.createdAt ? (typeof l.createdAt === 'string' && l.createdAt.includes('T') ? l.createdAt.split('T')[1].substring(0, 5) : '') : '') || '')}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Diagnostic Category</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(l.category || 'General')}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Doctor &amp; Department</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(l.doctorName || 'Doctor')} (${escapeHtml(l.department || 'General')})</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Lab Order ID</span>
              <span style="font-weight:700; font-family:monospace; color:var(--cv-primary);">${escapeHtml(l.orderNumber)}</span>
            </div>
            <div class="cv-calc-row" style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid #f1f5f9;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Invoice Number</span>
              <span style="font-weight:700; font-family:monospace; color:#0284c7;">${escapeHtml(l.invoiceNumber || activeBillingPatient?.existingInvoiceNumber || '—')}</span>
            </div>
          </div>

          <!-- Diagnostic Tests Table -->
          <div class="cv-bill-table-wrapper" style="margin-bottom:1.25rem;">
            <table class="cv-bill-table">
              <thead>
                <tr>
                  <th>Tests</th>
                  <th>Category</th>
                  <th>Order Reference</th>
                  <th style="text-align:right;">Test Price (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${escapeHtml(l.testName || 'Diagnostic Laboratory Test')}</strong></td>
                  <td>${escapeHtml(l.category || 'GENERAL')}</td>
                  <td><span style="font-family:monospace;">${escapeHtml(l.orderNumber)}</span></td>
                  <td style="text-align:right; font-weight:800; color:#0f172a;">₹${formatCurrency(subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bottom Financial Summary Row -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:0.75rem; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:0.9rem 1.1rem;">
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">Subtotal</div>
              <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">₹${formatCurrency(subtotal)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">Discount</div>
              <div style="font-size:1.1rem; font-weight:800; color:var(--cv-danger);">- ₹${formatCurrency(discount)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">GST (0%)</div>
              <div style="font-size:1.1rem; font-weight:800; color:#0369a1;">+ ₹${formatCurrency(gst)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">Total Amount</div>
              <div style="font-size:1.25rem; font-weight:800; color:#b45309;">₹${formatCurrency(total)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">Amount Paid</div>
              <div id="labSummaryPaid_${l.id}" style="font-size:1.1rem; font-weight:800; color:#059669;">₹${formatCurrency(paid)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">Balance</div>
              <div id="labSummaryBal_${l.id}" style="font-size:1.1rem; font-weight:800; color:${bal > 0 ? 'var(--cv-danger)' : '#059669'};">₹${formatCurrency(bal)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">Payment Status</div>
              <div><span id="labSummaryStatus_${l.id}" class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paid > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">${escapeHtml(payStatus)}</span></div>
            </div>
            <div>
              <div style="font-size:0.7rem; font-weight:700; color:#92400e; text-transform:uppercase;">Payment Method</div>
              <div id="labSummaryMethod_${l.id}" style="font-size:0.95rem; font-weight:700; color:#0f172a;">${escapeHtml(l.paymentMethod || 'CASH')}</div>
            </div>
          </div>

          <div id="labPaymentArea_${l.id}">
          ${bal > 0 ? `
            <div style="margin-top:0.85rem; padding:0.75rem 1rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.6rem;">
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span style="font-size:0.8rem; font-weight:700; color:#475569; text-transform:uppercase;">Outstanding Balance:</span>
                <span id="labAreaBal_${l.id}" style="font-size:1.05rem; font-weight:800; color:var(--cv-danger);">₹${formatCurrency(bal)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <label for="labAmountPaid_${l.id}" style="font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; white-space:nowrap;">Amount Paid</label>
                  <input type="number" id="labAmountPaid_${l.id}" class="cv-form-input" style="height:36px; width:125px; font-size:0.9rem; font-weight:700; background:#fff; text-align:right;" placeholder="0.00" value="${bal}" min="0.01" max="${bal}" step="any">
                </div>
                <select id="labPaymentMethod_${l.id}" class="cv-form-select" style="height:36px; width:115px; font-size:0.82rem; background:#fff;">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
                <button type="button" class="cv-btn-primary" id="btnLabSubmitPayment_${l.id}" style="height:36px; padding:0 1.1rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                  <svg style="width:15px; height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  Submit
                </button>
              </div>
            </div>
          ` : ''}
          </div>

        </div>
      `;

      recordsArea.querySelectorAll('[data-labid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const selId = Number(btn.getAttribute('data-labid'));
          activeLabRecord = orders.find(x => x.id === selId) || activeLabRecord;
          loadAndRenderPatientLabBilling(patient);
        });
      });

      if (bal > 0) {
        document.getElementById(`btnLabSubmitPayment_${l.id}`)?.addEventListener('click', async () => {
          const amtInput = document.getElementById(`labAmountPaid_${l.id}`);
          const amtVal = amtInput?.value;
          const mthVal = document.getElementById(`labPaymentMethod_${l.id}`)?.value || 'CASH';
          const btn = document.getElementById(`btnLabSubmitPayment_${l.id}`);

          if (amtVal === undefined || amtVal === null || String(amtVal).trim() === '') {
            showToast('Please enter a payment amount.', 'danger');
            return;
          }
          const numAmt = parseFloat(amtVal);
          if (isNaN(numAmt) || numAmt <= 0) {
            showToast('Payment amount must be greater than zero.', 'danger');
            return;
          }
          const curBal = (l.balanceAmount !== undefined ? l.balanceAmount : Math.max(0, total - paid));
          if (numAmt > curBal + 0.001) {
            showToast('Payment amount cannot exceed the outstanding balance.', 'danger');
            return;
          }

          const remBal = Math.max(0, parseFloat((curBal - numAmt).toFixed(2)));

          showPaymentConfirmationModal({
            title: 'Confirm Payment',
            billRef: 'Lab Order: ' + l.orderNumber,
            paymentAmount: numAmt,
            remainingBalance: remBal,
            moduleType: 'LABORATORY',
            printButtonLabel: 'Print Bill',
            onConfirm: async (showSuccessState) => {
              await executeBillPayment({
                moduleType: 'LABORATORY',
                billId: l.id,
                billNumber: l.orderNumber,
                amount: numAmt,
                balance: curBal,
                paymentMethod: mthVal,
                buttonEl: btn,
                onSuccess: async (data) => {
                  l.paidAmount = data.amountPaid;
                  l.balanceAmount = data.balanceAmount;
                  l.paymentStatus = data.paymentStatus;
                  l.paymentMethod = data.paymentMethod;
                  if (activeLabRecord && activeLabRecord.id === l.id) {
                    activeLabRecord.paidAmount = data.amountPaid;
                    activeLabRecord.balanceAmount = data.balanceAmount;
                    activeLabRecord.paymentStatus = data.paymentStatus;
                    activeLabRecord.paymentMethod = data.paymentMethod;
                  }
                  const isNowPaid = (data.balanceAmount <= 0);
                  const paidEl = document.getElementById(`labSummaryPaid_${l.id}`);
                  const balEl = document.getElementById(`labSummaryBal_${l.id}`);
                  const statusEl = document.getElementById(`labSummaryStatus_${l.id}`);
                  const methodEl = document.getElementById(`labSummaryMethod_${l.id}`);
                  const payArea = document.getElementById(`labPaymentArea_${l.id}`);
                  if (paidEl) paidEl.textContent = '₹' + formatCurrency(data.amountPaid);
                  if (balEl) {
                    balEl.textContent = '₹' + formatCurrency(data.balanceAmount);
                    balEl.style.color = isNowPaid ? '#059669' : 'var(--cv-danger)';
                  }
                  if (statusEl) {
                    statusEl.textContent = data.paymentStatus;
                    statusEl.className = 'cv-payment-balance-badge ' + (isNowPaid ? 'cv-badge-paid' : 'cv-badge-part');
                  }
                  if (methodEl) methodEl.textContent = data.paymentMethod;
                  if (payArea) {
                    if (isNowPaid) {
                      payArea.innerHTML = '';
                    } else {
                      if (amtInput) {
                        amtInput.value = data.balanceAmount.toFixed(2);
                        amtInput.max = data.balanceAmount.toFixed(2);
                      }
                      const areaBal = document.getElementById(`labAreaBal_${l.id}`);
                      if (areaBal) areaBal.textContent = '₹' + formatCurrency(data.balanceAmount);
                    }
                  }
                  await loadBillingSummaryData();
                  updateBillingKpiValues();

                  showSuccessState(data);
                }
              });
            },
            onPrint: () => {
              printDedicatedDocument(buildLabBillPrintHtml(patient, l));
            }
          });
        });
      }

      document.getElementById('btnViewLabOrderModal')?.addEventListener('click', () => {
        showLabOrderDetailsModal(l.id);
      });

      document.getElementById('btnPrintLabBill')?.addEventListener('click', () => {
        printDedicatedDocument(buildLabBillPrintHtml(patient, l));
      });

    } catch (e) {
      recordsArea.innerHTML = '<div class="cv-alert cv-alert-error">Unable to retrieve billing information.</div>';
    }
  }

  async function renderLaboratoryAllLedgerTable(isPrompt = false) {
    const mount = document.getElementById('labCategoryMainContent');
    if (!mount) return;

    mount.innerHTML = `
      ${isPrompt ? `
        <div style="padding:0.75rem 1rem; background:#f8fafc; border:1px dashed var(--cv-border); border-radius:6px; margin-bottom:1rem; font-size:0.84rem; color:var(--cv-text-muted); display:flex; align-items:center; gap:0.5rem;">
          <svg style="width:18px; height:18px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Search and select a patient above to automatically retrieve their Laboratory billing details, or review the complete hospital Laboratory ledger below:
        </div>
      ` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
        <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">All Hospital Diagnostic Orders</div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <input type="text" id="labFilterSearch" class="cv-form-input" style="height:34px; font-size:0.82rem; width:220px;" placeholder="Filter rows...">
          <select id="labFilterStatus" class="cv-form-select" style="height:34px; font-size:0.82rem; width:130px;">
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      <div class="cv-bill-table-wrapper">
        <table class="cv-bill-table" id="labBillingTable">
          <thead>
            <tr>
              <th>Lab Order ID</th>
              <th>Date</th>
              <th>Patient Name</th>
              <th>UHID</th>
              <th>OP / IP ID</th>
              <th>Tests &amp; Category</th>
              <th style="text-align:right;">Test Price</th>
              <th style="text-align:right;">Discount</th>
              <th style="text-align:right;">GST</th>
              <th style="text-align:right;">Total</th>
              <th style="text-align:right;">Paid</th>
              <th style="text-align:right;">Balance</th>
              <th>Method</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="labBillingTableBody">
            <tr><td colspan="15" style="text-align:center; padding:1.5rem;"><div class="cv-spinner"></div></td></tr>
          </tbody>
        </table>
      </div>
    `;

    try {
      const res = await Api.get('/api/billing/laboratory/history');
      const orders = (res && res.success) ? res.data : [];
      const filterInput = document.getElementById('labFilterSearch');
      const filterStatus = document.getElementById('labFilterStatus');
      const tableBody = document.getElementById('labBillingTableBody');

      function filterLabRows() {
        const q = filterInput?.value.toLowerCase().trim() || '';
        const st = filterStatus?.value.toUpperCase().trim() || '';
        const filtered = orders.filter(l => {
          const matchQ = !q ||
            (l.orderNumber && l.orderNumber.toLowerCase().includes(q)) ||
            (l.patientName && l.patientName.toLowerCase().includes(q)) ||
            (l.uhid && l.uhid.toLowerCase().includes(q)) ||
            (l.testName && l.testName.toLowerCase().includes(q)) ||
            (l.opId && l.opId.toLowerCase().includes(q)) ||
            (l.ipId && l.ipId.toLowerCase().includes(q));
          const matchSt = !st || (l.paymentStatus && l.paymentStatus.toUpperCase() === st);
          return matchQ && matchSt;
        });
        if (tableBody) tableBody.innerHTML = renderLaboratoryBillingRows(filtered);
      }

      filterInput?.addEventListener('input', filterLabRows);
      filterStatus?.addEventListener('change', filterLabRows);
      filterLabRows();

    } catch (e) {
      const tb = document.getElementById('labBillingTableBody');
      if (tb) tb.innerHTML = '<tr><td colspan="15" style="text-align:center; color:var(--cv-danger); padding:1rem;">Failed to load Laboratory history from MySQL.</td></tr>';
    }
  }

  function renderLaboratoryBillingRows(orders) {
    if (!orders || orders.length === 0) {
      return '<tr><td colspan="15" style="text-align:center; padding:1.75rem; color:var(--cv-text-muted);">No Laboratory bills found in MySQL.</td></tr>';
    }
    return orders.map(l => {
      const isPaid = (l.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const subtotal = l.subtotal || l.testPrice || 0;
      const total = l.totalAmount || subtotal;
      const paid = l.paidAmount || (isPaid ? total : 0);
      const bal = l.balanceAmount !== undefined ? l.balanceAmount : Math.max(0, total - paid);

      return `
        <tr>
          <td><strong>${escapeHtml(l.orderNumber)}</strong></td>
          <td>${escapeHtml(l.orderDate || '')}</td>
          <td><strong>${escapeHtml(l.patientName || l.patient?.fullName || 'Walk-in')}</strong></td>
          <td><span style="font-family:monospace; font-size:0.8rem;">${escapeHtml(l.uhid || '—')}</span></td>
          <td>${escapeHtml(l.opId || l.ipId || '—')}</td>
          <td>${escapeHtml(l.testName || 'Diagnostics')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(l.category || 'General')}</span></td>
          <td style="text-align:right;">₹${formatCurrency(subtotal)}</td>
          <td style="text-align:right; color:var(--cv-danger);">- ₹${formatCurrency(l.discountAmount || 0)}</td>
          <td style="text-align:right; color:#0369a1;">+ ₹${formatCurrency(l.gstAmount || 0)}</td>
          <td style="text-align:right; font-weight:700;">₹${formatCurrency(total)}</td>
          <td style="text-align:right; color:#059669; font-weight:600;">₹${formatCurrency(paid)}</td>
          <td style="text-align:right; color:${bal > 0 ? 'var(--cv-danger)' : '#059669'}; font-weight:700;">₹${formatCurrency(bal)}</td>
          <td><span class="cv-badge-unpaid" style="background:#f1f5f9; color:#475569; padding:0.15rem 0.4rem; font-size:0.75rem;">${escapeHtml(l.paymentMethod || 'CASH')}</span></td>
          <td>
            <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : (paid > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
              ${escapeHtml(l.paymentStatus || 'PAID')}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:0.3rem;">
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.selectPatientForLabCategory(${l.patient?.id})">Auto-Fill</button>
              <button class="cv-btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="AdminModule.showLabOrderDetailsModal(${l.id})">Details</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Helper bindings for auto-fill buttons from ledger rows
  function selectPatientForCategory(patientId, category) {
    if (!patientId) return;
    Api.get('/api/billing/patients/search?q=').then(res => {
      if (res && res.success && res.data) {
        const p = res.data.find(x => String(x.id) === String(patientId));
        if (p) {
          activeBillingPatient = p;
          billingCategoryTab = category;
          renderSection1Billing();
        }
      }
    });
  }

  // ==========================================================
  // SECTION 2 — MAIN BILLING (ONE OVERALL CONSOLIDATED VIEW)
  // ==========================================================
  function renderSection2MainBilling() {
    const mount = document.getElementById('centralBillingSectionContent');
    if (!mount) return;

    mount.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Sub View Toggle: Consolidated Bill vs Central Bills History -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
          <div class="cv-sub-nav-tabs">
            <button type="button" class="cv-sub-tab-btn ${mainBillingSubView === 'new' ? 'active' : ''}" id="btnSubViewNew">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              Consolidated Billing Summary
            </button>
            <button type="button" class="cv-sub-tab-btn ${mainBillingSubView === 'history' ? 'active' : ''}" id="btnSubViewHistory">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Central Bills &amp; Invoice History
            </button>
          </div>

          <div style="display:flex; gap:0.5rem;">
            ${mainBillingSubView === 'new' && activeBillingPatient ? `
              <button type="button" class="cv-btn-secondary" id="btnCbRefreshCharges" style="padding:0.45rem 0.85rem; font-size:0.8rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Refresh Patient Charges
              </button>
            ` : ''}
          </div>
        </div>

        <div id="mainBillingSubViewMount"></div>
      </div>
    `;

    document.getElementById('btnSubViewNew')?.addEventListener('click', () => {
      mainBillingSubView = 'new';
      renderSection2MainBilling();
    });

    document.getElementById('btnSubViewHistory')?.addEventListener('click', () => {
      mainBillingSubView = 'history';
      renderSection2MainBilling();
    });

    document.getElementById('btnCbRefreshCharges')?.addEventListener('click', () => {
      if (activeBillingPatient) fetchCbConsolidatedCharges(activeBillingPatient.id);
    });

    if (mainBillingSubView === 'new') {
      renderMainBillingCreateView();
    } else {
      renderMainBillingHistoryView();
    }
  }

  function renderMainBillingCreateView() {
    const mount = document.getElementById('mainBillingSubViewMount');
    if (!mount) return;

    mount.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- 1. Patient Search Card -->
        <div class="cv-pharmacy-card">
          <div class="cv-pharmacy-card-header">
            <div class="cv-pharmacy-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Patient Search &amp; Auto-fill
            </div>
            <div style="font-size:0.75rem; color:var(--cv-text-muted);">Search by Patient Name, UHID, OP ID, IP ID, or Phone Number</div>
          </div>

          <div style="position:relative; margin-bottom:1rem;">
            <div style="display:flex; align-items:center; position:relative;">
              <svg style="position:absolute; left:12px; width:18px; height:18px; color:var(--cv-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" id="cbPatientSearchInput" class="cv-form-input" style="padding-left:2.5rem; height:42px; font-size:0.9rem;" placeholder="Search patient by Name, UHID, OP-ID, IP-ID, or Mobile number..." autocomplete="off">
            </div>
            <div id="cbPatientDropdown" class="cv-patient-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid var(--cv-border); border-radius:var(--cv-radius-md); box-shadow:var(--cv-shadow-lg); z-index:50; max-height:260px; overflow-y:auto;"></div>
          </div>

          <!-- Patient Autofill Display Container -->
          <div id="cbPatientAutofillContainer">
            ${activeBillingPatient ? renderCbPatientDetailsCard(activeBillingPatient) : `
              <div style="padding:1.5rem; text-align:center; color:var(--cv-text-muted); font-size:0.85rem; background:#f8fafc; border:1px dashed var(--cv-border); border-radius:var(--cv-radius-md);">
                No patient selected. Type in the search box above to retrieve a patient's consolidated hospital billing summary.
              </div>
            `}
          </div>
        </div>

        <!-- 2. ONE OVERALL CONSOLIDATED BILLING VIEW (Card per Section 8 Layout) -->
        <div id="cbConsolidatedViewContainer" style="${activeBillingPatient ? 'display:flex;' : 'display:none;'} flex-direction:column; gap:1.25rem;">
          <div id="cbConsolidatedContentMount">
            <div class="cv-spinner" style="margin:2rem auto;"></div>
            <p style="text-align:center; color:var(--cv-primary); font-weight:600; font-size:0.9rem;">Loading patient billing information...</p>
          </div>
        </div>
      </div>
    `;

    setupPatientSearchWidget('cbPatientSearchInput', 'cbPatientDropdown', (pat) => {
      activeBillingPatient = pat;
      renderMainBillingCreateView();
    });

    if (activeBillingPatient) {
      fetchCbConsolidatedCharges(activeBillingPatient.id);
    }
  }

  function renderCbPatientDetailsCard(p) {
    return `
      <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:1.15rem 1.4rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:0.6rem; margin-bottom:0.85rem;">
          <div style="font-size:0.85rem; font-weight:800; color:var(--cv-primary); text-transform:uppercase; letter-spacing:0.04em;">
            PATIENT DETAILS
          </div>
          <button type="button" class="cv-btn-secondary" id="btnCbClearPatient" style="padding:0.3rem 0.7rem; font-size:0.75rem;">
            Change Patient
          </button>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">Patient Name</div>
            <div style="font-weight:800; font-size:1rem; color:#0f172a;">${escapeHtml(p.fullName)}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">UHID</div>
            <div style="font-weight:800; font-size:1rem; font-family:monospace; color:var(--cv-primary);">${escapeHtml(p.uhid || '—')}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">OP ID</div>
            <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">${escapeHtml(cbConsolidatedData.opId || p.latestOpId || '—')}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">IP ID</div>
            <div style="font-weight:700; font-size:0.95rem; color:#0f172a;">${escapeHtml(cbConsolidatedData.ipId || p.latestIpId || '—')}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">Phone Number</div>
            <div style="font-weight:600; font-size:0.92rem; color:#0f172a;">${escapeHtml(p.phone || '—')}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">Doctor</div>
            <div style="font-weight:600; font-size:0.92rem; color:#0f172a;">${escapeHtml(cbConsolidatedData.doctorName || p.doctorName || 'Attending Doctor')}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">Department</div>
            <div style="font-weight:600; font-size:0.92rem; color:#0f172a;">${escapeHtml(cbConsolidatedData.department || p.department || 'General')}</div>
          </div>
        </div>
      </div>
    `;
  }

  async function fetchCbConsolidatedCharges(patientId) {
    const mount = document.getElementById('cbConsolidatedContentMount');
    if (mount) {
      mount.innerHTML = `
        <div class="cv-spinner" style="margin:2rem auto;"></div>
        <p style="text-align:center; color:var(--cv-primary); font-weight:600; font-size:0.9rem;">Loading patient billing information...</p>
      `;
    }

    try {
      const res = await Api.get(`/api/billing/central/consolidated/${patientId}`);
      if (res && res.success) {
        cbConsolidatedData = res.data;
        renderMainBillingConsolidatedCard();
      } else {
        if (mount) mount.innerHTML = '<div class="cv-alert cv-alert-error">Failed to retrieve consolidated billing records from MySQL.</div>';
      }
    } catch (e) {
      if (mount) mount.innerHTML = '<div class="cv-alert cv-alert-error">Server connection error loading charges.</div>';
    }
  }

  // Renders ONE OVERALL CONSOLIDATED BILLING VIEW (Section 8 Layout)
  function renderMainBillingConsolidatedCard() {
    const mount = document.getElementById('cbConsolidatedContentMount');
    if (!mount) return;

    // Refresh Patient card with updated metadata from consolidated endpoint
    const pContainer = document.getElementById('cbPatientAutofillContainer');
    if (pContainer && activeBillingPatient) {
      pContainer.innerHTML = renderCbPatientDetailsCard(activeBillingPatient);
      document.getElementById('btnCbClearPatient')?.addEventListener('click', () => {
        activeBillingPatient = null;
        cbConsolidatedData = { opCharges: [], ipCharges: [], pharmacyCharges: [], labCharges: [], opSubtotal: 0, ipSubtotal: 0, pharmacySubtotal: 0, labSubtotal: 0, overallSubtotal: 0 };
        renderMainBillingCreateView();
      });
    }

    const opSub = cbConsolidatedData.opSubtotal || 0;
    const ipSub = cbConsolidatedData.ipSubtotal || 0;
    const phSub = cbConsolidatedData.pharmacySubtotal || 0;
    const labSub = cbConsolidatedData.labSubtotal || 0;
    const otherSub = 0; // Configured other charges
    const overallSubtotal = opSub + ipSub + phSub + labSub + otherSub;
    cbConsolidatedData.overallSubtotal = overallSubtotal;

    const allItems = [
      ...(cbConsolidatedData.opCharges || []),
      ...(cbConsolidatedData.ipCharges || []),
      ...(cbConsolidatedData.pharmacyCharges || []),
      ...(cbConsolidatedData.labCharges || [])
    ];

    const hasExistingInvoice = !!cbConsolidatedData.existingInvoiceNumber;
    const invoiceNumDisplay = cbConsolidatedData.existingInvoiceNumber || 'Not yet issued (Click \'Generate Consolidated Bill &amp; Invoice\' below)';

    mount.innerHTML = `
      <div class="cv-pharmacy-card" style="background:#ffffff; border:2px solid var(--cv-primary-border); box-shadow:var(--cv-shadow-md);">
        
        <!-- CARD HEADER -->
        <div class="cv-pharmacy-card-header" style="border-bottom:1px solid var(--cv-border); padding-bottom:0.75rem;">
          <div class="cv-pharmacy-card-title">
            <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            OVERALL CHARGES &amp; SETTLEMENT
          </div>
          <div style="font-size:0.75rem; font-weight:700; color:var(--cv-primary); text-transform:uppercase; letter-spacing:0.03em;">
            CareVista Centralized Billing Ledger
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:2rem; padding:1.25rem 0.5rem 0.5rem 0.5rem;">
          
          <!-- LEFT COLUMN: OVERALL CHARGES & CALCULATION (Exact Layout) -->
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            
            <div style="font-size:0.8rem; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.25rem;">
              OVERALL CHARGES
            </div>

            <!-- OP Charges -->
            <div class="cv-calc-row">
              <span style="font-weight:600; color:var(--cv-text-secondary); display:flex; align-items:center; gap:0.4rem;">
                <span class="cv-badge-unpaid" style="background:#e0e7ff; color:#3730a3; padding:0.1rem 0.35rem; font-size:0.7rem; font-weight:700;">OP</span>
                OP Charges
              </span>
              <strong style="color:#0f172a; font-size:1.05rem;">₹${formatCurrency(opSub)}</strong>
            </div>

            <!-- IP Charges -->
            <div class="cv-calc-row">
              <span style="font-weight:600; color:var(--cv-text-secondary); display:flex; align-items:center; gap:0.4rem;">
                <span class="cv-badge-unpaid" style="background:#fce7f3; color:#9d174d; padding:0.1rem 0.35rem; font-size:0.7rem; font-weight:700;">IP</span>
                IP Charges
              </span>
              <strong style="color:#0f172a; font-size:1.05rem;">₹${formatCurrency(ipSub)}</strong>
            </div>

            <!-- Pharmacy Charges -->
            <div class="cv-calc-row">
              <span style="font-weight:600; color:var(--cv-text-secondary); display:flex; align-items:center; gap:0.4rem;">
                <span class="cv-badge-unpaid" style="background:#dcfce7; color:#166534; padding:0.1rem 0.35rem; font-size:0.7rem; font-weight:700;">PHARM</span>
                Pharmacy Charges
              </span>
              <strong style="color:#0f172a; font-size:1.05rem;">₹${formatCurrency(phSub)}</strong>
            </div>

            <!-- Laboratory Charges -->
            <div class="cv-calc-row">
              <span style="font-weight:600; color:var(--cv-text-secondary); display:flex; align-items:center; gap:0.4rem;">
                <span class="cv-badge-unpaid" style="background:#fef3c7; color:#92400e; padding:0.1rem 0.35rem; font-size:0.7rem; font-weight:700;">LAB</span>
                Laboratory Charges
              </span>
              <strong style="color:#0f172a; font-size:1.05rem;">₹${formatCurrency(labSub)}</strong>
            </div>

            <!-- Other Charges -->
            <div class="cv-calc-row">
              <span style="font-weight:600; color:var(--cv-text-secondary);">Other Charges</span>
              <strong style="color:var(--cv-text-muted); font-size:1.05rem;">₹${formatCurrency(otherSub)}</strong>
            </div>

            <div style="border-top:2px solid #e2e8f0; margin:0.4rem 0;"></div>

            <!-- OVERALL SUBTOTAL -->
            <div class="cv-calc-row">
              <span style="font-weight:700; color:#0f172a; font-size:1rem;">OVERALL SUBTOTAL</span>
              <span id="cbOverallSubtotal" style="font-weight:800; font-size:1.25rem; color:#0f172a;">₹${formatCurrency(overallSubtotal)}</span>
            </div>

            <!-- Overall Discount -->
            <div class="cv-calc-row">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-weight:600; color:var(--cv-text-secondary);">Overall Discount %</span>
                <input type="number" id="cbOverallDiscountPct" class="cv-calc-input" min="0" max="100" step="0.5" value="0" style="width:65px; height:32px;">
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:0.75rem; color:var(--cv-text-muted);">Amount:</span>
                <span id="cbOverallDiscountAmt" style="font-weight:700; color:var(--cv-danger); font-size:1rem;">- ₹0.00</span>
              </div>
            </div>

            <!-- Net Amount -->
            <div class="cv-calc-row">
              <span style="font-weight:600; color:var(--cv-text-secondary);">Net Amount</span>
              <span id="cbOverallNetAmt" style="font-weight:700; font-size:1.05rem; color:#0f172a;">₹${formatCurrency(overallSubtotal)}</span>
            </div>

            <!-- GSTIN & GST -->
            <div class="cv-calc-row" style="align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <span style="font-size:0.68rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">GSTIN</span>
                <input type="text" id="cbOverallGstNumber" class="cv-form-input" style="height:32px; font-size:0.78rem; font-family:monospace; text-transform:uppercase; width:150px;" placeholder="29ABCDE1234F1Z5">
              </div>
              <div style="display:flex; align-items:center; gap:0.4rem; margin-left:auto;">
                <span style="font-weight:600; color:var(--cv-text-secondary); font-size:0.85rem;">GST %:</span>
                <input type="number" id="cbOverallGstPct" class="cv-calc-input" min="0" max="28" step="0.5" value="0" style="width:55px; height:32px;">
                <span id="cbOverallGstAmt" style="font-weight:700; color:#0369a1; font-size:0.95rem; margin-left:0.4rem;">+ ₹0.00</span>
              </div>
            </div>

            <div style="border-top:2px solid #e2e8f0; margin:0.4rem 0;"></div>

            <!-- FINAL TOTAL -->
            <div class="cv-calc-row final-total" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:0.75rem 1rem;">
              <span style="font-size:1.1rem; font-weight:800; color:#1e3a8a;">FINAL TOTAL</span>
              <span id="cbOverallFinalTotal" style="color:var(--cv-primary); font-size:1.55rem; font-weight:800;">₹${formatCurrency(overallSubtotal)}</span>
            </div>
          </div>

          <!-- RIGHT COLUMN: SETTLEMENT, INVOICE NUMBER & ACTIONS (Exact Layout) -->
          <div style="display:flex; flex-direction:column; gap:0.85rem;">
            
            <div style="font-size:0.8rem; font-weight:800; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.25rem;">
              SETTLEMENT &amp; INVOICE
            </div>

            ${(hasExistingInvoice && (cbConsolidatedData.existingAmountPaid || 0) > 0) ? `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; background:#f1f5f9; padding:0.4rem 0.6rem; border-radius:4px; margin-bottom:0.25rem;">
                <span style="font-weight:600; color:#475569;">Previously Paid:</span>
                <span id="cbDisplayPreviouslyPaid" style="font-weight:700; color:#059669;">₹${formatCurrency(cbConsolidatedData.existingAmountPaid)}</span>
              </div>
            ` : ''}

            <!-- Amount Paid & Pay Full -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">AMOUNT PAID (₹) *</label>
                <button type="button" id="btnCbPayFullAmount" style="background:none; border:none; color:var(--cv-primary); font-size:0.75rem; font-weight:700; cursor:pointer; text-decoration:underline;">Pay Full</button>
              </div>
              <input type="number" id="cbOverallPaidAmount" class="cv-form-input" min="0" step="0.01" value="${hasExistingInvoice ? (cbConsolidatedData.existingBalance || 0).toFixed(2) : '0.00'}" style="height:44px; font-weight:800; font-size:1.2rem; text-align:right;">
            </div>

            <!-- Balance Due & Payment Status -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
              <div style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid var(--cv-border);">
                <div style="font-size:0.7rem; color:var(--cv-text-muted); font-weight:700; text-transform:uppercase;">Outstanding Balance</div>
                <div id="cbOverallBalanceAmt" style="font-size:1.25rem; font-weight:800; color:${(hasExistingInvoice ? (cbConsolidatedData.existingBalance || 0) : overallSubtotal) > 0 ? 'var(--cv-danger)' : '#059669'}; margin-top:0.2rem;">₹${formatCurrency(hasExistingInvoice ? (cbConsolidatedData.existingBalance || 0) : overallSubtotal)}</div>
              </div>

              <div style="background:#f8fafc; padding:0.6rem 0.8rem; border-radius:6px; border:1px solid var(--cv-border); display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:0.7rem; color:var(--cv-text-muted); font-weight:700; text-transform:uppercase; margin-bottom:0.3rem;">Payment Status</div>
                <div>
                  <span id="cbOverallStatusBadge" class="cv-payment-balance-badge ${hasExistingInvoice && (cbConsolidatedData.existingBalance || 0) <= 0 ? 'cv-badge-paid' : ((cbConsolidatedData.existingAmountPaid || 0) > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}" style="font-size:0.75rem; padding:0.2rem 0.5rem;">${hasExistingInvoice ? (cbConsolidatedData.existingPaymentStatus || 'UNPAID') : 'UNPAID'}</span>
                </div>
              </div>
            </div>

            <!-- Payment Method -->
            <div>
              <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">PAYMENT METHOD</label>
              <select id="cbOverallPaymentMethod" class="cv-form-select" style="height:40px; font-size:0.88rem;">
                <option value="CASH">Cash</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="INSURANCE">TPA / Insurance</option>
              </select>
            </div>

            <!-- Settlement Remarks -->
            <div>
              <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">SETTLEMENT NOTES / REMARKS</label>
              <input type="text" id="cbOverallNotes" class="cv-form-input" style="height:38px; font-size:0.84rem;" placeholder="Consolidated central billing notes...">
            </div>

            <div style="border-top:2px solid #e2e8f0; margin:0.4rem 0;"></div>

            <!-- INVOICE NUMBER SECTION -->
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.75rem 1rem;">
              <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">INVOICE NUMBER</div>
              <div style="margin-top:0.25rem; font-size:1.05rem;">
                <strong id="cbDisplayInvoiceNumber" style="font-family:monospace; color:var(--cv-primary);">${invoiceNumDisplay}</strong>
              </div>
            </div>

            <!-- INVOICE BUTTONS & ACTION -->
            <div style="display:flex; gap:0.6rem; margin-top:0.4rem;">
              <button type="button" class="cv-btn-secondary" id="btnCbViewInvoice" style="flex:1; height:42px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; gap:0.35rem;" ${!hasExistingInvoice ? 'title="Generate bill first to issue an invoice"' : ''}>
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                VIEW INVOICE
              </button>
              <button type="button" class="cv-btn-secondary" id="btnCbPrintInvoice" style="flex:1; height:42px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; gap:0.35rem;" ${!hasExistingInvoice ? 'title="Generate bill first to print"' : ''}>
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                PRINT INVOICE
              </button>
            </div>

            <!-- SUBMIT BUTTON -->
            <button type="button" class="cv-btn-primary" id="btnCbSubmitBill" style="width:100%; height:46px; font-weight:800; font-size:0.95rem; display:inline-flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:0.25rem;">
              <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Submit
            </button>
          </div>
        </div>

        <!-- EXPANDABLE SERVICE BREAKDOWN ACCORDION (Ensures Requirement 10: Dates/Times preserved!) -->
        <div style="border-top:1px solid #e2e8f0; padding:0.85rem 1rem; margin-top:1.25rem; background:#f8fafc; border-radius:0 0 var(--cv-radius-md) var(--cv-radius-md);">
          <details>
            <summary style="cursor:pointer; font-size:0.85rem; font-weight:700; color:var(--cv-primary); user-select:none; display:flex; align-items:center; gap:0.4rem;">
              <span>+ View Detailed Service Breakdown &amp; Original Transaction Dates (${allItems.length} records combined)</span>
            </summary>
            <div style="margin-top:0.75rem;">
              <table class="cv-bill-table" style="font-size:0.82rem; margin-bottom:0;">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Reference ID</th>
                    <th>Particulars &amp; Description</th>
                    <th>Transaction Date</th>
                    <th>Status</th>
                    <th style="text-align:right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${allItems.length > 0 ? allItems.map(it => `
                    <tr>
                      <td><span class="cv-badge-unpaid" style="font-size:0.7rem; font-weight:700;">${escapeHtml(it.category || 'SERVICE')}</span></td>
                      <td><strong>${escapeHtml(it.sourceId || '—')}</strong></td>
                      <td>${escapeHtml(it.description || '')}</td>
                      <td>${escapeHtml(it.date || '')} ${escapeHtml(it.time || '')}</td>
                      <td><span class="cv-payment-balance-badge cv-badge-paid">${escapeHtml(it.status || 'PAID')}</span></td>
                      <td style="text-align:right; font-weight:700;">₹${formatCurrency(it.amount)}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="6" style="text-align:center; padding:0.75rem; color:var(--cv-text-muted);">No billable charge particulars found.</td></tr>'}
                </tbody>
              </table>
            </div>
          </details>
        </div>

      </div>
    `;

    // Calculation event listeners
    ['cbOverallDiscountPct', 'cbOverallGstPct', 'cbOverallPaidAmount'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', calculateCbTotals);
    });

    document.getElementById('btnCbPayFullAmount')?.addEventListener('click', () => {
      let curOutstanding = 0;
      if (cbConsolidatedData.existingBillId && cbConsolidatedData.existingBalance != null) {
        curOutstanding = parseFloat(cbConsolidatedData.existingBalance) || 0;
      } else {
        const finalTotalStr = document.getElementById('cbOverallFinalTotal')?.innerText.replace(/[^0-9.-]+/g, "") || "0";
        curOutstanding = parseFloat(finalTotalStr) || 0;
      }
      const paidInput = document.getElementById('cbOverallPaidAmount');
      if (paidInput) {
        paidInput.value = curOutstanding.toFixed(2);
        calculateCbTotals();
      }
    });

    // View Invoice Button
    document.getElementById('btnCbViewInvoice')?.addEventListener('click', async () => {
      if (cbConsolidatedData.existingBillId) {
        showCentralInvoiceModal(cbConsolidatedData.existingBillId);
      } else if (activeBillingPatient && (cbConsolidatedData.overallSubtotal || 0) > 0) {
        await handleGenerateCentralBill(false);
      } else {
        alert("No invoice generated yet for this patient. Click 'Submit' first.");
      }
    });

    // Print Invoice Button
    document.getElementById('btnCbPrintInvoice')?.addEventListener('click', async () => {
      if (cbConsolidatedData.existingBillId) {
        printDedicatedCentralInvoice(cbConsolidatedData.existingBillId);
      } else if (activeBillingPatient && (cbConsolidatedData.overallSubtotal || 0) > 0) {
        await handleGenerateCentralBill(true);
      } else {
        alert("No invoice generated yet for this patient. Click 'Submit' first.");
      }
    });

    // Submit Central Bill Button
    document.getElementById('btnCbSubmitBill')?.addEventListener('click', handleGenerateCentralBill);

    calculateCbTotals();
  }

  function calculateCbTotals() {
    const subtotal = cbConsolidatedData.overallSubtotal || 0;

    let discountPct = parseFloat(document.getElementById('cbOverallDiscountPct')?.value) || 0;
    if (discountPct < 0) discountPct = 0;
    if (discountPct > 100) discountPct = 100;

    const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
    const discountEl = document.getElementById('cbOverallDiscountAmt');
    if (discountEl) discountEl.innerText = '- ₹' + formatCurrency(discountAmount);

    const netAmount = Math.max(0, subtotal - discountAmount);
    const netEl = document.getElementById('cbOverallNetAmt');
    if (netEl) netEl.innerText = '₹' + formatCurrency(netAmount);

    let gstPct = parseFloat(document.getElementById('cbOverallGstPct')?.value) || 0;
    if (gstPct < 0) gstPct = 0;
    if (gstPct > 28) gstPct = 28;

    const gstAmount = parseFloat(((netAmount * gstPct) / 100).toFixed(2));
    const gstEl = document.getElementById('cbOverallGstAmt');
    if (gstEl) gstEl.innerText = '+ ₹' + formatCurrency(gstAmount);

    const finalTotal = parseFloat((netAmount + gstAmount).toFixed(2));
    const totalEl = document.getElementById('cbOverallFinalTotal');
    if (totalEl) totalEl.innerText = '₹' + formatCurrency(finalTotal);

    let payingAmount = parseFloat(document.getElementById('cbOverallPaidAmount')?.value) || 0;
    if (payingAmount < 0) payingAmount = 0;

    let balance = 0;
    let prevPaid = 0;
    if (cbConsolidatedData.existingBillId) {
      prevPaid = parseFloat(cbConsolidatedData.existingAmountPaid) || 0;
      const currentOutstanding = (cbConsolidatedData.existingBalance != null)
        ? parseFloat(cbConsolidatedData.existingBalance) : Math.max(0, finalTotal - prevPaid);
      balance = parseFloat(Math.max(0, currentOutstanding - payingAmount).toFixed(2));
    } else {
      balance = parseFloat(Math.max(0, finalTotal - payingAmount).toFixed(2));
    }

    const balEl = document.getElementById('cbOverallBalanceAmt');
    if (balEl) {
      balEl.innerText = '₹' + formatCurrency(balance);
      balEl.style.color = (balance === 0 && (finalTotal > 0 || prevPaid > 0)) ? '#059669' : ((prevPaid + payingAmount) > 0 ? '#d97706' : 'var(--cv-danger)');
    }

    const totalPaidCumulative = prevPaid + payingAmount;
    const statusBadge = document.getElementById('cbOverallStatusBadge');
    if (statusBadge) {
      statusBadge.classList.remove('cv-badge-unpaid', 'cv-badge-part', 'cv-badge-paid');
      if (balance === 0 && (finalTotal > 0 || totalPaidCumulative > 0)) {
        statusBadge.textContent = 'PAID';
        statusBadge.classList.add('cv-badge-paid');
      } else if (totalPaidCumulative > 0) {
        statusBadge.textContent = 'PARTIALLY PAID';
        statusBadge.classList.add('cv-badge-part');
      } else {
        statusBadge.textContent = 'UNPAID';
        statusBadge.classList.add('cv-badge-unpaid');
      }
    }
  }

  async function handleGenerateCentralBill(isPrintAfter = false) {
    if (!activeBillingPatient) {
      showToast('Please search and select a patient first.', 'danger');
      return;
    }

    const submitBtn = document.getElementById('btnCbSubmitBill');
    if (submitBtn && (submitBtn.disabled || submitBtn.dataset.processing === 'true')) {
      return;
    }

    const paymentMethod = document.getElementById('cbOverallPaymentMethod')?.value || 'CASH';
    const notes = document.getElementById('cbOverallNotes')?.value.trim() || '';
    const amountPaidStr = document.getElementById('cbOverallPaidAmount')?.value;

    // CASE A: EXISTING BILL / INVOICE ALREADY EXISTS -> PROCESS PAYMENT ON EXISTING BILL
    if (cbConsolidatedData.existingBillId) {
      if (amountPaidStr === undefined || amountPaidStr === null || String(amountPaidStr).trim() === '') {
        showToast('Please enter a payment amount.', 'danger');
        return;
      }
      const numAmt = parseFloat(amountPaidStr);
      if (isNaN(numAmt) || numAmt <= 0) {
        showToast('Payment amount must be greater than zero.', 'danger');
        return;
      }
      const curBal = (cbConsolidatedData.existingBalance != null)
        ? parseFloat(cbConsolidatedData.existingBalance) : 0;
      if (curBal <= 0) {
        showToast('This invoice is already fully paid.', 'info');
        return;
      }
      if (numAmt > curBal + 0.001) {
        showToast('Payment amount cannot exceed the outstanding balance.', 'danger');
        return;
      }

      const remBal = Math.max(0, parseFloat((curBal - numAmt).toFixed(2)));

      showPaymentConfirmationModal({
        title: 'Confirm Payment',
        billRef: 'Invoice: ' + (cbConsolidatedData.existingInvoiceNumber || cbConsolidatedData.existingBillNumber),
        paymentAmount: numAmt,
        remainingBalance: remBal,
        moduleType: 'MAIN',
        printButtonLabel: 'Print Invoice',
        onConfirm: async (showSuccessState) => {
          await executeBillPayment({
            moduleType: 'CENTRAL',
            billId: cbConsolidatedData.existingBillId,
            billNumber: cbConsolidatedData.existingInvoiceNumber || cbConsolidatedData.existingBillNumber,
            amount: numAmt,
            balance: curBal,
            paymentMethod: paymentMethod,
            notes: notes,
            buttonEl: submitBtn,
            onSuccess: async (data) => {
              cbConsolidatedData.existingAmountPaid = data.amountPaid;
              cbConsolidatedData.existingBalance = data.balanceAmount;
              cbConsolidatedData.existingPaymentStatus = data.paymentStatus;
              cbConsolidatedData.existingPaymentMethod = data.paymentMethod;

              const isNowPaid = (data.balanceAmount <= 0);

              // Update UI immediately without refresh
              const prevPaidEl = document.getElementById('cbDisplayPreviouslyPaid');
              if (prevPaidEl) prevPaidEl.textContent = '₹' + formatCurrency(data.amountPaid);

              const balEl = document.getElementById('cbOverallBalanceAmt');
              if (balEl) {
                balEl.innerText = '₹' + formatCurrency(data.balanceAmount);
                balEl.style.color = isNowPaid ? '#059669' : 'var(--cv-danger)';
              }

              const statusBadge = document.getElementById('cbOverallStatusBadge');
              if (statusBadge) {
                statusBadge.classList.remove('cv-badge-unpaid', 'cv-badge-part', 'cv-badge-paid');
                statusBadge.textContent = data.paymentStatus;
                statusBadge.classList.add(isNowPaid ? 'cv-badge-paid' : 'cv-badge-part');
              }

              const paidInput = document.getElementById('cbOverallPaidAmount');
              if (paidInput) {
                if (isNowPaid) {
                  paidInput.value = '0.00';
                  paidInput.disabled = true;
                } else {
                  paidInput.value = data.balanceAmount.toFixed(2);
                  paidInput.max = data.balanceAmount.toFixed(2);
                }
              }

              if (isNowPaid && submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Fully Paid (PAID)';
              }

              await loadBillingSummaryData();
              updateBillingKpiValues();

              showSuccessState(data);
            }
          });
        },
        onPrint: () => {
          printDedicatedCentralInvoice(cbConsolidatedData.existingBillId);
        }
      });
      return;
    }

    // CASE B: FIRST TIME GENERATING CENTRAL BILL
    const subtotal = cbConsolidatedData.overallSubtotal || 0;
    if (subtotal <= 0) {
      showToast('No billable charges exist for this patient across OP, IP, Pharmacy, or Laboratory.', 'danger');
      return;
    }

    const discountPct = parseFloat(document.getElementById('cbOverallDiscountPct')?.value) || 0;
    const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
    const netAmount = Math.max(0, subtotal - discountAmount);
    const gstPct = parseFloat(document.getElementById('cbOverallGstPct')?.value) || 0;
    const gstAmount = parseFloat(((netAmount * gstPct) / 100).toFixed(2));
    const finalTotal = parseFloat((netAmount + gstAmount).toFixed(2));
    const amountPaid = parseFloat(amountPaidStr) || 0;

    if (amountPaid > finalTotal + 0.001) {
      showToast('Payment amount cannot exceed the outstanding balance.', 'danger');
      return;
    }

    // Collect all items from the 4 categories
    const items = [];
    const pushItems = (list, moduleType) => {
      (list || []).forEach(it => {
        items.push({
          moduleType: moduleType,
          referenceId: it.sourceId,
          description: it.description,
          amount: it.amount
        });
      });
    };
    pushItems(cbConsolidatedData.opCharges, 'OP');
    pushItems(cbConsolidatedData.ipCharges, 'IP');
    pushItems(cbConsolidatedData.pharmacyCharges, 'PHARMACY');
    pushItems(cbConsolidatedData.labCharges, 'LABORATORY');

    const payload = {
      patientId: activeBillingPatient.id,
      patientName: activeBillingPatient.fullName,
      uhid: activeBillingPatient.uhid,
      opId: cbConsolidatedData.opId || activeBillingPatient.latestOpId,
      ipId: cbConsolidatedData.ipId || activeBillingPatient.latestIpId,
      phone: activeBillingPatient.phone,
      doctorName: cbConsolidatedData.doctorName || activeBillingPatient.doctorName,
      department: cbConsolidatedData.department || activeBillingPatient.department,
      subtotal,
      discountPct,
      discountAmount,
      gstPct,
      gstAmount,
      finalTotal,
      amountPaid,
      gstNumber: document.getElementById('cbOverallGstNumber')?.value.trim() || '',
      paymentMethod,
      notes,
      items
    };

    const remBal = Math.max(0, parseFloat((finalTotal - amountPaid).toFixed(2)));

    const doCreateBill = async (showSuccessState, onError) => {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.processing = 'true';
        submitBtn.innerHTML = '<span class="cv-spinner" style="width:16px; height:16px; border-width:2px; margin-right:0.4rem;"></span> Processing...';
      }

      try {
        const res = await Api.post('/api/billing/central/create', payload);
        if (res && res.success) {
          showToast(res.message || 'Central Bill generated successfully.', 'success');
          cbConsolidatedData.existingInvoiceNumber = res.data.invoiceNumber;
          cbConsolidatedData.existingBillNumber = res.data.billNumber;
          cbConsolidatedData.existingBillId = res.data.id;
          cbConsolidatedData.existingAmountPaid = res.data.amountPaid;
          cbConsolidatedData.existingBalance = res.data.balance;
          cbConsolidatedData.existingPaymentStatus = res.data.paymentStatus;
          cbConsolidatedData.existingPaymentMethod = res.data.paymentMethod;

          const isNowPaid = (res.data.balance <= 0);

          // Update display immediately
          const invEl = document.getElementById('cbDisplayInvoiceNumber');
          if (invEl) invEl.innerText = res.data.invoiceNumber;

          const balEl = document.getElementById('cbOverallBalanceAmt');
          if (balEl) {
            balEl.innerText = '₹' + formatCurrency(res.data.balance);
            balEl.style.color = isNowPaid ? '#059669' : 'var(--cv-danger)';
          }

          const statusBadge = document.getElementById('cbOverallStatusBadge');
          if (statusBadge) {
            statusBadge.classList.remove('cv-badge-unpaid', 'cv-badge-part', 'cv-badge-paid');
            statusBadge.textContent = res.data.paymentStatus;
            statusBadge.classList.add(isNowPaid ? 'cv-badge-paid' : (res.data.amountPaid > 0 ? 'cv-badge-part' : 'cv-badge-unpaid'));
          }

          await loadBillingSummaryData();
          updateBillingKpiValues();

          if (typeof showSuccessState === 'function') {
            showSuccessState({
              paymentStatus: res.data.paymentStatus,
              amountPaid: res.data.amountPaid,
              balanceAmount: res.data.balance,
              invoiceNumber: res.data.invoiceNumber
            });
          }
        } else {
          showToast('Could not generate Central Bill: ' + (res?.message || 'Error'), 'danger');
          if (typeof onError === 'function') onError();
        }
      } catch (err) {
        showToast('Network or server error while generating Central Bill.', 'danger');
        if (typeof onError === 'function') onError();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          delete submitBtn.dataset.processing;
          submitBtn.innerHTML = '<svg style="width:18px; height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit';
        }
      }
    };

    showPaymentConfirmationModal({
      title: 'Confirm Payment',
      billRef: 'Consolidated Bill: ' + activeBillingPatient.fullName,
      paymentAmount: amountPaid,
      remainingBalance: remBal,
      moduleType: 'MAIN',
      printButtonLabel: 'Print Invoice',
      onConfirm: async (showSuccessState, onError) => {
        await doCreateBill(showSuccessState, onError);
      },
      onPrint: () => {
        if (cbConsolidatedData.existingBillId) {
          printDedicatedCentralInvoice(cbConsolidatedData.existingBillId);
        }
      }
    });
  }

  // Central Billing History View
  // Central Billing History View
  let cbHistoryPagination = null;
  let cbHistoryAllBills = [];

  async function renderMainBillingHistoryView() {
    const mount = document.getElementById('mainBillingSubViewMount');
    if (!mount) return;

    if (!cbHistoryPagination) {
      cbHistoryPagination = createHistoryPaginationController({
        defaultPageSize: 10,
        onPageChange: (pagedItems) => {
          const tbody = document.getElementById('cbHistoryTableBody');
          if (tbody) tbody.innerHTML = renderCbHistoryRows(pagedItems);
          const pMount = document.getElementById('cbHistoryPaginationMount');
          if (pMount) {
            pMount.innerHTML = cbHistoryPagination.renderControlsHtml('cbHistory');
            cbHistoryPagination.bindEvents('cbHistory');
          }
        }
      });
    }

    mount.innerHTML = '<div class="cv-spinner" style="margin:2.5rem auto;"></div>';

    try {
      const res = await Api.get('/api/billing/central/history');
      cbHistoryAllBills = (res && res.success && Array.isArray(res.data)) ? res.data : [];

      mount.innerHTML = `
        <div class="cv-pharmacy-card" style="box-shadow:var(--cv-shadow-sm);">
          <div class="cv-pharmacy-card-header" style="flex-wrap:wrap; gap:0.75rem;">
            <div class="cv-pharmacy-card-title">
              <svg style="width:20px; height:20px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Central Billing History &amp; Issued Invoices
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              <input type="text" id="cbHistoryFilterInput" class="cv-form-input" style="height:34px; font-size:0.82rem; width:220px;" placeholder="Search bill, invoice, patient, UHID...">
              <select id="cbHistoryStatusFilter" class="cv-form-select" style="height:34px; font-size:0.82rem; width:125px;">
                <option value="">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY PAID">Partially Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
              <button type="button" class="cv-btn-secondary" id="btnRefreshCbHistory" style="height:34px; padding:0 0.85rem; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
            </div>
          </div>

          <!-- Compact Fixed/Controlled Layout for Table -->
          <div class="cv-bill-table-wrapper" style="max-height: 480px; overflow-y: auto; overflow-x: auto; margin-top:0; border:1px solid var(--cv-border); border-radius:6px 6px 0 0;">
            <table class="cv-bill-table" id="cbHistoryTable" style="margin-bottom:0;">
              <thead style="position:sticky; top:0; z-index:10; background:#f8fafc;">
                <tr>
                  <th style="white-space:nowrap;">Central Bill No</th>
                  <th style="white-space:nowrap;">Invoice Number</th>
                  <th style="white-space:nowrap;">Date &amp; Time</th>
                  <th>Patient Name</th>
                  <th>UHID</th>
                  <th>OP / IP ID</th>
                  <th style="text-align:right; white-space:nowrap;">Subtotal</th>
                  <th style="text-align:right; white-space:nowrap;">Discount</th>
                  <th style="text-align:right; white-space:nowrap;">GST</th>
                  <th style="text-align:right; white-space:nowrap;">Final Total</th>
                  <th style="text-align:right; white-space:nowrap;">Paid</th>
                  <th style="text-align:right; white-space:nowrap;">Balance</th>
                  <th>Status</th>
                  <th style="text-align:center;">Actions</th>
                </tr>
              </thead>
              <tbody id="cbHistoryTableBody">
                <!-- Sliced via pagination controller -->
              </tbody>
            </table>
          </div>
          <div id="cbHistoryPaginationMount"></div>
        </div>
      `;

      function filterCbHistory(preservePage = false) {
        const filterInput = document.getElementById('cbHistoryFilterInput');
        const filterStatus = document.getElementById('cbHistoryStatusFilter');
        const q = filterInput ? filterInput.value.toLowerCase().trim() : '';
        const st = filterStatus ? filterStatus.value.toUpperCase().trim() : '';

        const filtered = cbHistoryAllBills.filter(b => {
          const matchQ = !q ||
            (b.billNumber && b.billNumber.toLowerCase().includes(q)) ||
            (b.invoiceNumber && b.invoiceNumber.toLowerCase().includes(q)) ||
            (b.patientName && b.patientName.toLowerCase().includes(q)) ||
            (b.uhid && b.uhid.toLowerCase().includes(q)) ||
            (b.opId && b.opId.toLowerCase().includes(q)) ||
            (b.ipId && b.ipId.toLowerCase().includes(q));
          const matchSt = !st || (b.paymentStatus && b.paymentStatus.toUpperCase() === st);
          return matchQ && matchSt;
        });

        const paged = cbHistoryPagination.setItems(filtered, preservePage);
        const tbody = document.getElementById('cbHistoryTableBody');
        if (tbody) tbody.innerHTML = renderCbHistoryRows(paged);

        const pMount = document.getElementById('cbHistoryPaginationMount');
        if (pMount) {
          pMount.innerHTML = cbHistoryPagination.renderControlsHtml('cbHistory');
          cbHistoryPagination.bindEvents('cbHistory');
        }
      }

      document.getElementById('cbHistoryFilterInput')?.addEventListener('input', () => filterCbHistory(false));
      document.getElementById('cbHistoryStatusFilter')?.addEventListener('change', () => filterCbHistory(false));

      document.getElementById('btnRefreshCbHistory')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnRefreshCbHistory');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:4px;"></span> Refreshing...';
        }
        try {
          const r = await Api.get('/api/billing/central/history');
          if (r && r.success && Array.isArray(r.data)) {
            cbHistoryAllBills = r.data;
          }
          filterCbHistory(true);
        } catch (e) {
          console.error('Error refreshing central billing history:', e);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Refresh';
          }
        }
      });

      filterCbHistory(false);

    } catch (e) {
      mount.innerHTML = '<div class="cv-alert cv-alert-error">Failed to load Central Billing history from MySQL.</div>';
    }
  }

  function renderCbHistoryRows(bills) {
    if (!bills || bills.length === 0) {
      return '<tr><td colspan="14" style="text-align:center; padding:1.75rem; color:var(--cv-text-muted);">No Central Bills issued yet.</td></tr>';
    }
    return bills.map(b => {
      const isPaid = (b.paymentStatus || 'PAID').toUpperCase() === 'PAID';
      const bal = b.balance || 0;

      return `
        <tr>
          <td><strong>${escapeHtml(b.billNumber)}</strong></td>
          <td><span style="font-family:monospace; font-weight:700; color:var(--cv-primary);">${escapeHtml(b.invoiceNumber || '—')}</span></td>
          <td>${escapeHtml(b.billDate || '')}<br><span style="font-size:0.75rem; color:var(--cv-text-muted);">${escapeHtml(b.billTime || '')}</span></td>
          <td><strong>${escapeHtml(b.patientName || b.patient?.fullName || 'Walk-in')}</strong></td>
          <td><span style="font-family:monospace; font-size:0.8rem;">${escapeHtml(b.uhid || '—')}</span></td>
          <td>${escapeHtml(b.opId || b.ipId || '—')}</td>
          <td style="text-align:right;">₹${formatCurrency(b.subtotal)}</td>
          <td style="text-align:right; color:var(--cv-danger);">- ₹${formatCurrency(b.discountAmount)}</td>
          <td style="text-align:right; color:#0369a1;">+ ₹${formatCurrency(b.gstAmount)}</td>
          <td style="text-align:right; font-weight:700;">₹${formatCurrency(b.finalTotal)}</td>
          <td style="text-align:right; color:#059669; font-weight:600;">₹${formatCurrency(b.amountPaid)}</td>
          <td style="text-align:right; color:${bal > 0 ? 'var(--cv-danger)' : '#059669'}; font-weight:700;">₹${formatCurrency(bal)}</td>
          <td>
            <span class="cv-payment-balance-badge ${isPaid ? 'cv-badge-paid' : ((b.amountPaid || 0) > 0 ? 'cv-badge-part' : 'cv-badge-unpaid')}">
              ${escapeHtml(b.paymentStatus || 'PAID')}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              <button class="cv-btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="AdminModule.showCentralInvoiceModal(${b.id})">Invoice</button>
              <button class="cv-btn-secondary" style="padding:0.25rem 0.45rem; font-size:0.75rem;" onclick="window.open('/api/billing/central/' + ${b.id} + '/pdf', '_blank')">PDF</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

// ==========================================================
  // PROFESSIONAL CENTRAL INVOICE MODAL (VIEW, PRINT, PDF)
  // ==========================================================
  async function showCentralInvoiceModal(billId) {
    const existing = document.getElementById('centralInvoiceModalOverlay');
    if (existing) existing.remove();

    try {
      const res = await Api.get('/api/billing/central/' + billId);
      if (!res || !res.success || !res.data) {
        alert('Could not fetch Central Invoice details.');
        return;
      }
      const bill = res.data;

      // Resilient enrichment: if any detail lists are empty, fetch from patient category endpoints
      const patientId = bill.patientId || (bill.patient && bill.patient.id);
      if (patientId) {
        const promises = [];
        if (!bill.opRecords || bill.opRecords.length === 0) {
          promises.push(Api.get('/api/billing/op/patient/' + patientId).then(r => { if (r && r.success) bill.opRecords = r.data || []; }));
        }
        if (!bill.ipRecords || bill.ipRecords.length === 0) {
          promises.push(Api.get('/api/billing/ip/patient/' + patientId).then(r => { if (r && r.success) bill.ipRecords = r.data || []; }));
        }
        if (!bill.pharmacyBills || bill.pharmacyBills.length === 0) {
          promises.push(Api.get('/api/billing/pharmacy/patient/' + patientId).then(r => { if (r && r.success) bill.pharmacyBills = r.data || []; }));
        }
        if (!bill.labOrders || bill.labOrders.length === 0) {
          promises.push(Api.get('/api/billing/laboratory/patient/' + patientId).then(r => { if (r && r.success) bill.labOrders = r.data || []; }));
        }
        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
      }

      const modalHtml = `
        <div id="centralInvoiceModalOverlay" class="cv-invoice-modal-overlay">
          <div class="cv-invoice-paper" style="max-width:920px; width:95%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden;">
            <!-- Modal Actions Bar (Hidden on print) -->
            <div class="no-print" style="padding:0.85rem 1.25rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc; flex-shrink:0;">
              <div style="display:flex; align-items:center; gap:0.6rem;">
                <svg style="width:22px; height:22px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <h3 style="margin:0; font-size:1.1rem; color:var(--cv-text-primary); font-weight:700;">
                  Central Tax Invoice: ${escapeHtml(bill.invoiceNumber || bill.billNumber)}
                </h3>
              </div>

              <div style="display:flex; gap:0.5rem; align-items:center;">
                <button type="button" class="cv-btn-secondary" id="btnCloseCentralInvoiceModal" style="padding:0.45rem 0.9rem; font-size:0.85rem;">
                  Close
                </button>
                <button type="button" class="cv-btn-secondary" id="btnDownloadCentralInvoicePdf" style="padding:0.45rem 0.9rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.35rem;">
                  <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download PDF
                </button>
                <button type="button" class="cv-btn-primary" id="btnPrintCentralInvoiceModal" style="padding:0.45rem 1.1rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.4rem;">
                  <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                  PRINT INVOICE
                </button>
              </div>
            </div>

            <!-- Printable Invoice Paper Body -->
            <div id="centralPrintableInvoiceArea" style="padding:1.5rem; font-family:'Inter', sans-serif; background:#fff; overflow-y:auto; flex:1;">
              ${buildCentralInvoicePrintHtml(bill)}
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      document.getElementById('btnCloseCentralInvoiceModal')?.addEventListener('click', () => {
        document.getElementById('centralInvoiceModalOverlay')?.remove();
      });

      document.getElementById('btnPrintCentralInvoiceModal')?.addEventListener('click', () => {
        printDedicatedCentralInvoice(billId);
      });

      document.getElementById('btnDownloadCentralInvoicePdf')?.addEventListener('click', () => {
        window.open('/api/billing/central/' + billId + '/pdf', '_blank');
      });

    } catch (e) {
      alert('Error rendering invoice modal');
    }
  }

  function showGenericRecordDetailsModal(title, data) {
    const existing = document.getElementById('genericRecordDetailsModal');
    if (existing) existing.remove();

    const keys = Object.keys(data || {}).filter(k => typeof data[k] !== 'object' && data[k] !== null && data[k] !== undefined);

    const modalHtml = `
      <div id="genericRecordDetailsModal" class="cv-invoice-modal-overlay">
        <div style="background:#fff; width:100%; max-width:600px; border-radius:8px; box-shadow:var(--cv-shadow-lg); overflow:hidden; margin:auto;">
          <div style="padding:1rem 1.25rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
            <h3 style="margin:0; font-size:1rem; font-weight:700; color:var(--cv-text-primary);">${escapeHtml(title)}</h3>
            <button type="button" class="cv-btn-secondary" onclick="document.getElementById('genericRecordDetailsModal').remove()">Close</button>
          </div>
          <div style="padding:1.25rem; max-height:420px; overflow-y:auto;">
            <table class="cv-bill-table" style="font-size:0.84rem;">
              <tbody>
                ${keys.map(k => `
                  <tr>
                    <td style="font-weight:700; color:#64748b; width:40%;">${escapeHtml(k.replace(/([A-Z])/g, ' $1').toUpperCase())}</td>
                    <td style="color:#0f172a;">${escapeHtml(String(data[k]))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // ====================================================================
  // ADMIN — MONEY MANAGEMENT (REVENUE + EXPENSE ANALYTICS)
  // ====================================================================
  let currentMoneyPeriod = 'ONE_MONTH';
  let currentMoneyCustomStart = '';
  let currentMoneyCustomEnd = '';
  let currentMoneyData = null;
  let currentMoneyTxFilter = 'ALL';
  let currentMoneyTxSearch = '';
  let currentDoctorSort = 'HIGHEST';
  let currentExpenseTab = 'PURCHASES';
  let currentIpViewMode = 'WARDS';

  function renderMoneyManagementSkeleton(container, period = 'ONE_MONTH') {
    container.innerHTML = `
      <div class="cv-money-wrapper">

        <!-- Header Bar with Actions -->
        <div class="cv-page-header" style="flex-wrap:wrap; gap:1rem; margin-bottom:0;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            ${renderBackArrowHtml('Back')}
            <div>
              <h1 class="cv-page-title" style="display:flex; align-items:center; gap:0.5rem;">
                <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff;">
                  <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </span>
                Money Management
              </h1>
              <p class="cv-page-subtitle">Hospital Revenue, Expense Analytics &amp; Financial Ledger &bull; Real Database Scoped</p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            <div class="cv-skeleton-bar" style="width:85px; height:38px; border-radius:6px;"></div>
            <div class="cv-skeleton-bar" style="width:130px; height:38px; border-radius:6px;"></div>
          </div>
        </div>

        <!-- Period Selector Filter Bar -->
        <div class="cv-money-period-bar">
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <span style="font-size:0.78rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase; letter-spacing:0.04em;">TIME PERIOD:</span>
            <div class="cv-money-period-pills">
              <button type="button" class="cv-money-pill-btn ${period === 'ONE_DAY' ? 'active' : ''}">One Day</button>
              <button type="button" class="cv-money-pill-btn ${period === 'ONE_WEEK' ? 'active' : ''}">One Week</button>
              <button type="button" class="cv-money-pill-btn ${period === 'ONE_MONTH' ? 'active' : ''}">One Month</button>
              <button type="button" class="cv-money-pill-btn ${period === 'ONE_YEAR' ? 'active' : ''}">One Year</button>
              <button type="button" class="cv-money-pill-btn ${period === 'LIFETIME' ? 'active' : ''}">Lifetime</button>
              <button type="button" class="cv-money-pill-btn ${period === 'CUSTOM' ? 'active' : ''}">Custom Date Range</button>
            </div>
          </div>
          <div class="cv-skeleton-bar" style="width:180px; height:20px; border-radius:4px;"></div>
        </div>

        <!-- Main Financial KPI Summary Cards Skeleton -->
        <div class="cv-money-kpi-grid">
          <div class="cv-money-kpi-card cv-money-kpi-rev">
            <div class="cv-skeleton-bar" style="width:140px; height:16px; margin-bottom:0.75rem;"></div>
            <div class="cv-skeleton-bar" style="width:110px; height:28px; margin-bottom:1rem;"></div>
            <div class="cv-skeleton-bar" style="width:100%; height:14px; margin-bottom:0.35rem;"></div>
            <div class="cv-skeleton-bar" style="width:80%; height:14px;"></div>
          </div>
          <div class="cv-money-kpi-card cv-money-kpi-exp">
            <div class="cv-skeleton-bar" style="width:130px; height:16px; margin-bottom:0.75rem;"></div>
            <div class="cv-skeleton-bar" style="width:100px; height:28px; margin-bottom:1rem;"></div>
            <div class="cv-skeleton-bar" style="width:100%; height:14px; margin-bottom:0.35rem;"></div>
            <div class="cv-skeleton-bar" style="width:85%; height:14px;"></div>
          </div>
          <div class="cv-money-kpi-card cv-money-kpi-net">
            <div class="cv-skeleton-bar" style="width:120px; height:16px; margin-bottom:0.75rem;"></div>
            <div class="cv-skeleton-bar" style="width:110px; height:28px; margin-bottom:1rem;"></div>
            <div class="cv-skeleton-bar" style="width:100%; height:14px; margin-bottom:0.35rem;"></div>
            <div class="cv-skeleton-bar" style="width:75%; height:14px;"></div>
          </div>
          <div class="cv-money-kpi-card cv-money-kpi-out">
            <div class="cv-skeleton-bar" style="width:150px; height:16px; margin-bottom:0.75rem;"></div>
            <div class="cv-skeleton-bar" style="width:95px; height:28px; margin-bottom:1rem;"></div>
            <div class="cv-skeleton-bar" style="width:100%; height:14px; margin-bottom:0.35rem;"></div>
            <div class="cv-skeleton-bar" style="width:80%; height:14px;"></div>
          </div>
        </div>

        <!-- Today's Financial Snapshot Skeleton -->
        <div class="cv-money-today-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
          <div class="cv-skeleton-bar" style="width:200px; height:18px;"></div>
          <div class="cv-skeleton-bar" style="width:360px; height:18px;"></div>
        </div>

        <!-- Overall Financial Summary Banner Skeleton -->
        <div class="cv-money-formula-banner">
          <div class="cv-skeleton-bar" style="width:220px; height:16px; margin:0 auto 1rem auto;"></div>
          <div style="display:flex; justify-content:center; gap:1.5rem; flex-wrap:wrap;">
            <div class="cv-skeleton-bar" style="width:160px; height:55px; border-radius:8px;"></div>
            <div class="cv-skeleton-bar" style="width:160px; height:55px; border-radius:8px;"></div>
            <div class="cv-skeleton-bar" style="width:180px; height:55px; border-radius:8px;"></div>
          </div>
        </div>

        <!-- Revenue Sources Card Skeleton -->
        <div class="cv-card" style="padding:1.25rem;">
          <div class="cv-skeleton-bar" style="width:240px; height:20px; margin-bottom:0.5rem;"></div>
          <div class="cv-skeleton-bar" style="width:360px; height:14px; margin-bottom:1.25rem;"></div>
          <div class="cv-skeleton-bar" style="width:100%; height:26px; border-radius:13px; margin-bottom:1.25rem;"></div>
          <div class="cv-money-sources-grid">
            <div class="cv-money-source-card"><div class="cv-skeleton-bar" style="width:100%; height:90px;"></div></div>
            <div class="cv-money-source-card"><div class="cv-skeleton-bar" style="width:100%; height:90px;"></div></div>
            <div class="cv-money-source-card"><div class="cv-skeleton-bar" style="width:100%; height:90px;"></div></div>
            <div class="cv-money-source-card"><div class="cv-skeleton-bar" style="width:100%; height:90px;"></div></div>
          </div>
        </div>

      </div>
    `;
  }

  async function renderMoneyManagementModule(period = currentMoneyPeriod, customStart = currentMoneyCustomStart, customEnd = currentMoneyCustomEnd) {
    const mainContent = document.getElementById('dashboardMain');
    if (!mainContent) return;

    currentMoneyPeriod = period;
    currentMoneyCustomStart = customStart;
    currentMoneyCustomEnd = customEnd;

    // Check if we have matching pre-fetched/cached data for the requested period
    const hasCachedMatchingData = currentMoneyData && (
      period !== 'CUSTOM'
        ? (currentMoneyData.period === period || (!currentMoneyData.period && period === 'ONE_MONTH'))
        : (currentMoneyData.startDate === customStart && currentMoneyData.endDate === customEnd)
    );

    if (hasCachedMatchingData) {
      // Instant seamless render without blank void or spinner delay!
      renderMoneyDashboardHtml(mainContent, currentMoneyData);
    } else {
      // Structured full-layout skeleton with smooth shimmer animation
      renderMoneyManagementSkeleton(mainContent, period);
    }

    try {
      let url = `/api/admin/money/dashboard?period=${encodeURIComponent(period)}`;
      if (period === 'CUSTOM' && customStart && customEnd) {
        url += `&startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`;
      }

      const res = await Api.get(url);
      if (!res || !res.success || !res.data) {
        if (!hasCachedMatchingData) {
          mainContent.innerHTML = `
            <div class="cv-card" style="padding:2.5rem; text-align:center;">
              <p style="color:var(--cv-danger); font-weight:700;">Could not load financial data: ${escapeHtml(res?.message || 'Server error')}</p>
              <button type="button" class="cv-btn-secondary" onclick="Admin.renderMoneyManagementModule()" style="margin-top:1rem;">Retry</button>
            </div>
          `;
        }
        return;
      }

      currentMoneyData = res.data;
      renderMoneyDashboardHtml(mainContent, res.data);
    } catch (err) {
      if (!hasCachedMatchingData) {
        mainContent.innerHTML = `
          <div class="cv-card" style="padding:2.5rem; text-align:center;">
            <p style="color:var(--cv-danger); font-weight:700;">Network or server error while retrieving Money Management analytics.</p>
            <button type="button" class="cv-btn-secondary" onclick="Admin.renderMoneyManagementModule()" style="margin-top:1rem;">Retry</button>
          </div>
        `;
      }
    }
  }

  function renderMoneyDashboardHtml(container, data) {
    const isCustom = (currentMoneyPeriod === 'CUSTOM');
    const netIsPositive = (data.netAmount || 0) >= 0;

    container.innerHTML = `
      <div class="cv-money-wrapper">

        <!-- Header Bar with Actions -->
        <div class="cv-page-header" style="flex-wrap:wrap; gap:1rem; margin-bottom:0;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            ${renderBackArrowHtml('Back')}
            <div>
              <h1 class="cv-page-title" style="display:flex; align-items:center; gap:0.5rem;">
                <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff;">
                  <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </span>
                Money Management
              </h1>
              <p class="cv-page-subtitle">Hospital Revenue, Expense Analytics &amp; Financial Ledger &bull; Real Database Scoped</p>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            <button type="button" class="cv-btn-secondary" onclick="Admin.renderMoneyManagementModule('${currentMoneyPeriod}', '${currentMoneyCustomStart}', '${currentMoneyCustomEnd}')" title="Refresh financial analytics" style="height:38px;">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Refresh
            </button>
            <button type="button" class="cv-btn-primary" onclick="Admin.showRecordExpenseModal()" style="background:#059669; border-color:#059669; height:38px; font-weight:700;">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              + Record Expense
            </button>
          </div>
        </div>

        <!-- Period Selector Filter Bar -->
        <div class="cv-money-period-bar">
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <span style="font-size:0.78rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase; letter-spacing:0.04em;">TIME PERIOD:</span>
            <div class="cv-money-period-pills">
              <button type="button" class="cv-money-pill-btn ${currentMoneyPeriod === 'ONE_DAY' ? 'active' : ''}" onclick="Admin.filterMoneyPeriod('ONE_DAY')">One Day</button>
              <button type="button" class="cv-money-pill-btn ${currentMoneyPeriod === 'ONE_WEEK' ? 'active' : ''}" onclick="Admin.filterMoneyPeriod('ONE_WEEK')">One Week</button>
              <button type="button" class="cv-money-pill-btn ${currentMoneyPeriod === 'ONE_MONTH' ? 'active' : ''}" onclick="Admin.filterMoneyPeriod('ONE_MONTH')">One Month</button>
              <button type="button" class="cv-money-pill-btn ${currentMoneyPeriod === 'ONE_YEAR' ? 'active' : ''}" onclick="Admin.filterMoneyPeriod('ONE_YEAR')">One Year</button>
              <button type="button" class="cv-money-pill-btn ${currentMoneyPeriod === 'LIFETIME' ? 'active' : ''}" onclick="Admin.filterMoneyPeriod('LIFETIME')">Lifetime</button>
              <button type="button" class="cv-money-pill-btn ${currentMoneyPeriod === 'CUSTOM' ? 'active' : ''}" onclick="Admin.filterMoneyPeriod('CUSTOM')">Custom Date Range</button>
            </div>
          </div>

          <div style="font-size:0.8rem; color:#475569; font-weight:600; display:flex; align-items:center; gap:0.4rem;">
            <svg style="width:15px; height:15px; color:var(--cv-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Active Window: <span style="font-family:monospace; color:var(--cv-text-main); font-weight:700;">${escapeHtml(data.startDate)} &mdash; ${escapeHtml(data.endDate)}</span>
          </div>
        </div>

        <!-- Custom Date Range Form (Toggles when Custom is active) -->
        <div id="moneyCustomRangeBox" class="cv-money-custom-box" style="${isCustom ? '' : 'display:none;'}">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">From Date:</label>
            <input type="date" id="moneyCustomFromDate" class="cv-form-input" style="height:36px; font-size:0.85rem;" value="${currentMoneyCustomStart ? formatDateForInput(currentMoneyCustomStart) : ''}">
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); text-transform:uppercase;">To Date:</label>
            <input type="date" id="moneyCustomToDate" class="cv-form-input" style="height:36px; font-size:0.85rem;" value="${currentMoneyCustomEnd ? formatDateForInput(currentMoneyCustomEnd) : ''}">
          </div>
          <button type="button" class="cv-btn-primary" onclick="Admin.applyCustomMoneyDateRange()" style="height:36px; padding:0 1rem; font-size:0.82rem;">Apply Filter</button>
        </div>

        <!-- SECTION D: OVERALL FINANCIAL SUMMARY (Phase 4) -->
        <div class="cv-card" style="padding:1.25rem; margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <div style="font-size:0.75rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">SECTION D &bull; EXECUTIVE FINANCIAL SUMMARY</div>
              <h2 style="font-size:1.15rem; font-weight:800; color:var(--cv-deep-blue); margin:0.2rem 0 0 0;">Overall Financial Performance</h2>
            </div>
            <div style="font-size:0.75rem; color:#64748b; background:#f1f5f9; padding:0.35rem 0.75rem; border-radius:6px;">
              Sales &amp; Collections are separated &bull; Zero Double-Counting
            </div>
          </div>

          <div class="cv-money-kpi-grid">
            <!-- 1. Total Sales / Billed -->
            <div class="cv-money-kpi-card cv-money-kpi-rev">
              <div>
                <div class="cv-money-kpi-title">
                  <span>TOTAL SALES (BILLED)</span>
                  <span class="cv-money-badge-rev">INVOICED</span>
                </div>
                <div class="cv-money-kpi-amount" style="color:#065f46;">₹${formatCurrency(data.totalRevenueBilled)}</div>
              </div>
              <div class="cv-money-kpi-meta">
                <div style="display:flex; justify-content:space-between;">
                  <span>Gross Services Billed:</span>
                  <strong style="color:#065f46;">₹${formatCurrency(data.totalRevenueBilled)}</strong>
                </div>
              </div>
            </div>

            <!-- 2. Total Collection / Received -->
            <div class="cv-money-kpi-card" style="border-left:4px solid #059669; background:#ffffff;">
              <div>
                <div class="cv-money-kpi-title">
                  <span>TOTAL COLLECTION</span>
                  <span style="font-size:0.7rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:4px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">RECEIVED</span>
                </div>
                <div class="cv-money-kpi-amount" style="color:#059669;">₹${formatCurrency(data.totalRevenueCollected)}</div>
              </div>
              <div class="cv-money-kpi-meta">
                <div style="display:flex; justify-content:space-between;">
                  <span>Actual Cash Realized:</span>
                  <strong style="color:#059669;">₹${formatCurrency(data.totalRevenueCollected)}</strong>
                </div>
              </div>
            </div>

            <!-- 3. Total Outstanding / Receivable -->
            <div class="cv-money-kpi-card cv-money-kpi-out">
              <div>
                <div class="cv-money-kpi-title">
                  <span>TOTAL OUTSTANDING</span>
                  <span style="font-size:0.7rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:4px; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">RECEIVABLE</span>
                </div>
                <div class="cv-money-kpi-amount" style="color:#b91c1c;">₹${formatCurrency(data.totalOutstanding)}</div>
              </div>
              <div class="cv-money-kpi-meta">
                <div style="display:flex; justify-content:space-between;">
                  <span>Unpaid Patient Dues:</span>
                  <strong style="color:#dc2626;">₹${formatCurrency(data.totalOutstanding)}</strong>
                </div>
              </div>
            </div>

            <!-- 4. Total Expenses -->
            <div class="cv-money-kpi-card cv-money-kpi-exp">
              <div>
                <div class="cv-money-kpi-title">
                  <span>TOTAL EXPENSES</span>
                  <span class="cv-money-badge-exp">EXPENSES</span>
                </div>
                <div class="cv-money-kpi-amount" style="color:#92400e;">₹${formatCurrency(data.totalExpenses)}</div>
              </div>
              <div class="cv-money-kpi-meta">
                <div style="display:flex; justify-content:space-between;">
                  <span>Operational &amp; Purchases:</span>
                  <strong style="color:#92400e;">₹${formatCurrency(data.totalExpenses)}</strong>
                </div>
              </div>
            </div>

            <!-- 5. Net Amount -->
            <div class="cv-money-kpi-card cv-money-kpi-net">
              <div>
                <div class="cv-money-kpi-title">
                  <span>NET AMOUNT</span>
                  <span style="font-size:0.7rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:4px; ${netIsPositive ? 'background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;' : 'background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;'}">
                    ${netIsPositive ? 'SURPLUS' : 'DEFICIT'}
                  </span>
                </div>
                <div class="cv-money-kpi-amount" style="color:${netIsPositive ? '#059669' : '#b91c1c'};">
                  ${netIsPositive ? '' : '- '}₹${formatCurrency(Math.abs(data.netAmount || 0))}
                </div>
              </div>
              <div class="cv-money-kpi-meta">
                <div style="display:flex; justify-content:space-between;">
                  <span>Net Cash Realized:</span>
                  <strong style="color:${(data.netCollected || 0) >= 0 ? '#059669' : '#b91c1c'};">₹${formatCurrency(data.netCollected || 0)}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Financial Formula Calculation Banner -->
          <div class="cv-money-formula-banner" style="margin-top:1.25rem;">
            <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.6rem;">OVERALL FINANCIAL FORMULA LEDGER</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:1.25rem; flex-wrap:wrap; font-size:1.15rem; font-weight:800;">
              <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:0.6rem 1.25rem; border-radius:8px; text-align:center;">
                <div style="font-size:0.68rem; font-weight:700; color:#065f46; text-transform:uppercase;">TOTAL SALES (BILLED)</div>
                <div style="color:#065f46; font-size:1.35rem; margin-top:0.2rem;">₹${formatCurrency(data.totalRevenueBilled)}</div>
              </div>
              <div style="font-size:1.5rem; color:#94a3b8; font-weight:900;">&minus;</div>
              <div style="background:#fffbeb; border:1px solid #fde68a; padding:0.6rem 1.25rem; border-radius:8px; text-align:center;">
                <div style="font-size:0.68rem; font-weight:700; color:#92400e; text-transform:uppercase;">TOTAL EXPENSES</div>
                <div style="color:#92400e; font-size:1.35rem; margin-top:0.2rem;">₹${formatCurrency(data.totalExpenses)}</div>
              </div>
              <div style="font-size:1.5rem; color:#94a3b8; font-weight:900;">&equals;</div>
              <div style="background:${netIsPositive ? '#ecfdf5' : '#fef2f2'}; border:1px solid ${netIsPositive ? '#a7f3d0' : '#fecaca'}; padding:0.6rem 1.5rem; border-radius:8px; text-align:center;">
                <div style="font-size:0.68rem; font-weight:700; color:${netIsPositive ? '#065f46' : '#991b1b'}; text-transform:uppercase;">NET AMOUNT</div>
                <div style="color:${netIsPositive ? '#065f46' : '#b91c1c'}; font-size:1.35rem; margin-top:0.2rem;">
                  ${netIsPositive ? '' : '- '}₹${formatCurrency(Math.abs(data.netAmount || 0))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- THREE-SECTION BREAKDOWN: A. SALES, B. COLLECTIONS, C. OUTSTANDING (Phase 4) -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.25rem; margin-bottom:1.25rem;">

          <!-- SECTION A: SALES / BILLING -->
          <div class="cv-card" style="padding:1.25rem; border-top:4px solid #2563eb;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem;">
              <div>
                <h3 style="font-size:1rem; font-weight:800; color:#1e3a8a; margin:0;">A. SALES / BILLING</h3>
                <span style="font-size:0.75rem; color:#64748b;">Total Invoiced Service Revenue</span>
              </div>
              <span style="font-size:0.72rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:4px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">BILLED</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.65rem; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">OP Sales:</span>
                <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.op?.billed || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">IP Sales:</span>
                <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.ip?.billed || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Pharmacy Sales:</span>
                <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.pharmacy?.billed || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Laboratory Sales:</span>
                <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.laboratory?.billed || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Other Sales:</span>
                <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.other?.billed || data.revenueSources?.doctors?.billed || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.65rem 0.75rem; background:#eff6ff; border-radius:6px; border:1px solid #bfdbfe; margin-top:0.35rem;">
                <span style="color:#1e3a8a; font-weight:800; font-size:0.9rem;">Total Sales:</span>
                <strong style="color:#1d4ed8; font-size:1.15rem;">₹${formatCurrency(data.totalRevenueBilled)}</strong>
              </div>
            </div>
          </div>

          <!-- SECTION B: COLLECTIONS / RECEIVED AMOUNT -->
          <div class="cv-card" style="padding:1.25rem; border-top:4px solid #059669;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem;">
              <div>
                <h3 style="font-size:1rem; font-weight:800; color:#065f46; margin:0;">B. COLLECTIONS / RECEIVED</h3>
                <span style="font-size:0.75rem; color:#64748b;">Actual Cash &amp; Digital Realized</span>
              </div>
              <span style="font-size:0.72rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:4px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">RECEIVED</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.65rem; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">OP Collection:</span>
                <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.op?.collected || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">IP Collection:</span>
                <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.ip?.collected || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Pharmacy Collection:</span>
                <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.pharmacy?.collected || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Laboratory Collection:</span>
                <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.laboratory?.collected || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Other Collection:</span>
                <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.other?.collected || data.revenueSources?.doctors?.collected || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.65rem 0.75rem; background:#ecfdf5; border-radius:6px; border:1px solid #a7f3d0; margin-top:0.35rem;">
                <span style="color:#065f46; font-weight:800; font-size:0.9rem;">Total Collection:</span>
                <strong style="color:#059669; font-size:1.15rem;">₹${formatCurrency(data.totalRevenueCollected)}</strong>
              </div>
            </div>
          </div>

          <!-- SECTION C: OUTSTANDING / RECEIVABLE -->
          <div class="cv-card" style="padding:1.25rem; border-top:4px solid #dc2626;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem;">
              <div>
                <h3 style="font-size:1rem; font-weight:800; color:#991b1b; margin:0;">C. OUTSTANDING / RECEIVABLE</h3>
                <span style="font-size:0.75rem; color:#64748b;">Remaining Patient Balances Due</span>
              </div>
              <span style="font-size:0.72rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:4px; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">RECEIVABLE</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.65rem; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">OP Outstanding:</span>
                <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.op?.outstanding || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">IP Outstanding:</span>
                <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.ip?.outstanding || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Pharmacy Outstanding:</span>
                <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.pharmacy?.outstanding || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Laboratory Outstanding:</span>
                <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.laboratory?.outstanding || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; background:#f8fafc; border-radius:6px;">
                <span style="color:#475569; font-weight:600;">Other Outstanding:</span>
                <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.other?.outstanding || data.revenueSources?.doctors?.outstanding || 0)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.65rem 0.75rem; background:#fef2f2; border-radius:6px; border:1px solid #fecaca; margin-top:0.35rem;">
                <span style="color:#991b1b; font-weight:800; font-size:0.9rem;">Total Outstanding:</span>
                <strong style="color:#b91c1c; font-size:1.15rem;">₹${formatCurrency(data.totalOutstanding)}</strong>
              </div>
            </div>
          </div>

        </div>

        <!-- SECTION 6: CATEGORY-WISE PERFORMANCE & RECOVERY VIEW (Phase 4) -->
        <div class="cv-card" style="padding:1.25rem; margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <div style="font-size:0.75rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em;">CATEGORY-WISE VIEW &bull; OP / IP / PHARMACY / LABORATORY</div>
              <h2 style="font-size:1.1rem; font-weight:800; color:var(--cv-deep-blue); margin:0.2rem 0 0 0;">Department Clinical &amp; Financial Analytics</h2>
              <p style="font-size:0.78rem; color:var(--cv-text-muted); margin:0.15rem 0 0 0;">Discrete reporting of Billed, Collected, Outstanding, and Transaction count per department</p>
            </div>
            <span class="cv-money-badge-rev">Total Billed: ₹${formatCurrency(data.totalRevenueBilled)}</span>
          </div>

          <!-- Visual Distribution Chart Bar -->
          ${renderRevenueVisualDistributionBar(data.revenueSources)}

          <!-- 4 Category-Wise Cards -->
          <div class="cv-money-sources-grid" style="margin-top:1.25rem;">

            <!-- OP Category -->
            <div class="cv-money-source-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:0.85rem; color:var(--cv-deep-blue); display:flex; align-items:center; gap:0.35rem;">
                  <span style="width:10px; height:10px; border-radius:50%; background:#3b82f6; display:inline-block;"></span>
                  OP DEPARTMENT
                </span>
                <span style="font-size:0.75rem; font-weight:700; color:#3b82f6;">${data.revenueSources?.op?.percentage || 0}% share</span>
              </div>
              <div style="font-size:1.35rem; font-weight:800; color:#0f172a; margin:0.2rem 0;">₹${formatCurrency(data.revenueSources?.op?.billed || 0)}</div>
              <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; flex-direction:column; gap:0.25rem; border-top:1px solid #f1f5f9; padding-top:0.45rem;">
                <div style="display:flex; justify-content:space-between;">
                  <span>Sales / Billed:</span>
                  <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.op?.billed || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Collection / Received:</span>
                  <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.op?.collected || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Outstanding Due:</span>
                  <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.op?.outstanding || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed #e2e8f0; padding-top:0.25rem;">
                  <span>Transaction Count:</span>
                  <strong>${data.revenueSources?.op?.count || 0} visits</strong>
                </div>
              </div>
            </div>

            <!-- IP Category -->
            <div class="cv-money-source-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:0.85rem; color:var(--cv-deep-blue); display:flex; align-items:center; gap:0.35rem;">
                  <span style="width:10px; height:10px; border-radius:50%; background:#10b981; display:inline-block;"></span>
                  IP INPATIENTS
                </span>
                <span style="font-size:0.75rem; font-weight:700; color:#10b981;">${data.revenueSources?.ip?.percentage || 0}% share</span>
              </div>
              <div style="font-size:1.35rem; font-weight:800; color:#0f172a; margin:0.2rem 0;">₹${formatCurrency(data.revenueSources?.ip?.billed || 0)}</div>
              <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; flex-direction:column; gap:0.25rem; border-top:1px solid #f1f5f9; padding-top:0.45rem;">
                <div style="display:flex; justify-content:space-between;">
                  <span>Sales / Billed:</span>
                  <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.ip?.billed || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Collection / Received:</span>
                  <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.ip?.collected || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Outstanding Due:</span>
                  <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.ip?.outstanding || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed #e2e8f0; padding-top:0.25rem;">
                  <span>Transaction Count:</span>
                  <strong>${data.revenueSources?.ip?.count || 0} admissions</strong>
                </div>
              </div>
            </div>

            <!-- Pharmacy Category -->
            <div class="cv-money-source-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:0.85rem; color:var(--cv-deep-blue); display:flex; align-items:center; gap:0.35rem;">
                  <span style="width:10px; height:10px; border-radius:50%; background:#8b5cf6; display:inline-block;"></span>
                  PHARMACY DISPENSARY
                </span>
                <span style="font-size:0.75rem; font-weight:700; color:#8b5cf6;">${data.revenueSources?.pharmacy?.percentage || 0}% share</span>
              </div>
              <div style="font-size:1.35rem; font-weight:800; color:#0f172a; margin:0.2rem 0;">₹${formatCurrency(data.revenueSources?.pharmacy?.billed || 0)}</div>
              <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; flex-direction:column; gap:0.25rem; border-top:1px solid #f1f5f9; padding-top:0.45rem;">
                <div style="display:flex; justify-content:space-between;">
                  <span>Sales / Billed:</span>
                  <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.pharmacy?.billed || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Collection / Received:</span>
                  <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.pharmacy?.collected || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Outstanding Due:</span>
                  <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.pharmacy?.outstanding || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed #e2e8f0; padding-top:0.25rem;">
                  <span>Transaction Count:</span>
                  <strong>${data.revenueSources?.pharmacy?.count || 0} sales bills</strong>
                </div>
              </div>
            </div>

            <!-- Laboratory Category -->
            <div class="cv-money-source-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:0.85rem; color:var(--cv-deep-blue); display:flex; align-items:center; gap:0.35rem;">
                  <span style="width:10px; height:10px; border-radius:50%; background:#f59e0b; display:inline-block;"></span>
                  LABORATORY DIAGNOSTICS
                </span>
                <span style="font-size:0.75rem; font-weight:700; color:#f59e0b;">${data.revenueSources?.laboratory?.percentage || 0}% share</span>
              </div>
              <div style="font-size:1.35rem; font-weight:800; color:#0f172a; margin:0.2rem 0;">₹${formatCurrency(data.revenueSources?.laboratory?.billed || 0)}</div>
              <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; flex-direction:column; gap:0.25rem; border-top:1px solid #f1f5f9; padding-top:0.45rem;">
                <div style="display:flex; justify-content:space-between;">
                  <span>Sales / Billed:</span>
                  <strong style="color:#0f172a;">₹${formatCurrency(data.revenueSources?.laboratory?.billed || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Collection / Received:</span>
                  <strong style="color:#059669;">₹${formatCurrency(data.revenueSources?.laboratory?.collected || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Outstanding Due:</span>
                  <strong style="color:#dc2626;">₹${formatCurrency(data.revenueSources?.laboratory?.outstanding || 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed #e2e8f0; padding-top:0.25rem;">
                  <span>Transaction Count:</span>
                  <strong>${data.revenueSources?.laboratory?.count || 0} lab tests</strong>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Section 2: IP ROOM / WARD REVENUE & BED-LEVEL DETAILS (Change 1) -->
        <div class="cv-card" style="padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <h2 style="font-size:1.05rem; font-weight:800; color:var(--cv-deep-blue); margin:0;">IP Room &amp; Ward Revenue</h2>
              <p style="font-size:0.78rem; color:var(--cv-text-muted); margin:0.2rem 0 0 0;">Categorized by General Ward, ICU, VIP, Deluxe, Semi-Private, Private, Emergency &amp; Other</p>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem; background:#f1f5f9; padding:0.25rem; border-radius:6px;">
              <button type="button" class="cv-money-pill-btn ${currentIpViewMode === 'WARDS' ? 'active' : ''}" onclick="Admin.switchIpViewMode('WARDS')">Ward Categories</button>
              <button type="button" class="cv-money-pill-btn ${currentIpViewMode === 'BEDS' ? 'active' : ''}" onclick="Admin.switchIpViewMode('BEDS')">Bed-Level Details (${data.ipRevenueBreakdown?.bedBreakdown?.length || 0})</button>
            </div>
          </div>

          <!-- Mode 1: Ward Categories (Table + Visual Cards) -->
          <div id="ipWardCategoriesMount" style="${currentIpViewMode === 'WARDS' ? '' : 'display:none;'}">
            
            <!-- Executive Ward Revenue Breakdown Table -->
            <div style="overflow-x:auto; margin-bottom:1.25rem;">
              <table class="cv-money-table">
                <thead>
                  <tr>
                    <th>Room / Ward Type</th>
                    <th style="text-align:center;">Occupied Beds / Rooms</th>
                    <th style="text-align:right;">Revenue / Billed</th>
                    <th style="text-align:right;">Collected Amount</th>
                    <th style="text-align:right;">Outstanding Amount</th>
                    <th style="text-align:center;">Transactions</th>
                    <th style="text-align:right;">Share %</th>
                  </tr>
                </thead>
                <tbody>
                  ${(data.ipRevenueBreakdown?.wardBreakdown || []).map(w => `
                    <tr>
                      <td>
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                          <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${(w.billed || 0) > 0 ? '#1d4ed8' : '#cbd5e1'};"></span>
                          <strong style="color:var(--cv-deep-blue); font-size:0.88rem;">${escapeHtml(w.wardType)}</strong>
                        </div>
                      </td>
                      <td style="text-align:center;">
                        <span style="font-size:0.78rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:4px; ${w.occupiedCount > 0 ? 'background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;' : 'background:#f1f5f9; color:#64748b;'}">
                          ${w.occupiedCount} occupied ${w.totalBeds > 0 ? `(${w.occupiedCount}/${w.totalBeds} beds)` : ''}
                        </span>
                      </td>
                      <td style="text-align:right; font-weight:800; color:var(--cv-deep-blue); font-size:0.92rem;">
                        ₹${formatCurrency(w.billed)}
                      </td>
                      <td style="text-align:right; font-weight:700; color:#059669; font-size:0.88rem;">
                        ₹${formatCurrency(w.collected)}
                      </td>
                      <td style="text-align:right; font-weight:700; color:${(w.outstanding || 0) > 0 ? '#dc2626' : '#64748b'}; font-size:0.88rem;">
                        ₹${formatCurrency(w.outstanding)}
                      </td>
                      <td style="text-align:center; font-weight:600;">
                        ${w.transactionCount || w.count || 0}
                      </td>
                      <td style="text-align:right;">
                        <span style="font-weight:700; color:#2563eb; font-size:0.84rem;">${w.percentage || 0}%</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Category Cards Grid -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:1rem;">
              ${(data.ipRevenueBreakdown?.wardBreakdown || []).map(w => `
                <div style="background:#f8fafc; border:1px solid var(--cv-border); border-radius:8px; padding:1rem; border-left:4px solid ${(w.billed || 0) > 0 ? '#3b82f6' : '#cbd5e1'};">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:0.86rem; color:var(--cv-deep-blue);">${escapeHtml(w.wardType)}</strong>
                    <span style="font-size:0.75rem; font-weight:700; color:#3b82f6;">${w.percentage || 0}%</span>
                  </div>
                  <div style="font-size:1.25rem; font-weight:800; color:#0f172a; margin:0.35rem 0;">₹${formatCurrency(w.billed)}</div>
                  <div style="font-size:0.75rem; color:var(--cv-text-muted); display:flex; flex-direction:column; gap:0.2rem; border-top:1px solid #e2e8f0; padding-top:0.4rem;">
                    <div style="display:flex; justify-content:space-between;">
                      <span>Occupied:</span>
                      <strong style="color:#0f172a;">${w.occupiedCount} ${w.totalBeds > 0 ? `(${w.occupiedCount}/${w.totalBeds})` : ''}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span>Collected:</span>
                      <strong style="color:#059669;">₹${formatCurrency(w.collected)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span>Outstanding:</span>
                      <strong style="color:#dc2626;">₹${formatCurrency(w.outstanding)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span>Transactions:</span>
                      <strong>${w.transactionCount || w.count || 0}</strong>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Mode 2: Bed-Level Details Table -->
          <div id="ipBedsMount" style="${currentIpViewMode === 'BEDS' ? '' : 'display:none;'}">
            <div style="overflow-x:auto;">
              <table class="cv-money-table">
                <thead>
                  <tr>
                    <th>Room #</th>
                    <th>Bed #</th>
                    <th>Ward Type</th>
                    <th>Patient Name</th>
                    <th>Attending Doctor</th>
                    <th>Admission Date</th>
                    <th style="text-align:right;">Room Fee</th>
                    <th style="text-align:right;">Bed Fee</th>
                    <th style="text-align:right;">Total Billed</th>
                    <th style="text-align:right;">Paid</th>
                    <th style="text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${(data.ipRevenueBreakdown?.bedBreakdown || []).map(b => `
                    <tr>
                      <td style="font-family:monospace; font-weight:700;">${escapeHtml(b.roomNumber)}</td>
                      <td style="font-weight:600;">${escapeHtml(b.bedNumber)}</td>
                      <td><span style="font-size:0.75rem; padding:0.15rem 0.4rem; background:#eff6ff; color:#1d4ed8; border-radius:4px; font-weight:600;">${escapeHtml(b.wardType)}</span></td>
                      <td style="font-weight:600;">${escapeHtml(b.patientName)}</td>
                      <td>${escapeHtml(b.doctorName)}</td>
                      <td style="font-family:monospace;">${escapeHtml(b.admissionDate)}</td>
                      <td style="text-align:right;">₹${formatCurrency(b.roomPrice)}</td>
                      <td style="text-align:right;">₹${formatCurrency(b.bedPrice)}</td>
                      <td style="text-align:right; font-weight:700;">₹${formatCurrency(b.totalCharges)}</td>
                      <td style="text-align:right; color:#059669; font-weight:700;">₹${formatCurrency(b.collected)}</td>
                      <td style="text-align:center;">
                        <span class="cv-payment-balance-badge ${b.paymentStatus === 'PAID' ? 'cv-badge-paid' : 'cv-badge-unpaid'}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">
                          ${escapeHtml(b.paymentStatus || 'PAID')}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                  ${(!data.ipRevenueBreakdown?.bedBreakdown || data.ipRevenueBreakdown.bedBreakdown.length === 0) ? `
                    <tr><td colspan="11" style="text-align:center; padding:1.5rem; color:var(--cv-text-muted);">No bed transactions recorded in this window.</td></tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Section 3: DOCTOR-WISE REVENUE (Sections 5 & 22) -->
        <div class="cv-card" style="padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <h2 style="font-size:1.05rem; font-weight:800; color:var(--cv-deep-blue); margin:0;">Doctor-Wise Revenue Generated</h2>
              <p style="font-size:0.78rem; color:var(--cv-text-muted); margin:0.2rem 0 0 0;">Actual billing &amp; collections linked to each physician's consultations and inpatient admissions</p>
            </div>
            <div style="display:flex; align-items:center; gap:0.35rem; background:#f1f5f9; padding:0.25rem; border-radius:6px;">
              <span style="font-size:0.72rem; font-weight:700; color:#64748b; padding:0 0.4rem;">SORT:</span>
              <button type="button" class="cv-money-pill-btn ${currentDoctorSort === 'HIGHEST' ? 'active' : ''}" onclick="Admin.sortDoctorRevenue('HIGHEST')">Highest Revenue</button>
              <button type="button" class="cv-money-pill-btn ${currentDoctorSort === 'LOWEST' ? 'active' : ''}" onclick="Admin.sortDoctorRevenue('LOWEST')">Lowest Revenue</button>
              <button type="button" class="cv-money-pill-btn ${currentDoctorSort === 'NAME' ? 'active' : ''}" onclick="Admin.sortDoctorRevenue('NAME')">Doctor Name</button>
            </div>
          </div>

          <!-- Documentation note on calculation logic (Requirement 22) -->
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:0.5rem 0.85rem; font-size:0.75rem; color:#166534; margin-bottom:1rem; display:flex; align-items:center; gap:0.4rem;">
            <svg style="width:16px; height:16px; flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span><strong>Calculation Logic:</strong> Doctor revenue aggregates Outpatient consultation fees, Inpatient attending physician charges, and physician-referred Pharmacy and Diagnostic orders genuinely associated with each medical practitioner.</span>
          </div>

          <div style="overflow-x:auto;">
            <table class="cv-money-table" id="doctorRevenueTable">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Department &amp; Specialization</th>
                  <th style="text-align:right;">OP Visits</th>
                  <th style="text-align:right;">OP Revenue</th>
                  <th style="text-align:right;">IP Admissions</th>
                  <th style="text-align:right;">IP Revenue</th>
                  <th style="text-align:right;">Total Billed</th>
                  <th style="text-align:right;">Cash Collected</th>
                  <th style="text-align:right;">Outstanding</th>
                  <th style="text-align:right;">Share %</th>
                </tr>
              </thead>
              <tbody id="doctorRevenueTableBody">
                ${renderDoctorRevenueRows(data.doctorRevenueList || [])}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 4: EXPENSE MANAGEMENT & BREAKDOWN (Sections 13, 14, 15, 16 & 27) -->
        <div class="cv-card" style="padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <h2 style="font-size:1.05rem; font-weight:800; color:var(--cv-deep-blue); margin:0;">Expense Management &amp; Analytics</h2>
              <p style="font-size:0.78rem; color:var(--cv-text-muted); margin:0.2rem 0 0 0;">Pharmacy medicine purchases from suppliers/agencies and operational hospital expenditures</p>
            </div>
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
              <span class="cv-money-badge-exp">Total Expenses: ₹${formatCurrency(data.totalExpenses)}</span>
              <button type="button" class="cv-btn-secondary" onclick="Admin.showRecordExpenseModal()" style="font-size:0.78rem; padding:0.35rem 0.75rem;">
                + Add Operational Expense
              </button>
            </div>
          </div>

          <!-- Expense Category Breakdown Cards (Section 15) -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; margin-bottom:1.25rem;">
            ${(data.expenseBreakdown?.categories || []).map(c => `
              <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:0.85rem 1rem; border-left:4px solid #f59e0b;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:0.75rem; color:#92400e; text-transform:uppercase;">${escapeHtml(c.category)}</strong>
                  <span style="font-size:0.72rem; font-weight:700; color:#b45309;">${c.percentage}%</span>
                </div>
                <div style="font-size:1.25rem; font-weight:800; color:#0f172a; margin:0.3rem 0;">₹${formatCurrency(c.amount)}</div>
                <div style="font-size:0.72rem; color:#92400e;">${c.count} transactions recorded</div>
              </div>
            `).join('')}
            ${(!data.expenseBreakdown?.categories || data.expenseBreakdown.categories.length === 0) ? `
              <div style="padding:1.5rem; text-align:center; color:var(--cv-text-muted); grid-column:1/-1;">No expense records recorded in this window.</div>
            ` : ''}
          </div>

          <!-- Dual Tab Switcher -->
          <div style="display:flex; align-items:center; gap:0.5rem; border-bottom:1px solid var(--cv-border); margin-bottom:1rem; padding-bottom:0.5rem;">
            <button type="button" class="cv-lab-tab-btn ${currentExpenseTab === 'PURCHASES' ? 'active' : ''}" onclick="Admin.switchExpenseTab('PURCHASES')">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Pharmacy Purchases (${data.expenseBreakdown?.pharmacyPurchases?.length || 0})
            </button>
            <button type="button" class="cv-lab-tab-btn ${currentExpenseTab === 'OPERATIONAL' ? 'active' : ''}" onclick="Admin.switchExpenseTab('OPERATIONAL')">
              <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Operational Hospital Expenses (${data.expenseBreakdown?.operationalExpenses?.length || 0})
            </button>
          </div>

          <!-- Tab 1: Pharmacy Purchases Table (Sections 14 & 27) -->
          <div id="expensePurchasesTab" style="${currentExpenseTab === 'PURCHASES' ? '' : 'display:none;'}">
            <div style="overflow-x:auto;">
              <table class="cv-money-table">
                <thead>
                  <tr>
                    <th>Supplier / Agency</th>
                    <th>Purchase Date</th>
                    <th>Medicine Name</th>
                    <th>Batch Number</th>
                    <th>Manufacturer</th>
                    <th style="text-align:right;">Stock Quantity</th>
                    <th style="text-align:right;">Cost Price</th>
                    <th style="text-align:right;">Purchase Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${(data.expenseBreakdown?.pharmacyPurchases || []).map(p => `
                    <tr>
                      <td style="font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(p.supplier || 'Direct Agency')}</td>
                      <td style="font-family:monospace;">${escapeHtml(p.purchaseDate)}</td>
                      <td style="font-weight:600;">${escapeHtml(p.medicineName)}</td>
                      <td style="font-family:monospace; color:#475569;">${escapeHtml(p.batchNumber)}</td>
                      <td>${escapeHtml(p.manufacturer || '-')}</td>
                      <td style="text-align:right; font-weight:600;">${p.quantity}</td>
                      <td style="text-align:right;">₹${formatCurrency(p.costPrice)}</td>
                      <td style="text-align:right; font-weight:800; color:#92400e;">₹${formatCurrency(p.purchaseAmount)}</td>
                    </tr>
                  `).join('')}
                  ${(!data.expenseBreakdown?.pharmacyPurchases || data.expenseBreakdown.pharmacyPurchases.length === 0) ? `
                    <tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--cv-text-muted);">No pharmacy purchases found in this time window.</td></tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab 2: Operational Expenses Table -->
          <div id="expenseOperationalTab" style="${currentExpenseTab === 'OPERATIONAL' ? '' : 'display:none;'}">
            <div style="overflow-x:auto;">
              <table class="cv-money-table">
                <thead>
                  <tr>
                    <th>Expense #</th>
                    <th>Category</th>
                    <th>Title / Description</th>
                    <th>Payee / Vendor</th>
                    <th>Expense Date</th>
                    <th>Payment Method</th>
                    <th>Receipt #</th>
                    <th style="text-align:right;">Amount</th>
                    <th style="text-align:center;">Status</th>
                    <th style="text-align:center;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${(data.expenseBreakdown?.operationalExpenses || []).map(e => `
                    <tr>
                      <td style="font-family:monospace; font-weight:700;">${escapeHtml(e.expenseNumber)}</td>
                      <td><span style="font-size:0.72rem; padding:0.15rem 0.4rem; background:#fef3c7; color:#92400e; border-radius:4px; font-weight:600;">${escapeHtml(e.category)}</span></td>
                      <td style="font-weight:600;">${escapeHtml(e.title)}</td>
                      <td>${escapeHtml(e.payeeVendor || '-')}</td>
                      <td style="font-family:monospace;">${escapeHtml(e.expenseDate)}</td>
                      <td>${escapeHtml(e.paymentMethod)}</td>
                      <td style="font-family:monospace;">${escapeHtml(e.receiptNumber || '-')}</td>
                      <td style="text-align:right; font-weight:800; color:#b91c1c;">₹${formatCurrency(e.amount)}</td>
                      <td style="text-align:center;">
                        <span class="cv-payment-balance-badge ${e.status === 'PAID' ? 'cv-badge-paid' : 'cv-badge-unpaid'}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">
                          ${escapeHtml(e.status || 'PAID')}
                        </span>
                      </td>
                      <td style="text-align:center;">
                        <button type="button" class="cv-btn-secondary" onclick="Admin.deleteOperationalExpense(${e.id}, '${escapeHtml(e.expenseNumber)}', '${formatCurrency(e.amount)}')" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:#dc2626;" title="Cancel this expense record">
                          Delete
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                  ${(!data.expenseBreakdown?.operationalExpenses || data.expenseBreakdown.operationalExpenses.length === 0) ? `
                    <tr><td colspan="10" style="text-align:center; padding:1.5rem; color:var(--cv-text-muted);">No operational expenses recorded. Click "+ Add Operational Expense" to record one.</td></tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Section 5: TRANSACTION HISTORY & FINANCIAL LEDGER (Sections 28 & 29) -->
        <div class="cv-card" style="padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <h2 style="font-size:1.05rem; font-weight:800; color:var(--cv-deep-blue); margin:0;">Transaction History &amp; Financial Ledger</h2>
              <p style="font-size:0.78rem; color:var(--cv-text-muted); margin:0.2rem 0 0 0;">Unified audit log of all clinical revenues, billing invoices, supplier purchases &amp; operational expenses</p>
            </div>

            <!-- Filter tabs & Search Input -->
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
              <div class="cv-money-period-pills" style="padding:0.2rem;">
                <button type="button" class="cv-money-pill-btn ${currentMoneyTxFilter === 'ALL' ? 'active' : ''}" onclick="Admin.filterMoneyTransactions('ALL')">All (${data.recentTransactions?.length || 0})</button>
                <button type="button" class="cv-money-pill-btn ${currentMoneyTxFilter === 'REVENUE' ? 'active' : ''}" onclick="Admin.filterMoneyTransactions('REVENUE')">Revenue</button>
                <button type="button" class="cv-money-pill-btn ${currentMoneyTxFilter === 'EXPENSE' ? 'active' : ''}" onclick="Admin.filterMoneyTransactions('EXPENSE')">Expenses</button>
              </div>

              <!-- Search input (Requirement 29) -->
              <div style="position:relative;">
                <input type="text" id="moneyTxSearchInput" class="cv-form-input" placeholder="Search Doctor, Patient, Supplier, Bill #..." style="height:36px; width:260px; font-size:0.8rem; padding-left:2rem;" oninput="Admin.searchMoneyTransactions(this.value)">
                <svg style="width:14px; height:14px; color:#94a3b8; position:absolute; left:0.65rem; top:50%; transform:translateY(-50%);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table class="cv-money-table" id="moneyTransactionTable">
              <thead>
                <tr>
                  <th style="width:90px;">Type</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Reference #</th>
                  <th>Patient / Supplier</th>
                  <th>Doctor</th>
                  <th>Date &amp; Time</th>
                  <th style="text-align:right;">Amount</th>
                  <th style="text-align:center;">Payment Status</th>
                </tr>
              </thead>
              <tbody id="moneyTransactionTableBody">
                ${renderMoneyTransactionRows(data.recentTransactions || [])}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  function renderRevenueVisualDistributionBar(sources) {
    if (!sources) return '';
    const total = sources.totalBilled || 1;
    const opPct = sources.op?.percentage || 0;
    const ipPct = sources.ip?.percentage || 0;
    const phPct = sources.pharmacy?.percentage || 0;
    const labPct = sources.laboratory?.percentage || 0;

    return `
      <div>
        <div style="display:flex; height:14px; width:100%; border-radius:7px; overflow:hidden; background:#e2e8f0; margin-bottom:0.75rem;">
          <div style="width:${opPct}%; background:#3b82f6;" title="OP: ${opPct}%"></div>
          <div style="width:${ipPct}%; background:#10b981;" title="IP: ${ipPct}%"></div>
          <div style="width:${phPct}%; background:#8b5cf6;" title="Pharmacy: ${phPct}%"></div>
          <div style="width:${labPct}%; background:#f59e0b;" title="Laboratory: ${labPct}%"></div>
        </div>
        <div style="display:flex; align-items:center; justify-content:center; gap:1.5rem; flex-wrap:wrap; font-size:0.75rem; color:#475569; font-weight:600;">
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:#3b82f6;"></span>
            <span>OP: ${opPct}% (₹${formatCurrency(sources.op?.billed || 0)})</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:#10b981;"></span>
            <span>IP: ${ipPct}% (₹${formatCurrency(sources.ip?.billed || 0)})</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:#8b5cf6;"></span>
            <span>Pharmacy: ${phPct}% (₹${formatCurrency(sources.pharmacy?.billed || 0)})</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:#f59e0b;"></span>
            <span>Laboratory: ${labPct}% (₹${formatCurrency(sources.laboratory?.billed || 0)})</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderDoctorRevenueRows(doctors) {
    if (!doctors || doctors.length === 0) {
      return `<tr><td colspan="10" style="text-align:center; padding:1.5rem; color:var(--cv-text-muted);">No doctor revenue records found for this period.</td></tr>`;
    }

    return doctors.map(d => `
      <tr>
        <td style="font-weight:700; color:var(--cv-deep-blue);">${escapeHtml(d.doctorName)}</td>
        <td>
          <div style="font-weight:600;">${escapeHtml(d.department || 'General')}</div>
          <div style="font-size:0.72rem; color:var(--cv-text-muted);">${escapeHtml(d.specialization || '')}</div>
        </td>
        <td style="text-align:right;">${d.opCount}</td>
        <td style="text-align:right;">₹${formatCurrency(d.opRevenue)}</td>
        <td style="text-align:right;">${d.ipCount}</td>
        <td style="text-align:right;">₹${formatCurrency(d.ipRevenue)}</td>
        <td style="text-align:right; font-weight:800; color:#0f172a;">₹${formatCurrency(d.totalRevenueBilled)}</td>
        <td style="text-align:right; font-weight:700; color:#059669;">₹${formatCurrency(d.totalRevenueCollected)}</td>
        <td style="text-align:right; font-weight:700; color:#dc2626;">₹${formatCurrency(d.outstanding)}</td>
        <td style="text-align:right; font-weight:700; color:#3b82f6;">${d.percentage}%</td>
      </tr>
    `).join('');
  }

  function renderMoneyTransactionRows(txs) {
    if (!txs || txs.length === 0) {
      return `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--cv-text-muted);">No financial transactions match your query.</td></tr>`;
    }

    return txs.map(t => {
      const isRev = (t.type === 'REVENUE');
      return `
        <tr>
          <td>
            <span class="${isRev ? 'cv-money-badge-rev' : 'cv-money-badge-exp'}">
              ${escapeHtml(t.type)}
            </span>
          </td>
          <td style="font-weight:600;">${escapeHtml(t.category)}</td>
          <td><span style="font-size:0.72rem; font-family:monospace; background:#f1f5f9; padding:0.15rem 0.4rem; border-radius:4px;">${escapeHtml(t.source)}</span></td>
          <td style="font-family:monospace; font-weight:700;">${escapeHtml(t.referenceNumber)}</td>
          <td>${escapeHtml(isRev ? t.patientName : t.supplierName)}</td>
          <td>${escapeHtml(t.doctorName)}</td>
          <td style="font-family:monospace; font-size:0.78rem;">
            ${escapeHtml(t.date)} ${t.time ? `<span style="color:#94a3b8;">${escapeHtml(t.time)}</span>` : ''}
          </td>
          <td style="text-align:right; font-weight:800; color:${isRev ? '#065f46' : '#92400e'};">
            ${isRev ? '+' : '-'} ₹${formatCurrency(t.amount)}
          </td>
          <td style="text-align:center;">
            <span class="cv-payment-balance-badge ${t.paymentStatus === 'PAID' ? 'cv-badge-paid' : 'cv-badge-unpaid'}" style="font-size:0.7rem; padding:0.15rem 0.45rem;">
              ${escapeHtml(t.paymentStatus || 'PAID')}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterMoneyPeriod(period) {
    if (period === 'CUSTOM') {
      const box = document.getElementById('moneyCustomRangeBox');
      if (box) box.style.display = (box.style.display === 'none') ? 'flex' : 'none';
      currentMoneyPeriod = 'CUSTOM';
      document.querySelectorAll('.cv-money-period-pills button').forEach(b => b.classList.remove('active'));
      const customBtn = Array.from(document.querySelectorAll('.cv-money-period-pills button')).find(b => b.textContent.includes('Custom'));
      if (customBtn) customBtn.classList.add('active');
      return;
    }
    renderMoneyManagementModule(period);
  }

  function applyCustomMoneyDateRange() {
    const fromVal = document.getElementById('moneyCustomFromDate')?.value;
    const toVal = document.getElementById('moneyCustomToDate')?.value;
    if (!fromVal || !toVal) {
      alert('Please select both From Date and To Date');
      return;
    }
    const fromFmt = formatDateFromInput(fromVal);
    const toFmt = formatDateFromInput(toVal);
    renderMoneyManagementModule('CUSTOM', fromFmt, toFmt);
  }

  function formatDateFromInput(val) {
    // Converts YYYY-MM-DD to DD/MM/YYYY
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
  }

  function formatDateForInput(val) {
    // Converts DD/MM/YYYY to YYYY-MM-DD
    if (!val) return '';
    const parts = val.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return val;
  }

  function switchIpViewMode(mode) {
    currentIpViewMode = mode;
    const wardMount = document.getElementById('ipWardCategoriesMount');
    const bedMount = document.getElementById('ipBedsMount');
    if (wardMount && bedMount) {
      wardMount.style.display = (mode === 'WARDS') ? 'block' : 'none';
      bedMount.style.display = (mode === 'BEDS') ? 'block' : 'none';
    }
    document.querySelectorAll('#ipWardCategoriesMount, #ipBedsMount').forEach(el => {});
  }

  function switchExpenseTab(tab) {
    currentExpenseTab = tab;
    const purMount = document.getElementById('expensePurchasesTab');
    const opMount = document.getElementById('expenseOperationalTab');
    if (purMount && opMount) {
      purMount.style.display = (tab === 'PURCHASES') ? 'block' : 'none';
      opMount.style.display = (tab === 'OPERATIONAL') ? 'block' : 'none';
    }
    document.querySelectorAll('.cv-lab-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab === 'PURCHASES' ? 'purchases' : 'operational'));
    });
  }

  function sortDoctorRevenue(sortType) {
    currentDoctorSort = sortType;
    if (!currentMoneyData || !currentMoneyData.doctorRevenueList) return;
    const list = [...currentMoneyData.doctorRevenueList];
    if (sortType === 'HIGHEST') {
      list.sort((a, b) => (b.totalRevenueBilled || 0) - (a.totalRevenueBilled || 0));
    } else if (sortType === 'LOWEST') {
      list.sort((a, b) => (a.totalRevenueBilled || 0) - (b.totalRevenueBilled || 0));
    } else if (sortType === 'NAME') {
      list.sort((a, b) => (a.doctorName || '').localeCompare(b.doctorName || ''));
    }
    const tbody = document.getElementById('doctorRevenueTableBody');
    if (tbody) tbody.innerHTML = renderDoctorRevenueRows(list);
  }

  function filterMoneyTransactions(filterType) {
    currentMoneyTxFilter = filterType;
    applyMoneyTxFilters();
  }

  function searchMoneyTransactions(query) {
    currentMoneyTxSearch = (query || '').trim().toLowerCase();
    applyMoneyTxFilters();
  }

  function applyMoneyTxFilters() {
    if (!currentMoneyData || !currentMoneyData.recentTransactions) return;
    let list = currentMoneyData.recentTransactions;

    if (currentMoneyTxFilter !== 'ALL') {
      list = list.filter(t => t.type === currentMoneyTxFilter);
    }

    if (currentMoneyTxSearch) {
      list = list.filter(t => {
        const doc = (t.doctorName || '').toLowerCase();
        const pat = (t.patientName || '').toLowerCase();
        const sup = (t.supplierName || '').toLowerCase();
        const ref = (t.referenceNumber || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        return doc.includes(currentMoneyTxSearch) ||
               pat.includes(currentMoneyTxSearch) ||
               sup.includes(currentMoneyTxSearch) ||
               ref.includes(currentMoneyTxSearch) ||
               cat.includes(currentMoneyTxSearch);
      });
    }

    const tbody = document.getElementById('moneyTransactionTableBody');
    if (tbody) tbody.innerHTML = renderMoneyTransactionRows(list);
  }

  function showRecordExpenseModal() {
    const todayIso = new Date().toISOString().split('T')[0];
    const modalHtml = `
      <div id="recordExpenseModal" class="cv-invoice-modal-overlay">
        <div style="background:#fff; width:100%; max-width:550px; border-radius:10px; box-shadow:var(--cv-shadow-lg); overflow:hidden; margin:auto;">
          <div style="padding:1rem 1.25rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; background:#fef3c7; color:#92400e;">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              </span>
              <h3 style="margin:0; font-size:1rem; font-weight:800; color:var(--cv-deep-blue);">Record Hospital Expense</h3>
            </div>
            <button type="button" class="cv-btn-secondary" onclick="document.getElementById('recordExpenseModal').remove()" style="padding:0.3rem 0.6rem;">&times;</button>
          </div>

          <form id="recordExpenseForm" onsubmit="Admin.submitRecordExpense(event)" style="padding:1.25rem; display:flex; flex-direction:column; gap:0.85rem;">
            <div>
              <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">EXPENSE CATEGORY *</label>
              <select id="expCategory" class="cv-form-select" required style="height:38px;">
                <option value="GENERAL EXPENSES">GENERAL EXPENSES (Facility, Power, Cleaning)</option>
                <option value="LAB EXPENSES">LAB EXPENSES (Reagents, Kits, Diagnostics)</option>
                <option value="OTHER EXPENSES">OTHER EXPENSES (Equipment AMC, Maintenance)</option>
                <option value="UTILITIES">UTILITIES (Water, Electricity, Internet)</option>
                <option value="MAINTENANCE">MAINTENANCE (Building, Biomedical repair)</option>
                <option value="STAFF &amp; DOCTOR PAYOUTS">STAFF &amp; DOCTOR PAYOUTS</option>
              </select>
            </div>

            <div>
              <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">TITLE / DESCRIPTION *</label>
              <input type="text" id="expTitle" class="cv-form-input" required placeholder="e.g. Hematology Analyzer Reagent Packs" style="height:38px;">
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
              <div>
                <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">PAYEE / VENDOR *</label>
                <input type="text" id="expVendor" class="cv-form-input" required placeholder="e.g. TransAsia Bio-Medicals" style="height:38px;">
              </div>
              <div>
                <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">AMOUNT (₹) *</label>
                <input type="number" id="expAmount" class="cv-form-input" required min="1" step="0.01" placeholder="0.00" style="height:38px; font-weight:700;">
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
              <div>
                <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">EXPENSE DATE *</label>
                <input type="date" id="expDate" class="cv-form-input" required value="${todayIso}" style="height:38px;">
              </div>
              <div>
                <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">PAYMENT METHOD</label>
                <select id="expMethod" class="cv-form-select" style="height:38px;">
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
              <div>
                <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">INVOICE / RECEIPT #</label>
                <input type="text" id="expReceipt" class="cv-form-input" placeholder="e.g. INV-2026-901" style="height:38px;">
              </div>
              <div>
                <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">PAYMENT STATUS</label>
                <select id="expStatus" class="cv-form-select" style="height:38px;">
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
            </div>

            <div>
              <label style="font-size:0.75rem; font-weight:700; color:var(--cv-text-muted); display:block; margin-bottom:0.25rem; text-transform:uppercase;">NOTES / AUDIT REMARKS</label>
              <textarea id="expNotes" class="cv-form-input" rows="2" placeholder="Optional audit explanation..." style="resize:vertical;"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:0.5rem; border-top:1px solid #e2e8f0; padding-top:0.75rem;">
              <button type="button" class="cv-btn-secondary" onclick="document.getElementById('recordExpenseModal').remove()">Cancel</button>
              <button type="submit" id="btnSubmitRecordExpense" class="cv-btn-primary" style="background:#059669; border-color:#059669; font-weight:700;">Record Expense</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async function submitRecordExpense(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitRecordExpense');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="cv-spinner" style="width:14px; height:14px; margin-right:0.3rem;"></span> Saving...';
    }

    const payload = {
      category: document.getElementById('expCategory')?.value,
      title: document.getElementById('expTitle')?.value?.trim(),
      payeeVendor: document.getElementById('expVendor')?.value?.trim(),
      amount: parseFloat(document.getElementById('expAmount')?.value || 0),
      expenseDate: document.getElementById('expDate')?.value,
      paymentMethod: document.getElementById('expMethod')?.value,
      receiptNumber: document.getElementById('expReceipt')?.value?.trim(),
      status: document.getElementById('expStatus')?.value,
      notes: document.getElementById('expNotes')?.value?.trim()
    };

    try {
      const res = await Api.post('/api/admin/money/expenses', payload);
      if (res && res.success) {
        showToast('Hospital expense recorded successfully: ' + (res.data?.expenseNumber || ''));
        document.getElementById('recordExpenseModal')?.remove();
        renderMoneyManagementModule(currentMoneyPeriod, currentMoneyCustomStart, currentMoneyCustomEnd);
      } else {
        alert('Could not record expense: ' + (res?.message || 'Error'));
      }
    } catch (err) {
      alert('Network or server error while recording expense.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Record Expense';
      }
    }
  }

  async function deleteOperationalExpense(id, expNum, amt) {
    if (!confirm(`Are you sure you want to cancel expense ${expNum} (₹${amt})? This will be recorded in the audit log.`)) {
      return;
    }

    try {
      const res = await Api.delete(`/api/admin/money/expenses/${id}`);
      if (res && res.success) {
        showToast(`Expense ${expNum} cancelled.`);
        renderMoneyManagementModule(currentMoneyPeriod, currentMoneyCustomStart, currentMoneyCustomEnd);
      } else {
        alert('Could not cancel expense: ' + (res?.message || 'Error'));
      }
    } catch (err) {
      alert('Error cancelling expense.');
    }
  }

  return {
    init: init,
    renderDashboardLayout: renderDashboardLayout,
    renderOpModule: renderOpModule,
    renderIpModule: renderIpModule,
    renderPharmacyModule: renderPharmacyModule,
    showPharmacyInvoiceModal: showPharmacyInvoiceModal,
    showDischargeModal: showDischargeModal,
    showIpDetailsModal: showIpDetailsModal,
    showAddRoomModal: showAddRoomModal,
    loadDashboardData: loadDashboardData,
    loadChartData: loadChartData,
    renderLaboratoryModule: renderLaboratoryModule,
    showLabResultsModal: showLabResultsModal,
    showPrintableLabReportModal: showPrintableLabReportModal,
    showLabOrderDetailsModal: showLabOrderDetailsModal,
    markLabOrderCompleted: markLabOrderCompleted,
    renderBillingModule: renderBillingModule,
    showCentralInvoiceModal: showCentralInvoiceModal,
    showGenericRecordDetailsModal: showGenericRecordDetailsModal,
    selectPatientForOpCategory: (id) => selectPatientForCategory(id, 'op'),
    selectPatientForIpCategory: (id) => selectPatientForCategory(id, 'ip'),
    selectPatientForPhCategory: (id) => selectPatientForCategory(id, 'pharmacy'),
    selectPatientForLabCategory: (id) => selectPatientForCategory(id, 'laboratory'),
    printDedicatedCentralInvoice: printDedicatedCentralInvoice,
    printDedicatedDocument: printDedicatedDocument,
    buildOpBillPrintHtml: buildOpBillPrintHtml,
    buildIpBillPrintHtml: buildIpBillPrintHtml,
    buildPharmacyBillPrintHtml: buildPharmacyBillPrintHtml,
    buildLabBillPrintHtml: buildLabBillPrintHtml,
    renderSettingsModule: renderSettingsModule,
    handlePopstate: handlePopstate,
    dispatchAdminRoute: dispatchAdminRoute,
    navigateBack: navigateBack,
    navigateTo: navigateTo,
    filterSettingsSection: filterSettingsSection,
    updateDoctorStatus: updateDoctorStatus,
    showAddDoctorModal: showAddDoctorModal,
    submitCreateDoctor: submitCreateDoctor,
    showEditDoctorModal: showEditDoctorModal,
    submitUpdateDoctor: submitUpdateDoctor,
    toggleStaffStatus: toggleStaffStatus,
    showResetStaffPasswordModal: showResetStaffPasswordModal,
    submitResetStaffPassword: submitResetStaffPassword,
    showAddStaffModal: showAddStaffModal,
    submitCreateStaff: submitCreateStaff,
    showEditStaffModal: showEditStaffModal,
    submitUpdateStaff: submitUpdateStaff,
    selectThemePreset: selectThemePreset,
    onCustomColorChange: onCustomColorChange,
    onCustomColorTextInput: onCustomColorTextInput,
    saveAppearanceTheme: saveAppearanceTheme,
    saveHospitalProfile: saveHospitalProfile,
    saveBillingSettings: saveBillingSettings,
    savePharmacySettings: savePharmacySettings,
    saveLabSettings: saveLabSettings,
    saveNotificationSettings: saveNotificationSettings,
    saveSecuritySettings: saveSecuritySettings,
    showChangeAdminPasswordModal: showChangeAdminPasswordModal,
    submitChangeAdminPassword: submitChangeAdminPassword,
    closeModal: closeModal,
    renderMoneyManagementModule: renderMoneyManagementModule,
    filterMoneyPeriod: filterMoneyPeriod,
    applyCustomMoneyDateRange: applyCustomMoneyDateRange,
    switchIpViewMode: switchIpViewMode,
    switchExpenseTab: switchExpenseTab,
    sortDoctorRevenue: sortDoctorRevenue,
    filterMoneyTransactions: filterMoneyTransactions,
    searchMoneyTransactions: searchMoneyTransactions,
    showRecordExpenseModal: showRecordExpenseModal,
    submitRecordExpense: submitRecordExpense,
    deleteOperationalExpense: deleteOperationalExpense,
    openPaymentDoneModal: openPaymentDoneModal,
    executeBillPayment: executeBillPayment,
    refreshCurrentBillingCategory: refreshCurrentBillingCategory,
    showPaymentConfirmationModal: showPaymentConfirmationModal,
    showBedPaymentModal: showBedPaymentModal
  };
})();
window.AdminModule = Admin;
window.Admin = Admin;



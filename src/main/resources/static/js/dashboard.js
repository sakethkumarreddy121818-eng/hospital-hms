/**
 * CAREVISTA HOSPITAL MANAGEMENT SAAS
 * Dashboard Controller Module - Phase 1 Foundation
 */

const Dashboard = (function () {
  'use strict';

  function render(user) {
    if (!user) return;

    // Update user info in sidebar
    const userNameElem = document.getElementById('sidebarUserName');
    const userRoleElem = document.getElementById('sidebarUserRole');
    const tenantBadge = document.getElementById('sidebarTenantBadge');
    const tenantName = document.getElementById('sidebarTenantName');

    if (userNameElem) userNameElem.textContent = user.fullName || user.email;
    if (userRoleElem) userRoleElem.textContent = formatRole(user.role);

    if (user.role === 'SUPER_ADMIN') {
      if (tenantBadge) tenantBadge.textContent = 'SAAS PLATFORM';
      if (tenantName) tenantName.textContent = 'Global Operations';
      renderSuperAdminDashboard(user);
    } else {
      if (tenantBadge) tenantBadge.textContent = 'HOSPITAL TENANT';
      if (user.role === 'ADMIN') {
        user.hospitalName = 'CITYCARE SUPER SPECIALITY HOSPITAL';
        if (tenantName) tenantName.textContent = 'CITYCARE SUPER SPECIALITY HOSPITAL';
        renderAdminDashboard(user);
      } else {
        if (tenantName) tenantName.textContent = user.hospitalName || 'Hospital Center';
        renderEmployeeDashboard(user);
      }
    }

    // Attach logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = () => Auth.logout();
    }
  }

  function formatRole(role) {
    if (role === 'SUPER_ADMIN') return 'Super Administrator';
    if (role === 'ADMIN') return 'Hospital Administrator';
    if (role === 'EMPLOYEE') return 'Hospital Staff / Employee';
    return role;
  }

  function renderSuperAdminDashboard(user) {
    if (typeof SuperAdmin !== 'undefined' && SuperAdmin.init) {
      SuperAdmin.init();
    }
  }

  function renderAdminDashboard(user) {
    if (typeof Admin !== 'undefined' && Admin.init) {
      Admin.init(user);
    }
  }

  function renderEmployeeDashboard(user) {
    const navList = document.getElementById('sidebarNavList');
    navList.innerHTML = `
      <li><a class="cv-nav-item active"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg> Workstation</a></li>
      <li><a class="cv-nav-item"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> Outpatient (OP) Desk</a></li>
      <li><a class="cv-nav-item"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Patient Search</a></li>
      <li><a class="cv-nav-item"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg> OP Invoices</a></li>
    `;

    const mainContent = document.getElementById('dashboardMain');
    mainContent.innerHTML = `
      <div class="cv-page-header">
        <div>
          <h1 class="cv-page-title">${user.department || 'Employee Workstation'}</h1>
          <p class="cv-page-subtitle">Hospital: ${user.hospitalName} &bull; Staff Member: ${user.fullName}</p>
        </div>
        <div class="cv-badge-status">
          <span class="cv-status-pulse"></span>
          <span>Department Access Active</span>
        </div>
      </div>

      <div class="cv-welcome-card">
        <h2>Department Workstation Online</h2>
        <p>You are logged in under hospital <strong>${user.hospitalName}</strong> with role <strong>${user.role}</strong> and permissions: <code>${user.permissions || 'Standard'}</code>.</p>
        <p style="margin-top: 0.8rem; font-size: 0.86rem; color: #64748b;">
          <strong>Workstation ID:</strong> ${user.id} &bull; 
          <strong>Email:</strong> ${user.email} &bull; 
          <strong>Department:</strong> ${user.department || 'Front Desk'}
        </p>
        <div style="margin-top:1.25rem; display:flex; gap:0.75rem;">
          <button type="button" class="cv-btn-primary" id="btnEmpGoOpDesk">Open OP Registration Desk</button>
          <button type="button" class="cv-btn-secondary" id="btnEmpGoOpHistory">View OP Records</button>
        </div>
      </div>
    `;

    document.getElementById('btnEmpGoOpDesk')?.addEventListener('click', () => {
      navList.querySelectorAll('.cv-nav-item').forEach(i => i.classList.remove('active'));
      navList.children[1]?.querySelector('a')?.classList.add('active');
      Admin.renderOpModule('register');
    });

    document.getElementById('btnEmpGoOpHistory')?.addEventListener('click', () => {
      navList.querySelectorAll('.cv-nav-item').forEach(i => i.classList.remove('active'));
      navList.children[3]?.querySelector('a')?.classList.add('active');
      Admin.renderOpModule('history');
    });

    navList.querySelectorAll('.cv-nav-item').forEach((item, idx) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navList.querySelectorAll('.cv-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        if (idx === 0) {
          renderEmployeeDashboard(user);
        } else if (idx === 1 || idx === 2) {
          Admin.renderOpModule('register');
        } else if (idx === 3) {
          Admin.renderOpModule('history');
        }
      });
    });
  }

  return {
    render: render
  };
})();

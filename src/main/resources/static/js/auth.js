/**
 * CAREVISTA HOSPITAL MANAGEMENT SAAS
 * Authentication Module - Single Login Controller
 */

const Auth = (function () {
  'use strict';

  let currentRole = 'SUPER_ADMIN';
  let currentUser = null;

  function init() {
    setupRoleSelector();
    setupPasswordToggle();
    setupLoginForm();
    setupDemoPills();
  }

  function setupRoleSelector() {
    const buttons = document.querySelectorAll('.cv-role-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentRole = btn.dataset.role;
        clearAlert();
        updateRoleDisplay();
      });
    });
  }

  function updateRoleDisplay() {
    const subtitle = document.getElementById('loginSubtitle');
    if (!subtitle) return;

    if (currentRole === 'SUPER_ADMIN') {
      subtitle.textContent = 'Sign in to access SaaS Operations and Hospital Governance';
    } else if (currentRole === 'ADMIN') {
      subtitle.textContent = 'Sign in to manage Hospital Operations, Doctors, and Modules';
    } else if (currentRole === 'EMPLOYEE') {
      subtitle.textContent = 'Sign in to access your Department & Workstation Portal';
    }
  }

  function setupPasswordToggle() {
    const toggleBtn = document.getElementById('pwToggleBtn');
    const pwInput = document.getElementById('loginPassword');
    if (!toggleBtn || !pwInput) return;

    toggleBtn.addEventListener('click', () => {
      const isPassword = pwInput.type === 'password';
      pwInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
  }

  function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      // Validation
      if (!email) {
        showAlert('Please enter your email ID.', 'danger');
        document.getElementById('loginEmail').focus();
        return;
      }

      if (!password) {
        showAlert('Please enter your password.', 'danger');
        document.getElementById('loginPassword').focus();
        return;
      }

      setLoading(true);

      const res = await Api.post('/api/auth/login', {
        email: email,
        password: password,
        role: currentRole
      });

      setLoading(false);

      if (res.ok && res.data) {
        currentUser = res.data;
        showAlert('Login successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          showDashboard(currentUser);
        }, 500);
      } else {
        showAlert(res.message || 'Invalid login credentials. Please try again.', 'danger');
      }
    });
  }

  function setupDemoPills() {
    const pills = document.querySelectorAll('.cv-demo-pill');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const role = pill.dataset.role;
        const email = pill.dataset.email;
        const pass = pill.dataset.pass;

        // Set role button
        const targetBtn = document.querySelector(`.cv-role-btn[data-role="${role}"]`);
        if (targetBtn) {
          targetBtn.click();
        }

        // Fill inputs
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = pass;
        clearAlert();
      });
    });
  }

  function showAlert(msg, type = 'danger') {
    const alertBox = document.getElementById('loginAlert');
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `cv-alert cv-alert-${type} show`;
  }

  function clearAlert() {
    const alertBox = document.getElementById('loginAlert');
    if (!alertBox) return;
    alertBox.textContent = '';
    alertBox.className = 'cv-alert';
  }

  function setLoading(isLoading) {
    const btn = document.getElementById('loginSubmitBtn');
    const spinner = document.getElementById('loginSpinner');
    const btnText = document.getElementById('loginBtnText');
    if (!btn) return;

    btn.disabled = isLoading;
    if (isLoading) {
      spinner?.classList.add('show');
      if (btnText) btnText.textContent = 'Verifying credentials...';
    } else {
      spinner?.classList.remove('show');
      if (btnText) btnText.textContent = 'Sign In';
    }
  }

  async function checkSession() {
    const res = await Api.get('/api/auth/me');
    if (res.ok && res.data) {
      currentUser = res.data;
      showDashboard(currentUser);
    } else {
      showLogin();
    }
  }

  async function logout() {
    await Api.post('/api/auth/logout', {});
    currentUser = null;
    showLogin();
  }

  function showLogin() {
    document.body.classList.remove('cv-dashboard-active');
    document.body.classList.remove('cv-sidebar-collapsed-mode');
    const appSidebar = document.getElementById('appSidebar');
    if (appSidebar) {
      appSidebar.classList.remove('cv-sidebar-collapsed');
    }
    const navList = document.getElementById('sidebarNavList');
    if (navList) navList.innerHTML = '';
    const backBtn = document.getElementById('cvFloatingBackBtn');
    const backWrap = document.getElementById('sidebarBackWrap');
    if (backBtn) backBtn.style.display = 'none';
    if (backWrap) backWrap.style.display = 'none';

    // Remove any active modals
    const modalContainers = document.querySelectorAll('#activeModalContainer, .cv-modal-backdrop, .cv-op-modal-backdrop');
    modalContainers.forEach(m => m.remove());

    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) {}

    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('dashboardView').classList.remove('active');
    clearAlert();
  }

  function showDashboard(user) {
    document.body.classList.add('cv-dashboard-active');
    document.getElementById('loginView').style.display = 'none';
    const dbView = document.getElementById('dashboardView');
    dbView.classList.add('active');
    Dashboard.render(user);
  }

  return {
    init: init,
    checkSession: checkSession,
    logout: logout,
    getCurrentUser: () => currentUser
  };
})();

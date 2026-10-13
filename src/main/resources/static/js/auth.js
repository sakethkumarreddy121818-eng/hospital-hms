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
        if (res.data.token) {
          Api.setToken(res.data.token);
        }
        try {
          sessionStorage.setItem('carevista_user', JSON.stringify(res.data));
          localStorage.removeItem('carevista_user');
          localStorage.removeItem('carevista_token');
        } catch (e) {}
        showAlert('Login successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          showDashboard(currentUser);
        }, 400);
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
    // Only attempt session restoration if active tab has a session token
    const token = Api.getToken();
    if (!token) {
      currentUser = null;
      try {
        sessionStorage.removeItem('carevista_user');
        localStorage.removeItem('carevista_user');
        localStorage.removeItem('carevista_token');
      } catch (e) {}
      showLogin();
      return;
    }

    const res = await Api.get('/api/auth/me');
    if (res.ok && res.data) {
      currentUser = res.data;
      if (res.data.token) {
        Api.setToken(res.data.token);
      }
      try {
        sessionStorage.setItem('carevista_user', JSON.stringify(res.data));
        localStorage.removeItem('carevista_user');
        localStorage.removeItem('carevista_token');
      } catch (e) {}
      showDashboard(currentUser);
    } else {
      Api.setToken(null);
      currentUser = null;
      try {
        sessionStorage.removeItem('carevista_user');
        localStorage.removeItem('carevista_user');
        localStorage.removeItem('carevista_token');
      } catch (e) {}
      showLogin();
    }
  }

  async function logout() {
    try {
      await Api.post('/api/auth/logout', {});
    } catch (e) {}
    Api.setToken(null);
    currentUser = null;
    try {
      sessionStorage.removeItem('carevista_user');
      sessionStorage.removeItem('carevista_token');
      localStorage.removeItem('carevista_user');
      localStorage.removeItem('carevista_token');
    } catch (e) {}
    showLogin();
  }

  function handleSessionExpired() {
    Api.setToken(null);
    currentUser = null;
    try {
      sessionStorage.removeItem('carevista_user');
      sessionStorage.removeItem('carevista_token');
      localStorage.removeItem('carevista_user');
      localStorage.removeItem('carevista_token');
    } catch (e) {}
    showLogin();
    showAlert('Your session has expired. Please sign in again to continue.', 'danger');
  }

  function showLogin() {
    document.body.classList.remove('cv-dashboard-active');
    document.body.classList.remove('cv-sidebar-collapsed-mode');

    // Hide authenticated header components from login view
    const navSearch = document.getElementById('cvNavCenterSearch');
    if (navSearch) navSearch.style.display = 'none';
    const navActions = document.getElementById('cvNavActions');
    if (navActions) navActions.style.display = 'none';
    const navProfile = document.getElementById('cvNavProfilePill');
    if (navProfile) navProfile.style.display = 'none';
    const navUserName = document.getElementById('navTopUserName');
    if (navUserName) navUserName.textContent = '';
    const navAvatar = document.getElementById('navAvatarInitial');
    if (navAvatar) navAvatar.textContent = '';

    // Clear sidebar navigation & main dashboard DOM
    const appSidebar = document.getElementById('appSidebar');
    if (appSidebar) {
      appSidebar.classList.remove('cv-sidebar-collapsed');
    }
    const navList = document.getElementById('sidebarNavList');
    if (navList) navList.innerHTML = '';
    const dashboardMain = document.getElementById('dashboardMain');
    if (dashboardMain) dashboardMain.innerHTML = '';

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

    const loginView = document.getElementById('loginView');
    if (loginView) loginView.style.display = 'flex';
    const dbView = document.getElementById('dashboardView');
    if (dbView) dbView.classList.remove('active');
    clearAlert();
  }

  function showDashboard(user) {
    if (!user) {
      showLogin();
      return;
    }
    document.body.classList.add('cv-dashboard-active');

    // Show authenticated header components
    const navSearch = document.getElementById('cvNavCenterSearch');
    if (navSearch) navSearch.style.display = '';
    const navActions = document.getElementById('cvNavActions');
    if (navActions) navActions.style.display = '';
    const navProfile = document.getElementById('cvNavProfilePill');
    if (navProfile) navProfile.style.display = 'flex';

    const displayName = user.fullName || (user.role === 'ADMIN' ? 'Hospital Admin' : (user.role === 'SUPER_ADMIN' ? 'Super Administrator' : user.email));
    const navUserName = document.getElementById('navTopUserName');
    if (navUserName) navUserName.textContent = displayName;
    const navAvatar = document.getElementById('navAvatarInitial');
    if (navAvatar) navAvatar.textContent = displayName.charAt(0).toUpperCase();

    const loginView = document.getElementById('loginView');
    if (loginView) loginView.style.display = 'none';
    const dbView = document.getElementById('dashboardView');
    if (dbView) dbView.classList.add('active');

    Dashboard.render(user);
  }

  return {
    init: init,
    checkSession: checkSession,
    logout: logout,
    showLogin: showLogin,
    showDashboard: showDashboard,
    handleSessionExpired: handleSessionExpired,
    getCurrentUser: () => currentUser,
    isAuthenticated: () => currentUser !== null
  };
})();

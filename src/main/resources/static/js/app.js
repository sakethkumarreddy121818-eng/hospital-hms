/**
 * CAREVISTA HOSPITAL MANAGEMENT SAAS
 * Main Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  console.log('Initializing CareVista Hospital Management SaaS...');

  // Prevent full-page reload and unintended navigation when clicking brand logo/title or internal anchors
  document.addEventListener('click', (e) => {
    const brand = e.target.closest('.cv-brand') || e.target.closest('#cvBrandNav') || e.target.closest('.cv-brand-subtitle');
    if (brand) {
      e.preventDefault();
      e.stopPropagation();
      // Keep application on current page and form state normally without refresh or redirect
      return;
    }

    // Intercept any internal anchor with href="/" or href="" or href="#"
    const anchor = e.target.closest('a');
    if (anchor && (anchor.getAttribute('href') === '/' || anchor.getAttribute('href') === '' || anchor.getAttribute('href') === '#')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Initialize Auth module (listeners, role selector, form)
  Auth.init();

  // Check backend health & database connectivity
  try {
    const health = await Api.get('/api/health');
    if (health.ok) {
      console.log('CareVista Backend Health:', health.data);
      const healthBadge = document.getElementById('navHealthStatus');
      if (healthBadge) {
        healthBadge.textContent = 'MySQL Online';
      }
    } else {
      console.warn('Backend returned non-OK status:', health.message);
    }
  } catch (e) {
    console.error('Error connecting to CareVista backend:', e);
  }

  // Check if session already exists
  await Auth.checkSession();
});

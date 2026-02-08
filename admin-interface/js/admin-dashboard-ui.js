// admin-dashboard-ui.js - Menu interactions and simple UI glue
(function() {
  const ADMIN_DASHBOARD_UI = {};

  // Handle sign out
  ADMIN_DASHBOARD_UI.handleSignOut = function() {
    if (confirm('Are you sure you want to sign out?')) {
      if (typeof AUTH !== 'undefined' && typeof AUTH.logout === 'function') {
        AUTH.logout();
      } else {
        try { sessionStorage.removeItem('isAdmin'); sessionStorage.removeItem('currentUser'); } catch(e){}
        try { localStorage.removeItem('isAdmin'); localStorage.removeItem('currentUser'); } catch(e){}
      }

      const target = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.HOMEPAGE) ? CONSTANTS.PAGES.HOMEPAGE : '../../html/landing.html';
      window.location.href = target;
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin and redirect if not. Uses AUTH when available, otherwise falls back to stored user data.
    function checkAdmin() {
      let isAdmin = false;
      try {
        if (typeof AUTH !== 'undefined' && typeof AUTH.isAdmin === 'function') {
          isAdmin = AUTH.isAdmin();
        } else {
          // Fallback: check sessionStorage currentUser, isAdmin flag, or stored currentUser role
          try {
            const sCur = sessionStorage.getItem('currentUser');
            if (sCur) {
              const parsed = JSON.parse(sCur);
              isAdmin = parsed && parsed.role === 'admin';
            }
          } catch (e) {}

          if (!isAdmin) {
            isAdmin = sessionStorage.getItem('isAdmin') === '1';
          }

          if (!isAdmin) {
            const cur = localStorage.getItem('currentUser');
            if (cur) {
              try { const parsedL = JSON.parse(cur); if (parsedL && parsedL.role === 'admin') isAdmin = true; } catch (e) {}
            }
          }
        }
      } catch (e) {
        isAdmin = false;
      }

      if (!isAdmin) {
        alert('Access Denied: Admin only');
        const target = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.HOME) ? CONSTANTS.PAGES.HOME : '../../html/portal.html';
        window.location.href = target;
      }
    }

    try { checkAdmin(); } catch(e) { /* ignore if check fails during dev */ }

    // Menu navigation handler
    document.querySelectorAll('.menu-item:not(.has-submenu)').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Close any open submenus
        document.querySelectorAll('.menu-group ul.submenu.active').forEach(sm => sm.classList.remove('active'));
        document.querySelectorAll('.has-submenu.open').forEach(h => h.classList.remove('open'));

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
          section.classList.remove('active');
        });

        // Show selected section
        const sectionId = item.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
          section.classList.add('active');

          // If it's a status section, request ADMIN_SUBMISSIONS to render
          if (typeof ADMIN_SUBMISSIONS !== 'undefined') {
            if (sectionId === 'approved') ADMIN_SUBMISSIONS.showStatusSection('Approved');
            if (sectionId === 'declined') ADMIN_SUBMISSIONS.showStatusSection('Declined');
            if (sectionId === 'in-progress') ADMIN_SUBMISSIONS.showStatusSection('In Progress');
            if (sectionId === 'history') ADMIN_SUBMISSIONS.showStatusSection('Received');
          }
        }
      });
    });

    // Submenu toggle
    document.querySelectorAll('.has-submenu').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        const submenu = item.nextElementSibling;
        if (submenu && submenu.classList.contains('submenu')) {
          const wasActive = submenu.classList.contains('active');
          // close others
          document.querySelectorAll('.menu-group ul.submenu.active').forEach(sm => sm.classList.remove('active'));
          document.querySelectorAll('.has-submenu.open').forEach(h => h.classList.remove('open'));

          if (!wasActive) {
            submenu.classList.add('active');
            item.classList.add('open');
          }
        }
      });
    });

    // Submenu item click handler - show form sections
    document.querySelectorAll('.submenu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        const formType = item.textContent.trim();

        // Show request section
        document.querySelectorAll('.content-section').forEach(section => {
          section.classList.remove('active');
        });
        const section = document.getElementById('request');
        if (section) {
          section.classList.add('active');
        }

        // Show submissions for this form type
        if (typeof ADMIN_SUBMISSIONS !== 'undefined') {
          ADMIN_SUBMISSIONS.showFormTypeSubmissions(formType);
        }
      });
    });

    // Setup admin check
    if (typeof AUTH !== 'undefined' && !AUTH.isAdmin()) {
      alert('Access Denied: Admin only');
      const target = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.HOME) ? CONSTANTS.PAGES.HOME : '../../html/portal.html';
      window.location.href = target;
    }
  });

  // Expose ADMIN_DASHBOARD_UI globally
  window.ADMIN_DASHBOARD_UI = ADMIN_DASHBOARD_UI;
})();

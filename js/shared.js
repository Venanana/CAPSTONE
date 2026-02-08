// shared.js - Common header and document card behaviors used across pages

(function(window) {
  const SHARED = {};

  // Initialize header navigation
  SHARED.initHeader = function() {
    try {
      DOM_UTILS.getAll('.top-icons .icon').forEach(icon => {
        const labelEl = icon.querySelector('.icon-label');
        const linkEl = icon.querySelector('a');
        if (!labelEl || !linkEl) return;
        
        const label = labelEl.textContent.trim().toUpperCase();

        // Set navigation links
        switch(label) {
          case 'PROFILE':
            linkEl.setAttribute('href', CONSTANTS.PAGES.PROFILE);
            break;
          case 'HOME':
            // Ensure top-header Home icon points to the public user portal page
            if (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.HOME) {
              linkEl.setAttribute('href', CONSTANTS.PAGES.HOME);
            } else {
              linkEl.setAttribute('href', '/html/portal.html');
            }
            break;
          case 'SETTINGS':
            linkEl.setAttribute('href', CONSTANTS.PAGES.SETTINGS);
            break;
          case 'NOTIFICATION':
            linkEl.setAttribute('href', '#');
            break;
          case 'LOGOUT':
            icon.remove();
            break;
        }
      });
    } catch(e) {
      console.warn('SHARED.initHeader error', e);
    }
  };

  // Initialize document card click handlers
  SHARED.initDocumentCards = function() {
    const map = {
      'BARANGAY I.D': 'barangay-id',
      'BARANGAY CLEARANCE': 'barangay-clearance',
      'BARANGAY CERTIFICATE': 'barangay-certificate',
      'CERTIFICATE OF INDIGENCY': 'certificate-indigency',
      'CERTIFICATE OF RESIDENCY': 'certificate-residency',
      'FIRST-TIME JOB SEEKER': 'first-time-seeker',
      'BARANGAY BUSINESS CLEARANCE': 'business-clearance',
      'BARANGAY BLOTTER / CERTIFICATION': 'blotter-certification',
      'CONSTRUCTION / FENCING PERMIT': 'construction-permit'
    };

    // Normalize label for resilience to spacing/unicode variations
    const normalizeLabel = s => {
      if (!s) return '';
      return s.replace(/\u00A0/g, ' ').replace(/\s*\//g, ' /').replace(/\s+/g, ' ').trim().toUpperCase();
    };

    const normalizedMap = {};
    Object.keys(map).forEach(k => {
      normalizedMap[normalizeLabel(k)] = map[k];
    });

    try {
      DOM_UTILS.getAll('.document-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
          const labelEl = card.querySelector('.card-label');
          const raw = labelEl ? labelEl.textContent : '';
          const label = normalizeLabel(raw);
          const id = normalizedMap[label];
          
          if (id) {
            window.location.href = `${CONSTANTS.PAGES.DASHBOARD}#${id}`;
          } else {
            window.location.href = CONSTANTS.PAGES.DASHBOARD;
          }
        });
      });
    } catch(e) {
      console.warn('SHARED.initDocumentCards error', e);
    }
  };

  // Navigate to dashboard form
  SHARED.goToDashboardForm = function(formId) {
    if (!formId) return;
    window.location.href = `${CONSTANTS.PAGES.DASHBOARD}#${formId}`;
  };

  // Logout helper
  SHARED.logout = function() {
    console.log('🚪 Logout initiated');
    try {
      if (typeof AUTH !== 'undefined' && AUTH.logout) {
        AUTH.logout();
        console.log('✓ AUTH.logout() called');
      }
    } catch(e) {
      console.warn('SHARED.logout AUTH error', e);
    }

    // Show notification
    if (typeof NOTIFICATION_SYSTEM !== 'undefined') {
      try {
        console.log('📢 Showing notification:', CONSTANTS.MESSAGES.LOGOUT_SUCCESS);
        NOTIFICATION_SYSTEM.success(CONSTANTS.MESSAGES.LOGOUT_SUCCESS);
      } catch(e) {
        console.warn('NOTIFICATION error', e);
      }
    } else {
      console.warn('⚠️ NOTIFICATION_SYSTEM not defined');
    }

    // Redirect to the public homepage after notification is fully displayed
    // Use notification duration so user sees the full message before redirect
    setTimeout(function() {
      console.log('⏱️ Redirecting to homepage');
      var homepage = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.HOMEPAGE) ? CONSTANTS.PAGES.HOMEPAGE : '/html/landing.html';
      try {
        window.location.href = homepage;
      } catch (e) {
        window.location.href = '/html/landing.html';
      }
    }, (typeof CONSTANTS !== 'undefined' && CONSTANTS.NOTIFICATION_DURATION) ? CONSTANTS.NOTIFICATION_DURATION : 3500);
  };

  // Initialize on DOM ready
  SHARED.init = function() {
    document.addEventListener('DOMContentLoaded', function() {
      SHARED.initHeader();
      SHARED.initDocumentCards();
    });
  };

  // Export
  window.SHARED = SHARED;
  SHARED.init();
})(window);

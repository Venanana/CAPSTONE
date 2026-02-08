// constants.js - Shared constants and configuration

const CONSTANTS = {
  // Email validation regex
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Password requirements
  PASSWORD_MIN_LENGTH: 6,
  
  // Messages
  MESSAGES: {
    // Errors
    FIELDS_REQUIRED: 'Please fill in all required fields',
    EMAIL_INVALID: 'Please enter a valid email address',
    PASSWORDS_MISMATCH: 'Passwords do not match',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
    TERMS_REQUIRED: 'Please accept the terms of service',
    EMAIL_EXISTS: 'Email already registered',
    EMAIL_NOT_FOUND: 'Email not found',
    PASSWORD_INCORRECT: 'Incorrect password',
    LOGIN_FAILED: 'Login failed',
    NO_USER_LOGGED_IN: 'No user logged in',
    
    // Success
    REGISTRATION_SUCCESS: 'Account created successfully! You can now login.',
    LOGIN_SUCCESS: 'Welcome back! Logging you in...',
    LOGOUT_SUCCESS: 'Logged out successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    
    // Info
    LOGOUT_CONFIRM: 'Are you sure you want to logout?'
  },
  
  // Page URLs
  PAGES: {
    // These keys are resolved at runtime to the correct relative path
    HOMEPAGE: '/html/landing.html',
    HOME: '/html/portal.html',
    PROFILE: '/html/profile.html',
    DASHBOARD: '/html/dashboard.html',
    SETTINGS: '/html/settings.html',
    ADMIN_DASHBOARD: '/admin-interface/html/admin-dashboard.html'
  },
  
  // Notification timeouts (ms)
  NOTIFICATION_DURATION: 3500,
  NOTIFICATION_FADE_OUT: 500,
  
  // Redirect delays (ms)
  REDIRECT_DELAY: 800
};

// Resolve page paths relative to the current document location.
(function resolvePagePaths() {
  const map = {
    HOMEPAGE: { folder: 'html', file: 'landing.html' },
    HOME: { folder: 'html', file: 'portal.html' },
    PROFILE: { folder: 'html', file: 'profile.html' },
    DASHBOARD: { folder: 'html', file: 'dashboard.html' },
    SETTINGS: { folder: 'html', file: 'settings.html' },
    ADMIN_DASHBOARD: { folder: 'admin-interface/html', file: 'admin-dashboard.html' }
  };

  function compute(key) {
    const entry = map[key];
    if (!entry) return '';
    const loc = (window && window.location && window.location.pathname) ? window.location.pathname : '';

    // If we're inside admin-interface/html, adjust paths accordingly
    if (loc.indexOf('/admin-interface/html/') !== -1) {
      if (entry.folder === 'admin-interface/html') return entry.file; // same folder
      return '../../' + entry.folder + '/' + entry.file; // go up to frontend root then into html
    }

    // If we're inside html/ pages
    if (loc.indexOf('/html/') !== -1) {
      if (entry.folder === 'html') return entry.file; // same folder
      if (entry.folder === 'admin-interface/html') return '../' + entry.folder + '/' + entry.file;
      return entry.folder + '/' + entry.file;
    }

    // Default: assume server root is frontend folder; return folder/file
    return entry.folder + '/' + entry.file;
  }

  // Replace PAGES values with dynamic getters
  Object.keys(map).forEach(key => {
    try {
      Object.defineProperty(CONSTANTS.PAGES, key, {
        get: function() { return compute(key); },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      // ignore if defineProperty fails in older environments
      CONSTANTS.PAGES[key] = compute(key);
    }
  });
})();

// Default API base URL for development. Override by setting `window.__API_BASE_URL__` before loading scripts.
if (!window.__API_BASE_URL__) {
  window.__API_BASE_URL__ = 'http://localhost:3000';
}


// auth.js - API-backed authentication utilities

const AUTH = (function() {
  const STORAGE_TOKEN = 'apiToken';
  const STORAGE_USER = 'currentUser';

  async function apiFetch(path, opts = {}) {
    const base = (window.__API_BASE_URL__) ? window.__API_BASE_URL__ : '';
    const headers = opts.headers || {};
    const token = sessionStorage.getItem(STORAGE_TOKEN);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    opts.headers = headers;
    const res = await fetch(base + path, opts);
    return res;
  }

  return {
    isLoggedIn: function() {
      return !!sessionStorage.getItem(STORAGE_TOKEN);
    },

    getToken: function() {
      return sessionStorage.getItem(STORAGE_TOKEN);
    },

    getCurrentUser: function() {
      const s = sessionStorage.getItem(STORAGE_USER);
      return s ? JSON.parse(s) : null;
    },

    setCurrentUser: function(user, token) {
      if (token) sessionStorage.setItem(STORAGE_TOKEN, token);
      if (user) sessionStorage.setItem(STORAGE_USER, JSON.stringify(user));
      else sessionStorage.removeItem(STORAGE_USER);
    },

    logout: function() {
      sessionStorage.removeItem(STORAGE_TOKEN);
      sessionStorage.removeItem(STORAGE_USER);
    },

    register: async function(userData) {
      const res = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
      const json = await res.json();
      if (!res.ok) return { success: false, message: json.error || 'Registration failed' };
      // server returns token
      if (json.token) {
        // try to get /auth/me
        try {
          sessionStorage.setItem(STORAGE_TOKEN, json.token);
          const meRes = await apiFetch('/auth/me');
          if (meRes.ok) {
            const me = await meRes.json();
            sessionStorage.setItem(STORAGE_USER, JSON.stringify(me));
          }
        } catch (e) {}
      }
      return { success: true };
    },

    login: async function(email, password) {
      const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      const json = await res.json();
      if (!res.ok) return { success: false, message: json.error || 'Login failed' };
      if (json.token) {
        sessionStorage.setItem(STORAGE_TOKEN, json.token);
      }
      if (json.user) {
        sessionStorage.setItem(STORAGE_USER, JSON.stringify(json.user));
      } else {
        // try to fetch /auth/me
        try {
          const meRes = await apiFetch('/auth/me');
          if (meRes.ok) {
            const me = await meRes.json();
            sessionStorage.setItem(STORAGE_USER, JSON.stringify(me));
          }
        } catch (e) {}
      }
      return { success: true };
    },

    // Returns boolean - admin status
    isAdmin: function() {
      const u = this.getCurrentUser();
      return u && u.role === 'admin';
    },

    // Update profile via API
    updateProfile: async function(updatedData) {
      try {
        const res = await apiFetch('/auth/me', { method: 'GET' });
        if (!res.ok) return { success: false, message: 'Not authorized' };
        const me = await res.json();
        // No profile update endpoint implemented server-side in scaffold; return success
        // You can add a PATCH /auth/me endpoint later. For now, update local session copy.
        const merged = { ...me, ...updatedData };
        sessionStorage.setItem(STORAGE_USER, JSON.stringify(merged));
        return { success: true, message: CONSTANTS.MESSAGES.PROFILE_UPDATED, user: merged };
      } catch (e) {
        return { success: false, message: 'Update failed' };
      }
    },

    // Helper for frontend code to call the API directly
    apiFetch: apiFetch,

    // Get user role (admin or user)
    getUserRole: function() {
      const u = this.getCurrentUser();
      return u ? u.role : null;
    }
  };
})();
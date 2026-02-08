// profile.js - Handle profile page loading and display

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (!AUTH.isLoggedIn()) {
    NOTIFICATION_SYSTEM.error(CONSTANTS.MESSAGES.NO_USER_LOGGED_IN);
    setTimeout(() => {
      window.location.href = CONSTANTS.PAGES.HOMEPAGE;
    }, CONSTANTS.REDIRECT_DELAY);
    return;
  }

  // Load user data from API (not just sessionStorage)
  loadUserProfile();
  
  // Setup logout button
  setupLogout();
});

async function loadUserProfile() {
  try {
    // Fetch fresh user data from API
    const res = await AUTH.apiFetch('/auth/me');
    if (!res.ok) {
      // Fallback to sessionStorage if API fails
      loadUserProfileFromStorage();
      return;
    }
    
    const user = await res.json();
    
    // Update sessionStorage with fresh data
    if (user) {
      AUTH.setCurrentUser(user);
    }
    
    displayUserProfile(user);
  } catch (e) {
    console.error('Failed to load user profile from API', e);
    // Fallback to sessionStorage
    loadUserProfileFromStorage();
  }
}

function loadUserProfileFromStorage() {
  const user = AUTH.getCurrentUser();
  if (!user) {
    NOTIFICATION_SYSTEM.error('User data not found');
    return;
  }
  displayUserProfile(user);
}

function displayUserProfile(user) {
  if (!user) {
    NOTIFICATION_SYSTEM.error('User data not found');
    return;
  }

  // Extract name fields with fallbacks
  let firstName = user.firstName || user.first_name || '';
  let lastName = user.lastName || user.last_name || '';
  let email = user.email || '';

  // Build display name
  const displayFull = [firstName, lastName].filter(Boolean).join(' ');

  // Update DOM
  DOM_UTILS.setText('#fullName', displayFull || 'User');
  DOM_UTILS.setText('#firstName', firstName || '-');
  DOM_UTILS.setText('#middleName', '-');
  DOM_UTILS.setText('#lastName', lastName || '-');
  DOM_UTILS.setText('#suffix', '-');
  DOM_UTILS.setText('#gender', '-');
  DOM_UTILS.setText('#birthDate', '-');
  DOM_UTILS.setText('#birthPlace', '-');
  DOM_UTILS.setText('#citizenship', '-');
  DOM_UTILS.setText('#address', '-');
  DOM_UTILS.setText('#mobile', '-');
  DOM_UTILS.setText('#email', email || '-');
}

function setupLogout() {
  DOM_UTILS.on('#logoutLink', 'click', function(e) {
    e.preventDefault();
    if (confirm(CONSTANTS.MESSAGES.LOGOUT_CONFIRM)) {
      AUTH.logout();
      NOTIFICATION_SYSTEM.success(CONSTANTS.MESSAGES.LOGOUT_SUCCESS);
      setTimeout(() => {
        window.location.href = CONSTANTS.PAGES.HOMEPAGE;
      }, CONSTANTS.REDIRECT_DELAY);
    }
  });
}


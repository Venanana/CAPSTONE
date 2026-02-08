// homepage.js - Homepage interactions and authentication

document.addEventListener('DOMContentLoaded', function () {
  // Initialize
  updateSignInUI();
  populateBirthSelects();

  // Prevent eService items click (non-clickable by design)
  DOM_UTILS.onAll('.eservice-item', 'click', e => e.preventDefault());

  // Form handlers
  DOM_UTILS.on('#regForm', 'submit', e => {
    e.preventDefault();
    handleRegistration();
  });

  DOM_UTILS.on('#signinBtn', 'click', handleSignIn);
  DOM_UTILS.on('#logoutBtn', 'click', handleLogout);
});

// Update sign in UI based on authentication state
function updateSignInUI() {
  // Check if user is stored in sessionStorage
  const currentUser = sessionStorage.getItem('currentUser');
  const isLoggedIn = !!currentUser;
  const user = currentUser ? JSON.parse(currentUser) : null;

  if (isLoggedIn) {
    DOM_UTILS.hide('#signinBtn');
    DOM_UTILS.show('#logoutBtn');
    DOM_UTILS.hide('#signinEmail');
    DOM_UTILS.hide('#signinPassword');

    // Show dashboard links
    const linksContainer = document.getElementById('postSignLinks');
    if (linksContainer) {
      linksContainer.innerHTML = '';

      const userDash = document.createElement('a');
      userDash.href = 'dashboard.html';
      userDash.textContent = 'Open Dashboard';
      userDash.className = 'btn small';
      linksContainer.appendChild(userDash);

      if (user && user.role === 'admin') {
        const adminDash = document.createElement('a');
        adminDash.href = '../admin-interface/html/admin-dashboard.html';
        adminDash.textContent = 'Admin Dashboard';
        adminDash.className = 'btn small';
        linksContainer.appendChild(adminDash);
      }
    }
  } else {
    // User not logged in
    DOM_UTILS.show('#signinBtn');
    DOM_UTILS.hide('#logoutBtn');
    DOM_UTILS.show('#signinEmail');
    DOM_UTILS.show('#signinPassword');
    const linksContainer = document.getElementById('postSignLinks');
    if (linksContainer) linksContainer.innerHTML = '';
  }
}

    }
  } else {
  DOM_UTILS.show('#signinBtn');
  DOM_UTILS.hide('#logoutBtn');
  DOM_UTILS.show('#signinEmail');
  DOM_UTILS.show('#signinPassword');
  const linksContainer = document.getElementById('postSignLinks');
  if (linksContainer) linksContainer.innerHTML = '';
}
}

// Populate birth date selects
function populateBirthSelects() {
  // Days - use querySelector directly to avoid caching issues
  const daySelect = document.querySelector('#birth-day');
  if (daySelect) {
    daySelect.innerHTML = '<option value="">Day</option>';
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = String(d).padStart(2, '0');
      opt.textContent = String(d).padStart(2, '0');
      daySelect.appendChild(opt);
    }
  }

  // Months
  const months = ['Month', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthSelect = document.querySelector('#birth-month');
  if (monthSelect) {
    monthSelect.innerHTML = '';
    months.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i === 0 ? '' : String(i).padStart(2, '0');
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });
  }

  // Years (1950 to current)
  const current = new Date().getFullYear();
  const yearSelect = document.querySelector('#birth-year');
  if (yearSelect) {
    yearSelect.innerHTML = '<option value="">Year</option>';
    for (let y = current; y >= 1950; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
  }
}

// Handle registration
async function handleRegistration() {
  const form = DOM_UTILS.get('#regForm');
  if (!form) return;

  // Collect form data
  const formData = {
    first: DOM_UTILS.getInputValue('input[name="first"]'),
    middle: DOM_UTILS.getInputValue('input[name="middle"]'),
    last: DOM_UTILS.getInputValue('input[name="last"]'),
    suffix: DOM_UTILS.getInputValue('input[name="suffix"]'),
    gender: DOM_UTILS.getInputValue('input[name="gender"]:checked'),
    birthPlace: DOM_UTILS.getInputValue('input[name="birthPlace"]'),
    citizenship: DOM_UTILS.getInputValue('input[name="citizenship"]'),
    address: DOM_UTILS.getInputValue('input[name="address"]'),
    mobile: DOM_UTILS.getInputValue('input[name="mobile"]'),
    email: DOM_UTILS.getInputValue('input[name="email"]'),
    password: DOM_UTILS.getInputValue('input[name="password"]'),
    confirm: DOM_UTILS.getInputValue('input[name="confirm"]')
  };

  // Validate
  const validation = FORM_VALIDATOR.validateRegistration(formData);
  if (!validation.valid) {
    FORM_VALIDATOR.showErrors(validation.errors);
    return;
  }

  // Format birth date
  const birthDay = DOM_UTILS.getInputValue('#birth-day');
  const birthMonth = DOM_UTILS.getInputValue('#birth-month');
  const birthYear = DOM_UTILS.getInputValue('#birth-year');

  let birthDate = '';
  if (birthDay && birthMonth && birthYear) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(birthMonth) - 1;
    birthDate = `${birthDay} ${monthNames[monthIndex]} ${birthYear}`;
  }

  // Register user
  const result = await AUTH.register({
    email: formData.email,
    password: formData.password,
    firstName: formData.first,
    middleName: formData.middle,
    lastName: formData.last,
    suffix: formData.suffix,
    gender: formData.gender,
    birthDate: birthDate,
    birthPlace: formData.birthPlace,
    citizenship: formData.citizenship,
    address: formData.address,
    mobile: formData.mobile
  });

  if (result.success) {
    NOTIFICATION_SYSTEM.success(CONSTANTS.MESSAGES.REGISTRATION_SUCCESS);
    FORM_VALIDATOR.clearForm('regForm');
    setTimeout(() => {
      window.location.href = CONSTANTS.PAGES.HOME;
    }, CONSTANTS.REDIRECT_DELAY);
  } else {
    NOTIFICATION_SYSTEM.error(result.message);
  }
}

// Handle sign in
async function handleSignIn() {
  const email = DOM_UTILS.getInputValue('#signinEmail');
  const password = DOM_UTILS.getInputValue('#signinPassword');

  // Validate
  const validation = FORM_VALIDATOR.validateLogin(email, password);
  if (!validation.valid) {
    FORM_VALIDATOR.showErrors(validation.errors);
    return;
  }

  // Login
  const result = await AUTH.login(email, password);

  if (result.success) {
    NOTIFICATION_SYSTEM.success(CONSTANTS.MESSAGES.LOGIN_SUCCESS);
    // Redirect based on user role
    setTimeout(() => {
      const userRole = AUTH.getUserRole();
      if (userRole === 'admin') {
        // Redirect admins to admin dashboard
        window.location.href = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.ADMIN_DASHBOARD) ? CONSTANTS.PAGES.ADMIN_DASHBOARD : '../admin-interface/html/admin-dashboard.html';
      } else {
        // Redirect regular users to main home page
        window.location.href = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.HOME) ? CONSTANTS.PAGES.HOME : '../html/portal.html';
      }
    }, CONSTANTS.REDIRECT_DELAY);
  } else {
    NOTIFICATION_SYSTEM.error(result.message);
  }
}

// Handle logout
function handleLogout() {
  if (confirm(CONSTANTS.MESSAGES.LOGOUT_CONFIRM)) {
    AUTH.logout();
    NOTIFICATION_SYSTEM.success(CONSTANTS.MESSAGES.LOGOUT_SUCCESS);
    updateSignInUI();
    // Redirect to landing homepage after logout
    setTimeout(() => { window.location.href = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PAGES && CONSTANTS.PAGES.HOMEPAGE) ? CONSTANTS.PAGES.HOMEPAGE : '../html/landing.html'; }, 300);
  }
}


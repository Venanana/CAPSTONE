// form-validator.js - Centralized form validation utilities

const FORM_VALIDATOR = {
  // Validate email format
  isValidEmail: function(email) {
    return CONSTANTS.EMAIL_REGEX.test(email.trim());
  },

  // Validate password strength
  isValidPassword: function(password) {
    return password && password.length >= CONSTANTS.PASSWORD_MIN_LENGTH;
  },

  // Validate two passwords match
  passwordsMatch: function(password1, password2) {
    return password1 === password2;
  },

  // Get form field value
  getFieldValue: function(selector) {
    const element = document.querySelector(selector);
    if (!element) return '';
    
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked ? element.value : '';
    }
    
    return element.value ? element.value.trim() : '';
  },

  // Get all form data as object
  getFormData: function(formId) {
    const form = document.getElementById(formId);
    if (!form) return null;
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value.trim();
    });
    
    return data;
  },

  // Set focus to element with visual feedback
  focusField: function(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      element.classList.add('input-error');
      setTimeout(() => element.classList.remove('input-error'), 1000);
    }
  },

  // Validate registration form
  validateRegistration: function(data) {
    const errors = [];
    
    if (!data.first || !data.first.trim()) {
      errors.push('First name is required');
    }
    
    if (!data.last || !data.last.trim()) {
      errors.push('Last name is required');
    }
    
    if (!data.email || !data.email.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push(CONSTANTS.MESSAGES.EMAIL_INVALID);
    }
    
    if (!data.password) {
      errors.push('Password is required');
    } else if (!this.isValidPassword(data.password)) {
      errors.push(CONSTANTS.MESSAGES.PASSWORD_TOO_SHORT);
    }
    
    if (!data.confirm) {
      errors.push('Please confirm your password');
    } else if (!this.passwordsMatch(data.password, data.confirm)) {
      errors.push(CONSTANTS.MESSAGES.PASSWORDS_MISMATCH);
    }
    
    const termsCheckbox = document.querySelector('input[type="checkbox"]');
    if (!termsCheckbox || !termsCheckbox.checked) {
      errors.push(CONSTANTS.MESSAGES.TERMS_REQUIRED);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Validate login form
  validateLogin: function(email, password) {
    const errors = [];
    
    if (!email || !email.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(email)) {
      errors.push(CONSTANTS.MESSAGES.EMAIL_INVALID);
    }
    
    if (!password) {
      errors.push('Password is required');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Display validation errors
  showErrors: function(errors) {
    if (!errors || errors.length === 0) return;
    
    NOTIFICATION_SYSTEM.error(errors[0]);
    
    // Log all errors for debugging
    if (errors.length > 1) {
      console.log('Validation errors:', errors);
    }
  },

  // Clear form
  clearForm: function(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
      // Remove any error states
      form.querySelectorAll('.input-error').forEach(el => {
        el.classList.remove('input-error');
      });
    }
  }
};

// dom-utils.js - DOM manipulation and caching utilities

const DOM_UTILS = {
  // Cache for frequently accessed elements
  cache: {},

  // Get or cache element
  get: function(selector) {
    if (!this.cache[selector]) {
      this.cache[selector] = document.querySelector(selector);
    }
    return this.cache[selector];
  },

  // Get all elements
  getAll: function(selector) {
    return document.querySelectorAll(selector);
  },

  // Clear cache
  clearCache: function() {
    this.cache = {};
  },

  // Set element visibility
  show: function(selector) {
    const el = this.get(selector);
    if (el) el.style.display = '';
    return el;
  },

  hide: function(selector) {
    const el = this.get(selector);
    if (el) el.style.display = 'none';
    return el;
  },

  toggle: function(selector) {
    const el = this.get(selector);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
    return el;
  },

  // Add/remove CSS class
  addClass: function(selector, className) {
    const el = this.get(selector);
    if (el) el.classList.add(className);
    return el;
  },

  removeClass: function(selector, className) {
    const el = this.get(selector);
    if (el) el.classList.remove(className);
    return el;
  },

  toggleClass: function(selector, className) {
    const el = this.get(selector);
    if (el) el.classList.toggle(className);
    return el;
  },

  hasClass: function(selector, className) {
    const el = this.get(selector);
    return el ? el.classList.contains(className) : false;
  },

  // Set text/HTML content
  setText: function(selector, text) {
    const el = this.get(selector);
    if (el) el.textContent = text;
    return el;
  },

  setHtml: function(selector, html) {
    const el = this.get(selector);
    if (el) el.innerHTML = html;
    return el;
  },

  // Set attributes
  setAttribute: function(selector, attr, value) {
    const el = this.get(selector);
    if (el) el.setAttribute(attr, value);
    return el;
  },

  getAttribute: function(selector, attr) {
    const el = this.get(selector);
    return el ? el.getAttribute(attr) : null;
  },

  // Form utilities
  getInputValue: function(selector) {
    const el = this.get(selector);
    if (!el) return '';
    
    if (el.type === 'checkbox' || el.type === 'radio') {
      return el.checked ? el.value : '';
    }
    
    return el.value ? el.value.trim() : '';
  },

  setInputValue: function(selector, value) {
    const el = this.get(selector);
    if (el) el.value = value;
    return el;
  },

  // Event delegation helper
  on: function(selector, event, handler) {
    const el = this.get(selector);
    if (el) el.addEventListener(event, handler);
    return el;
  },

  onAll: function(selector, event, handler) {
    this.getAll(selector).forEach(el => {
      el.addEventListener(event, handler);
    });
  },

  // Focus management
  focus: function(selector) {
    const el = this.get(selector);
    if (el) el.focus();
    return el;
  },

  blur: function(selector) {
    const el = this.get(selector);
    if (el) el.blur();
    return el;
  },

  // Smooth scroll to element
  scrollTo: function(selector, options = {}) {
    const el = this.get(selector);
    if (el) {
      el.scrollIntoView({
        behavior: options.behavior || 'smooth',
        block: options.block || 'start',
        inline: options.inline || 'nearest'
      });
    }
    return el;
  },

  // Safe element property access
  hasElement: function(selector) {
    return this.get(selector) !== null;
  },

  // Batch operations
  batch: function(operations) {
    operations.forEach(op => {
      if (typeof op === 'function') op();
    });
  }
};

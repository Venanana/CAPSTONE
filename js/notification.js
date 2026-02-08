// notification.js - Centralized notification/modal system with support for toasts and modals

const NOTIFICATION_SYSTEM = {
  // Initialize the notification container
  init: function() {
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    if (!document.getElementById('modal-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
  },

  // Show toast notification
  show: function(message, type = 'info', duration = CONSTANTS.NOTIFICATION_DURATION) {
    this.init();
    
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const notificationId = 'notification-' + Date.now();
    
    notification.id = notificationId;
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    // Icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    notification.innerHTML = `
      <span class="notification-icon">${icons[type] || icons.info}</span>
      <span class="notification-message">${this.escapeHtml(message)}</span>
      <button class="notification-close" aria-label="Close notification">×</button>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Close button handler
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => this.dismiss(notificationId));
    
    // Auto-dismiss
    const timeout = setTimeout(() => {
      this.dismiss(notificationId);
    }, duration);
    
    // Store timeout for manual cleanup
    notification.dataset.timeout = timeout;
    
    return notificationId;
  },

  // Show modal dialog
  showModal: function(options = {}) {
    this.init();
    
    const {
      title = 'Notification',
      message = '',
      type = 'info',
      buttons = [{ label: 'OK', action: 'close', className: 'btn-primary' }],
      closeOnBackdrop = true,
      onClose = null
    } = options;

    const modalId = 'modal-' + Date.now();
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = `modal modal-${type}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `${modalId}-title`);

    // Icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      confirm: '?'
    };

    let buttonsHtml = buttons.map(btn => `
      <button class="modal-btn ${btn.className || 'btn-secondary'}" data-action="${btn.action}">
        ${this.escapeHtml(btn.label)}
      </button>
    `).join('');

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-icon">${icons[type] || icons.info}</span>
          <h2 id="${modalId}-title" class="modal-title">${this.escapeHtml(title)}</h2>
          <button class="modal-close" aria-label="Close modal">×</button>
        </div>
        <div class="modal-body">
          <p>${this.escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          ${buttonsHtml}
        </div>
      </div>
    `;

    const overlay = document.getElementById('modal-overlay');
    overlay.appendChild(modal);

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      modal.classList.add('show');
    });

    // Button handlers
    modal.querySelectorAll('.modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'close') {
          this.closeModal(modalId, onClose);
        } else if (typeof action === 'function') {
          action();
          this.closeModal(modalId, onClose);
        }
      });
    });

    // Close button
    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      this.closeModal(modalId, onClose);
    });

    // Backdrop click
    if (closeOnBackdrop) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(modalId, onClose);
        }
      });
    }

    // Prevent backdrop click from closing if closeOnBackdrop is false
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    return modalId;
  },

  // Close modal
  closeModal: function(modalId, callback) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('show');
    
    setTimeout(() => {
      modal.remove();
      
      // Check if there are more modals
      const overlay = document.getElementById('modal-overlay');
      const hasModals = overlay?.querySelector('.modal');
      if (!hasModals) {
        overlay?.classList.remove('active');
      }

      if (callback && typeof callback === 'function') {
        callback();
      }
    }, 300);
  },

  // Show confirmation modal
  confirm: function(message, onConfirm, onCancel, title = 'Confirm') {
    return this.showModal({
      title: title,
      message: message,
      type: 'confirm',
      buttons: [
        { label: 'Cancel', action: 'close', className: 'btn-secondary' },
        { label: 'Confirm', action: 'confirm', className: 'btn-primary' }
      ],
      closeOnBackdrop: true,
      onClose: null
    });
  },

  // Dismiss a notification
  dismiss: function(notificationId) {
    const notification = document.getElementById(notificationId);
    if (!notification) return;
    
    clearTimeout(notification.dataset.timeout);
    notification.classList.remove('show');
    
    setTimeout(() => {
      notification.remove();
    }, CONSTANTS.NOTIFICATION_FADE_OUT);
  },

  // Dismiss all notifications
  dismissAll: function() {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notifications = container.querySelectorAll('.notification');
    notifications.forEach(n => this.dismiss(n.id));
  },

  // Shortcut methods for toast
  success: function(message, type = 'toast') {
    if (type === 'modal') {
      return this.showModal({
        title: 'Success',
        message: message,
        type: 'success',
        buttons: [{ label: 'OK', action: 'close', className: 'btn-primary' }]
      });
    }
    return this.show(message, 'success');
  },

  error: function(message, type = 'toast') {
    if (type === 'modal') {
      return this.showModal({
        title: 'Error',
        message: message,
        type: 'error',
        buttons: [{ label: 'OK', action: 'close', className: 'btn-primary' }]
      });
    }
    return this.show(message, 'error');
  },

  warning: function(message, type = 'toast') {
    if (type === 'modal') {
      return this.showModal({
        title: 'Warning',
        message: message,
        type: 'warning',
        buttons: [{ label: 'OK', action: 'close', className: 'btn-primary' }]
      });
    }
    return this.show(message, 'warning');
  },

  info: function(message, type = 'toast') {
    if (type === 'modal') {
      return this.showModal({
        title: 'Information',
        message: message,
        type: 'info',
        buttons: [{ label: 'OK', action: 'close', className: 'btn-primary' }]
      });
    }
    return this.show(message, 'info');
  },

  // Escape HTML to prevent XSS
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Legacy function to maintain backwards compatibility
function showNotification(message, type = 'info') {
  NOTIFICATION_SYSTEM.show(message, type);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  NOTIFICATION_SYSTEM.init();
});

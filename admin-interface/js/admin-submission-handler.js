// admin-submission-handler.js - Handle admin dashboard submission display and status updates

(function(window) {
  const ADMIN_SUBMISSIONS = {};

  ADMIN_SUBMISSIONS._cache = null;

  ADMIN_SUBMISSIONS.getAllSubmissions = function() {
    if (ADMIN_SUBMISSIONS._cache) return ADMIN_SUBMISSIONS._cache;
    // kick off background load
    ADMIN_SUBMISSIONS.reloadSubmissions().catch(()=>{});
    return [];
  };

  ADMIN_SUBMISSIONS.reloadSubmissions = async function() {
    try {
      const res = await AUTH.apiFetch('/submissions');
      if (!res.ok) { ADMIN_SUBMISSIONS._cache = []; return ADMIN_SUBMISSIONS._cache; }
      const rows = await res.json();
      ADMIN_SUBMISSIONS._cache = rows.map(r => ADMIN_SUBMISSIONS.normalize(r));
      return ADMIN_SUBMISSIONS._cache;
    } catch (e) {
      console.error('Failed to load submissions', e);
      ADMIN_SUBMISSIONS._cache = [];
      return ADMIN_SUBMISSIONS._cache;
    }
  };

  // Update submission with status and remark
  ADMIN_SUBMISSIONS.updateSubmissionWithRemark = async function(submissionId, newStatus, remark) {
    try {
      // Try to find by reference number first if string passed as submissionId
      let matchingId = submissionId;
      if (ADMIN_SUBMISSIONS._cache && typeof submissionId === 'string') {
        const found = ADMIN_SUBMISSIONS._cache.find(s => s.referenceNumber === submissionId);
        if (found) matchingId = found.id;
      }
      
      const res = await AUTH.apiFetch(`/submissions/${matchingId}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ status: newStatus, remark: remark }) 
      });
      if (!res.ok) throw new Error('update failed');
      const j = await res.json();
      
      // Update cache with normalized response
      if (j.submission && ADMIN_SUBMISSIONS._cache) {
        const idx = ADMIN_SUBMISSIONS._cache.findIndex(s => s.id === j.submission.id);
        if (idx !== -1) {
          ADMIN_SUBMISSIONS._cache[idx] = ADMIN_SUBMISSIONS.normalize(j.submission);
        } else {
          ADMIN_SUBMISSIONS._cache.push(ADMIN_SUBMISSIONS.normalize(j.submission));
        }
      }
      
      return j.submission || null;
    } catch (e) {
      console.error('Update failed', e);
      return null;
    }
  };

  // Normalize submission record from API/DB to legacy camelCase used in UI
  ADMIN_SUBMISSIONS.normalize = function(rec) {
    if (!rec) return rec;
    
    // Parse submitted_at to extract date and time
    let date = '';
    let time = '';
    const submittedAt = rec.submitted_at || rec.submittedAt || '';
    if (submittedAt) {
      try {
        const dt = new Date(submittedAt);
        date = dt.toLocaleDateString();
        time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        date = submittedAt;
        time = '';
      }
    }
    
    return {
      id: rec.id,
      referenceNumber: rec.reference_number || rec.referenceNumber || '',
      formType: rec.form_type || rec.formType || '',
      purpose: rec.purpose || '',
      status: rec.status || '',
      formData: rec.form_data || rec.formData || {},
      remark: rec.remark || '',
      adminDeleted: !!rec.admin_deleted,
      submittedAt: submittedAt,
      date: date,
      time: time,
      userId: rec.user_id || rec.userId || null
    };
  };

  // Group submissions by form type
  ADMIN_SUBMISSIONS.groupByFormType = function(submissions) {
    const grouped = {};
    submissions.forEach(sub => {
      if (!grouped[sub.formType]) {
        grouped[sub.formType] = {
          formType: sub.formType,
          submissions: []
        };
      }
      grouped[sub.formType].submissions.push(sub);
    });
    return grouped;
  };

  // Calculate and update dashboard statistics
  ADMIN_SUBMISSIONS.updateStatistics = function() {
    const submissions = ADMIN_SUBMISSIONS.getAllSubmissions().filter(s => !s.adminDeleted);
    
    // Count by status
    const totalCount = submissions.length;
    const pendingCount = submissions.filter(s => s.status === 'Pending' || s.status === 'In Progress').length;
    const approvedCount = submissions.filter(s => s.status === 'Approved').length;
    const declinedCount = submissions.filter(s => s.status === 'Declined').length;
    const receivedCount = submissions.filter(s => s.status === 'Received' || s.status === 'Ready for Receipt').length;
    
    // Calculate completion rate (Approved + Received out of Total)
    const completedCount = approvedCount + receivedCount;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Update DOM elements
    const statElements = {
      'stat-total': totalCount,
      'stat-pending': pendingCount,
      'stat-approved': approvedCount,
      'stat-declined': declinedCount,
      'stat-received': receivedCount,
      'stat-rate': completionRate + '%'
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  };

  // Small confirmation popup helper (reuses remark modal styles)
  ADMIN_SUBMISSIONS.showConfirmPopup = function(title, message, onConfirm, onCancel, options) {
    try {
      const modal = document.createElement('div');
      modal.className = 'remark-modal-overlay';
      modal.innerHTML = `
        <div class="remark-modal-content">
          <div class="remark-modal-header">
            <h3>${title || 'Confirm'}</h3>
            <button class="modal-close-btn" aria-label="Close">×</button>
          </div>
          <div class="remark-modal-body">
            <p style="color: #374151; font-size: 14px;">${message || ''}</p>
          </div>
          <div class="remark-modal-footer">
            <button class="modal-btn cancel-btn">${(options && options.cancelText) || 'Cancel'}</button>
            <button class="modal-btn confirm-btn">${(options && options.confirmText) || 'Confirm'}</button>
          </div>
        </div>
      `;

      // attach handlers
      const removeModal = () => modal.remove();
      modal.querySelector('.modal-close-btn').addEventListener('click', () => {
        removeModal();
        if (onCancel) onCancel();
      });
      modal.querySelector('.cancel-btn').addEventListener('click', () => {
        removeModal();
        if (onCancel) onCancel();
      });
      modal.querySelector('.confirm-btn').addEventListener('click', () => {
        removeModal();
        if (onConfirm) onConfirm();
      });

      document.body.appendChild(modal);
    } catch (e) {
      console.warn('Confirm popup failed', e);
      // fallback to native confirm
      const ok = window.confirm(message || 'Are you sure?');
      if (ok && onConfirm) onConfirm();
      if (!ok && onCancel) onCancel();
    }
  };

  // Get form data display
  ADMIN_SUBMISSIONS.getFormDataDisplay = function(formData) {
    const keys = Object.keys(formData);
    if (keys.length === 0) return '<p style="color: #6b7280; font-size: 11px;">No additional data</p>';
    
    return keys.slice(0, 5).map(key => {
      const value = formData[key];
      if (value && value.trim()) {
        const displayKey = key.replace(/\s*\*\s*/g, '').trim();
        return `<p style="margin: 4px 0; font-size: 11px; color: #000000;"><strong>${displayKey}:</strong> ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}</p>`;
      }
      return '';
    }).filter(item => item).join('');
  };

  // Render dashboard summary cards
  ADMIN_SUBMISSIONS.renderDashboardCards = function() {
    const container = document.getElementById('dashboard-cards');
    if (!container) return;

    // Update statistics first
    ADMIN_SUBMISSIONS.updateStatistics();

    const submissions = ADMIN_SUBMISSIONS.getAllSubmissions().filter(s => !s.adminDeleted);
    const grouped = ADMIN_SUBMISSIONS.groupByFormType(submissions);

    if (submissions.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px 20px; font-size: 13px; font-weight: 600; text-shadow: 0 1px 2px rgba(255,255,255,0.4);">No submissions yet</p>';
      return;
    }

    // Sort form types
    const formTypeOrder = [
      'Barangay I.D',
      'Barangay Clearance',
      'Barangay Certificate',
      'Certificate of Indigency',
      'Certificate of Residency',
      'First-Time Job Seeker',
      'Barangay Business Clearance',
      'Barangay Blotter / Certification',
      'Construction / Fencing Permit'
    ];

    let html = '';
    let cardIndex = 1;
    formTypeOrder.forEach(formType => {
      if (grouped[formType] && grouped[formType].submissions.length > 0) {
        const group = grouped[formType];
        const latestSubmission = group.submissions[group.submissions.length - 1];
        const refCode = latestSubmission.referenceNumber.slice(-4).toUpperCase();
        const count = String(group.submissions.length).padStart(2, '0');
        const statusClass = latestSubmission.status.toLowerCase().replace(' ', '-');

        html += `
          <div class="document-card" onclick="ADMIN_SUBMISSIONS.showFormTypeSubmissions('${formType}')">
            <div class="doc-header">
              <span class="doc-code">${refCode}</span>
            </div>
            <div class="doc-status">
              <span class="status-badge ${statusClass}">${latestSubmission.status}</span>
            </div>
            <div>
              <div class="doc-count">${count}</div>
              <div class="doc-form-type">${formType}</div>
            </div>
          </div>
        `;
        cardIndex++;
      }
    });

    container.innerHTML = html;
  };

  // Show submissions for specific form type
  ADMIN_SUBMISSIONS.showFormTypeSubmissions = function(formType) {
    const container = document.getElementById('submissions-container');
    const titleEl = document.getElementById('request-section-title');
    
    if (!container || !titleEl) return;

    const submissions = ADMIN_SUBMISSIONS.getAllSubmissions().filter(s => !s.adminDeleted);
    // Only show items that are in request workflow (Pending / In Progress)
    const visibleStatuses = ['Pending', 'In Progress'];
    const filtered = submissions.filter(sub => sub.formType === formType && visibleStatuses.includes(sub.status));

    titleEl.textContent = formType.toUpperCase();

    if (filtered.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px 20px; font-size: 13px; font-weight: 600; text-shadow: 0 1px 2px rgba(255,255,255,0.4);">No submissions for this form type</p>';
      return;
    }

    // Sort by submission date (newest first)
    filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Wrap the results within a form-type container
    let html = `
      <div class="admin-form-section" data-form="${formType}">
        <h2 class="admin-form-title">${formType}</h2>
        <div class="submissions-list">
          ${filtered.map(sub => `
            <div class="submission-card">
              <div class="submission-header">
                <div class="submission-ref">
                  <span class="ref-label">Ref #:</span>
                  <span class="ref-number">${sub.referenceNumber}</span>
                </div>
                <span class="status-badge status-${sub.status.toLowerCase().replace(' ', '-')}">${sub.status}</span>
              </div>
              <div class="submission-summary">
                <p class="submission-purpose"><strong>Purpose:</strong> ${sub.purpose}</p>
                <p class="submission-date"><strong>Submitted:</strong> ${sub.date} at ${sub.time}</p>
                ${sub.remark ? `<div class="remark-container"><p class="submission-remark"><strong>Remark:</strong> ${sub.remark}</p>${sub.remarkedAt ? `<p class="remarked-at">${sub.remarkedAt}</p>` : ''}</div>` : ''}
              </div>
                <div class="submission-actions">
                <button class="action-btn approve-btn" onclick="ADMIN_SUBMISSIONS.showRemarkModal('${sub.referenceNumber}', 'Approved')">Approve</button>
                <button class="action-btn decline-btn" onclick="ADMIN_SUBMISSIONS.showRemarkModal('${sub.referenceNumber}', 'Declined')">Decline</button>
                <button class="action-btn details-btn" onclick="ADMIN_SUBMISSIONS.showFullDetails('${sub.referenceNumber}')">View Details</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  };

  // Show submissions filtered by status into the corresponding status section
  ADMIN_SUBMISSIONS.showStatusSection = function(status) {
    const map = {
      'Approved': 'approved-list',
      'Declined': 'declined-list',
      'In Progress': 'inprogress-list',
      'Received': 'history-list'
    };
    const containerId = map[status] || null;
    if (!containerId) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    const submissions = ADMIN_SUBMISSIONS.getAllSubmissions().filter(s => !s.adminDeleted);
    const filtered = submissions.filter(s => s.status === status);
    if (filtered.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px; font-size: 13px;">No entries.</p>';
      return;
    }

    filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const html = filtered.map(sub => {
      // Actions depend on which status list we're in
      let actions = '';
      if (status === 'Approved') {
        actions = `
          <button class="action-btn approve-btn" onclick="ADMIN_SUBMISSIONS.updateStatusNoRemark('${sub.referenceNumber}','In Progress')">In Progress</button>
          <button class="action-btn decline-btn" onclick="ADMIN_SUBMISSIONS.showRemarkModal('${sub.referenceNumber}', 'Declined')">Decline</button>
          <button class="action-btn details-btn" onclick="ADMIN_SUBMISSIONS.showFullDetails('${sub.referenceNumber}')">View Details</button>
        `;
      } else if (status === 'Declined') {
        actions = `
          <button class="action-btn approve-btn" onclick="ADMIN_SUBMISSIONS.showRemarkModal('${sub.referenceNumber}', 'Approved')">Approve</button>
          <button class="action-btn decline-btn" onclick="ADMIN_SUBMISSIONS.deleteSubmission('${sub.referenceNumber}')">Delete</button>
          <button class="action-btn details-btn" onclick="ADMIN_SUBMISSIONS.showFullDetails('${sub.referenceNumber}')">View Details</button>
        `;
      } else if (status === 'In Progress') {
        actions = `
          <button class="action-btn approve-btn" onclick="ADMIN_SUBMISSIONS.updateStatusNoRemark('${sub.referenceNumber}','Received')">Mark as Received</button>
          <button class="action-btn details-btn" onclick="ADMIN_SUBMISSIONS.showFullDetails('${sub.referenceNumber}')">View Details</button>
        `;
      } else if (status === 'Received') {
        actions = `
          <button class="action-btn decline-btn" onclick="ADMIN_SUBMISSIONS.deleteSubmission('${sub.referenceNumber}')">Delete</button>
          <button class="action-btn details-btn" onclick="ADMIN_SUBMISSIONS.showFullDetails('${sub.referenceNumber}')">View Details</button>
        `;
      } else {
        actions = `<button class="action-btn details-btn" onclick="ADMIN_SUBMISSIONS.showFullDetails('${sub.referenceNumber}')">View Details</button>`;
      }

      return `
      <div class="submission-card">
        <div class="submission-header">
          <div class="submission-ref"><span class="ref-label">Ref #:</span> <span class="ref-number">${sub.referenceNumber}</span></div>
          <span class="status-badge status-${sub.status.toLowerCase().replace(' ', '-')}">${sub.status}</span>
        </div>
        <div class="submission-summary">
          <p class="submission-purpose"><strong>Purpose:</strong> ${sub.purpose}</p>
          <p class="submission-date"><strong>Submitted:</strong> ${sub.date} at ${sub.time}</p>
          ${sub.remark ? `<div class="remark-container"><p class="submission-remark"><strong>Remark:</strong> ${sub.remark}</p>${sub.remarkedAt ? `<p class="remarked-at">${sub.remarkedAt}</p>` : ''}</div>` : ''}
        </div>
        <div class="submission-actions">
          ${actions}
        </div>
      </div>
      `;
    }).join('');

    container.innerHTML = html;
    
    // Update history stats if it's the history section
    if (status === 'Received') {
      ADMIN_SUBMISSIONS.updateHistoryStats();
    }
  };

  // Render all submissions (when REQUEST is clicked without submenu)
  ADMIN_SUBMISSIONS.renderSubmissions = function() {
    const container = document.getElementById('submissions-container');
    const titleEl = document.getElementById('request-section-title');
    
    if (!container || !titleEl) return;

    const submissions = ADMIN_SUBMISSIONS.getAllSubmissions().filter(s => !s.adminDeleted);
    const grouped = ADMIN_SUBMISSIONS.groupByFormType(submissions);

    titleEl.textContent = 'ALL SUBMISSIONS';

    if (submissions.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px 20px; font-size: 13px; font-weight: 600; text-shadow: 0 1px 2px rgba(255,255,255,0.4);">No submissions available</p>';
      return;
    }

    // Sort form types
    const formTypeOrder = [
      'Barangay I.D',
      'Barangay Clearance',
      'Barangay Certificate',
      'Certificate of Indigency',
      'Certificate of Residency',
      'First-Time Job Seeker',
      'Barangay Business Clearance',
      'Barangay Blotter / Certification',
      'Construction / Fencing Permit'
    ];

    let html = '';
    formTypeOrder.forEach(formType => {
      if (grouped[formType]) {
        const group = grouped[formType];
        // Only show submissions that are in request workflow (Pending / In Progress)
        const pending = group.submissions.filter(s => ['Pending', 'In Progress'].includes(s.status));
        if (pending.length === 0) return; // skip empty groups
        html += `
          <div class="admin-form-section">
            <h2>${group.formType}</h2>
            <div class="submissions-list">
              ${pending.map(sub => `
                <div class="submission-card">
                  <div class="submission-header">
                    <div class="submission-ref">
                      <span class="ref-label">Ref #:</span>
                      <span class="ref-number">${sub.referenceNumber}</span>
                    </div>
                    <span class="status-badge status-${sub.status.toLowerCase().replace(' ', '-')}">${sub.status}</span>
                  </div>
                  <div class="submission-summary">
                    <p class="submission-purpose"><strong>Purpose:</strong> ${sub.purpose}</p>
                    <p class="submission-date"><strong>Submitted:</strong> ${sub.date} at ${sub.time}</p>
                    ${sub.remark ? `<div class="remark-container"><p class="submission-remark"><strong>Remark:</strong> ${sub.remark}</p>${sub.remarkedAt ? `<p class="remarked-at">${sub.remarkedAt}</p>` : ''}</div>` : ''}
                  </div>
                  <div class="submission-actions">
                    <button class="action-btn approve-btn" onclick="ADMIN_SUBMISSIONS.showRemarkModal('${sub.referenceNumber}', 'Approved')">Approve</button>
                    <button class="action-btn decline-btn" onclick="ADMIN_SUBMISSIONS.showRemarkModal('${sub.referenceNumber}', 'Declined')">Decline</button>
                    <button class="action-btn details-btn" onclick="ADMIN_SUBMISSIONS.showFullDetails('${sub.referenceNumber}')">View Details</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    });

    container.innerHTML = html;
  };

  // Handle status change
  ADMIN_SUBMISSIONS.handleStatusChange = function(selectElement) {
    const referenceNumber = selectElement.getAttribute('data-ref');
    const newStatus = selectElement.value;

    // Use remark-aware updater (no remark provided when using dropdown)
    if (ADMIN_SUBMISSIONS.updateSubmissionWithRemark) {
      ADMIN_SUBMISSIONS.updateSubmissionWithRemark(referenceNumber, newStatus, '');
    }

    // Update the status badge
    const statusBadge = selectElement.closest('.status-selector').querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.textContent = newStatus;
      statusBadge.className = `status-badge status-${newStatus.toLowerCase().replace(' ', '-')}`;
    }

    // Refresh dashboard to reflect status change
    ADMIN_SUBMISSIONS.renderDashboardCards();
  };

  // Update status without requiring a remark (for quick transitions)
  ADMIN_SUBMISSIONS.updateStatusNoRemark = async function(referenceNumber, newStatus) {
    // For sensitive quick transitions like 'Received', ask for confirmation first
    if (newStatus === 'Received') {
      ADMIN_SUBMISSIONS.showConfirmPopup('Mark as received', 'Move this submission to History? This will archive it from admin request lists.', async function() {
        const updated = await ADMIN_SUBMISSIONS.updateSubmissionWithRemark(referenceNumber, newStatus, '');
        if (updated) {
          // Refresh dashboard and internal lists
          ADMIN_SUBMISSIONS.renderDashboardCards();
          ADMIN_SUBMISSIONS.renderSubmissions();
          ADMIN_SUBMISSIONS.showStatusSection(newStatus);
          ADMIN_SUBMISSIONS.updateStatistics();

          // Ensure a single navigation flow: after marking as Received, navigate to History only
          try {
            // Hide all sections and activate history
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            const historySection = document.getElementById('history');
            if (historySection) historySection.classList.add('active');

            // Update sidebar active state
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            const historyMenu = Array.from(document.querySelectorAll('.menu-item')).find(mi => mi.getAttribute('data-section') === 'history');
            if (historyMenu) historyMenu.classList.add('active');

            // Make sure history is populated and stats updated
            ADMIN_SUBMISSIONS.showStatusSection('Received');
            ADMIN_SUBMISSIONS.updateHistoryStats();
          } catch (e) {
            console.warn('Navigation to history failed', e);
          }
        }
      }, function() {
        // cancelled: nothing to do
      }, { confirmText: 'Yes, archive', cancelText: 'Cancel' });
      return;
    }

    // Other quick transitions proceed without extra confirmation
    const updated = await ADMIN_SUBMISSIONS.updateSubmissionWithRemark(referenceNumber, newStatus, '');
    if (updated) {
      ADMIN_SUBMISSIONS.renderDashboardCards();
      ADMIN_SUBMISSIONS.renderSubmissions();
      ADMIN_SUBMISSIONS.showStatusSection(newStatus);
      ADMIN_SUBMISSIONS.updateStatistics();
    }
  };

  // Update history statistics
  ADMIN_SUBMISSIONS.updateHistoryStats = function() {
    const submissions = ADMIN_SUBMISSIONS.getAllSubmissions().filter(s => !s.adminDeleted);
    const receivedCount = submissions.filter(s => s.status === 'Received').length;
    
    const historyTotalEl = document.getElementById('history-total');
    const historyReceivedEl = document.getElementById('history-received');
    
    if (historyTotalEl) historyTotalEl.textContent = receivedCount;
    if (historyReceivedEl) historyReceivedEl.textContent = receivedCount;
  };

  // Delete a submission permanently
  ADMIN_SUBMISSIONS.deleteSubmission = async function(referenceNumber) {
    // Find the submission by reference number to get its ID
    const submission = ADMIN_SUBMISSIONS.getAllSubmissions().find(s => s.referenceNumber === referenceNumber);
    if (!submission) {
      console.error('Submission not found:', referenceNumber);
      return;
    }

    ADMIN_SUBMISSIONS.showConfirmPopup('Delete submission', 'This will permanently delete the submission. Continue?', async function() {
      try {
        const res = await AUTH.apiFetch(`/submissions/${submission.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        
        // Remove from cache
        if (ADMIN_SUBMISSIONS._cache) {
          ADMIN_SUBMISSIONS._cache = ADMIN_SUBMISSIONS._cache.filter(s => s.id !== submission.id);
        }
        
        // Refresh UI
        ADMIN_SUBMISSIONS.renderDashboardCards();
        ADMIN_SUBMISSIONS.renderSubmissions();
        ADMIN_SUBMISSIONS.showStatusSection('Declined');
        ADMIN_SUBMISSIONS.showStatusSection('Approved');
        ADMIN_SUBMISSIONS.updateStatistics();
      } catch (e) {
        console.error('Delete failed', e);
        alert('Failed to delete submission. Please try again.');
      }
    }, function() {
      // cancelled - do nothing
    }, { confirmText: 'Yes, delete', cancelText: 'Cancel' });
  };

  // Show full details modal
  ADMIN_SUBMISSIONS.showFullDetails = function(referenceNumber) {
    const submissions = ADMIN_SUBMISSIONS.getAllSubmissions().filter(s => !s.adminDeleted);
    const submission = submissions.find(sub => sub.referenceNumber === referenceNumber);

    if (!submission) return;

    // Build form data rows - simple and clean
    const formDataHtml = Object.keys(submission.formData).map(key => {
      const value = submission.formData[key];
      if (value && value.trim()) {
        let displayKey = key.replace(/\s*\*\s*/g, '').trim();
        return `<div class="details-row"><span class="details-label">${displayKey}</span><span class="details-value">${value}</span></div>`;
      }
      return '';
    }).filter(item => item).join('');

    const modalContent = `
      <div class="details-modal-content">
        <div class="details-modal-header">
          <h3>${submission.formType}</h3>
          <button class="details-close-btn" onclick="document.querySelectorAll('.details-modal-overlay').forEach(el => el.remove())">×</button>
        </div>

        <div class="details-modal-body">
          <div class="details-section">
            <div class="details-row">
              <span class="details-label">Reference</span>
              <span class="details-value">${submission.referenceNumber}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Purpose</span>
              <span class="details-value">${submission.purpose}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Status</span>
              <span class="details-value"><span class="status-badge status-${submission.status.toLowerCase().replace(' ', '-')}">${submission.status}</span></span>
            </div>
            <div class="details-row">
              <span class="details-label">Submitted</span>
              <span class="details-value">${submission.date} at ${submission.time}</span>
            </div>
          </div>

          <div class="details-section">
            <h4 class="section-title">Form Data</h4>
            <div class="details-grid">
              ${formDataHtml}
            </div>
          </div>

          ${submission.remark ? `
          <div class="details-section">
            <h4 class="section-title">Admin Remark</h4>
            <div class="remark-box">
              <p>${submission.remark}</p>
              ${submission.remarkedAt ? `<p class="remark-timestamp">${submission.remarkedAt}</p>` : ''}
            </div>
          </div>
          ` : ''}
        </div>

        <div class="details-modal-footer">
          <button class="details-close-modal-btn" onclick="document.querySelectorAll('.details-modal-overlay').forEach(el => el.remove())">Close</button>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'details-modal-overlay';
    overlay.innerHTML = modalContent;
    overlay.addEventListener('click', function(e) {
      if (e.target === this) this.remove();
    });
    document.body.appendChild(overlay);
  };

  // Show remark modal for approval/decline
  ADMIN_SUBMISSIONS.showRemarkModal = function(referenceNumber, status) {
    const submission = ADMIN_SUBMISSIONS.getAllSubmissions().find(s => s.referenceNumber === referenceNumber);
    if (!submission) return;

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'remark-modal-overlay';
    modal.id = 'remark-modal';
    
    const isDecline = status === 'Declined';
    const titleText = isDecline ? 'Decline Submission' : 'Approve Submission';
    const placeholderText = isDecline ? 'State reason for declining (required)...' : 'Add optional comment or feedback...';
    const requiredText = isDecline ? '(Required)' : '(Optional)';

    modal.innerHTML = `
      <div class="remark-modal-content">
        <div class="remark-modal-header">
          <h3>${titleText}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('remark-modal').remove()">×</button>
        </div>
        
        <div class="remark-modal-body">
          <p class="submission-ref-display"><strong>Reference:</strong> ${referenceNumber}</p>
          <p class="submission-form-display"><strong>Form Type:</strong> ${submission.formType}</p>
          
          <div class="remark-field">
            <label for="remark-textarea" class="remark-label">
              Remark ${requiredText}
            </label>
            <textarea 
              id="remark-textarea" 
              class="remark-textarea" 
              placeholder="${placeholderText}"
              rows="5"
            ></textarea>
          </div>
        </div>
        
        <div class="remark-modal-footer">
          <button class="modal-btn cancel-btn" onclick="document.getElementById('remark-modal').remove()">Cancel</button>
          <button class="modal-btn confirm-btn" onclick="ADMIN_SUBMISSIONS.confirmRemark('${referenceNumber}', '${status}', ${isDecline})">
            ${isDecline ? 'Decline' : 'Approve'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('remark-textarea').focus();
  };

  // Confirm remark and update submission
  ADMIN_SUBMISSIONS.confirmRemark = async function(referenceNumber, status, isRequiredRemark) {
    const textarea = document.getElementById('remark-textarea');
    const remark = textarea.value.trim();

    // Check if remark is required (for Declined)
    if (isRequiredRemark && !remark) {
      document.getElementById('remark-textarea').style.borderColor = '#ef4444';
      document.getElementById('remark-textarea').placeholder = 'Reason is required';
      return;
    }

    // Update submission with remark
    const updated = await ADMIN_SUBMISSIONS.updateSubmissionWithRemark(referenceNumber, status, remark);

    // Close modal
    const modal = document.getElementById('remark-modal');
    if (modal) modal.remove();

    if (updated) {
      // Refresh the dashboard and status lists
      ADMIN_SUBMISSIONS.renderDashboardCards();
      ADMIN_SUBMISSIONS.showStatusSection(status);

      // Refresh the request view so the item is removed from Request section
      ADMIN_SUBMISSIONS.renderSubmissions();

      // If currently viewing a specific form type in Request, refresh that too
      const titleEl = document.getElementById('request-section-title');
      if (titleEl && titleEl.textContent) {
        const formType = ADMIN_SUBMISSIONS.getAllSubmissions().find(s => s.referenceNumber === referenceNumber)?.formType;
        if (formType) {
          ADMIN_SUBMISSIONS.showFormTypeSubmissions(formType);
        }
      }
    }
  };

  // Initialize on page load
  ADMIN_SUBMISSIONS.init = function() {
    // Load submissions from API first, then render views
    ADMIN_SUBMISSIONS.reloadSubmissions().then(() => {
      ADMIN_SUBMISSIONS.renderDashboardCards();
      ADMIN_SUBMISSIONS.renderSubmissions();
      // refresh status lists
      ADMIN_SUBMISSIONS.showStatusSection('Approved');
      ADMIN_SUBMISSIONS.showStatusSection('Declined');
      ADMIN_SUBMISSIONS.showStatusSection('In Progress');
      ADMIN_SUBMISSIONS.showStatusSection('Received');
    }).catch(() => {
      // fallback render if fetch fails
      ADMIN_SUBMISSIONS.renderDashboardCards();
      ADMIN_SUBMISSIONS.renderSubmissions();
    });

    // Setup submenu item clicks to show form type submissions
    document.querySelectorAll('.submenu-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const formType = this.textContent.trim();
        ADMIN_SUBMISSIONS.showFormTypeSubmissions(formType);
      });
    });
  };

  // Re-render when storage changes (cross-tab updates)
  window.addEventListener('storage', function(e) {
    if (e.key === 'barangay_submissions') {
      ADMIN_SUBMISSIONS.renderDashboardCards();
      ADMIN_SUBMISSIONS.renderSubmissions();
      // refresh status lists
      ADMIN_SUBMISSIONS.showStatusSection('Approved');
      ADMIN_SUBMISSIONS.showStatusSection('Declined');
      ADMIN_SUBMISSIONS.showStatusSection('In Progress');
      ADMIN_SUBMISSIONS.showStatusSection('Received');
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ADMIN_SUBMISSIONS.init);
  } else {
    ADMIN_SUBMISSIONS.init();
  }

  window.ADMIN_SUBMISSIONS = ADMIN_SUBMISSIONS;
})(window);

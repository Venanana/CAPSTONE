// form-submission.js - Handle form submissions, generate reference numbers, and save to localStorage

(function(window) {
  const FORM_SUBMISSION = {};

  // Generate random 10-character alphanumeric reference number
  FORM_SUBMISSION.generateReferenceNumber = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Get current date and time formatted
  FORM_SUBMISSION.getCurrentDateTime = function() {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { date, time, fullDateTime: `${date} ${time}` };
  };

  // API-backed submissions
  FORM_SUBMISSION.getAllSubmissions = async function() {
    try {
      const res = await AUTH.apiFetch('/submissions');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch submissions', e);
      return [];
    }
  };

  FORM_SUBMISSION.saveSubmission = async function(submission) {
    try {
      const res = await AUTH.apiFetch('/submissions', { method: 'POST', body: JSON.stringify(submission) });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Save failed');
      }
      const json = await res.json();
      return { ...submission, id: json.id };
    } catch (e) {
      console.error('Save submission failed', e);
      // fallback to localStorage (last resort)
      const submissions = (JSON.parse(localStorage.getItem('barangay_submissions') || '[]'));
      submissions.push(submission);
      localStorage.setItem('barangay_submissions', JSON.stringify(submissions));
      return submission;
    }
  };

  FORM_SUBMISSION.getSubmissionByReference = async function(referenceNumber) {
    const all = await FORM_SUBMISSION.getAllSubmissions();
    return all.find(sub => sub.reference_number === referenceNumber || sub.referenceNumber === referenceNumber);
  };

  FORM_SUBMISSION.updateSubmissionStatus = async function(submissionId, newStatus) {
    try {
      const res = await AUTH.apiFetch(`/submissions/${submissionId}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error('update failed');
      const j = await res.json();
      return j.submission || null;
    } catch (e) {
      console.error('Update failed', e);
      return null;
    }
  };

  // Collect form data from dashboard panel
  FORM_SUBMISSION.collectFormData = function(formPanel) {
    const formData = {};
    
    // Collect all input/select/radio values
    formPanel.querySelectorAll('.form-input, .form-select').forEach(input => {
      const label = input.previousElementSibling?.textContent || input.placeholder || '';
      formData[label] = input.value;
    });

    // Collect radio button selections
    formPanel.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      const label = radio.closest('.radio-label')?.textContent.trim() || radio.name;
      formData[label] = radio.value;
    });

    return formData;
  };

  // Get form type from panel ID
  FORM_SUBMISSION.getFormType = function(formPanelId) {
    const formTypeMap = {
      'barangay-id': 'Barangay I.D',
      'barangay-clearance': 'Barangay Clearance',
      'barangay-certificate': 'Barangay Certificate',
      'certificate-indigency': 'Certificate of Indigency',
      'certificate-residency': 'Certificate of Residency',
      'first-time-seeker': 'First-Time Job Seeker',
      'business-clearance': 'Barangay Business Clearance',
      'blotter-certification': 'Barangay Blotter / Certification',
      'construction-permit': 'Construction / Fencing Permit'
    };
    return formTypeMap[formPanelId] || formPanelId;
  };

  // Populate birth date select fields
  FORM_SUBMISSION.populateBirthDateFields = function() {
    // Days (1-31)
    const daySelects = document.querySelectorAll('.birth-day');
    daySelects.forEach(select => {
      select.innerHTML = '<option value="">Select Day</option>';
      for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        select.appendChild(option);
      }
    });

    // Months
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthSelects = document.querySelectorAll('.birth-month');
    monthSelects.forEach(select => {
      select.innerHTML = '<option value="">Select Month</option>';
      months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = String(index + 1).padStart(2, '0');
        option.textContent = month;
        select.appendChild(option);
      });
    });

    // Years (1950 to current year)
    const currentYear = new Date().getFullYear();
    const yearSelects = document.querySelectorAll('.birth-year');
    yearSelects.forEach(select => {
      select.innerHTML = '<option value="">Select Year</option>';
      for (let i = currentYear; i >= 1950; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        select.appendChild(option);
      }
    });
  };

  // Initialize form submission handlers
  FORM_SUBMISSION.initSubmitHandlers = function() {
    // Prevent multiple initializations
    if (FORM_SUBMISSION._initialized) return;
    FORM_SUBMISSION._initialized = true;

    // Populate birth date fields
    FORM_SUBMISSION.populateBirthDateFields();

    document.querySelectorAll('.submit-btn').forEach(button => {
      // Remove any existing listeners to prevent duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener('click', async function(e) {
        e.preventDefault();

        // Get the form panel
        const formPanel = newButton.closest('.dashboard-panel');
        if (!formPanel) return;

        const formPanelContainer = newButton.closest('.form-panel');
        const formPanelId = formPanelContainer ? formPanelContainer.id : '';

        // Get purpose field
        const purposeInput = formPanel.querySelector('.purpose-input');
        const purpose = purposeInput ? purposeInput.value.trim() : '';

        // Validate purpose is filled
        if (!purpose) {
          alert('Please enter the purpose of your request');
          return;
        }

        // Validate required fields - check all form inputs and selects
        const inputsToValidate = formPanel.querySelectorAll('.form-input, .form-select');
        let hasEmptyRequired = false;
        inputsToValidate.forEach(input => {
          if (!input.value.trim()) {
            hasEmptyRequired = true;
          }
        });

        if (hasEmptyRequired) {
          alert('Please fill in all required fields (marked with *)');
          return;
        }

        // Generate submission data
        const referenceNumber = FORM_SUBMISSION.generateReferenceNumber();
        const dateTime = FORM_SUBMISSION.getCurrentDateTime();
        const formData = FORM_SUBMISSION.collectFormData(formPanel);
        const formType = FORM_SUBMISSION.getFormType(formPanelId);

        const submission = {
          referenceNumber: referenceNumber,
          formType: formType,
          purpose: purpose,
          date: dateTime.date,
          time: dateTime.time,
          status: 'Pending',
          submittedAt: dateTime.fullDateTime,
          formData: formData
        };

        // Save via API
        const saved = await FORM_SUBMISSION.saveSubmission(submission);

        // Show success modal instead of alert
        if (typeof NOTIFICATION_SYSTEM !== 'undefined') {
          NOTIFICATION_SYSTEM.showModal({
            title: '✅ Form Submitted Successfully',
            message: `Your form has been submitted.\n\nReference Number: ${referenceNumber}\n\nYou can track your application in the Tracker section of Settings.`,
            type: 'success',
            buttons: [
              { 
                label: 'Copy Reference', 
                className: 'btn-primary',
                action: function() {
                  navigator.clipboard.writeText(referenceNumber);
                  alert('Reference number copied to clipboard!');
                }
              },
              { 
                label: 'Close', 
                className: 'btn-secondary',
                action: 'close'
              }
            ],
            closeOnBackdrop: false
          });
        } else {
          alert(`✅ Form submitted successfully!\n\nReference Number: ${referenceNumber}\n\nYou can track your application in the Tracker section of Settings.`);
        }

        // Reset form
        formPanel.querySelectorAll('.form-input, .form-select, input[type="radio"]').forEach(input => {
          if (input.type === 'radio') {
            input.checked = false;
          } else {
            input.value = '';
          }
        });
      });
    });
  };

  // Call init only once when templates are loaded (avoid multiple registrations)
  window.addEventListener('templatesLoaded', function() {
    FORM_SUBMISSION.initSubmitHandlers();
  }, { once: true });

  window.FORM_SUBMISSION = FORM_SUBMISSION;
})(window);

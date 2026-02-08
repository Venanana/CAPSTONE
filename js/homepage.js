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

  // Validate passwords
  if (!formData.email || !formData.password || !formData.confirm) {
    FORM_VALIDATOR.showErrors({ register: 'Email and password are required' });
    return;
  }
  if (formData.password !== formData.confirm) {
    FORM_VALIDATOR.showErrors({ register: 'Passwords do not match' });
    return;
  }

  // Format birth date
  const birthDay = DOM_UTILS.getInputValue('#birth-day');
  const birthMonth = DOM_UTILS.getInputValue('#birth-month');
  const birthYear = DOM_UTILS.getInputValue('#birth-year');
  if (birthDay && birthMonth && birthYear) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(birthMonth) - 1;
    formData.birthDate = `${birthDay} ${monthNames[monthIndex]} ${birthYear}`;
  }

  try {
    // Send data to backend
    const res = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        role: 'user'
      })
    });

    const data = await res.json();

    if (data.success) {
      NOTIFICATION_SYSTEM.success('Registration successful!');

      // Optional: automatically log in after registration
      sessionStorage.setItem('currentUser', JSON.stringify({
        email: formData.email,
        role: 'user',
        id: data.userId
      }));
      updateSignInUI();

      // Clear form
      FORM_VALIDATOR.clearForm('regForm');

    } else {
      NOTIFICATION_SYSTEM.error(data.error || 'Registration failed');
    }

  } catch (err) {
    NOTIFICATION_SYSTEM.error('Server error, try again');
    console.error(err);
  }
}



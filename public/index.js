// Listen for ScamShield risk detection event to show the warning modal
document.addEventListener('scamshield:risk_detected', (e) => {
  const { message } = e.detail;
  const modal = document.getElementById('risk-modal');

  if (modal) {
    const messageElement = modal.querySelector('.risk-message');
    if (messageElement) {
      messageElement.innerText = message;
    }
    modal.classList.add('is-active');
  }
});

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      const modal = document.getElementById('risk-modal');
      const messageElement = modal.querySelector('.risk-message');
      if (messageElement) {
        messageElement.innerText = "Login Success";
      }
      modal.classList.add('is-active');
    } else {
      alert("Error: " + (data.message || "Invalid credentials"));
    }
  } catch (error) {
    console.error('Login error:', error);
  }
});

// ADD THIS: Bind and handle the checkout form submission
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
  checkoutForm.addEventListener('submit', (e) => {
    const paymentTypeInput = document.querySelector('#payment-type');
    if (paymentTypeInput) {
      const paymentType = paymentTypeInput.value;
      
      if (window.ScamShield) { window.ScamShield.sendTelemetry({ paymentType })     
        
        
        // Check configuration rules (e.g., block personal P2P)
        if (window.ScamShield.config && window.ScamShield.config.blockProtectedP2P && paymentType === 'PERSONAL_P2P') {
          e.preventDefault();
          window.ScamShield.triggerRiskIntervention('High-risk P2P payment detected!');
        }
      }
    }
  });
}

// Initialize ScamShield
if (window.ScamShield) {
  window.ScamShield.init();
}
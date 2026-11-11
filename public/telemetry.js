const ScamShield = {
  async init() {
    try {
      // Fixed: Pointing explicitly to the backend server port to prevent SPA HTML fallback
      const response = await fetch('http://localhost:3000/api/config');
      this.config = await response.json();
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
      this.config = { blockUnprotectedP2P: true };
    }
    this.bindCheckoutForm();
  },

  bindCheckoutForm() {
    const form = document.querySelector('#checkout-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      console.log('Checkout form submitted');
      
      const paymentTypeInput = document.querySelector('#payment-type');
      if (!paymentTypeInput) return;
      
      const paymentType = paymentTypeInput.value;
      this.sendTelemetry({ paymentType });

      if (this.config.blockUnprotectedP2P && paymentType === 'PERSONAL_P2P') {
        e.preventDefault();
        this.triggerRiskIntervention();
      }
    });
  },

  triggerRiskIntervention() {
    document.dispatchEvent(new CustomEvent('scamshield:risk_detected', {
      detail: {
        riskType: 'UNPROTECTED_P2P_PAYMENT',
        message: 'Personal transfers lack merchant chargeback protection.'
      }
    }));

    this.sendTelemetry({
      event: 'HIGH_RISK_CHECKOUT_BLOCKED',
      timestamp: new Date().toISOString()
    });
  },

  async sendTelemetry(payload) {
    try {
      const response = await fetch('http://localhost:3000/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (error) {
      console.error('Telemetry Error:', error);
    }
  }
};

window.ScamShield = ScamShield;
ScamShield.init();
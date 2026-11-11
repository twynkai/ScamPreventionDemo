import React, { useEffect, useRef } from 'react';
import { useSecurityState } from './security-guard/securitystatecontext';

const PayPalPayment = ({ onSuccess }) => {
  const isMounted = useRef(true);
  const { sendTelemetry } = useSecurityState(); // Access the security context

  useEffect(() => {
    isMounted.current = true;
    const containerId = 'paypal-button-container';
    
    // Clear out any leftover buttons in the DOM container first
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    const scriptId = 'paypal-sdk-script';
    let scriptTag = document.getElementById(scriptId);

    const renderButtons = () => {
      if (window.paypal && isMounted.current) {
        const containerElem = document.getElementById(containerId);
        // Ensure container exists and is empty before rendering
        if (containerElem && containerElem.innerHTML === '') {
          window.paypal.Buttons({
            createOrder: (data, actions) => {
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    value: '100.00'
                  }
                }]
              });
            },
            onApprove: (data, actions) => {
              return actions.order.capture().then(async (details) => {
                if (!isMounted.current) return;
                
                // Route telemetry through the security guard context to sign the payload
                try {
                  await sendTelemetry({
                    event: 'CHECKOUT_SUBMITTED',
                    paymentType: 'MERCHANT_GATEWAY',
                    timestamp: new Date().toISOString()
                  });
                } catch (err) {
                  console.warn("Telemetry submission failed:", err);
                }

                alert('Transaction completed by ' + details.payer.name.given_name);
                if (onSuccess) onSuccess();
              });
            }
          }).render(`#${containerId}`).catch((err) => {
            // Catch Zoid or rendering race condition errors silently to prevent uncaught runtime crashes
            console.warn("PayPal Buttons render warning:", err);
          });
        }
      }
    };

    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.src = "https://www.paypal.com/sdk/js?client-id=BAA35nYIl8ee9OzZQ8tuDffgdgJOodRbxy6zGErIQWea5nbHDb4OV-_CHT1EHw7IDmh746AcrCf35KBmDM";
      scriptTag.async = true;
      scriptTag.onload = renderButtons;
      document.body.appendChild(scriptTag);
    } else {
      renderButtons();
    }

    return () => {
      isMounted.current = false;
      // Clear container on unmount to prevent Zoid conflict errors
      const currentContainer = document.getElementById(containerId);
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [onSuccess, sendTelemetry]);

  return (
    <div className="paypal-payment-container">
      <div id="paypal-button-container"></div>
    </div>
  );
};

export default PayPalPayment;
import React, { useState } from 'react';
import Dashboard from './dashboard';
import { SecurityGuard } from './security-guard/securityguard';
import { SecurityStateProvider } from './security-guard/securitystatecontext';
import { WarningBanner } from './security-guard/warningbanner';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskMessage, setRiskMessage] = useState('');
  const [paymentType, setPaymentType] = useState('MERCHANT_GATEWAY');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        const errorData = await response.json();
        const msg = errorData.message || 'Invalid credentials';
        setErrorMessage(msg);
        if (errorData.isRiskDetected) {
          setRiskMessage(msg);
          setIsRiskModalOpen(true);
        }
      }
    } catch (error) {
      setErrorMessage('Failed to connect to server.');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:3000/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'CHECKOUT_SUBMITTED', paymentType, timestamp: new Date().toISOString() })
      });
      alert(`Processing payment via ${paymentType} and telemetry sent.`);
    } catch (error) {
      console.error('Telemetry failed:', error);
      alert(`Processing payment via ${paymentType} (telemetry failed)`);
    }
  };

  return (
    <SecurityStateProvider>
      <WarningBanner />
      <SecurityGuard>
        <div className="App" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          {isAuthenticated ? (
            <Dashboard />
          ) : (
            <div>
              <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', border: '1px solid #ccc' }}>
                <h2>Login</h2>
                {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Username:</label><br />
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Password:</label><br />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
                  </div>
                  <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0070ba', color: '#fff', border: 'none', cursor: 'pointer' }}>Login</button>
                </form>
              </div>
              <hr style={{ margin: '40px 0' }} />
              <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', border: '1px solid #ccc' }}>
                <h2>Checkout Form</h2>
                <form onSubmit={handleCheckout}>
                  <div style={{ marginBottom: '10px' }}>
                    <label>Payment Type:</label><br />
                    <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                      <option value="MERCHANT_GATEWAY">Merchant Gateway</option>
                      <option value="PERSONAL_P2P">Personal P2P</option>
                    </select>
                  </div>
                  <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>Submit Payment</button>
                </form>
              </div>
            </div>
          )}
          {isRiskModalOpen && (
            <div style={{ display: 'block', position: 'fixed', zIndex: 1, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div style={{ backgroundColor: 'white', margin: '15% auto', padding: '20px', width: '50%', border: '1px solid #888' }}>
                <h3>⚠️ Risk Detected</h3>
                <p>{riskMessage}</p>
                <button onClick={() => setIsRiskModalOpen(false)}>Close</button>
              </div>
            </div>
          )}
        </div>
      </SecurityGuard>
    </SecurityStateProvider>
  );
}
import React from 'react';
import { useSecurityState } from './securitystatecontext';

export const WarningBanner = () => {
  const { lockoutState, isBlured } = useSecurityState();

  if (!lockoutState && !isBlured) return null;

  return (
    <div style={{
      backgroundColor: '#ffdd00',
      color: '#333',
      padding: '15px',
      textAlign: 'center',
      fontWeight: 'bold',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      zIndex: 1000,
      borderBottom: '2px solid #cc0000'
    }}>
      ⚠️ Security Alert: Anomalous activity detected. Session terminating.
    </div>
  );
};
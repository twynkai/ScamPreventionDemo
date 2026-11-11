import React, { createContext, useState, useContext } from 'react';
import { writeAuditLog } from './auditlogger';

const SecurityStateContext = createContext(null);

export const SecurityStateProvider = ({ children }) => {
  const [isBlured, setIsBlured] = useState(false);
  const [lockoutState, setLockoutState] = useState(false);
  const [anomalyScore, setAnomalyScore] = useState(0.0);

  const triggerGlobalLockout = async () => {
    await writeAuditLog('LOCKOUT_TRIGGERED', { anomalyScore });
    setIsBlured(true);
    setLockoutState(true);
    localStorage.setItem('security_violation', Date.now());
  };

  const value = {
    isBlured,
    lockoutState,
    anomalyScore,
    setAnomalyScore,
    triggerGlobalLockout
  };

  console.log('Security State:', { isBlured, lockoutState, anomalyScore });

  return (
    <SecurityStateContext.Provider value={value}>
      {children}
    </SecurityStateContext.Provider>
  );
};

export const useSecurityState = () => useContext(SecurityStateContext);
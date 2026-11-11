import React, { createContext, useEffect, useRef } from 'react';
import { useSecurityState } from './securitystatecontext';

const SecurityContext = createContext(null);

export const SecurityGuard = ({ children }) => {
  const { isBlured, triggerGlobalLockout } = useSecurityState();
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./telemetryworker.js', import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const { status } = event.data;
      if (status === 'TRIGGER_LOCKOUT') {
        handleLockout();
      }
    };

    // Expose a test function to the global window object for console testing
    window.triggerTelemetry = async (payload) => {
      await dispatchTelemetry(payload);
    };

    const handleVisibilityChange = async () => {
      const payload = {
        type: 'VISIBILITY_CHANGE',
        state: document.visibilityState,
        sessionId: 'session-default',
        mode: 'STRICT'
      };
      await dispatchTelemetry(payload);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic heartbeat sync (every 15s) to force state alignment and eliminate reporting delays
    const heartbeatInterval = setInterval(async () => {
      const payload = {
        type: 'HEARTBEAT',
        state: document.visibilityState,
        sessionId: 'session-default',
        mode: 'STRICT'
      };
      await dispatchTelemetry(payload);
    }, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      workerRef.current?.terminate();
      delete window.triggerTelemetry;
    };
  }, []);

  const handleLockout = () => {
    triggerGlobalLockout();
    
    // Explicit client-side state cleanup and storage purging during lockouts
    localStorage.removeItem('token');
    localStorage.removeItem('user_session');
    sessionStorage.clear();
    
    localStorage.setItem('security_violation', Date.now());
    
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  const generateHmacSignature = async (payload) => {
    try {
      const secret = import.meta.env.VITE_ACCESS_TOKEN_SECRET || 'EBQ3rnvD5j2yYHZWBkaOYTnMOduSJ-nryU4irU1xhSOXP9SnqPYMNWJBYFLR7_XYiWRgSA111GFL_EX1';
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      
      // Sort object keys recursively to guarantee deterministic matching with the server
      const sortObjectKeys = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(sortObjectKeys);
        return Object.keys(obj).sort().reduce((sorted, key) => {
          sorted[key] = sortObjectKeys(obj[key]);
          return sorted;
        }, {});
      };

      const sortedPayloadString = JSON.stringify(sortObjectKeys(payload));
      const msgData = encoder.encode(sortedPayloadString);
      
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuffer = await window.crypto.subtle.sign('HMAC', key, msgData);
      return Array.from(new Uint8Array(sigBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (err) {
      console.error('HMAC signature generation failed:', err);
      return '';
    }
  };

  const dispatchTelemetry = async (payload) => {
    // Evaluate anomaly score on the client matching worker criteria precisely before signing
    let anomalyScore = 0.0;
    if (payload.type === 'POINTER_TELEPORTATION') anomalyScore += 0.8;
    if (payload.type === 'KEVIN_DYNAMICS') anomalyScore += 0.9;
    if (payload.type === 'VISIBILITY_CHANGE' && payload.state === 'hidden') anomalyScore += 0.2; // Safe non-trigger level
    if (payload.type === 'HEARTBEAT') anomalyScore = 0.0;
    anomalyScore = Math.min(anomalyScore, 1.0);

    const enrichedPayload = {
      anomalyScore,
      id: payload.id || window.crypto.randomUUID(),
      mode: payload.mode || 'STRICT',
      sessionId: payload.sessionId || 'session-default',
      state: payload.state,
      timestamp: payload.timestamp || Date.now(),
      type: payload.type
    };

    const signature = await generateHmacSignature(enrichedPayload);
    workerRef.current?.postMessage({
      type: 'DISPATCH_EVENT',
      payload: enrichedPayload,
      signature,
    });
  };

  return (
    <SecurityContext.Provider value={{ dispatchTelemetry }}>
      <div style={{
        filter: isBlured ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s ease',
        pointerEvents: isBlured ? 'none' : 'auto'
      }}>
        {children}
      </div>
    </SecurityContext.Provider>
  );
};
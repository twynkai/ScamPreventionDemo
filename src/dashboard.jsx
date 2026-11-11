// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import styles from './dashboard.module.css';
import PayPalPayment from './paypalpayment';

const Dashboard = () => {
  const [rowData, setRowData] = useState([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const formatEvents = (data) => {
    return data.map((item, index) => {
      const typeLabel = (index % 2 === 0) ? 'Payment Checkout' : 'Login Attempt';
      return {
        id: item.id || `TXN-00${index + 1}`,
        user: item.username || item.user || 'Unknown User',
        amount: item.amount || 100.0,
        riskScore: item.riskScore || Math.floor(Math.random() * 90) + 10,
        status: item.status || 'Flagged',
        eventType: typeLabel,
      };
    });
  };

  useEffect(() => {
    // Initial fetch
    fetch('http://localhost:3000/api/events')
      .then((res) => res.json())
      .then((data) => {
        const formattedData = formatEvents(data);
        if (formattedData.length > 0) {
          setRowData(formattedData);
        }
      })
      .catch((err) => console.error('Failed to fetch events:', err));

    // Real-Time Server-Sent Events (SSE) Stream Setup
    const eventSource = new EventSource('http://localhost:3000/api/events/stream');

    eventSource.onmessage = (event) => {
      try {
        const newItems = JSON.parse(event.data);
        const formattedNewItems = formatEvents(newItems);
        setRowData((prevData) => [...prevData, ...formattedNewItems]);
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const triggerStepUp = (txn) => {
    setSelectedTxn(txn);
    setAuthRequired(true);
  };

  const columnDefs = useMemo(
    () => [
      { 
        field: 'id', 
        headerName: 'Transaction ID', 
        sortable: true, 
        filter: false, 
        suppressMenu: true,
        suppressHeaderMenuButton: true,
        flex: 1.5,
        minWidth: 140 
      },
      { 
        field: 'user', 
        headerName: 'User', 
        sortable: true, 
        filter: false, 
        suppressMenu: true,
        suppressHeaderMenuButton: true,
        flex: 1.5,
        minWidth: 120 
      },
      {
        field: 'amount',
        headerName: 'Amount ($)',
        sortable: true,
        filter: false,
        suppressMenu: true,
        suppressHeaderMenuButton: true,
        flex: 1.5,
        minWidth: 120,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`,
      },
      { 
        field: 'riskScore', 
        headerName: 'Risk Score', 
        sortable: true, 
        filter: false, 
        suppressMenu: true,
        suppressHeaderMenuButton: true,
        flex: 1,
        minWidth: 100 
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: true,
        filter: false,
        suppressMenu: true,
        suppressHeaderMenuButton: true,
        flex: 1.2,
        minWidth: 110,
        cellRenderer: (params) => {
          let statusClass = '';
          if (params.value === 'Flagged') statusClass = styles.statusFlagged;
          if (params.value === 'Approved') statusClass = styles.statusApproved;

          return <span className={statusClass}>{params.value}</span>;
        },
      },
      {
        headerName: 'Action',
        suppressMenu: true,
        suppressHeaderMenuButton: true,
        flex: 1.5,
        minWidth: 140,
        cellRenderer: (params) => {
          if (params.data && params.data.status === 'Flagged') {
            return (
              <button
                onClick={() => triggerStepUp(params.data)}
                className={styles.verifyButton}
              >
                Verify Identity
              </button>
            );
          }
          return <span style={{ color: '#94a3b8', fontSize: '12px' }}>None</span>;
        },
      },
    ],
    []
  );

  const handleAuthSuccess = () => {
    setRowData((prevData) =>
      prevData.map((item) =>
        item.id === selectedTxn.id ? { ...item, status: 'Approved', riskScore: 10 } : item
      )
    );
    setAuthRequired(false);
    setSelectedTxn(null);
  };

  const calculatedGridHeight = useMemo(() => {
    const rowHeight = 44;
    const headerHeight = 48;
    const paginationHeight = rowData.length > 0 ? 52 : 0;
    const activeRows = Math.max(rowData.length, 1);
    const visibleRows = Math.min(activeRows, 10);
    return headerHeight + (visibleRows * rowHeight) + paginationHeight;
  }, [rowData]);

  const onGridReady = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onGridSizeChanged = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <h1>Risk Analysis Dashboard</h1>
        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
          Zero-trust financial defense system powering privacy-preserving cross-merchant threat detection.
        </p>
      </div>

      <div className={styles.riskGuideContainer}>
        <span className={styles.riskGuideTitle}><strong>Risk Scoring Guide:</strong></span>
        <div className={styles.riskGuideItems}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block', flexShrink: 0 }}></span>
            <strong>0–39 (Low):</strong> Normal login/payment activity.
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706', display: 'inline-block', flexShrink: 0 }}></span>
            <strong>40–69 (Medium):</strong> Unusual device or amount mismatch.
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block', flexShrink: 0 }}></span>
            <strong>70–100 (High):</strong> Severe risk flags in login attempt or payment checkout.
          </span>

        </div>
      </div>

      <div className={`ag-theme-alpine ${styles.gridWrapper}`} style={{ height: calculatedGridHeight, transition: 'height 0.2s ease' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          onGridReady={onGridReady}
          onGridSizeChanged={onGridSizeChanged}
          animateRows={true}
          pagination={rowData.length > 10}
          paginationPageSize={10}
          rowHeight={44}
          headerHeight={48}
        />
      </div>

      <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
        <strong>Security Notice:</strong> Watch out for unusual account activities, unexpected payment requests, or unfamiliar login attempts, as these are common indicators of account takeover and phishing scams.
      </div>

      {authRequired && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Step-Up Authentication Required</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              High-risk <strong>{selectedTxn?.eventType || 'payment checkout'}</strong> detected for <strong>{selectedTxn?.user}</strong>. Please verify your identity to proceed.
            </p>

            {selectedTxn?.eventType === 'Payment Checkout' && (
              <div style={{ margin: '16px 0' }}>
                <PayPalPayment onSuccess={handleAuthSuccess} />
              </div>
            )}

            <div className={styles.modalActions}>
              {selectedTxn?.eventType === 'Login Attempt' && (
                <button onClick={handleAuthSuccess} className={styles.btnApprove}>
                  Approve Login
                </button>
              )}
              <button onClick={() => setAuthRequired(false)} className={styles.btnCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
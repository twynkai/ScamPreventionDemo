import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise';
import App from './app.jsx';

// Register all enterprise modules to clear version mismatch/module errors
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Set the enterprise license key globally once upon application startup
LicenseManager.setLicenseKey('MTc5Njk0NzIwMDAwMA==7793a771ce87a20d73d167620608e1a8');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
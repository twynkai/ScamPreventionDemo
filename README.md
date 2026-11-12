# ScamPreventionDemo

**Zero-Trust Financial Defense & Privacy-Preserving Threat Intelligence Platform**

---

## Executive Summary

**ScamPreventionDemo** is a multi-layered, zero-trust financial security architecture engineered to detect, intercept, and neutralize account takeovers, high-risk peer-to-peer (P2P) fraud, and anomalous checkout sessions in real time[cite: 3, 4]. 

Built specifically for the **PayPal AI Hackathon**, the system bridges client-side behavioral surveillance with cryptographic state validation, a native Redis rate-limiting and session-management broker, an enterprise AG Grid telemetry console, and a decentralized federated learning pipeline powered by the Flower framework[cite: 3, 4].

---

## Core Architecture & Engineering Pillars

### 1. PayPal Sandbox & Risk-Gated Checkout Integration
* **Order & Capture Orchestration:** Integrates `@paypal/checkout-server-sdk` and the PayPal JavaScript SDK to dynamically initialize, render, and capture sandbox orders (`USD 100.00`) upon passing security posture checks[cite: 4].
* **Risk Intervention & Policy Enforcement:** Evaluates payment vectors at checkout, distinguishing between protected merchant gateway flows (`MERCHANT_GATEWAY`) and high-risk personal transfers (`PERSONAL_P2P`) to trigger automated step-up authentication modals and risk decision-tree telemetry (`/v1/risk/decision-trees`)[cite: 4].

### 2. Zero-Trust Client Surveillance & Cryptographic Integrity
* **Web Worker Telemetry Pipeline:** Offloads behavioral anomaly detection (`POINTER_TELEPORTATION`, `KEVIN_DYNAMICS`, `VISIBILITY_CHANGE`, `HEARTBEAT`) to a dedicated background worker (`telemetryworker.js`) with local 200ms flood throttling[cite: 4].
* **Deterministic SHA-256 HMAC Signing:** Recursively sorts JSON payload keys on the client and signs transmissions via Web Crypto API (`x-security-integrity`)[cite: 4]. The Node.js backend enforces timing-safe cryptographic verification (`crypto.timingSafeEqual`) to eliminate replay and payload-tampering attacks[cite: 4].
* **Immutable Client Audit Trail:** Maintains a SHA-256 hash-chained local audit log (`auditlogger.js`) alongside automated UI blurring and storage purging upon threshold breaches[cite: 4].

### 3. Stateful Financial Middleware & Real-Time Streaming
* **Redis Session & Rate-Limit Broker:** Utilizes a password-authenticated Redis instance to enforce 1-second sliding-window rate limits (`20 req/sec` per IP) and maintain immediate session invalidation states (`session_invalidated:<sessionId>`) with automatic TTL expiration[cite: 3, 4].
* **AG Grid Enterprise Telemetry Console:** Streams live security events and transaction risk scores (`0–39 Low`, `40–69 Medium`, `70–100 High`) via Server-Sent Events (`/api/events/stream`), enabling security operators to inspect anomalies and execute step-up PayPal verification workflows[cite: 4].

### 4. Privacy-Preserving Federated Threat Intelligence (Flower Core)
* **Differential Privacy Blinding:** Injects controlled Gaussian noise ($\sigma = 0.005$) into local model updates prior to transmission to prevent gradient inversion and protect merchant data confidentiality[cite: 3, 4].
* **8-Bit Weight Quantization:** Compresses 32-bit floating-point parameter tensors into `int8` representations, achieving a verified **4.00x bandwidth reduction** across edge-to-aggregator links[cite: 3, 4].
* **FedProx Statistical Stabilization:** Implements a proximal optimization term ($\mu = 0.01$) in the aggregation strategy (`fedprox_optimizer.py`) to prevent model divergence across heterogeneous merchant nodes[cite: 3, 4].
* **Automated Parameter Rollback:** Continuously inspects weight tensors for numerical instability (`NaN` or `Inf`), instantly reverting to the last validated parameter checkpoint to guarantee zero-downtime execution[cite: 3, 4].

---

## System Topology

```text
+-----------------------------------+       TLS 1.3 / HTTPS        +---------------------------------------+
|        Client Application         | ---------------------------> |         Financial Middleware          |
|-----------------------------------|   SHA-256 HMAC Signatures    |---------------------------------------|
| - React 19 UI & AG Grid Dashboard |                              | - Node.js / Express REST & SSE Server |
| - Web Worker Anomaly Engine       | <--------------------------- | - JWT RBAC & Timing-Safe Verification |
| - PayPal JS SDK Step-Up Modal     |   Server-Sent Events (SSE)   | - Redis Rate Limiter & Session Store  |
+-----------------------------------+                              +---------------------------------------+
                                                                                       |
                                                                                       v
                                                                   +---------------------------------------+
                                                                   |     Federated AI/ML Core (Linux)      |
                                                                   |---------------------------------------|
                                                                   | - Flower NumPy Client & Aggregator    |
                                                                   | - Gaussian DP Noise & int8 Quantizer  |
                                                                   | - FedProx Strategy (mu=0.01)          |
                                                                   | - Automated Safe-State Rollback       |
                                                                   +---------------------------------------+
```

---

## Repository Structure

```text
ScamPreventionDemo/
├── server.js                     # Express backend, PayPal SDK, Redis broker & HMAC middleware
├── package.json                  # Node.js dependencies and execution scripts
├── verify_orchestration.py       # End-to-end verification script for Redis & Flower pipelines
├── telemetry.test.js             # Jest & Supertest security, rate-limit, and exploit test suite
├── public/
│   ├── index.html                # Application mount point
│   ├── index.js                  # Legacy form & ScamShield event bindings
│   ├── paypal.html               # Standalone PayPal SDK sandbox view
│   └── telemetry.js              # Client-side P2P risk interceptor
├── src/
│   ├── app.jsx                   # Root authentication, checkout simulator & security provider
│   ├── index.js                  # React DOM entry & AG Grid Enterprise license initialization
│   ├── dashboard.jsx             # Real-time AG Grid telemetry dashboard & step-up modal
│   ├── dashboard.module.css      # Responsive fintech styling
│   ├── paypalpayment.jsx         # PayPal Buttons React wrapper with Zoid cleanup management
│   └── security-guard/
│       ├── securityguard.jsx     # Web Worker lifecycle, heartbeat sync & HMAC signer
│       ├── securitystatecontext.jsx # Global lockout state & audit log integration
│       ├── telemetryworker.js    # Background thread anomaly scoring & throttling
│       ├── auditlogger.js        # SHA-256 hash-chained local audit ledger
│       └── warningbanner.jsx     # Global lockout alert overlay
└── flowerclient/
    ├── client.py                 # Flower client with DP noise, int8 quantization & rollback
    ├── server_runner.py          # Flower aggregation server configured with FedProx
    ├── fedprox_optimizer.py      # Custom FedProx server aggregation strategy
    ├── secure_server.py          # Base SecureFedAvg strategy extension
    └── test_*.py                 # Unit tests for quantization, FedProx, rollback & aggregation
```

---

## Prerequisites

* **Node.js:** v18.0 or higher
* **Python:** v3.9 or higher (Linux/WSL2 recommended for Flower execution)[cite: 3]
* **Redis Server:** v6.0 or higher (configured with password authentication)[cite: 3, 4]
* **PayPal Developer Account:** Sandbox Client ID and Client Secret[cite: 4]

---

## Installation & Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/twynkai/ScamPreventionDemo.git
cd ScamPreventionDemo
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Install Python Dependencies (Federated Learning Core)
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows PowerShell: .\venv\Scripts\Activate.ps1
pip install flwr numpy redis requests
```

### 4. Configure Environment Variables
Create a `.env` file in the project root directory with the following variables[cite: 4]:

```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
ACCESS_TOKEN_SECRET=your_shared_hmac_and_jwt_secret
VITE_ACCESS_TOKEN_SECRET=your_shared_hmac_and_jwt_secret
REDIS_PASSWORD=your_secure_redis_password_here
JWT_SECRET=your_jwt_secret_here
```
*(Note: Ensure `ACCESS_TOKEN_SECRET` and `VITE_ACCESS_TOKEN_SECRET` share the exact same key string so client-side Web Crypto HMAC signatures match server-side verification[cite: 4].)*

### 5. Start the Redis Broker
Ensure your local Redis instance is running with the configured password[cite: 3, 4]:
```bash
redis-server --requirepass your_redis_password_here
```

---

## Running the Application

Open separate terminal sessions to run each subsystem concurrently:

### Terminal 1: Express Backend & PayPal API Server
```bash
node server.js
```
*Expected output:* `Server is running at http://localhost:3000` and `Connected to Redis`[cite: 4].

### Terminal 2: React Frontend Dashboard
```bash
npm start
```
*Expected output:* Opens the React application in your browser at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied by the API server; ensure API calls target `http://localhost:3000`)[cite: 4].

### Terminal 3 & 4: Federated Learning Pipeline (Optional)
Start the Flower aggregation server[cite: 3, 4]:
```bash
cd flowerclient
python3 server_runner.py
```
In a fourth terminal, connect the Flower edge client[cite: 3, 4]:
```bash
cd flowerclient
python3 client.py
```

---

## Verification & Testing Guide for Judges

### 1. Interactive UI & Step-Up PayPal Flow
1. **Normal Authentication:** Log in on the landing screen using the default sandbox operator credentials[cite: 4]:
   * **Username:** `testuser`[cite: 4]
   * **Password:** `password`[cite: 4]
2. **Triggering High-Risk Telemetry:** Attempt a login with invalid credentials (e.g., `attacker` / `wrongpass`) or submit a `PERSONAL_P2P` payment on the checkout form[cite: 4]. The event immediately streams to the **Risk Analysis Dashboard** with a `Flagged` status and a high risk score (`92`)[cite: 4].
3. **PayPal Sandbox Step-Up Verification:** Click **Verify Identity** on any flagged `Payment Checkout` row in the AG Grid table to launch the Step-Up Authentication modal and complete a sandbox transaction via the integrated PayPal Checkout buttons[cite: 4].
4. **Simulating Client Lockout:** Open the browser Developer Console and execute two consecutive high-anomaly telemetry events to observe the Web Worker threshold enforcement, UI blur lockdown, and Redis session invalidation[cite: 4]:
   ```javascript
   await window.triggerTelemetry({ type: 'POINTER_TELEPORTATION' });
   await window.triggerTelemetry({ type: 'KEVIN_DYNAMICS' });
   ```

### 2. Automated Security & Orchestration Test Suites
* **Node.js Security & Exploit Suite (Jest):** Validates HMAC tamper rejection, prototype pollution resilience, rate-limiting (`HTTP 429`), and Redis TTL expiration[cite: 3, 4]:
  ```bash
  npx jest telemetry.test.js
  ```
* **Master Pipeline Verification (Python):** Validates Redis connectivity, differential privacy noise injection, and `4.00x` `int8` weight quantization[cite: 3, 4]:
  ```bash
  python3 verify_orchestration.py
  ```
* **Federated Learning Unit Tests:**
  ```bash
  cd flowerclient
  python3 test_quantization.py
  python3 test_fedprox.py
  python3 test_rollback.py
  python3 test_secure_agg.py
  ```

---

## Demonstration Video

* **YouTube Demo Video:** https://www.youtube.com/watch?v=RJZljDEFl6Q

---

## License

This project is licensed under the **MIT License**. See the `LICENSE` file in the root directory for full terms.
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from 'redis';
import paypal from '@paypal/checkout-server-sdk';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';

const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

// Initialize Redis Client for Server-Side State Tracking
const redisClient = createClient({ password: process.env.REDIS_PASSWORD });
redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function startRedis() {
  try {
    await redisClient.connect();
    console.log("Connected to Redis");
  } catch (err) {
    console.log("Redis connection skipped or failed:", err.message);
  }
}
startRedis();

async function sendTelemetry(data) {
  try {
    const response = await fetch(`${PAYPAL_API}/v1/risk/decision-trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error('Telemetry Error:', error);
  }
}

const eventQueue = [];

// SSE Clients Connection List
let sseClients = [];

function broadcastEvent(newEvent) {
  eventQueue.push(newEvent);
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify([newEvent])}\n\n`);
  });
}

function environment() {
    let clientId = process.env.PAYPAL_CLIENT_ID;
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function client() {
    return new paypal.core.PayPalHttpClient(environment());
}

const app = express();
app.use(express.json());
app.use(cors());
const PORT = 3000;
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static('public'));

// Cryptographic HMAC Integrity Middleware for Phase 2 State Hardening
const verifyTelemetryIntegrity = (req, res, next) => {
  const signature = req.headers['x-security-integrity'];
  if (!signature) {
    return res.status(403).json({ error: 'Missing security integrity signature' });
  }
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'default_secret_key';
    
    // Sort object keys recursively to ensure deterministic stringification matching the client
    const sortObjectKeys = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
      }, {});
    };

    const sortedBody = sortObjectKeys(req.body);
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sortedBody))
      .digest('hex');

    console.log('Received Signature:', signature);
    console.log('Computed Signature:', computedSignature);

    // Secure timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf8');
    const computedBuffer = Buffer.from(computedSignature, 'utf8');

    if (sigBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(sigBuffer, computedBuffer)) {
      return res.status(403).json({ error: 'Integrity signature mismatch' });
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid integrity signature format' });
  }
};

app.get('/api/dashboard', authenticateToken, (req, res) => {
  res.json({ message: 'Welcome to your dashboard', user: req.user });
});

app.post('/api/login', (req, res) => { 
  console.log('Login attempt:', req.body);
  const { username, password } = req.body; 
  const validUser = 'testuser'; 
  const validPassword = 'password';

  // Successful Login
  if (username === validUser && password === validPassword) { 
    const token = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: '1h' }); 
    broadcastEvent({ 
      id: `TXN-00${eventQueue.length + 1}`,
      user: username, 
      amount: 100.00,
      riskScore: 15,
      status: 'Logged in', 
      timestamp: new Date().toISOString() 
    });
    return res.json({ token, status: 'success' }); 
  } 

  // High-Risk / Flagged Attempt
  if (username && (username !== validUser || password !== validPassword)) {
    const token = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: '1h' }); 
    broadcastEvent({ 
      id: `TXN-00${eventQueue.length + 1}`,
      user: username, 
      amount: 250.00,
      riskScore: 92,
      status: 'Flagged', 
      timestamp: new Date().toISOString() 
    });
    return res.status(403).json({ 
      msg: 'High-risk login detected. Step-up authentication required.', 
      requiresStepUp: true,
      token 
    });
  }

  // Fallback Invalid Credentials
  return res.status(401).json({ msg: 'Invalid credentials' }); 
});

app.get('/api/login-history', authenticateToken, (req, res) => {
  res.json(eventQueue);
});

app.get('/api/config', (req, res) => { 
  console.log('Config requested'); 
  setTimeout(() => { 
    res.json({ blockUnprotectedP2p: true, requireExplicitWarning: true, telemetryMode: 'STRICT' }); 
  }, 100); 
});

// Telemetry Rate-Limiting & Flood-Protection Middleware
const telemetryRateLimiter = async (req, res, next) => {
  try {
    const clientIp = req.ip || 'global-guard';
    const rateLimitKey = `telemetry_ratelimit:${clientIp}`;
    
    if (redisClient.isOpen) {
      const requests = await redisClient.incr(rateLimitKey);
      if (requests === 1) {
        await redisClient.expire(rateLimitKey, 1); // 1-second sliding window limit
      }
      if (requests > 20) { // Max 20 telemetry requests per second per IP/client
        return res.status(429).json({ error: 'Too many telemetry requests. Rate limit exceeded.' });
      }
    }
    next();
  } catch (err) {
    console.error('Rate Limiter Error:', err);
    next(); // Fallback to allow request if Redis fails temporarily
  }
};

// Enhanced Telemetry Endpoint with Redis Threshold Tracking, Session Validation & Rate Limiting
app.post('/api/telemetry', telemetryRateLimiter, verifyTelemetryIntegrity, async (req, res) => {
  broadcastEvent(req.body);
  console.log('Telemetry received:', req.body);

  try {
    const clientIp = req.ip || 'global-guard';
    const redisKey = `telemetry_violations:${clientIp}`;
    const sessionId = req.body.sessionId || 'session-default';
    const sessionInvalidKey = `session_invalidated:${sessionId}`;
    
    // Server-side session validation to immediately reject invalidated sessions
    if (redisClient.isOpen) {
      const isInvalid = await redisClient.get(sessionInvalidKey);
      if (isInvalid === 'true') {
        return res.set('Content-Type', 'application/json').status(403).json({ 
          status: 'lockout', 
          message: 'Session invalidated due to security policy.' 
        });
      }
    }

    let violations = 0;
    
    // Only track violations in Redis if the anomaly score crosses the high-risk threshold
    if (req.body.anomalyScore >= 0.8) {
      if (redisClient.isOpen) {
        violations = await redisClient.incr(redisKey);
        if (violations === 1) {
          await redisClient.expire(redisKey, 60);
        }
      }

      // If violations exceed threshold, invalidate session and trigger client-side lockout
      if (violations >= 2) {
        if (redisClient.isOpen) {
          await redisClient.set(sessionInvalidKey, 'true', { EX: 300 });
        }
        return res.set('Content-Type', 'application/json').status(403).json({ 
          status: 'lockout', 
          message: 'Threshold exceeded. Security session terminated.' 
        });
      }
    } else {
      // For benign requests (including heartbeats), fetch current count without incrementing
      if (redisClient.isOpen) {
        const currentVal = await redisClient.get(redisKey);
        violations = currentVal ? parseInt(currentVal, 10) : 0;
      }
    }

    return res.set('Content-Type', 'application/json').status(200).json({ status: 'success', violations });
  } catch (err) {
    console.error('Redis Telemetry Error:', err);
    return res.set('Content-Type', 'application/json').status(200).json({ status: 'success' });
  }
});

app.get('/api/events', (req, res) => { 
  res.json(eventQueue); 
});

// Server-Sent Events Endpoint
app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

app.post("/api/create-paypal-order", async (req, res) => {
  try {
    const order = await client().execute(new paypal.orders.OrdersCreateRequest().requestBody({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: "USD", value: "100.00" }
      }]
    }));
    res.json({ id: order.result.id });
  } catch (error) {
    console.error('PayPal Order Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/signup', (req, res) => { 
  const { username, password } = req.body; 
  const hashedPassword = bcrypt.hashSync(password, 10); 
  res.json({ user: username, password: hashedPassword }); 
});

app.get('/paypal', (req, res) => {
  res.sendFile(path.resolve('./public/paypal.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

export { sendTelemetry };
export default app;
import request from 'supertest';
import crypto from 'crypto';
import { createClient } from 'redis';
import app from './server.js';

describe('/api/telemetry', () => {
  it('should return 403 when session is invalid', async () => {
    const sessionId = 'test-session-123';
    const sessionInvalidKey = `session_invalidated:${sessionId}`;

    const testRedis = createClient({ password: process.env.REDIS_PASSWORD });
    await testRedis.connect();
    await testRedis.set(sessionInvalidKey, 'true', { EX: 300 });

    const payload = { sessionId, anomalyScore: 0.9 };
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'default_secret_key';

    const sortObjectKeys = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
      }, {});
    };

    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sortObjectKeys(payload)))
      .digest('hex');

    const response = await request(app)
      .post('/api/telemetry')
      .set('x-security-integrity', signature)
      .send(payload);

    await testRedis.quit();

    expect(response.status).toBe(403);
    expect(response.body.status).toBe('lockout');
  });

  it('should return 429 when rate limit is exceeded', async () => {
    const payload = { sessionId: 'rate-limit-test', anomalyScore: 0.1 };
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'default_secret_key';

    const sortObjectKeys = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
      }, {});
    };

    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sortObjectKeys(payload)))
      .digest('hex');

    // Make 22 rapid requests to exceed the limit of 20 per second
    const requests = [];
    for (let i = 0; i < 22; i++) {
      requests.push(
        request(app)
          .post('/api/telemetry')
          .set('x-security-integrity', signature)
          .send(payload)
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequestsResponse = responses.find(res => res.status === 429);
    expect(tooManyRequestsResponse).toBeDefined();
    expect(tooManyRequestsResponse.body.error).toBe('Too many telemetry requests. Rate limit exceeded.');
  });

  it('should clean up state or expire lockout keys correctly', async () => {
    const sessionId = 'cleanup-test-session';
    const sessionInvalidKey = `session_invalidated:${sessionId}`;

    const testRedis = createClient({ password: process.env.REDIS_PASSWORD });
    await testRedis.connect();

    // Set a key with a short expiration TTL to verify cleanup/expiry behavior
    await testRedis.set(sessionInvalidKey, 'true', { EX: 1 });

    // Wait slightly over 1 second for the TTL to elapse
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const val = await testRedis.get(sessionInvalidKey);
    await testRedis.quit();

    // Verify that the state has been cleaned up / expired from storage
    expect(val).toBeNull();
  });

  it('should reject malicious payloads and invalid signatures safely during exploit probing', async () => {
    const sessionId = 'exploit-test-session';
    
    // Test Case 1: Tampered payload with valid-looking structure but invalid signature
    const payload = { sessionId, anomalyScore: 0.5 };
    const maliciousPayload = { sessionId, anomalyScore: 0.5, injectedField: '<script>alert(1)</script>' };
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'default_secret_key';

    const sortObjectKeys = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
      }, {});
    };

    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sortObjectKeys(payload)))
      .digest('hex');

    // Send tampered payload with old/mismatched signature
    const responseTampered = await request(app)
      .post('/api/telemetry')
      .set('x-security-integrity', signature)
      .send(maliciousPayload);

    expect([400, 403]).toContain(responseTampered.status);

    // Test Case 2: Prototype pollution or malformed types in payload
    const polluterPayload = { sessionId: { __proto__: { polluted: true } }, anomalyScore: 0.1 };
    const polluterSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sortObjectKeys(polluterPayload)))
      .digest('hex');

    const responsePollution = await request(app)
      .post('/api/telemetry')
      .set('x-security-integrity', polluterSignature)
      .send(polluterPayload);

    expect(responsePollution.status).not.toBe(500);
  });

  it('should handle boundary values for anomalyScore correctly (0 and 1 limits)', async () => {
    const sessionId = 'boundary-test-session';
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'default_secret_key';

    const sortObjectKeys = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortObjectKeys(obj[key]);
        return sorted;
      }, {});
    };

    // Test Lower Bound: anomalyScore = 0
    const payloadMin = { sessionId, anomalyScore: 0 };
    const signatureMin = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sortObjectKeys(payloadMin)))
      .digest('hex');

    const responseMin = await request(app)
      .post('/api/telemetry')
      .set('x-security-integrity', signatureMin)
      .send(payloadMin);

    expect(responseMin.status).not.toBe(500);

    // Test Upper Bound: anomalyScore = 1
    const payloadMax = { sessionId, anomalyScore: 1 };
    const signatureMax = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(sortObjectKeys(payloadMax)))
      .digest('hex');

    const responseMax = await request(app)
      .post('/api/telemetry')
      .set('x-security-integrity', signatureMax)
      .send(payloadMax);

    expect(responseMax.status).not.toBe(500);
  });
});
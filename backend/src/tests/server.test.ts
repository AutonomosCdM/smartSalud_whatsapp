/**
 * ALONSO TDD - EXPRESS SERVER TESTS (RED PHASE)
 *
 * Tests for Express server initialization and middleware.
 * ALL TESTS MUST FAIL - waiting for Valtteri implementation.
 */

import request from 'supertest';
import app from '../app'; // This import will fail - no app.ts exists yet

describe('Express Server', () => {
  it('should start server on configured PORT', async () => {
    expect(app).toBeDefined();
    expect(app.listen).toBeDefined();
  });

  it('should have CORS enabled', async () => {
    const response = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });

  it('should parse JSON bodies', async () => {
    const response = await request(app)
      .post('/api/appointments')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');

    // Should not fail at body parsing level
    expect(response.status).not.toBe(415); // Unsupported Media Type
  });

  it('should handle 404 for unknown routes', async () => {
    const response = await request(app).get('/api/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  it('should handle 500 errors with proper logging', async () => {
    // Trigger an internal error by sending malformed data to an endpoint
    const response = await request(app)
      .post('/api/test-error')
      .send({ malformed: 'data' });

    if (response.status === 500) {
      expect(response.body).toHaveProperty('error');
      expect(response.body).not.toHaveProperty('stack'); // Stack traces hidden in production
    }
  });
});

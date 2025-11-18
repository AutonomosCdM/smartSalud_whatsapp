/**
 * Security-focused validation tests
 * Tests JSONB injection, prototype pollution, DoS vectors
 */
import { conversationDataSchema } from '../utils/validation';

describe('JSONB Security Tests', () => {
  describe('Prototype Pollution Prevention', () => {
    it('should REJECT __proto__ injection attempt', () => {
      const maliciousPayload = {
        validatedRut: '12345678-5',
        __proto__: { isAdmin: true }, // Prototype pollution attempt
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Unrecognized key');
      }
    });

    it('should REJECT constructor injection attempt', () => {
      const maliciousPayload = {
        validatedRut: '12345678-5',
        constructor: { prototype: { isAdmin: true } },
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should REJECT unknown keys', () => {
      const maliciousPayload = {
        validatedRut: '12345678-5',
        maliciousKey: 'exploit',
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('DoS Prevention - Array Limits', () => {
    it('should REJECT messageHistory with >5 messages (DoS attempt)', () => {
      const maliciousPayload = {
        messageHistory: Array(10).fill({
          role: 'user',
          content: 'test',
          timestamp: new Date().toISOString(),
        }),
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('5');
      }
    });

    it('should ACCEPT messageHistory with exactly 5 messages', () => {
      const validPayload = {
        messageHistory: Array(5).fill({
          role: 'user',
          content: 'test',
          timestamp: new Date().toISOString(),
        }),
      };

      const result = conversationDataSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should REJECT validationErrors with >10 entries', () => {
      const maliciousPayload = {
        validationErrors: Array(15).fill('error'),
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('DoS Prevention - String Limits', () => {
    it('should REJECT message content >1000 chars (memory exhaustion)', () => {
      const largeString = 'A'.repeat(1001);
      const maliciousPayload = {
        messageHistory: [{
          role: 'user',
          content: largeString,
          timestamp: new Date().toISOString(),
        }],
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should ACCEPT message content exactly 1000 chars', () => {
      const validString = 'A'.repeat(1000);
      const validPayload = {
        messageHistory: [{
          role: 'user',
          content: validString,
          timestamp: new Date().toISOString(),
        }],
      };

      const result = conversationDataSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Retry Count Limits', () => {
    it('should REJECT retryCount > 3 (infinite loop prevention)', () => {
      const maliciousPayload = {
        retryCount: 10,
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should REJECT negative retryCount', () => {
      const maliciousPayload = {
        retryCount: -1,
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should ACCEPT retryCount = 3', () => {
      const validPayload = {
        retryCount: 3,
      };

      const result = conversationDataSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Intent Validation', () => {
    it('should REJECT invalid intent values', () => {
      const maliciousPayload = {
        detectedIntent: 'SQL_INJECTION',
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should ACCEPT valid intent values', () => {
      const validIntents = ['CONFIRM', 'CANCEL', 'CHANGE_APPOINTMENT', 'UNKNOWN'];

      validIntents.forEach(intent => {
        const validPayload = { detectedIntent: intent };
        const result = conversationDataSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Confidence Score Validation', () => {
    it('should REJECT intentConfidence > 1.0', () => {
      const maliciousPayload = {
        intentConfidence: 1.5,
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should REJECT negative intentConfidence', () => {
      const maliciousPayload = {
        intentConfidence: -0.5,
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should ACCEPT intentConfidence in [0, 1] range', () => {
      const validPayload = {
        intentConfidence: 0.87,
      };

      const result = conversationDataSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Complex Injection Scenarios', () => {
    it('should REJECT nested prototype pollution attempt', () => {
      const maliciousPayload = {
        messageHistory: [{
          role: 'user',
          content: 'test',
          timestamp: new Date().toISOString(),
          __proto__: { isAdmin: true }, // Nested pollution
        }],
      };

      const result = conversationDataSchema.safeParse(maliciousPayload);
      expect(result.success).toBe(false);
    });

    it('should ACCEPT valid complex payload', () => {
      const validPayload = {
        validatedRut: '12345678-5',
        validatedPhone: '+56912345678',
        detectedIntent: 'CONFIRM' as const,
        intentConfidence: 0.95,
        requestedDate: new Date().toISOString(),
        requestedTime: '14:30',
        messageHistory: [
          {
            role: 'user' as const,
            content: 'Quiero confirmar mi cita',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant' as const,
            content: 'Por favor, envía tu RUT',
            timestamp: new Date().toISOString(),
          },
        ],
        validationErrors: ['RUT format invalid'],
        retryCount: 1,
      };

      const result = conversationDataSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });
});

// Jest setup file for test environment configuration
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load .env file before tests
dotenv.config();

// Extend Jest timeout for database operations
jest.setTimeout(30000);

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://autonomos_dev@localhost:5432/smartsalud_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Mock external services
jest.mock('twilio', () => ({
  Twilio: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'SM123' }),
    },
  })),
  validateRequest: jest.fn((_authToken, signature, _url, _params) => {
    return signature === 'valid_signature';
  }),
  twiml: {
    MessagingResponse: jest.fn().mockImplementation(() => ({
      message: jest.fn(),
      toString: jest.fn().mockReturnValue('<Response><Message>Test</Message></Response>'),
    })),
  },
}));

jest.mock('groq-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'CONFIRM' } }],
          }),
        },
      },
    })),
  };
});

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
    remove: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Global Prisma instance for cleanup
const prisma = new PrismaClient();

// Global test teardown
afterAll(async () => {
  await prisma.$disconnect();
});

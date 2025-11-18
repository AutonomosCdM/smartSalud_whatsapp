// Jest setup file for test environment configuration
import dotenv from 'dotenv';

// Load .env file before tests
dotenv.config();

// Extend Jest timeout for database operations
jest.setTimeout(10000);

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://autonomos_dev@localhost:5432/smartsalud_test';

// Global test setup
beforeAll(() => {
  // Any global setup needed before all tests
});

// Global test teardown
afterAll(() => {
  // Any global cleanup needed after all tests
});

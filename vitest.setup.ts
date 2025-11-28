/**
 * Vitest Global Setup
 *
 * Configure environment and globals before running tests
 */

// Set required environment variables for testing
// API key must match pattern: /^[a-zA-Z0-9%+/=]{20,}$/
process.env.PUBLIC_DATA_API_KEY = 'testApiKey1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN=';
process.env.API_KEY_EXPIRY = '2099-12-31';
process.env.NODE_ENV = 'test';

/**
 * Jest test setup file
 */

// Extend test timeout for slower operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};

beforeAll(() => {
  // Only show console output if VERBOSE env is set
  if (!process.env.VERBOSE) {
    console.log = jest.fn();
    console.debug = jest.fn();
    // Keep error and warn for important messages
  }
});

afterAll(() => {
  // Restore original console
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
});

// Global test utilities
global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toContainObject(received: any[], expected: object) {
    const pass = received.some(item => 
      Object.keys(expected).every(key => item[key] === expected[key])
    );
    
    if (pass) {
      return {
        message: () => `expected array not to contain object matching ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected array to contain object matching ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  }
});

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toContainObject(expected: object): R;
    }
  }
  
  var sleep: (ms: number) => Promise<void>;
}

// Ensure tests run in test environment
process.env.NODE_ENV = 'test';

// Disable color output for cleaner logs
process.env.NO_COLOR = '1';

// Export for use in tests
export { originalConsole };
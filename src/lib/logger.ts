 
/**
 * Redacting Logger Utility
 * Scrubs sensitive data (passwords, tokens, emails, prompts, answer text, error stacks)
 * before forwarding to console. All parameters are precisely typed (no `any`).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Keys whose values are fully replaced with '[REDACTED]' */
const REDACTED_KEYS: ReadonlySet<string> = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'answer_text',
  'prompt',
]);

/**
 * Masks the local part of an email address: `user@example.com` → `***@example.com`
 */
function maskEmail(value: string): string {
  const atIndex = value.lastIndexOf('@');
  if (atIndex <= 0) return value; // not a valid email shape, pass through
  return `***${value.slice(atIndex)}`;
}

/**
 * Deep-traverses a value and returns a redacted copy.
 * Handles circular references gracefully via a WeakSet.
 */
function redact(value: unknown, seen?: WeakSet<object>, parentKey?: string): unknown {
  // Primitives pass through unchanged (only object keys are redacted)
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'symbol' || typeof value === 'function') {
    return String(value);
  }
  if (typeof value === 'string') {
    // If the parent key indicates this string should be redacted
    if (parentKey !== undefined && REDACTED_KEYS.has(parentKey)) {
      return '[REDACTED]';
    }
    if (parentKey === 'email') {
      return maskEmail(value);
    }
    if (parentKey === 'stack') {
      return '[REDACTED]';
    }
    return value;
  }

  // Object handling
  if (typeof value !== 'object') return value;

  const seenSet = seen ?? new WeakSet<object>();

  // Circular reference guard
  if (seenSet.has(value as object)) {
    return '[Circular]';
  }
  seenSet.add(value as object);

  // Error instances: redact the stack property
  if (value instanceof Error) {
    const redactedError: Record<string, unknown> = {
      message: value.message,
      name: value.name,
      stack: '[REDACTED]',
    };
    // Copy any additional enumerable properties
    for (const key of Object.keys(value)) {
      if (key === 'stack') {
        redactedError[key] = '[REDACTED]';
      } else if (key === 'message' || key === 'name') {
        continue; // already handled
      } else {
        redactedError[key] = redact(
          (value as unknown as Record<string, unknown>)[key],
          seenSet,
          key
        );
      }
    }
    return redactedError;
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seenSet, undefined));
  }

  // Plain objects
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const val = (value as Record<string, unknown>)[key];

    if (REDACTED_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (key === 'email' && typeof val === 'string') {
      result[key] = maskEmail(val);
    } else if (key === 'stack' && typeof val === 'string') {
      // error.stack nested under any key named 'error' or directly
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(val, seenSet, key);
    }
  }
  return result;
}

/**
 * Redacts an array of log arguments, preserving primitives and deep-redacting objects.
 */
function redactArgs(args: readonly unknown[]): unknown[] {
  return args.map((arg) => redact(arg, undefined, undefined));
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      return level === 'error';
    }
    return true;
  }

  debug(message: unknown, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      const redacted = redactArgs([message, ...args]);
      console.log(`[DEBUG]`, ...redacted);
    }
  }

  info(message: unknown, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      const redacted = redactArgs([message, ...args]);
      console.info(`[INFO]`, ...redacted);
    }
  }

  warn(message: unknown, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      const redacted = redactArgs([message, ...args]);
      console.warn(`[WARN]`, ...redacted);
    }
  }

  error(message: unknown, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      const redacted = redactArgs([message, ...args]);
      console.error(`[ERROR]`, ...redacted);
    }
  }

  /** Method untuk development saja */
  devOnly(callback: () => void): void {
    if (this.isDevelopment) {
      callback();
    }
  }

  /** Method untuk log dengan kondisi tertentu */
  conditional(condition: boolean, level: LogLevel, message: unknown, ...args: unknown[]): void {
    if (condition) {
      this[level](message, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export default untuk kemudahan import
export default logger;

// Export types
export type { LogLevel };

// Export redact utility for testing
export { redact, redactArgs, maskEmail };

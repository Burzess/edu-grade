/**
 * Custom Logger Utility
 * Logger ini akan otomatis dinonaktifkan di production build
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    // Di production, hanya log error yang ditampilkan
    if (!this.isDevelopment) {
      return level === 'error';
    }
    return true;
  }

  debug(message: any, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG]`, message, ...args);
    }
  }

  info(message: any, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO]`, message, ...args);
    }
  }

  warn(message: any, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN]`, message, ...args);
    }
  }

  error(message: any, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR]`, message, ...args);
    }
  }

  // Method untuk development saja
  devOnly(callback: () => void): void {
    if (this.isDevelopment) {
      callback();
    }
  }

  // Method untuk log dengan kondisi tertentu
  conditional(condition: boolean, level: LogLevel, message: any, ...args: any[]): void {
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

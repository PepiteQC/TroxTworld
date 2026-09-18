// ============================================================
// utils/Logger.ts — Logger structuré avec niveaux et couleurs
// ============================================================

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
};

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: ' INFO',
  warn: ' WARN',
  error: 'ERROR',
};

export class Logger {
  private context: string;
  private level: LogLevel;

  constructor(context: string, level?: LogLevel) {
    this.context = context;
    this.level = level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const color = LEVEL_COLORS[level];
      const prefix = LEVEL_PREFIX[level];

      const header = `${COLORS.gray}[${timestamp}]${COLORS.reset} ${color}[${prefix}]${COLORS.reset} ${COLORS.cyan}[${this.context}]${COLORS.reset}`;

      if (args.length > 0) {
        const extra = args.map(a => {
          if (a instanceof Error) return `${COLORS.red}${a.message}${COLORS.reset}`;
          if (typeof a === 'object') return `\n${JSON.stringify(a, null, 2)}`;
          return String(a);
        }).join(' ');
        console.log(`${header} ${message} ${extra}`);
      } else {
        console.log(`${header} ${message}`);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  debug(message: string, ...args: unknown[]): void { this.log('debug', message, ...args); }
  info(message: string, ...args: unknown[]): void { this.log('info', message, ...args); }
  warn(message: string, ...args: unknown[]): void { this.log('warn', message, ...args); }
  error(message: string, ...args: unknown[]): void { this.log('error', message, ...args); }

  /**
   * Crée un sous-logger avec un contexte supplémentaire
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.level);
  }
}
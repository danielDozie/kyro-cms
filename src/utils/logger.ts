export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

export class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = typeof process !== "undefined" ? process.env?.KYRO_LOG_LEVEL : undefined;
    this.level = (envLevel as LogLevel) || "info";
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(targetLevel: LogLevel): boolean {
    return LEVEL_ORDER[targetLevel] >= LEVEL_ORDER[this.level];
  }

  debug(...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.debug("[Kyro DEBUG]", ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog("info")) {
      console.log("[Kyro]", ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog("warn")) {
      console.warn("[Kyro WARN]", ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog("error")) {
      console.error("[Kyro ERROR]", ...args);
    }
  }
}

export const logger = new Logger();

import pino, {
  Logger as PinoLogger,
  LoggerOptions as PinoLoggerOptions,
} from "pino";

interface LoggerOptions {
  loggerType?: string;
  pinoOptions?: PinoLoggerOptions;
}

class Logger {
  private loggerType: string;
  private logger: PinoLogger | Console;

  constructor(options: LoggerOptions) {
    this.loggerType = options.loggerType || "console";

    switch (this.loggerType) {
      case "pino":
        this.logger = pino(options.pinoOptions || {});
        break;
      default:
        this.logger = console;
        break;
    }
  }

  private log(
    level: "info" | "warn" | "error" | "debug",
    ...args: any[]
  ): void {
    switch (this.loggerType) {
      case "pino":
        (this.logger as PinoLogger)[level](args);
        break;
      default:
        (this.logger as any).log(`${level.toUpperCase()}: ${args.join(" ")}`);
        break;
    }
  }

  info(...args: any[]): void {
    this.log("info", ...args);
  }

  warn(...args: any[]): void {
    this.log("warn", ...args);
  }

  error(...args: any[]): void {
    this.log("error", ...args);
  }

  debug(...args: any[]): void {
    this.log("debug", ...args);
  }
}

export const consoleLogger = new Logger({ loggerType: "pino" });

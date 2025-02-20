export class Logger {
  constructor(
    private readonly context: string,
    private readonly emoji: string = '📝'
  ) {}

  info(message: string, data?: any) {
    console.log(`${this.emoji} ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`);
  }

  error(message: string, error?: any) {
    console.error(`❌ ${message}${error ? ': ' + JSON.stringify(error, null, 2) : ''}`);
  }

  warn(message: string, data?: any) {
    console.warn(`⚠️ ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`);
  }
}

import { TrueLayerError, TrueLayerErrorCode } from './types';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};

export class ApiUtils {
  private static rateLimitMap = new Map<string, number>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 100;

  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;
    let delay = retryConfig.initialDelay;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry if it's not a retryable error
        if (error instanceof TrueLayerError) {
          if (
            error.code === TrueLayerErrorCode.UNAUTHORIZED ||
            error.code === TrueLayerErrorCode.ENCRYPTION_FAILED
          ) {
            throw error;
          }
        }

        if (attempt === retryConfig.maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * retryConfig.backoffFactor, retryConfig.maxDelay);
      }
    }

    throw lastError;
  }

  static async checkRateLimit(endpoint: string): Promise<void> {
    const now = Date.now();
    const key = `${endpoint}_${Math.floor(now / this.RATE_LIMIT_WINDOW)}`;
    const currentCount = this.rateLimitMap.get(key) || 0;

    if (currentCount >= this.MAX_REQUESTS_PER_WINDOW) {
      throw new TrueLayerError('Rate limit exceeded', TrueLayerErrorCode.RATE_LIMIT_EXCEEDED, 429);
    }

    this.rateLimitMap.set(key, currentCount + 1);

    // Clean up old entries
    for (const [mapKey] of this.rateLimitMap) {
      const [, windowStart] = mapKey.split('_');
      if (Number(windowStart) * this.RATE_LIMIT_WINDOW < now - this.RATE_LIMIT_WINDOW) {
        this.rateLimitMap.delete(mapKey);
      }
    }
  }

  static async withRateLimit<T>(endpoint: string, operation: () => Promise<T>): Promise<T> {
    await this.checkRateLimit(endpoint);
    return operation();
  }
}

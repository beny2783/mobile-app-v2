import { TrueLayerService as NewTrueLayerService } from './trueLayer/index';
import type { TrueLayerConfig } from './trueLayer/types';

// Wrap the new service to add logging
export class TrueLayerService extends NewTrueLayerService {
  constructor(config: TrueLayerConfig) {
    console.log('🔍 TrueLayer Service Creation: Using NEW implementation with separated services');
    super(config);
  }
}

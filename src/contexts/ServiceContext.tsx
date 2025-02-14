import React, { createContext, useContext } from 'react';
import { getTrueLayerService } from '../services/trueLayer';
import { ChallengeTrackingService } from '../services/challengeTracking';

interface ServiceContextType {
  trueLayerService: ReturnType<typeof getTrueLayerService>;
  challengeTrackingService: ChallengeTrackingService;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  // Initialize services once
  const services = React.useMemo(
    () => ({
      trueLayerService: getTrueLayerService(),
      challengeTrackingService: new ChallengeTrackingService(),
    }),
    []
  );

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
}

export function useServices() {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, any>;
};

export type UserSubscription = {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: Date;
  cancel_at_period_end: boolean;
};

type SubscriptionContextType = {
  currentPlan: SubscriptionPlan | null;
  subscription: UserSubscription | null;
  isLoading: boolean;
  error: Error | null;
  hasFeature: (featureKey: string) => boolean;
  canAddMoreBanks: () => boolean;
  upgradeToPremium: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);

      // Get user's active subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (subError) throw subError;

      if (subData) {
        // Get plan details
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', subData.plan_id)
          .single();

        if (planError) throw planError;

        setCurrentPlan(planData);
        setSubscription(subData);
      } else {
        // Load free plan as default
        const { data: freePlan, error: freeError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', 'Free')
          .single();

        if (freeError) throw freeError;

        setCurrentPlan(freePlan);
        setSubscription(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load subscription'));
    } finally {
      setIsLoading(false);
    }
  };

  const hasFeature = (featureKey: string): boolean => {
    if (!currentPlan) return false;
    return !!currentPlan.features[featureKey];
  };

  const canAddMoreBanks = () => {
    if (!currentPlan) return false;
    const maxConnections = currentPlan.features.max_bank_connections;
    if (maxConnections === -1) return true; // Unlimited
    // TODO: Compare with actual number of connected banks
    return true; // Implement actual check
  };

  const upgradeToPremium = async () => {
    // TODO: Implement upgrade flow with payment processing
    throw new Error('Not implemented');
  };

  const cancelSubscription = async () => {
    if (!subscription) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      await loadSubscriptionData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cancel subscription'));
      throw err;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        currentPlan,
        subscription,
        isLoading,
        error,
        hasFeature,
        canAddMoreBanks,
        upgradeToPremium,
        cancelSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

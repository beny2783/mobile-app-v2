import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Modal as RNModal } from 'react-native';
import { Text, Card, ActivityIndicator, Button, IconButton, ProgressBar } from 'react-native-paper';
import { colors } from '../constants/theme';
import { ChallengeTrackingService } from '../services/challengeTracking';
import type { Challenge, UserChallenge } from '../types';
import { supabase } from '../services/supabase';

interface UserChallengeWithDetails extends UserChallenge {
  challenge: Challenge;
}

const ProgressIndicator = ({ userChallenge }: { userChallenge: UserChallengeWithDetails }) => {
  const { challenge, progress } = userChallenge;
  const { criteria } = challenge;

  const getProgressPercentage = (): number => {
    switch (criteria.type) {
      case 'no_spend':
        // For no_spend, we show how much of their max_spend is remaining
        const spent = progress.total_spent || 0;
        const maxSpend = criteria.max_spend || 1; // Prevent division by zero
        return Math.max(0, Math.min(1, 1 - spent / maxSpend));

      case 'reduced_spending':
        // For reduced spending, show progress towards spending limit
        const categorySpent = progress.category_spent || 0;
        const spendingLimit = criteria.max_spend || 1; // Prevent division by zero
        return Math.max(0, Math.min(1, 1 - categorySpent / spendingLimit));

      case 'spending_reduction': {
        // For spending reduction, show progress towards reduction target
        const reductionPercentage = progress.reduction_percentage || 0;
        const targetReduction = Number(criteria.reduction_target || 0) * 100;
        return Math.max(0, Math.min(1, reductionPercentage / (targetReduction || 1))); // Prevent division by zero
      }

      case 'savings':
        // For savings challenges, show progress towards target
        const saved = progress.total_saved || 0;
        const target = criteria.target || 1; // Prevent division by zero
        return Math.max(0, Math.min(1, saved / target));

      case 'streak':
        // For streak challenges, show progress towards target days
        const currentStreak = Number(progress.streak_count || 0);
        const targetDays = Number(criteria.days || 30);
        return Math.max(0, Math.min(1, currentStreak / targetDays));

      case 'category_budget':
        // For category budget, show overall budget compliance
        const categories = Object.keys(progress.category_spending || {});
        if (categories.length === 0) return 0;
        const compliantCategories = categories.filter(
          (cat) =>
            (progress.category_spending?.[cat] || 0) <= ((criteria as any).budgets?.[cat] || 0)
        );
        return compliantCategories.length / Math.max(1, categories.length); // Prevent division by zero

      default:
        return 0;
    }
  };

  const getProgressText = (): string => {
    const percentage = getProgressPercentage() * 100;
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
      }).format(amount);
    };

    switch (criteria.type) {
      case 'no_spend':
        const spent = progress.total_spent || 0;
        const maxSpend = criteria.max_spend || 0;
        return `${formatCurrency(maxSpend - spent)} remaining`;

      case 'reduced_spending':
        const categorySpent = progress.category_spent || 0;
        const spendingLimit = criteria.max_spend || 0;
        return `${formatCurrency(spendingLimit - categorySpent)} remaining`;

      case 'spending_reduction':
        const reduction = progress.reduction_percentage || 0;
        return `${reduction.toFixed(1)}% reduced`;

      case 'savings':
        const saved = progress.total_saved || 0;
        const target = criteria.target || 0;
        return `${formatCurrency(saved)} of ${formatCurrency(target)}`;

      case 'streak':
        const currentStreak = progress.streak_count || 0;
        const targetDays = criteria.days || 30;
        return `${currentStreak} of ${targetDays} days`;

      case 'category_budget':
        const categories = Object.keys(progress.category_spending || {}).length;
        return `${categories} categories tracked`;

      default:
        return `${percentage.toFixed(0)}% complete`;
    }
  };

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text variant="bodySmall" style={styles.progressLabel}>
          Progress
        </Text>
        <Text variant="bodySmall" style={styles.progressText}>
          {getProgressText()}
        </Text>
      </View>
      <ProgressBar
        progress={getProgressPercentage()}
        color={colors.primary}
        style={styles.progressBar}
      />
    </View>
  );
};

export default function ChallengesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState<UserChallengeWithDetails[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [startingChallenge, setStartingChallenge] = useState(false);
  const challengeTracking = React.useMemo(() => new ChallengeTrackingService(), []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }
      const [active, available] = await Promise.all([
        challengeTracking.getActiveChallenges(user.id),
        challengeTracking.getAvailableChallenges(user.id),
      ]);
      setActiveChallenges(active);
      setAvailableChallenges(available);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallenges();
  };

  const startChallenge = async (challengeId: string) => {
    try {
      setStartingChallenge(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await challengeTracking.startChallenge(user.id, challengeId);
      await fetchChallenges();
      setModalVisible(false);
    } catch (error) {
      console.error('Failed to start challenge:', error);
    } finally {
      setStartingChallenge(false);
    }
  };

  const renderModal = () => (
    <RNModal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Available Challenges
            </Text>
            <IconButton icon="close" size={24} onPress={() => setModalVisible(false)} />
          </View>
          <ScrollView style={styles.modalContent}>
            {availableChallenges.map((challenge) => (
              <Card key={challenge.id} style={styles.challengeCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.challengeName}>
                    {challenge.name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.challengeDescription}>
                    {challenge.description}
                  </Text>
                  <View style={styles.rewardContainer}>
                    <Text variant="bodySmall" style={styles.rewardLabel}>
                      Reward
                    </Text>
                    <Text variant="bodyMedium" style={styles.rewardValue}>
                      {challenge.reward_xp} XP
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    onPress={() => startChallenge(challenge.id)}
                    loading={startingChallenge}
                    disabled={startingChallenge}
                    style={styles.startButton}
                  >
                    Start Challenge
                  </Button>
                </Card.Content>
              </Card>
            ))}
            {availableChallenges.length === 0 && (
              <Text style={styles.noAvailableText}>No challenges available at the moment</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Active Challenges
          </Text>
          <Button mode="contained" onPress={() => setModalVisible(true)} style={styles.newButton}>
            Start New Challenge
          </Button>
        </View>

        {activeChallenges.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.emptyText}>
                No active challenges
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Start a new challenge to earn rewards!
              </Text>
            </Card.Content>
          </Card>
        ) : (
          activeChallenges.map((userChallenge) => (
            <Card key={userChallenge.id} style={styles.challengeCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.challengeName}>
                  {userChallenge.challenge.name}
                </Text>
                <Text variant="bodyMedium" style={styles.challengeDescription}>
                  {userChallenge.challenge.description}
                </Text>
                <ProgressIndicator userChallenge={userChallenge} />
                <View style={styles.rewardContainer}>
                  <Text variant="bodySmall" style={styles.rewardLabel}>
                    Reward
                  </Text>
                  <Text variant="bodyMedium" style={styles.rewardValue}>
                    {userChallenge.challenge.reward_xp} XP
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
      {renderModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  newButton: {
    marginTop: 8,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: colors.surface,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
  challengeCard: {
    margin: 16,
    backgroundColor: colors.surface,
  },
  challengeName: {
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  challengeDescription: {
    color: colors.text.secondary,
    marginBottom: 16,
  },
  progressContainer: {
    marginVertical: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: colors.text.secondary,
  },
  progressText: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardLabel: {
    color: colors.text.secondary,
  },
  rewardValue: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.background,
    width: '90%',
    maxHeight: '80%',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  startButton: {
    marginTop: 8,
  },
  noAvailableText: {
    textAlign: 'center',
    color: colors.text.secondary,
    padding: 16,
  },
});

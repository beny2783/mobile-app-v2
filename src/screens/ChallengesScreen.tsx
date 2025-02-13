import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Modal as RNModal } from 'react-native';
import { Text, Card, ActivityIndicator, Button, IconButton } from 'react-native-paper';
import { colors } from '../constants/theme';
import { ChallengeTrackingService } from '../services/challengeTracking';
import type { Challenge, UserChallenge } from '../types';
import { supabase } from '../services/supabase';

interface UserChallengeWithDetails extends UserChallenge {
  challenge: Challenge;
}

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
                <View style={styles.progressContainer}>
                  <Text variant="bodySmall" style={styles.progressLabel}>
                    Progress
                  </Text>
                  {/* TODO: Add progress visualization */}
                </View>
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
    marginBottom: 16,
  },
  progressLabel: {
    color: colors.text.secondary,
    marginBottom: 8,
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

import type { Challenge, UserChallenge } from '../../types';
import { supabase } from '../supabase';

export interface UserChallengeWithChallenge extends UserChallenge {
  challenge: Challenge;
}

export class ChallengeRepository {
  /**
   * Get all active challenges for a user
   */
  async getActiveChallenges(userId: string): Promise<UserChallengeWithChallenge[]> {
    // First, get user challenges
    const { data: userChallenges, error: userChallengesError } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (userChallengesError) {
      console.error('Error fetching user challenges:', userChallengesError);
      throw userChallengesError;
    }

    // Then, get the challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('*');

    if (challengesError) {
      console.error('Error fetching challenges:', challengesError);
      throw challengesError;
    }

    // Combine the data
    return userChallenges.map((uc: UserChallenge) => ({
      ...uc,
      challenge: challenges.find((c: Challenge) => c.id === uc.challenge_id),
    })) as UserChallengeWithChallenge[];
  }

  /**
   * Start a new challenge for a user
   */
  async startChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    // Check if user is eligible for this challenge
    const { data: eligibilityData, error: eligibilityError } = await supabase.rpc(
      'is_challenge_eligible',
      {
        p_user_id: userId,
        p_challenge_id: challengeId,
      }
    );

    if (eligibilityError) throw eligibilityError;
    if (!eligibilityData) throw new Error('User is not eligible for this challenge');

    // Start the challenge
    const { data, error } = await supabase
      .from('user_challenges')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        status: 'active',
        progress: {},
        streak_count: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Complete a challenge and award rewards
   */
  async completeChallenge(
    challengeId: string,
    finalProgress: Record<string, any>
  ): Promise<UserChallenge> {
    const { data: challengeData, error } = await supabase
      .from('user_challenges')
      .update({
        status: 'completed',
        progress: finalProgress,
        completed_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .select('*, challenge:challenges(*)')
      .single();

    if (error) throw error;
    if (!challengeData) throw new Error('Challenge not found');

    // Award XP
    await supabase.rpc('update_user_xp', {
      p_user_id: challengeData.user_id,
      p_xp_earned: (challengeData.challenge as Challenge).reward_xp,
    });

    // Award badge if applicable
    const challenge = challengeData.challenge as Challenge;
    if (challenge.reward_badge) {
      await supabase.rpc('check_and_award_achievement', {
        p_user_id: challengeData.user_id,
        p_badge_name: challenge.reward_badge,
        p_metadata: finalProgress,
      });
    }

    return challengeData;
  }

  /**
   * Mark a challenge as failed
   */
  async failChallenge(
    challengeId: string,
    finalProgress: Record<string, any>
  ): Promise<UserChallenge> {
    const { data, error } = await supabase
      .from('user_challenges')
      .update({
        status: 'failed',
        progress: finalProgress,
        completed_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Challenge not found');
    return data;
  }

  /**
   * Update challenge progress
   */
  async updateProgress(challengeId: string, progress: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('user_challenges')
      .update({ progress })
      .eq('id', challengeId);

    if (error) throw error;
  }

  /**
   * Get available challenges that the user can start
   */
  async getAvailableChallenges(userId: string): Promise<Challenge[]> {
    try {
      // Get all active challenges
      const { data: userChallenges, error: userChallengesError } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (userChallengesError) throw userChallengesError;

      // Get all challenges that are:
      // 1. Active in the system
      // 2. Not currently active for the user
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .not(
          'id',
          'in',
          `(${(userChallenges || []).map((c: { challenge_id: string }) => c.challenge_id).join(',')})`
        );

      if (challengesError) throw challengesError;

      return challenges || [];
    } catch (error) {
      console.error('Failed to fetch available challenges:', error);
      throw error;
    }
  }
}

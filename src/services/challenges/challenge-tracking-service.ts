import type { Challenge, UserChallenge, Transaction } from '../../types';
import { ChallengeRepository } from './challenge-repository';
import { ChallengeProgressCalculator } from './progress-calculator';

export class ChallengeTrackingService {
  private repository: ChallengeRepository;
  private progressCalculator: ChallengeProgressCalculator;

  constructor() {
    this.repository = new ChallengeRepository();
    this.progressCalculator = new ChallengeProgressCalculator();
  }

  async getActiveChallenges(userId: string): Promise<UserChallenge[]> {
    return this.repository.getActiveChallenges(userId);
  }

  async startChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    return this.repository.startChallenge(userId, challengeId);
  }

  async completeChallenge(userChallengeId: string): Promise<UserChallenge> {
    return this.repository.completeChallenge(userChallengeId);
  }

  async failChallenge(userChallengeId: string): Promise<UserChallenge> {
    return this.repository.failChallenge(userChallengeId);
  }

  async getAvailableChallenges(): Promise<Challenge[]> {
    return this.repository.getAvailableChallenges();
  }

  async updateChallengeProgress(userId: string, transactions: Transaction[]): Promise<void> {
    const activeChallenges = await this.getActiveChallenges(userId);
    const availableChallenges = await this.getAvailableChallenges();

    const challengesMap = new Map(availableChallenges.map((c) => [c.id, c]));

    for (const userChallenge of activeChallenges) {
      const challenge = challengesMap.get(userChallenge.challenge_id);
      if (!challenge) continue;

      const { isCompleted, isFailed, progress } = this.progressCalculator.calculateProgress(
        userChallenge,
        challenge,
        transactions
      );

      if (isCompleted) {
        await this.completeChallenge(userChallenge.id);
      } else if (isFailed) {
        await this.failChallenge(userChallenge.id);
      } else {
        await this.repository.updateProgress(userChallenge.id, progress);
      }
    }
  }
}

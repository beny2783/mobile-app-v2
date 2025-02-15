import { Transaction } from '../types';
import {
  Target,
  CategoryTarget,
  TargetAchievement,
  DailySpending,
  TargetSummary,
  CreateTargetInput,
  UpdateTargetInput,
  CreateCategoryTargetInput,
  UpdateCategoryTargetInput,
  CreateTargetAchievementInput,
  CreateDailySpendingInput,
  UpdateDailySpendingInput,
} from '../types/target';

export interface TransactionFilters {
  fromDate?: Date;
  toDate?: Date;
  category?: string;
  connectionId?: string;
  searchQuery?: string;
}

export interface MerchantCategory {
  category: string;
  merchant_pattern: string;
}

export interface TransactionRepository {
  // Core transaction operations
  getTransactions(filters: TransactionFilters): Promise<Transaction[]>;
  getTransactionById(transactionId: string): Promise<Transaction | null>;
  storeTransactions(transactions: Transaction[]): Promise<void>;

  // Category operations
  getCategories(): Promise<string[]>;
  getMerchantCategories(): Promise<MerchantCategory[]>;
  categorizeTransaction(transaction: Transaction): string;
  updateTransactionCategory(transactionId: string, category: string): Promise<void>;

  // Sync operations
  syncTransactions(connectionId: string, fromDate: Date, toDate: Date): Promise<void>;
  getLastSyncTime(connectionId: string): Promise<Date | null>;

  // Cleanup operations
  deleteTransactionsByConnectionId(connectionId: string): Promise<void>;
}

export interface TargetRepository {
  // Core target operations
  getTargets(userId: string): Promise<Target[]>;
  getTargetById(targetId: string): Promise<Target | null>;
  createTarget(target: CreateTargetInput): Promise<Target>;
  updateTarget(targetId: string, target: UpdateTargetInput): Promise<Target>;
  deleteTarget(targetId: string): Promise<void>;

  // Category target operations
  getCategoryTargets(userId: string): Promise<CategoryTarget[]>;
  getCategoryTargetByCategory(userId: string, category: string): Promise<CategoryTarget | null>;
  createCategoryTarget(target: CreateCategoryTargetInput): Promise<CategoryTarget>;
  updateCategoryTarget(
    userId: string,
    category: string,
    target: UpdateCategoryTargetInput
  ): Promise<CategoryTarget>;
  deleteCategoryTarget(userId: string, category: string): Promise<void>;

  // Achievement operations
  getAchievements(userId: string): Promise<TargetAchievement[]>;
  getAchievementsByTarget(targetId: string): Promise<TargetAchievement[]>;
  createAchievement(achievement: CreateTargetAchievementInput): Promise<TargetAchievement>;

  // Daily spending operations
  getDailySpending(userId: string, startDate: Date, endDate: Date): Promise<DailySpending[]>;
  createDailySpending(spending: CreateDailySpendingInput): Promise<DailySpending>;
  updateDailySpending(
    userId: string,
    date: string,
    spending: UpdateDailySpendingInput
  ): Promise<DailySpending>;

  // Summary operations
  getTargetSummary(userId: string): Promise<TargetSummary>;
}

export interface RepositoryError extends Error {
  code: string;
  statusCode?: number;
  originalError?: any;
}

export enum RepositoryErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SYNC_FAILED = 'SYNC_FAILED',
  STORAGE_FAILED = 'STORAGE_FAILED',
  INVALID_DATA = 'INVALID_DATA',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

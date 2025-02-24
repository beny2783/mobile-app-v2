import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { CategoryTarget } from '../types/target';
import { CategoryBudgetList } from '../components/budget/CategoryBudgetList';
import { BudgetSettingModal } from '../components/budget/BudgetSettingModal';
import { CategoryDetailModal } from '../components/budget/CategoryDetailModal';
import { useBudget } from '../store/slices/budget/hooks';
import { useAuth } from '../store/slices/auth/hooks';

const { width } = Dimensions.get('window');

export default function BudgetScreen() {
  const { user } = useAuth();
  const {
    categoryTargets,
    loading,
    error,
    createTarget,
    updateTarget,
    deleteTarget,
    fetchTargets,
  } = useBudget();

  const [isSettingModalVisible, setIsSettingModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryTarget | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  useEffect(() => {
    const loadBudgets = async () => {
      if (!user) {
        console.log('No user found, cannot fetch budgets');
        return;
      }
      console.log('Fetching budgets for user:', user.id);
      try {
        await fetchTargets(user.id);
      } catch (err) {
        console.error('Error fetching budgets:', err);
      }
    };

    loadBudgets();
  }, [user, fetchTargets]);

  // Log state changes
  useEffect(() => {
    console.log('Budget state updated:', {
      categoryTargetsCount: categoryTargets?.length,
      loading,
      error,
      userId: user?.id,
    });
  }, [categoryTargets, loading, error, user]);

  const handleCreateTarget = async (
    target: Omit<CategoryTarget, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) {
      console.error('No user found, cannot create target');
      return;
    }

    try {
      console.log('Creating new target:', { ...target });
      await createTarget(target);
      setIsSettingModalVisible(false);
      console.log('Target created, refreshing budgets...');
      await fetchTargets(user.id);
    } catch (error) {
      console.error('Failed to create target:', error);
    }
  };

  const handleUpdateTarget = async (category: string, updates: Partial<CategoryTarget>) => {
    if (!user) {
      console.error('No user found, cannot update target');
      return;
    }

    try {
      console.log('Updating target:', { category, updates, userId: user.id });
      await updateTarget(user.id, category, updates);
      setIsDetailModalVisible(false);
      setSelectedCategory(null);
      console.log('Target updated, refreshing budgets...');
      await fetchTargets(user.id);
    } catch (error) {
      console.error('Failed to update target:', error);
    }
  };

  const handleDeleteTarget = async (category: string) => {
    if (!user) {
      console.error('No user found, cannot delete target');
      return;
    }

    try {
      console.log('Deleting target:', { category, userId: user.id });
      await deleteTarget(user.id, category);
      setIsDetailModalVisible(false);
      setSelectedCategory(null);
      console.log('Target deleted, refreshing budgets...');
      await fetchTargets(user.id);
    } catch (error) {
      console.error('Failed to delete target:', error);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Please sign in to view budgets</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchTargets(user.id)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Budget Targets</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsSettingModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Empty State or Category Budget List */}
      {!categoryTargets || categoryTargets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No budget targets set</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the + button to create your first budget target
          </Text>
        </View>
      ) : (
        <CategoryBudgetList
          categoryTargets={categoryTargets}
          onCategoryPress={(category) => {
            setSelectedCategory(category);
            setIsDetailModalVisible(true);
          }}
        />
      )}

      {/* Budget Setting Modal */}
      <BudgetSettingModal
        isVisible={isSettingModalVisible}
        onClose={() => setIsSettingModalVisible(false)}
        onSubmit={handleCreateTarget}
      />

      {/* Category Detail Modal */}
      {selectedCategory && (
        <CategoryDetailModal
          isVisible={isDetailModalVisible}
          category={selectedCategory}
          onClose={() => {
            setIsDetailModalVisible(false);
            setSelectedCategory(null);
          }}
          onUpdate={handleUpdateTarget}
          onDelete={handleDeleteTarget}
        />
      )}
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

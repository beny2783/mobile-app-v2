import React, { useState } from 'react';
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
import { useBudget } from '../store/slices/budget/hooks';
import { useAuth } from '../store/slices/auth/hooks';
import { CategoryTarget } from '../types/target';
import { CategoryBudgetList } from '../components/budget/CategoryBudgetList';
import { BudgetSettingModal } from '../components/budget/BudgetSettingModal';
import { CategoryDetailModal } from '../components/budget/CategoryDetailModal';

const { width } = Dimensions.get('window');

export default function BudgetScreen() {
  const { user } = useAuth();
  const {
    categoryTargets,
    loading: isLoading,
    error,
    createTarget: createCategoryTarget,
    updateTarget: updateCategoryTarget,
    deleteTarget: deleteCategoryTarget,
  } = useBudget();

  const [isSettingModalVisible, setIsSettingModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryTarget | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Add logging for initial data load and updates
  React.useEffect(() => {
    console.log('[TargetScreen] Loaded category targets:', categoryTargets);
    console.log('[TargetScreen] Loading state:', isLoading);
    if (error) console.error('[TargetScreen] Error:', error);
  }, [categoryTargets, isLoading, error]);

  const handleCreateTarget = async (
    target: Omit<CategoryTarget, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) {
      console.error('[TargetScreen] No user found, cannot create target');
      return;
    }

    try {
      console.log('[TargetScreen] Creating new target:', target);
      await createCategoryTarget({ ...target, user_id: user.id });
      console.log('[TargetScreen] Target created successfully');
      setIsSettingModalVisible(false);
    } catch (err) {
      console.error('[TargetScreen] Failed to create target:', err);
      // TODO: Show error toast
    }
  };

  const handleUpdateTarget = async (category: string, updates: Partial<CategoryTarget>) => {
    if (!user) {
      console.error('[TargetScreen] No user found, cannot update target');
      return;
    }

    try {
      console.log('[TargetScreen] Updating target:', { category, updates });
      await updateCategoryTarget(user.id, category, updates);
      console.log('[TargetScreen] Target updated successfully');
      setIsDetailModalVisible(false);
      setSelectedCategory(null);
    } catch (err) {
      console.error('[TargetScreen] Failed to update target:', err);
      // TODO: Show error toast
    }
  };

  const handleDeleteTarget = async (category: string) => {
    if (!user) {
      console.error('[TargetScreen] No user found, cannot delete target');
      return;
    }

    try {
      console.log('[TargetScreen] Deleting target:', category);
      await deleteCategoryTarget(user.id, category);
      console.log('[TargetScreen] Target deleted successfully');
      setIsDetailModalVisible(false);
      setSelectedCategory(null);
    } catch (err) {
      console.error('[TargetScreen] Failed to delete target:', err);
      // TODO: Show error toast
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Budget Targets</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsSettingModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Category Budget List */}
        <CategoryBudgetList
          categoryTargets={categoryTargets}
          onCategoryPress={(category) => {
            setSelectedCategory(category);
            setIsDetailModalVisible(true);
          }}
        />
      </ScrollView>

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
  error: {
    color: colors.error,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addButton: {
    padding: 8,
  },
});

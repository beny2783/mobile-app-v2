import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { CategoryTarget, TargetPeriod } from '../../types/target';
import ColorPicker from 'react-native-wheel-color-picker';
import { useTransactions } from '../../store/slices/transactions/hooks';
import { useBudget } from '../../store/slices/budget/hooks';

interface BudgetSettingModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (
    target: Omit<CategoryTarget, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
}

export const BudgetSettingModal: React.FC<BudgetSettingModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
}) => {
  const { categories, loading, refreshCategories } = useTransactions();
  const { loading: isBudgetLoading } = useBudget();
  const isCategoriesLoading = loading.categories;
  const [selectedCategory, setSelectedCategory] = useState('');
  const [targetLimit, setTargetLimit] = useState('');
  const [period, setPeriod] = useState<TargetPeriod>('monthly');
  const [color, setColor] = useState('#4CAF50');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      refreshCategories();
    }
  }, [isVisible, refreshCategories]);

  const periodOptions: { label: string; value: TargetPeriod }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    const target = parseFloat(targetLimit);

    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        category: selectedCategory,
        target_limit: target,
        current_amount: 0,
        color,
        period,
        period_start: new Date().toISOString(),
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create budget target:', error);
      Alert.alert('Error', 'Failed to create budget target. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    setTargetLimit('');
    setPeriod('monthly');
    setColor('#4CAF50');
    onClose();
  };

  const renderCategoryItem = ({ item: category }: { item: string }) => (
    <TouchableOpacity
      key={category}
      style={[styles.categoryItem, selectedCategory === category && styles.selectedCategoryItem]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text
        style={[styles.categoryText, selectedCategory === category && styles.selectedCategoryText]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  const renderFormContent = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        {isCategoriesLoading ? (
          <Text style={styles.loadingText}>Loading categories...</Text>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryItem,
                  selectedCategory === category && styles.selectedCategoryItem,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.selectedCategoryText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Period</Text>
        <View style={styles.periodContainer}>
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.periodOption, period === option.value && styles.selectedPeriodOption]}
              onPress={() => setPeriod(option.value)}
            >
              <Text
                style={[styles.periodText, period === option.value && styles.selectedPeriodText]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Target Amount (£)</Text>
        <TextInput
          style={styles.input}
          value={targetLimit}
          onChangeText={setTargetLimit}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.text.secondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorPicker}>
          <ColorPicker
            color={color}
            onColorChange={setColor}
            thumbSize={30}
            sliderSize={20}
            noSnap={true}
            row={false}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          (isSubmitting || isBudgetLoading) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting || isBudgetLoading}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Creating...' : 'Create Budget Target'}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Budget Target</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderFormContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  formScrollView: {
    maxHeight: '80%',
  },
  formContentContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorPicker: {
    height: 200,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategoryItem: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  selectedCategoryText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPeriodOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  selectedPeriodText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useTransactions } from '../store/slices/transactions/hooks';

interface CategoriesModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({ isVisible, onClose }) => {
  const { categories, loading, errors, refreshCategories } = useTransactions();
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (categories.includes(newCategory.trim())) {
      Alert.alert('Error', 'This category already exists');
      return;
    }

    setIsAdding(true);
    try {
      // TODO: Implement the actual API call to add a new category
      // For now, we'll just refresh the categories
      await refreshCategories();
      setNewCategory('');
      Alert.alert('Success', 'Category added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setIsAdding(false);
    }
  };

  const renderCategory = ({ item }: { item: string }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryIcon}>
        <Ionicons name="pricetag" size={20} color={colors.primary} />
      </View>
      <Text style={styles.categoryName}>{item}</Text>
      <Text style={styles.transactionCount}>0 transactions</Text>
    </View>
  );

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Categories</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.addCategorySection}>
            <TextInput
              style={styles.input}
              placeholder="Add new category"
              value={newCategory}
              onChangeText={setNewCategory}
              placeholderTextColor={colors.text.secondary}
            />
            <TouchableOpacity
              style={[styles.addButton, !newCategory.trim() && styles.addButtonDisabled]}
              onPress={handleAddCategory}
              disabled={!newCategory.trim() || isAdding}
            >
              {isAdding ? (
                <Text style={styles.addButtonText}>Adding...</Text>
              ) : (
                <Text style={styles.addButtonText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>

          {loading.categories ? (
            <View style={styles.centerContainer}>
              <Text style={styles.messageText}>Loading categories...</Text>
            </View>
          ) : errors.categories ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Error loading categories</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refreshCategories}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.messageText}>No categories found</Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  addCategorySection: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: colors.border,
  },
  addButtonText: {
    color: colors.text.inverse,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  transactionCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: colors.text.inverse,
    fontWeight: '500',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';

interface CategorySelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (category: string) => Promise<void>;
  currentCategory: string;
  availableCategories: string[];
  transactionDescription: string;
  isUpdating?: boolean;
}

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  currentCategory,
  availableCategories,
  transactionDescription,
  isUpdating = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  const handleConfirm = async () => {
    const categoryToUse = isCustom ? customCategory : selectedCategory;
    if (categoryToUse === currentCategory || (isCustom && !customCategory.trim())) {
      onClose();
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Update All Similar Transactions?',
      `This will update all transactions from "${transactionDescription}" to the category "${categoryToUse}". This helps keep your categories consistent.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update All',
          style: 'default',
          onPress: async () => {
            try {
              await onConfirm(categoryToUse);
            } catch (error) {
              console.error('Failed to update category:', error);
              Alert.alert('Error', 'Failed to update transaction category. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Category</Text>
            <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
              {transactionDescription}
            </Text>
          </View>

          {/* Custom Category Input */}
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              placeholder="Add a new category..."
              value={customCategory}
              onChangeText={(text) => {
                setCustomCategory(text);
                setIsCustom(true);
              }}
              onFocus={() => setIsCustom(true)}
            />
          </View>

          {/* Categories List */}
          <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
            {availableCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryItem,
                  !isCustom && selectedCategory === category && styles.selectedCategory,
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setIsCustom(false);
                }}
                disabled={isUpdating}
              >
                <Text
                  style={[
                    styles.categoryText,
                    !isCustom && selectedCategory === category && styles.selectedCategoryText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isUpdating}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              disabled={
                isUpdating ||
                (!isCustom && selectedCategory === currentCategory) ||
                (isCustom && !customCategory.trim())
              }
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                {isUpdating ? 'Updating...' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  customInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#f9fafb',
  },
  categoriesList: {
    maxHeight: '60%',
  },
  categoryItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#f8f9ff',
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },
  selectedCategoryText: {
    color: '#6366f1',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    marginRight: 10,
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#6366f1',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  confirmButtonText: {
    color: '#fff',
  },
});

export default CategorySelectionModal;

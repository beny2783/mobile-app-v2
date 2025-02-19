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

  const handleConfirm = async () => {
    if (selectedCategory === currentCategory) {
      onClose();
      return;
    }

    try {
      await onConfirm(selectedCategory);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
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

          {/* Categories List */}
          <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
            {availableCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryItem,
                  selectedCategory === category && styles.selectedCategory,
                ]}
                onPress={() => setSelectedCategory(category)}
                disabled={isUpdating}
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
              disabled={isUpdating || selectedCategory === currentCategory}
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

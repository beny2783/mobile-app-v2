import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

const { width } = Dimensions.get('window');

interface QuestionCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  questions: {
    id: string;
    question: string;
    description: string;
  }[];
}

const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    id: 'spending',
    title: 'Spending',
    icon: 'wallet-outline',
    questions: [
      {
        id: 'largest_expenses',
        question: 'What are my largest expenses?',
        description: 'Identify your biggest spending areas',
      },
      {
        id: 'spending_categories',
        question: 'How is my spending distributed?',
        description: 'See your spending breakdown by category',
      },
    ],
  },
  {
    id: 'savings',
    title: 'Savings',
    icon: 'trending-up-outline',
    questions: [
      {
        id: 'saving_opportunities',
        question: 'Where can I save money?',
        description: 'Find potential savings in your spending',
      },
      {
        id: 'subscription_review',
        question: 'Which subscriptions should I review?',
        description: 'Analyze your recurring payments',
      },
    ],
  },
  {
    id: 'patterns',
    title: 'Patterns',
    icon: 'analytics-outline',
    questions: [
      {
        id: 'unusual_spending',
        question: 'Any unusual spending?',
        description: 'Detect anomalies in your transactions',
      },
      {
        id: 'recurring_payments',
        question: 'What are my recurring payments?',
        description: 'View all your regular expenses',
      },
    ],
  },
];

interface QuestionCardsProps {
  onSelectQuestion: (questionId: string) => void;
}

export const QuestionCards: React.FC<QuestionCardsProps> = ({ onSelectQuestion }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Ask AI Assistant</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUESTION_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Ionicons name={category.icon} size={24} color={colors.primary} />
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>
            <View style={styles.questionsContainer}>
              {category.questions.map((question) => (
                <TouchableOpacity
                  key={question.id}
                  style={styles.questionButton}
                  onPress={() => onSelectQuestion(question.id)}
                >
                  <Text style={styles.questionText}>{question.question}</Text>
                  <Text style={styles.questionDescription}>{question.description}</Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={16}
                    color={colors.text.secondary}
                    style={styles.arrow}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  scrollContent: {
    paddingRight: 16,
  },
  categoryCard: {
    width: width * 0.75,
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  categoryTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  questionsContainer: {
    gap: 12,
  },
  questionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  questionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  questionDescription: {
    color: colors.text.secondary,
    fontSize: 12,
    marginRight: 20,
  },
  arrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
  },
});

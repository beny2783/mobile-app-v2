import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { colors } from '../constants/theme';

interface ActivityItem {
  id: string;
  merchantName: string;
  amount: number;
  logo?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card style={styles.card}>
      <Card.Title title="Activity" />
      <Card.Content>
        {items.map((item) => (
          <View key={item.id} style={styles.activityItem}>
            <View style={styles.merchantInfo}>
              {item.logo ? (
                <Image source={{ uri: item.logo }} style={styles.merchantLogo} />
              ) : (
                <View style={styles.placeholderLogo} />
              )}
              <Text variant="bodyLarge">{item.merchantName}</Text>
            </View>
            <Text variant="bodyLarge" style={styles.amount}>
              {item.amount.toFixed(2)}
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    backgroundColor: colors.surface,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  placeholderLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    marginRight: 12,
  },
  amount: {
    fontWeight: '500',
  },
});

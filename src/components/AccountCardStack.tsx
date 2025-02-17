import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Alert,
} from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface AccountCardProps {
  bankName: string;
  accountType?: string;
  balance: number;
  accountNumber?: string;
  overdraftLimit?: number;
  backgroundColor?: string;
  textColor?: string;
  logoUrl?: string;
  onPress?: () => void;
  isExpanded?: boolean;
  onDisconnect?: () => void;
  connectionId?: string;
  showHeader?: boolean;
}

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
}

function QuickAction({ icon, label, onPress, color }: QuickActionProps) {
  const getIconName = (name: string): 'add-circle-outline' | 'card-outline' => {
    switch (name) {
      case 'add-money':
        return 'add-circle-outline';
      case 'card':
        return 'card-outline';
      default:
        return 'add-circle-outline';
    }
  };

  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={getIconName(icon)} size={20} color={color} style={styles.quickActionIcon} />
      <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const getBankColor = (bankName: string): { bg: string; text: string } => {
  const name = bankName.toLowerCase();
  if (name.includes('amex') || name.includes('american express')) {
    return { bg: '#016FD0', text: '#FFFFFF' }; // AMEX Blue
  }
  if (name.includes('hsbc')) {
    return { bg: '#DB0011', text: '#FFFFFF' }; // HSBC Red
  }
  if (name.includes('monzo')) {
    if (name.includes('joint')) {
      return { bg: '#FFFFFF', text: '#000000' }; // Monzo Joint (White)
    }
    if (name.includes('flex')) {
      return { bg: '#1C1C1E', text: '#FFFFFF' }; // Monzo Flex (Dark)
    }
    return { bg: '#0152E1', text: '#FFFFFF' }; // Monzo Blue
  }
  if (name.includes('truelayer')) {
    return { bg: '#FFFFFF', text: '#000000' }; // Default to white for Truelayer
  }
  return { bg: colors.surface, text: colors.text.primary };
};

function AccountCard({
  bankName,
  accountType,
  balance,
  accountNumber,
  overdraftLimit,
  backgroundColor,
  textColor,
  onPress,
  isExpanded,
  onDisconnect,
  connectionId,
  showHeader,
}: AccountCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const bankColors = getBankColor(bankName);
  const bgColor = backgroundColor || bankColors.bg;
  const txtColor = textColor || bankColors.text;

  const formattedBalance = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(balance));

  const [whole, decimal] = formattedBalance.split('.');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        {showHeader && (
          <View style={styles.bankInfo}>
            <Text style={styles.bankName}>{bankName}</Text>
            {accountType && <Text style={styles.accountType}>{accountType}</Text>}
          </View>
        )}

        <View style={styles.balanceContainer}>
          <Text style={styles.balance}>
            {balance < 0 ? '-' : ''}£{whole}
          </Text>
          <Text style={styles.balanceDecimal}>.{decimal}</Text>
        </View>

        <TouchableOpacity style={styles.moreButton} onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" style={{ opacity: 0.6 }} />
        </TouchableOpacity>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<View style={{ width: 1, height: 1 }} />}
          contentStyle={styles.menuContent}
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              onDisconnect?.();
            }}
            title="Disconnect Bank"
            titleStyle={styles.menuItem}
          />
        </Menu>
      </View>
    </TouchableOpacity>
  );
}

interface AccountCardStackProps {
  accounts: Array<AccountCardProps>;
  onDisconnectBank?: (connectionId: string) => void;
}

export default function AccountCardStack({ accounts, onDisconnectBank }: AccountCardStackProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Group accounts by bank name
  const groupedAccounts = accounts.reduce((groups, account) => {
    const existing = groups.find((g) => g[0].bankName === account.bankName);
    if (existing) {
      existing.push(account);
    } else {
      groups.push([account]);
    }
    return groups;
  }, [] as AccountCardProps[][]);

  return (
    <View style={styles.container}>
      {groupedAccounts.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          {group.map((account, index) => (
            <AccountCard
              key={index}
              {...account}
              showHeader={index === 0} // Only show header for first card in group
              isExpanded={expandedIndex === index}
              onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
              onDisconnect={() => onDisconnectBank?.(account.connectionId || '')}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  group: {
    marginBottom: 24,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    position: 'relative',
  },
  bankInfo: {
    marginBottom: 4,
  },
  bankName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  accountType: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  balance: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  balanceDecimal: {
    fontSize: 24,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  moreButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  menuItem: {
    color: '#FFFFFF',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickActionIcon: {
    marginRight: 6,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

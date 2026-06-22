import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import SaaSButton from './SaaSButton';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      {/* Khối biểu tượng minh họa tối giản */}
      <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
        {icon ? (
          icon
        ) : (
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        )}
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <SaaSButton
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginVertical: 40,
    width: '100%',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 260,
  },
  button: {
    marginTop: 4,
  },
});

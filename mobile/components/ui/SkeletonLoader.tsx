import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const colors = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.7,
        duration: 850,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.3,
        duration: 850,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: colors.backgroundElement,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

// Cung cấp một số layout mẫu thông dụng (ví dụ: Card Skeleton, List Item Skeleton)
export function TripCardSkeleton() {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <SkeletonLoader width={80} height={24} borderRadius={6} />
        <SkeletonLoader width={50} height={20} borderRadius={6} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <SkeletonLoader width={16} height={16} borderRadius={8} />
          <SkeletonLoader width="65%" height={16} style={{ marginLeft: 12 }} />
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <SkeletonLoader width={16} height={16} borderRadius={8} />
          <SkeletonLoader width="50%" height={16} style={{ marginLeft: 12 }} />
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <SkeletonLoader width={100} height={18} />
        <SkeletonLoader width={80} height={36} borderRadius={10} />
      </View>
    </View>
  );
}

export function NotificationSkeleton() {
  const colors = useTheme();
  return (
    <View style={[styles.notiItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={styles.notiContent}>
        <SkeletonLoader width="80%" height={16} borderRadius={4} />
        <SkeletonLoader width="50%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  body: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  notiItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  notiContent: {
    flex: 1,
    marginLeft: 16,
  },
});

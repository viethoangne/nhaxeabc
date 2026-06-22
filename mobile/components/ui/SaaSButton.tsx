import React, { useRef } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  Animated, 
  StyleSheet, 
  GestureResponderEvent 
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SaaSButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: any;
}

export default function SaaSButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: SaaSButtonProps) {
  const colors = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;

  // Hiệu ứng scale khi nhấn xuống
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // Trả về kích thước cũ khi thả tay
  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: { backgroundColor: colors.primaryLight },
          text: { color: colors.primary },
        };
      case 'outline':
        return {
          button: { 
            backgroundColor: 'transparent', 
            borderWidth: 1.5, 
            borderColor: colors.border 
          },
          text: { color: colors.text },
        };
      case 'text':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: colors.primary },
        };
      case 'primary':
      default:
        return {
          button: { backgroundColor: colors.primary },
          text: { color: '#FFFFFF' },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
          text: { fontSize: 13, fontWeight: '600' as const },
        };
      case 'lg':
        return {
          button: { paddingVertical: 16, paddingHorizontal: 28, borderRadius: 20 },
          text: { fontSize: 16, fontWeight: '700' as const },
        };
      case 'md':
      default:
        return {
          button: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 16 },
          text: { fontSize: 14, fontWeight: '600' as const },
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  const isInteractionDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }], width: style?.width }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={isInteractionDisabled}
        style={[
          styles.baseButton,
          sizeStyle.button,
          variantStyle.button,
          isInteractionDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' ? '#FFFFFF' : colors.primary} 
          />
        ) : (
          <>
            {icon && <Animated.View style={styles.iconContainer}>{icon}</Animated.View>}
            <Text style={[sizeStyle.text, variantStyle.text]}>
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 8,
  },
});

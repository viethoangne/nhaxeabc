import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface BouncyPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  pressOpacity?: number;
  enableHaptics?: boolean;
}

const SELF_LAYOUT_PROPS = new Set([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'margin', 'marginHorizontal', 'marginVertical', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginStart', 'marginEnd',
  'position', 'top', 'bottom', 'left', 'right', 'start', 'end', 'zIndex',
  'alignSelf', 'aspectRatio'
]);

function splitStyles(style: any) {
  const layoutStyle: any = {};
  const visualStyle: any = {};

  const flatStyle = StyleSheet.flatten(style);
  if (!flatStyle) return { layoutStyle, visualStyle };

  for (const key of Object.keys(flatStyle)) {
    if (SELF_LAYOUT_PROPS.has(key)) {
      layoutStyle[key] = flatStyle[key];
    } else {
      visualStyle[key] = flatStyle[key];
    }
  }

  // Ensure inner view fills the outer Pressable layout container
  if (layoutStyle.flex || layoutStyle.flexGrow) {
    visualStyle.flex = 1;
  }
  if (layoutStyle.width) {
    visualStyle.width = '100%';
  }
  if (layoutStyle.height) {
    visualStyle.height = '100%';
  }

  return { layoutStyle, visualStyle };
}

export default function BouncyPressable({
  children,
  style,
  scaleTo = 0.96,
  pressOpacity = 0.9,
  enableHaptics = true,
  onPressIn,
  onPressOut,
  ...props
}: BouncyPressableProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  const { layoutStyle, visualStyle } = splitStyles(style);

  const handlePressIn = (event: GestureResponderEvent) => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: scaleTo,
        useNativeDriver: true,
        tension: 320,
        friction: 20,
      }),
      Animated.timing(opacityValue, {
        toValue: pressOpacity,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPressIn) {
      onPressIn(event);
    }
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 250,
        friction: 16,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPressOut) {
      onPressOut(event);
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={layoutStyle}
      {...props}
    >
      <Animated.View
        style={[
          visualStyle,
          {
            transform: [{ scale: scaleValue }],
            opacity: opacityValue,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

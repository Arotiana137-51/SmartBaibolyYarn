import React from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import {useLowEndMode} from '../contexts/ThemeContext';

interface AnimatedHamburgerProps {
  isOpen: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}

const AnimatedHamburger: React.FC<AnimatedHamburgerProps> = ({
  isOpen,
  onPress,
  size = 31,
  color = 'white',
  accessibilityLabel = 'Toggle menu'
}) => {
  const animatedValue = React.useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const {isLowEndMode} = useLowEndMode();

  React.useEffect(() => {
    // Stop any ongoing animation first
    animatedValue.stopAnimation();
    if (isLowEndMode) {
      animatedValue.setValue(isOpen ? 1 : 0);
      return;
    }

    // Then animate to the new value
    Animated.timing(animatedValue, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen, animatedValue, isLowEndMode]);

  const barHeight = size * 0.08;
  const barSpacing = size * 0.25;
  const containerHeight = barHeight * 3 + barSpacing * 2;
  const centerOffset = barHeight + barSpacing;

  // Top bar: move down to center, then rotate 45°
  const topBarTransform = {
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, centerOffset],
        }),
      },
      {
        rotate: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  // Middle bar: fade out
  const middleBarOpacity = {
    opacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  // Bottom bar: move up to center, then rotate -45°
  const bottomBarTransform = {
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -centerOffset],
        }),
      },
      {
        rotate: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-45deg'],
        }),
      },
    ],
  };

  const barStyle = {
    backgroundColor: color,
    height: barHeight,
    width: size,
    borderRadius: barHeight / 2,
  };

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <View style={[styles.hamburgerContainer, { height: containerHeight }]}>
        <Animated.View style={[styles.bar, barStyle, topBarTransform, { top: 0 }]} />
        <Animated.View style={[styles.bar, barStyle, middleBarOpacity, { top: centerOffset }]} />
        <Animated.View style={[styles.bar, barStyle, bottomBarTransform, { top: centerOffset * 2 }]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    height: 48,
  },
  hamburgerContainer: {
    justifyContent: 'flex-start',
    width: 31,
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

export default AnimatedHamburger;
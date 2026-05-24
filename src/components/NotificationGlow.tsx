import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {useInAppNotifications} from '../contexts/InAppNotificationContext';

const GLOW_HEIGHT = 3;
const PULSE_LOW = 0.18;
const PULSE_HIGH = 0.72;
const PULSE_DURATION_MS = 1800;

export const NotificationGlow: React.FC = () => {
  const {theme} = useTheme();
  const {unreadCount} = useInAppNotifications();
  const opacity = useRef(new Animated.Value(PULSE_LOW)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (unreadCount === 0) {
      loopRef.current?.stop();
      opacity.setValue(0);
      return;
    }

    opacity.setValue(PULSE_LOW);
    const sequence = Animated.sequence([
      Animated.timing(opacity, {
        toValue: PULSE_HIGH,
        duration: PULSE_DURATION_MS / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: PULSE_LOW,
        duration: PULSE_DURATION_MS / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(sequence);
    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [unreadCount, opacity]);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.accentBlue,
            opacity,
            shadowColor: theme.colors.accentBlue,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: GLOW_HEIGHT,
    width: '100%',
  },
  bar: {
    height: GLOW_HEIGHT,
    width: '100%',
    shadowOffset: {width: 0, height: 0},
    shadowRadius: 6,
    shadowOpacity: 1,
    elevation: 4,
  },
});

export default NotificationGlow;

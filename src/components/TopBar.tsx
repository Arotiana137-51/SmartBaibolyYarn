import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppMode} from '../screens/MainScreen';

interface TopBarProps {
  appMode: AppMode;
  title: string;
  onMenuPress?: () => void;
  onTitlePress?: () => void;
  isMenuOpen?: boolean;
  onPreviousPress?: () => void;
  onNextPress?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  appMode,
  title,
  onMenuPress,
  onTitlePress,
  isMenuOpen,
  onPreviousPress,
  onNextPress,
}) => {
  const insets = useSafeAreaInsets();
  const menuAnim = useRef(new Animated.Value(isMenuOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, menuAnim]);

  const burgerOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const closeOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} accessibilityLabel="Previous chapter" onPress={onPreviousPress}>
        <Text style={styles.buttonText}>{'‹‹'}</Text>
      </Pressable>
      <Pressable style={styles.titleContainer} onPress={onTitlePress}>
        <Text style={styles.title}>{title}</Text>
      </Pressable>
      <Pressable style={styles.button} accessibilityLabel="Next chapter" onPress={onNextPress}>
        <Text style={styles.buttonText}>{'››'}</Text>
      </Pressable>

      <View style={styles.rightActions}>
        <Pressable
          style={styles.button}
          accessibilityLabel={isMenuOpen ? 'Close menu' : 'Open menu'}
          onPress={onMenuPress}>
          <View style={styles.iconWrapper}>
            <Animated.Text style={[styles.buttonText, {opacity: burgerOpacity}]}>
              {'≡'}
            </Animated.Text>
            <Animated.Text
              style={[styles.buttonText, styles.closeIcon, {opacity: closeOpacity}]}>
              {'×'}
            </Animated.Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#2c3e50',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
  paddingHorizontal: 12,
  minWidth: 44,
  alignItems: 'center',
  justifyContent: 'center',
},
  buttonText: {
    color: 'white',
    fontSize: 26,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    position: 'absolute',
  },
});

export default TopBar;

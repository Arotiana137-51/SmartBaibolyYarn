import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppMode} from '../screens/MainScreen';
import AnimatedHamburger from './AnimatedHamburger';
import {useTheme} from '../contexts/ThemeContext';
import { TEXT_STYLES, scaleFontSize } from '../constants/Typography';

const HYMNAL_CATEGORIES = [
  { key: 'ffpm', label: 'Fihirana' },
  { key: 'antema', label: 'Antema' },
  { key: 'ff', label: 'F. Fanampiny' },
];

interface TopBarProps {
  appMode: AppMode;
  title: string;
  onMenuPress: () => void;
  onTitlePress?: () => void;
  isMenuOpen?: boolean;
  onPreviousPress?: () => void;
  onNextPress?: () => void;
  currentHymnalCategory?: string;
  onHymnalCategoryChange?: (category: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  appMode,
  title,
  onMenuPress,
  onTitlePress,
  isMenuOpen,
  onPreviousPress,
  onNextPress,
  currentHymnalCategory,
  onHymnalCategoryChange,
}) => {
  const {theme} = useTheme();
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
  const handleTitlePress = () => {
    if (appMode === 'hymnal' && onHymnalCategoryChange && currentHymnalCategory) {
      // Cycle through hymnal categories
      const currentIndex = HYMNAL_CATEGORIES.findIndex(cat => cat.key === currentHymnalCategory);
      const nextIndex = (currentIndex + 1) % HYMNAL_CATEGORIES.length;
      onHymnalCategoryChange(HYMNAL_CATEGORIES[nextIndex].key);
    } else if (onTitlePress) {
      onTitlePress();
    }
  };

  // Get display title for hymnal mode
  const displayTitle = appMode === 'hymnal' && currentHymnalCategory 
    ? HYMNAL_CATEGORIES.find(cat => cat.key === currentHymnalCategory)?.label || title
    : title;

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.navBackground}]}>
      <Pressable style={[styles.button, styles.coloredButton, {backgroundColor: theme.colors.navBackground}]} accessibilityLabel="Previous chapter" onPress={onPreviousPress}>
        <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>‹‹</Text>
      </Pressable>
      
      {appMode === 'hymnal' && onHymnalCategoryChange ? (
        // Hymnal category tabs - replace title when in hymnal mode
        <View style={styles.categoryTabsContainer}>
          {HYMNAL_CATEGORIES.map((category) => (
            <Pressable
              key={category.key}
              style={[
                styles.categoryTab,
                currentHymnalCategory === category.key && styles.activeCategoryTab,
              ]}
              onPress={() => onHymnalCategoryChange(category.key)}
            >
              <Text style={[
                styles.categoryTabText,
                currentHymnalCategory === category.key && styles.activeCategoryTabText,
              ]}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        // Normal title for other modes
        <Pressable style={styles.titleContainer} onPress={handleTitlePress}>
          <Text style={[styles.title, {color: '#FFFFFF'}]}>{displayTitle}</Text>
        </Pressable>
      )}
      
      <Pressable style={[styles.button, styles.coloredButton, {backgroundColor: theme.colors.navBackground}]} accessibilityLabel="Next chapter" onPress={onNextPress}>
        <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>{'››'}</Text>
      </Pressable>

      {/* Hamburger menu - always present */}
      <View style={styles.rightActions}>
        <AnimatedHamburger
          isOpen={isMenuOpen || false}
          onPress={onMenuPress}
          accessibilityLabel={isMenuOpen ? 'Close menu' : 'Open menu'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#247BA0',
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
  coloredButton: {
    borderRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoryTabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  activeCategoryTab: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ecf0f1',
  },
  activeCategoryTabText: {
    color: '#3498db',
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

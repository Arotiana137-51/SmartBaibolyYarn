import React from 'react';
import {Pressable, StyleSheet, Text, View, StatusBar, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppMode} from '../screens/MainScreen';
import AnimatedHamburger from './AnimatedHamburger';
import {useTheme} from '../contexts/ThemeContext';

const TOOLBAR_HEIGHT = Platform.OS === 'android' ? 56 : 44;
const EXTRA_TOP_PADDING = 6;

const HYMNAL_CATEGORIES = [
  { key: 'ffpm', label: 'Fihirana' },
  { key: 'antema', label: 'Antema' },
  { key: 'ff', label: 'F.Fanampiny' },
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.navBackground,
          paddingTop: insets.top + EXTRA_TOP_PADDING,
          height: TOOLBAR_HEIGHT + insets.top + EXTRA_TOP_PADDING,
        },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.navBackground}
      />
      <Pressable
        accessibilityLabel="Previous chapter"
        android_ripple={{
          color: theme.colors.accentBlue + '40',
          borderless: true,
          foreground: true,
        }}
        style={({pressed}) => [
          styles.iconButton,
          pressed && {opacity: 0.85},
        ]}
        onPress={onPreviousPress}
      >
        <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>‹‹</Text>
      </Pressable>
      
      {appMode === 'hymnal' && onHymnalCategoryChange ? (
        // Hymnal category tabs - replace title when in hymnal mode
        <View
          style={[
            styles.categoryTabsContainer,
            {
              backgroundColor: theme.colors.navBackground,
              borderColor: 'rgba(255,255,255,0.28)',
            },
          ]}
        >
          {HYMNAL_CATEGORIES.map((category) => (
            <Pressable
              key={category.key}
              android_ripple={{
                color: theme.colors.accentBlue + '40',
                borderless: true,
              }}
              style={({pressed}) => [
                styles.categoryTab,
                currentHymnalCategory === category.key
                  ? {backgroundColor: theme.colors.accentBlue}
                  : {backgroundColor: 'transparent'},
                pressed && {opacity: 0.92},
              ]}
              onPress={() => onHymnalCategoryChange(category.key)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  {
                    color:
                      currentHymnalCategory === category.key
                        ? '#FFFFFF'
                        : 'rgba(255,255,255,0.92)',
                    fontWeight: currentHymnalCategory === category.key ? '700' : '600',
                  },
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        // Normal title for other modes
        <Pressable
          android_ripple={{
            color: theme.colors.accentBlue + '40',
            borderless: true,
          }}
          style={({pressed}) => [styles.titleContainer, pressed && {opacity: 0.92}]}
          onPress={handleTitlePress}
        >
          <Text style={[styles.title, {color: '#FFFFFF'}]}>{displayTitle}</Text>
        </Pressable>
      )}
      
      <Pressable
        accessibilityLabel="Next chapter"
        android_ripple={{
          color: theme.colors.accentBlue + '40',
          borderless: true,
          foreground: true,
        }}
        style={({pressed}) => [
          styles.iconButton,
          pressed && {opacity: 0.85},
        ]}
        onPress={onNextPress}
      >
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    overflow: 'hidden',
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.15,
    textAlign: 'center',
    width: '100%',
  },
  categoryTabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 4,
    marginHorizontal: 6,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryTab: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ecf0f1',
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

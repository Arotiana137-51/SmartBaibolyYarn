import React from 'react';
import {Pressable, StyleSheet, Text, View, StatusBar} from 'react-native';
import {AppMode} from '../screens/MainScreen';
import AnimatedHamburger from './AnimatedHamburger';
import {useTheme} from '../contexts/ThemeContext';
import {useAdaptiveInsets} from '../hooks/useAdaptiveInsets';
import {useResponsive} from '../theme/responsive';

const EXTRA_TOP_PADDING = 6;

// Same order as HymnSelectionModal: Fihirana → F. Fifohazana →
// F. Fanampiny → Antema. Keep these two lists in sync.
const HYMNAL_CATEGORIES = [
  { key: 'ffpm', label: 'Fihirana' },
  { key: 'fifo', label: 'F. Fifohazana' },
  { key: 'ff', label: 'F.Fanampiny' },
  { key: 'antema', label: 'Antema' },
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
  const insets = useAdaptiveInsets();
  const {isAndroid, isSmall, isXSmall, scale, fontFor} = useResponsive();
  const toolbarHeight = Math.max(isAndroid ? 56 : 44, scale(isAndroid ? 52 : 44));
  const iconButtonWidth = Math.max(40, scale(44));
  const arrowFontSize = fontFor(isXSmall ? 28 : 32);
  const titleFontSize = fontFor(isSmall ? 16 : 18);
  const tabFontSize = fontFor(isXSmall ? 12 : isSmall ? 13 : 14);
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
          height: toolbarHeight + insets.top + EXTRA_TOP_PADDING,
        },
      ]}
    >
      <StatusBar barStyle="light-content" translucent />
      <Pressable
        accessibilityLabel="Previous chapter"
        android_ripple={{
          color: theme.colors.accentBlue + '40',
          borderless: true,
          foreground: true,
        }}
        style={({pressed}) => [
          styles.iconButton,
          {width: iconButtonWidth},
          pressed && {opacity: 0.85},
        ]}
        onPress={onPreviousPress}
      >
        <Text style={[styles.buttonText, {color: '#FFFFFF', fontSize: arrowFontSize}]}>‹‹</Text>
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
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  styles.categoryTabText,
                  {
                    fontSize: tabFontSize,
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
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[styles.title, {color: '#FFFFFF', fontSize: titleFontSize}]}
          >
            {displayTitle}
          </Text>
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
          {width: iconButtonWidth},
          pressed && {opacity: 0.85},
        ]}
        onPress={onNextPress}
      >
        <Text style={[styles.buttonText, {color: '#FFFFFF', fontSize: arrowFontSize}]}>{'››'}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    overflow: 'hidden',
  },
  buttonText: {
    color: 'white',
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
    flexShrink: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabText: {
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

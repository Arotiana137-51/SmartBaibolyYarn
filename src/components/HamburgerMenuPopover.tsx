import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {t} from '../i18n/strings';
import {useTheme} from '../contexts/ThemeContext';
import ToggleThemeButton from './ToggleThemeButton';
import {useJesusName} from '../contexts/JesusNameContext';

export type HamburgerMenuItemKey =
  | 'favorites'
  | 'history'
  | 'search'
  | 'misc'
  | 'about';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: HamburgerMenuItemKey) => void;
  isDarkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  fontScale?: number;
  topInset?: number;
  menuTop?: number;
  menuRight?: number;
  caretRightOffset?: number;
  fontControlsTop?: number;
  fontControlsRight?: number;
  onIncreaseFont?: () => void;
  onDecreaseFont?: () => void;
};

const HamburgerMenuPopover: React.FC<Props> = ({
  visible,
  onClose,
  onSelect,
  isDarkMode,
  onToggleDarkMode,
  fontScale = 1,
  topInset = 0,
  menuTop,
  menuRight = 12,
  caretRightOffset = 12,
  fontControlsTop = 0,
  fontControlsRight = 68,
  onIncreaseFont,
  onDecreaseFont,
}) => {
  const {theme, isLowEndMode} = useTheme();
  const {variant: jesusNameVariant, setVariant: setJesusNameVariant} = useJesusName();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  const fontPercent = Math.round(fontScale * 100);

  useEffect(() => {
    if (visible) {
      if (isLowEndMode) {
        opacity.stopAnimation();
        scale.stopAnimation();
        opacity.setValue(1);
        scale.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            speed: 20,
            bounciness: 6,
            useNativeDriver: true,
          }),
        ]).start();
      }
      return;
    }

    if (isLowEndMode) {
      opacity.stopAnimation();
      scale.stopAnimation();
      opacity.setValue(0);
      scale.setValue(0.96);
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale, isLowEndMode]);

  const items = useMemo(
    () =>
      [
        {key: 'favorites' as const, label: t('menu.favorites')},
        {key: 'history' as const, label: t('menu.history')},
        {key: 'search' as const, label: t('menu.search')},
        {key: 'misc' as const, label: t('menu.misc')},
        {key: 'about' as const, label: t('menu.about')},
      ] satisfies Array<{key: HamburgerMenuItemKey; label: string}>,
    []
  );

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={[styles.headerCloseHotspot, {height: topInset, right: menuRight}]}
          onPress={onClose}
        />
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.fontControlsContainer,
            {
              top: fontControlsTop,
              right: fontControlsRight,
              opacity,
              transform: [{scale}],
            },
          ]}>
          <View
            style={[
              styles.fontControlsCard,
              {
                backgroundColor: theme.colors.navBackground,
              },
            ]}
          >
            <Pressable
              style={({pressed}) => [
                styles.fontControlButton,
                pressed ? styles.fontControlButtonPressed : null,
              ]}
              accessibilityLabel="Increase font size"
              onPress={onIncreaseFont}>
              <Text style={styles.fontControlText}>{t('font.increase')}</Text>
            </Pressable>
            <View style={styles.fontControlDivider} />
            <View
              style={[
                styles.fontControlValue,
                {backgroundColor: theme.colors.readerBackground},
              ]}
              pointerEvents="none"
            >
              <Text
                style={[
                  styles.fontControlValueText,
                  {color: theme.colors.textPrimary},
                ]}
                allowFontScaling={false}
              >
                {fontPercent}%
              </Text>
            </View>
            <View style={styles.fontControlDivider} />
            <Pressable
              style={({pressed}) => [
                styles.fontControlButton,
                pressed ? styles.fontControlButtonPressed : null,
              ]}
              accessibilityLabel="Decrease font size"
              onPress={onDecreaseFont}>
              <Text style={styles.fontControlText}>{t('font.decrease')}</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.menuContainer,
            {
              top: menuTop ?? styles.menuContainer.top,
              right: menuRight,
              opacity,
              transform: [{scale}],
            },
          ]}>
          <View
            style={[
              styles.caret,
              {marginRight: caretRightOffset, borderBottomColor: theme.colors.backgroundSecondary},
            ]}
          />
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.divider,
              },
            ]}>
            {items.map(item => (
              <Pressable
                key={item.key}
                onPress={() => onSelect(item.key)}
                style={({pressed}) => [
                  styles.menuItem,
                  pressed ? {backgroundColor: theme.colors.backgroundTertiary} : null
                ]}>
                <Text style={[styles.menuItemText, {color: theme.colors.navBackground}]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}

            <View style={[styles.menuDivider, {backgroundColor: theme.colors.divider}]} />

            <View style={styles.variantSection}>
              <Text style={[styles.variantTitle, {color: theme.colors.textSecondary}]}>
                Anaran'ny Tompo
              </Text>

              <Pressable
                onPress={() => setJesusNameVariant('jesosy')}
                style={({pressed}) => [
                  styles.variantRow,
                  pressed ? {backgroundColor: theme.colors.backgroundTertiary} : null,
                ]}>
                <Text style={[styles.variantLabel, {color: theme.colors.navBackground}]}>Jesosy</Text>
                <Text style={[styles.variantMark, {color: theme.colors.accentBlue}]}>
                  {jesusNameVariant === 'jesosy' ? '✓' : ''}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setJesusNameVariant('jesoa')}
                style={({pressed}) => [
                  styles.variantRow,
                  pressed ? {backgroundColor: theme.colors.backgroundTertiary} : null,
                ]}>
                <Text style={[styles.variantLabel, {color: theme.colors.navBackground}]}>Jesoa</Text>
                <Text style={[styles.variantMark, {color: theme.colors.accentBlue}]}>
                  {jesusNameVariant === 'jesoa' ? '✓' : ''}
                </Text>
              </Pressable>
            </View>

            <View style={[styles.menuDivider, {backgroundColor: theme.colors.divider}]} />

            <View style={styles.themeRow}>
              <ToggleThemeButton
                isDarkMode={isDarkMode}
                onToggle={onToggleDarkMode}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerCloseHotspot: {
    position: 'absolute',
    top: 0,
    width: 56,
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  menuContainer: {
    position: 'absolute',
    top: 58,
    right: 12,
    alignItems: 'flex-end',
  },
  fontControlsContainer: {
    position: 'absolute',
  },
  fontControlsCard: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#3b72b9',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  fontControlButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontControlButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  fontControlDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fontControlText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  fontControlValue: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontControlValueText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  caret: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.85)',
  },
  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 180,
    borderWidth: 2,
    borderColor: '#2c7fb8',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
  },
  themeRow: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  variantSection: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  variantLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  variantMark: {
    width: 22,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '900',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemPressed: {
    backgroundColor: '#f2f6fb',
  },
  menuItemText: {
    fontSize: 20,
    color: '#2c7fb8',
    fontWeight: '400',
  },
});

export default HamburgerMenuPopover;

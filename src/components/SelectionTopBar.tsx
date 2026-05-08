import React from 'react';
import {Pressable, StyleSheet, Text, View, StatusBar, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../contexts/ThemeContext';

const TOOLBAR_HEIGHT = Platform.OS === 'android' ? 56 : 44;
const EXTRA_TOP_PADDING = 6;

 const lightenColor = (hex: string, percent: number): string => {
   const num = parseInt(hex.replace('#', ''), 16);
   const amt = Math.round(2.55 * percent);
   const R = (num >> 16) + amt;
   const G = ((num >> 8) & 0x00ff) + amt;
   const B = (num & 0x0000ff) + amt;
   const newR = R < 255 ? (R < 1 ? 0 : R) : 255;
   const newG = G < 255 ? (G < 1 ? 0 : G) : 255;
   const newB = B < 255 ? (B < 1 ? 0 : B) : 255;
   return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
     .toString(16)
     .slice(1)}`;
 };

export interface SelectionTab<T extends string> {
  key: T;
  label: string;
}

interface SelectionTopBarProps<T extends string> {
  tabs: ReadonlyArray<SelectionTab<T>>;
  activeKey: T;
  onTabPress: (key: T) => void;
}

function SelectionTopBarInner<T extends string>({
  tabs,
  activeKey,
  onTabPress,
}: SelectionTopBarProps<T>) {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();

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
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.navBackground} />
      <View style={styles.tabsRow}>
        {tabs.map((tab, index) => {
          const active = tab.key === activeKey;
          const isLast = index === tabs.length - 1;
          return (
            <Pressable
              key={tab.key}
              android_ripple={{color: lightenColor(theme.colors.accentBlue, 40) + '60', borderless: false}}
              style={({pressed}) => [
                styles.tab,
                !isLast && {borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.28)'},
                active ? {backgroundColor: lightenColor(theme.colors.accentBlue, 25)} : null,
                pressed && {opacity: 0.92},
              ]}
              onPress={() => onTabPress(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? '#FFFFFF' : 'rgba(255,255,255,0.92)',
                    fontWeight: active ? '700' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
});

const SelectionTopBar = React.memo(SelectionTopBarInner) as typeof SelectionTopBarInner;

export default SelectionTopBar;

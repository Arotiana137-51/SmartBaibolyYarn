import React from 'react';
import {Pressable, StyleSheet, Text, View, StatusBar, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../contexts/ThemeContext';

const TOOLBAR_HEIGHT = Platform.OS === 'android' ? 56 : 44;
const EXTRA_TOP_PADDING = 6;

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
              android_ripple={{color: theme.colors.accentBlue + '40', borderless: false}}
              style={({pressed}) => [
                styles.tab,
                !isLast && {borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.28)'},
                active ? {backgroundColor: theme.colors.accentBlue} : null,
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

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMode } from '../screens/MainScreen';
import {useTheme} from '../contexts/ThemeContext';

interface CustomBottomNavProps {
  activeMode: AppMode;
  onTabPress: (mode: AppMode) => void;
}

const CustomBottomNav: React.FC<CustomBottomNavProps> = ({ activeMode, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const {theme} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.backgroundSecondary, borderTopColor: theme.colors.divider}]}>
      <Pressable 
        style={[
          styles.tab,
          activeMode === 'bible' && {backgroundColor: theme.colors.readerBackground},
        ]}
        onPress={() => onTabPress('bible')}>
        <Text
          style={[
            styles.tabText,
            {color: theme.colors.textSecondary},
            activeMode === 'bible' && {color: theme.colors.textPrimary, fontWeight: 'bold'},
          ]}>
          Baiboly
        </Text>
      </Pressable>
      <Pressable 
        style={[
          styles.tab,
          activeMode === 'hymnal' && {backgroundColor: theme.colors.readerBackground},
        ]}
        onPress={() => onTabPress('hymnal')}>
        <Text
          style={[
            styles.tabText,
            {color: theme.colors.textSecondary},
            activeMode === 'hymnal' && {color: theme.colors.textPrimary, fontWeight: 'bold'},
          ]}>
          Fihirana
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e7e7e7',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
  },
});

export default CustomBottomNav;

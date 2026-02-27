import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMode } from '../screens/MainScreen';

interface CustomBottomNavProps {
  activeMode: AppMode;
  onTabPress: (mode: AppMode) => void;
}

const CustomBottomNav: React.FC<CustomBottomNavProps> = ({ activeMode, onTabPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Pressable 
        style={[styles.tab, activeMode === 'bible' && styles.tabActive]} 
        onPress={() => onTabPress('bible')}>
        <Text style={[styles.tabText, activeMode === 'bible' && styles.tabTextActive]}>Baiboly</Text>
      </Pressable>
      <Pressable 
        style={[styles.tab, activeMode === 'hymnal' && styles.tabActive]} 
        onPress={() => onTabPress('hymnal')}>
        <Text style={[styles.tabText, activeMode === 'hymnal' && styles.tabTextActive]}>Fihirana</Text>
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
  tabActive: {
    backgroundColor: '#e0e0e0', // Placeholder for active tab style
  },
  tabText: {
    fontSize: 16,
    color: '#888',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default CustomBottomNav;

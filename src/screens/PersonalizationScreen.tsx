import React, {useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../contexts/ThemeContext';
import {t} from '../i18n/strings';
import {
  PRIMARY_COLOR_OPTIONS,
  DEFAULT_PRIMARY_COLOR_ID,
  type PrimaryColorOption,
} from '../theme/personalizationPalette';
import type {RootStackParamList} from '../navigation/RootNavigator';

const SWATCH_SIZE = 64;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PersonalizationScreen = () => {
  const {theme, primaryColor, setPrimaryColor} = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const selectedHex = useMemo(() => {
    if (primaryColor) return primaryColor.toLowerCase();
    const def = PRIMARY_COLOR_OPTIONS.find(o => o.id === DEFAULT_PRIMARY_COLOR_ID);
    return def ? def.hex.toLowerCase() : null;
  }, [primaryColor]);

  const handleSelect = (option: PrimaryColorOption) => {
    if (option.id === DEFAULT_PRIMARY_COLOR_ID) {
      setPrimaryColor(null);
    } else {
      setPrimaryColor(option.hex);
    }
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, {backgroundColor: theme.colors.backgroundPrimary}]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          {t('personalization.subtitle')}
        </Text>

        <View style={styles.grid}>
          {PRIMARY_COLOR_OPTIONS.map(option => {
            const isSelected = selectedHex === option.hex.toLowerCase();
            return (
              <Pressable
                key={option.id}
                onPress={() => handleSelect(option)}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityLabel={option.name}
                accessibilityState={{selected: isSelected}}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: option.hex,
                      borderColor: isSelected
                        ? theme.colors.textPrimary
                        : theme.colors.divider,
                      borderWidth: isSelected ? 3 : 1,
                    },
                  ]}>
                  {isSelected ? <Text style={styles.check}>✓</Text> : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.label, {color: theme.colors.textPrimary}]}>
                  {option.name}
                </Text>
                <Text
                  style={[styles.hex, {color: theme.colors.textSecondary}]}>
                  {option.hex.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            setPrimaryColor(null);
            navigation.navigate('Home');
          }}
          style={[
            styles.resetButton,
            {backgroundColor: theme.colors.backgroundSecondary},
          ]}>
          <Text style={[styles.resetText, {color: theme.colors.textPrimary}]}>
            {t('personalization.reset')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: 16, paddingBottom: 32},
  subtitle: {fontSize: 14, marginBottom: 16},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    width: '33.3333%',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {color: '#FFFFFF', fontSize: 24, fontWeight: '700'},
  label: {fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center'},
  hex: {fontSize: 11, marginTop: 2, textAlign: 'center'},
  resetButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetText: {fontSize: 14, fontWeight: '700'},
});

export default PersonalizationScreen;

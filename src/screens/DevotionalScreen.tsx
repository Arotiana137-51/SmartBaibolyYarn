import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useTheme} from '../contexts/ThemeContext';
import {useDailyDevotional} from '../hooks/useDailyDevotional';
import DevotionalView from '../components/devotional/DevotionalView';
import type {RootStackParamList} from '../navigation/RootNavigator';

// Thin screen shell — fetch state lives in the hook, layout lives in
// DevotionalView. This file's job is the three top-level states (have
// data / loading / nothing) and gluing pull-to-refresh through.

type Props = NativeStackScreenProps<RootStackParamList, 'Devotional'>;

const DevotionalScreen: React.FC<Props> = () => {
  const {theme} = useTheme();
  const {data, status, refresh} = useDailyDevotional();

  if (data) {
    return <DevotionalView devotional={data} onRefresh={refresh} />;
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <View
        style={[
          styles.center,
          {backgroundColor: theme.colors.backgroundPrimary},
        ]}>
        <ActivityIndicator color={theme.colors.accentBlue} />
      </View>
    );
  }

  // status === 'error': nothing cached and nothing fetchable. Keep the
  // message short and non-blaming — the most common cause is "no devotional
  // has been published yet today", not anything the user did wrong.
  return (
    <View
      style={[
        styles.center,
        {backgroundColor: theme.colors.backgroundPrimary},
      ]}>
      <Text
        style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>
        Tsy misy fampahatsiarovana androany
      </Text>
      <Text
        style={[styles.emptyBody, {color: theme.colors.textSecondary}]}>
        Andramo indray rehefa misy fifandraisana amin'ny aterineto.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DevotionalScreen;

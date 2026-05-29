import React, {useCallback, useLayoutEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useTheme} from '../contexts/ThemeContext';
import {useDailyDevotional} from '../hooks/useDailyDevotional';
import DevotionalView from '../components/devotional/DevotionalView';
import DevotionalLoadingBar from '../components/devotional/DevotionalLoadingBar';
import type {RootStackParamList} from '../navigation/RootNavigator';

// Thin screen shell — fetch state lives in the hook, layout lives in
// DevotionalView. This file's job is the three top-level states (have
// data / loading / nothing) and gluing pull-to-refresh through.

type Props = NativeStackScreenProps<RootStackParamList, 'Devotional'>;

const DevotionalScreen: React.FC<Props> = ({navigation}) => {
  const {theme} = useTheme();
  const {data, status} = useDailyDevotional();

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      // No header title — the screen is content-led; the X is the only
      // chrome we need.
      title: '',
      headerBackVisible: false,
      headerRight: () => (
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Hidio">
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>
      ),
    });
  }, [navigation, handleClose]);

  if (data) {
    return <DevotionalView devotional={data} />;
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: theme.colors.backgroundPrimary},
        ]}>
        <DevotionalLoadingBar />
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
        Mbola tsy misy vatsim-panahy
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'flex-start',
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
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 26,
    paddingHorizontal: 4,
  },
});

export default DevotionalScreen;

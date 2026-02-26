import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {t} from '../i18n/strings';

const HymnsHomeScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>{t('hymns.title')}</Text>
    <Text style={styles.subtitle}>{t('hymns.placeholder')}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6f6f6f',
  },
});

export default HymnsHomeScreen;

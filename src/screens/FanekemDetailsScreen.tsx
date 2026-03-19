import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp, useRoute} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../navigation/RootNavigator';

type FanekemDetailsRouteProp = RouteProp<RootStackParamList, 'FanekemDetails'>;

const FanekemDetailsScreen = () => {
  const {theme} = useTheme();
  const route = useRoute<FanekemDetailsRouteProp>();
  const {title, content} = route.params!;

  const textColor = theme.isDark ? theme.colors.readerText : theme.colors.textPrimary;

  const styles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundPrimary,
      },
      content: {
        paddingHorizontal: 16,
        paddingVertical: 16,
      },
      title: {
        fontSize: 22,
        fontWeight: '800',
        color: textColor,
        marginBottom: 12,
        textAlign: 'center',
      },
      body: {
        fontSize: 18,
        lineHeight: 28,
        color: textColor,
        textAlign: 'center',
      },
    });
  }, [theme, textColor]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FanekemDetailsScreen;

import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp, useRoute} from '@react-navigation/native';
import {useTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../navigation/RootNavigator';
import {normalizeTextPreservingMarkers} from '../utils/bibleTextUtils';
import VavolombelonaContent from '../components/VavolombelonaContent';

type FanekemDetailsRouteProp = RouteProp<RootStackParamList, 'FanekemDetails'>;

const FanekemDetailsScreen = () => {
  const {theme} = useTheme();
  const route = useRoute<FanekemDetailsRouteProp>();
  const {title, content} = route.params!;

  const normalizedTitle = normalizeTextPreservingMarkers(title);
  const normalizedContent = normalizeTextPreservingMarkers(content);

  if (__DEV__) {
    console.log('FanekemDetails DEBUG: normalized content', normalizedContent);
  }

  const textColor = theme.isDark ? theme.colors.readerText : theme.colors.textPrimary;
  
  // Check if this is the vavolombelona text (contains the specific pattern)
  const isVavolombelona = normalizedContent.includes('Manambara ny finoantsika') && 
                          normalizedContent.includes('Jaona Mpanao Batisa');

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
        textAlign: 'left',
      },
      body: {
        fontSize: 18,
        lineHeight: 30,
        color: textColor,
        textAlign: 'justify',
        marginBottom: 16,
      },
      emptyLine: {
        height: 20,
      },
    });
  }, [theme, textColor]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{normalizedTitle}</Text>
        {isVavolombelona ? (
          <VavolombelonaContent />
        ) : (
          normalizedContent.split('\n').map((para, index) => {
            if (para.trim() === '') {
              return <View key={index} style={styles.emptyLine} />;
            }
            return (
              <Text key={index} style={styles.body}>
                {para}
              </Text>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FanekemDetailsScreen;

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

  const textColor = theme.isDark ? theme.colors.readerText : theme.colors.textPrimary;
  
  // Check if this is the vavolombelona text (contains the specific pattern)
  const isVavolombelona = normalizedContent.includes('Manambara ny finoantsika') && 
                          normalizedContent.includes('Jaona Mpanao Batisa');

  const styles = useMemo(() => {
    // Body size drives vertical rhythm so spacing scales with Dynamic Type.
    const BODY_SIZE = 18;
    const BODY_LINE_HEIGHT = 28; // ~1.55× — generous but not cavernous.

    // Detect a closing "Amen(a)" so we can give it a small hierarchy bump.
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundPrimary,
      },
      content: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
      },
      title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.2,
        color: textColor,
        marginBottom: 20,
        textAlign: 'left',
      },
      body: {
        fontSize: BODY_SIZE,
        lineHeight: BODY_LINE_HEIGHT,
        color: textColor,
        // Left-aligned, not justified: justify creates ugly word gaps on
        // narrow mobile widths.
        textAlign: 'left',
        marginBottom: BODY_SIZE * 0.7,
      },
      amen: {
        fontSize: BODY_SIZE,
        lineHeight: BODY_LINE_HEIGHT,
        color: theme.colors.accentBlue,
        fontWeight: '700',
        textAlign: 'left',
        marginTop: 4,
        marginBottom: BODY_SIZE * 0.7,
      },
      emptyLine: {
        // Small breathing space between paragraphs; the marginBottom on
        // the paragraph itself does most of the work.
        height: 4,
      },
    });
  }, [theme, textColor]);

  // A short paragraph that is just "Amena"/"Amen." gets a distinct style.
  const isAmenParagraph = (s: string) => /^amen[a]?\.?!?$/i.test(s.trim());

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
            if (isAmenParagraph(para)) {
              return (
                <Text key={index} style={styles.amen}>
                  {para}
                </Text>
              );
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

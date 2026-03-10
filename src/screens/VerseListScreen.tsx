import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBibleSearch, BibleVerseResult } from '../hooks/useBibleSearch';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { renderBibleLine, processBibleTextWithMetadataForReader } from '../utils/bibleTextUtils';

type VerseListScreenRouteProp = RouteProp<RootStackParamList, 'VerseList'>;
type VerseListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const VerseListScreen = () => {
  const route = useRoute<VerseListScreenRouteProp>();
  const navigation = useNavigation<VerseListScreenNavigationProp>();
  const { bookId, bookName, query } = route.params;
  const { theme } = useTheme();
  
  const [verses, setVerses] = useState<BibleVerseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getVersesForBook, error } = useBibleSearch();

  useEffect(() => {
    const loadVerses = async () => {
      setIsLoading(true);
      try {
        const results = await getVersesForBook(bookId, query);
        setVerses(results);
      } catch (err) {
        console.error('Error loading verses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadVerses();
  }, [bookId, query, getVersesForBook]);

  const handleVersePress = (verse: BibleVerseResult) => {
    // Navigate back to MainScreen and display the chapter
    navigation.navigate('Home', { 
      mode: 'bible',
      selectedBook: { id: verse.bookId, name: verse.bookName },
      selectedChapter: verse.chapter,
      selectedVerse: verse.verseNumber
    });
  };

const renderVerse = ({ item }: { item: BibleVerseResult }) => {
  const { lines, italicLines } = processBibleTextWithMetadataForReader(item.text);
  
  return (
    <Pressable
      style={[styles.verseItem, { backgroundColor: theme.colors.backgroundSecondary }]}
      onPress={() => handleVersePress(item)}
    >
      <View style={styles.verseHeader}>
        <Text style={[styles.verseReference, { color: theme.colors.textPrimary }]}>
          {item.chapter}:{item.verseNumber}
        </Text>
      </View>
      <View style={styles.verseContent}>
        {lines.map((line, lineIndex) => (
          <Text
            key={lineIndex}
            style={{
              fontSize: 16,
              lineHeight: 24,
              marginBottom: 4,
              textAlign: 'justify',
              fontStyle: italicLines.has(lineIndex) ? 'italic' : 'normal',
              color: italicLines.has(lineIndex)
                ? theme.colors.textWatermark
                : theme.colors.textPrimary,
            }}
          >
            {renderBibleLine(line, { lineHeight: 24 })}
          </Text>
        ))}
      </View>
    </Pressable>
  );
};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.navBackground }]}>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>
          {bookName}
        </Text>
        <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
          Recherche: "{query}"
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#ff4444' }]}>
            {error}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accentBlue} />
        </View>
      ) : verses.length > 0 ? (
        <FlatList
          data={verses}
          keyExtractor={(item) => `${item.chapter}-${item.verseNumber}`}
          renderItem={renderVerse}
          style={styles.versesList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Aucun verset trouvé pour "{query}" dans {bookName}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  versesList: {
    flex: 1,
  },
  verseItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    padding: 16,
  },
  verseHeader: {
    marginBottom: 8,
  },
  verseContent: {
    paddingLeft: 8,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
  },
  verseText: {
    fontSize: 16,
    lineHeight: 22,
  },
  highlightedText: {
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default VerseListScreen;

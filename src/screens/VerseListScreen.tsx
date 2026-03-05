import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBibleSearch, BibleVerseResult } from '../hooks/useBibleSearch';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';

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

  const renderBibleLine = (line: string) => {
    const parts = line.split(/(\[[^\]]+\])/g);
    return parts
      .filter(p => p.length > 0)
      .map((part, index) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const inner = part.slice(1, -1);
          return (
            <Text key={`verse-bracket-${index}`} style={{ fontStyle: 'italic', color: '#3a3a3a' }}>
              {inner}
            </Text>
          );
        }
        return (
          <Text key={`verse-text-${index}`} style={{ color: theme.colors.textPrimary }}>
            {part}
          </Text>
        );
      });
  };

  const renderBibleLineWithHighlight = (line: string, searchQuery: string) => {
    const parts = line.split(/(\[[^\]]+\])/g);
    return parts
      .filter(p => p.length > 0)
      .map((part, index) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const inner = part.slice(1, -1);
          return (
            <Text key={`verse-bracket-${index}`} style={{ fontStyle: 'italic', color: '#3a3a3a' }}>
              {inner}
            </Text>
          );
        }
        // Apply search highlighting to regular text
        return (
          <Text key={`verse-text-${index}`}>
            {highlightText(part, searchQuery)}
          </Text>
        );
      });
  };

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

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    const lowerQuery = query.toLowerCase();

    return parts.map((part, index) => {
      const isMatch = part.toLowerCase() === lowerQuery;
      return (
        <Text
          key={index}
          style={
            isMatch
              ? [styles.highlightedText, { color: theme.colors.accentBlue }]
              : [styles.verseText, { color: theme.colors.textPrimary }]
          }
        >
          {part}
        </Text>
      );
    });
  };

const renderVerse = ({ item }: { item: BibleVerseResult }) => {
  // Format the verse text to handle bracketed text like the regular reader
  const formattedLines = item.text.split('\n').map((line, lineIndex) => (
    <Text key={lineIndex} style={{ fontSize: 16, lineHeight: 24, marginBottom: 4 }}>
      {renderBibleLineWithHighlight(line, query)}
    </Text>
  ));

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
        {formattedLines}
      </View>
    </Pressable>
  );
};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {bookName}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
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

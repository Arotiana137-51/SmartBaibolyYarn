import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBibleSearch, BibleSearchResult } from '../hooks/useBibleSearch';
import { useHymnSearch, HymnSearchResult } from '../hooks/useHymnSearch';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { scaleFontSize } from '../constants/Typography';

// SF Symbols-style magnifying glass component
const MagnifyingGlass = ({ color, size = 16 }: { color: string; size?: number }) => (
  <View style={[styles.magnifyingGlass, { width: size, height: size }]}>
    <View style={[styles.magnifyingCircle, { borderColor: color, width: size * 0.8, height: size * 0.8 }]} />
    <View style={[styles.magnifyingHandle, { backgroundColor: color, width: size * 0.3, height: size * 0.15, bottom: -size * 0.05, right: -size * 0.05 }]} />
  </View>
);

type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;
type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SearchScreen = () => {
  const route = useRoute<SearchScreenRouteProp>();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { mode } = route.params;
  const { theme } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleSearchResult[] | HymnSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { searchBible, isLoading: isBibleLoading, error: bibleError } = useBibleSearch();
  const { searchHymns, isLoading: isHymnLoading, error: hymnError } = useHymnSearch();
  
  const isLoading = mode === 'bible' ? isBibleLoading : isHymnLoading;
  const error = mode === 'bible' ? bibleError : hymnError;

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      
      try {
        if (mode === 'bible') {
          const results = await searchBible(searchQuery);
          setSearchResults(results);
        } else {
          const results = await searchHymns(searchQuery);
          setSearchResults(results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, mode, searchBible, searchHymns]);

  const handleBookPress = (bookId: number, bookName: string) => {
    navigation.navigate('VerseList', { bookId, bookName, query: searchQuery });
  };

  const handleHymnPress = (hymnId: string) => {
    // Navigate back to MainScreen with the selected hymn
    navigation.navigate('Home', { mode: 'hymnal', selectedHymnId: hymnId });
  };

  const renderBibleResult = ({ item }: { item: BibleSearchResult }) => (
    <Pressable
      style={[styles.resultItem, { backgroundColor: theme.colors.backgroundSecondary }]}
      onPress={() => handleBookPress(item.bookId, item.bookName)}
    >
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>
          {item.bookName}
        </Text>
        <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>
          {item.verseCount} résultat{item.verseCount > 1 ? 's' : ''}
        </Text>
      </View>
    </Pressable>
  );

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
              ? { color: theme.colors.accentBlue, fontWeight: '600' }
              : { color: theme.colors.textSecondary }
          }
        >
          {part}
        </Text>
      );
    });
  };

  const renderHymnResult = ({ item }: { item: HymnSearchResult }) => {
    const highlightedSnippet = item.matchedVerse ? highlightText(item.matchedVerse, searchQuery) : null;
    
    return (
      <Pressable
        style={[styles.resultItem, { backgroundColor: theme.colors.backgroundSecondary }]}
        onPress={() => handleHymnPress(item.id)}
      >
        <View style={styles.resultContent}>
          <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>
            {item.category ? `${item.category.toUpperCase()} ` : ''}Hymne {item.number}
          </Text>
          <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]}>
            {item.title}
          </Text>
          {highlightedSnippet && (
            <Text style={[styles.resultSnippet, { color: theme.colors.textSecondary }]}>
              {highlightedSnippet}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  const renderResult = ({ item }: { item: any }) => {
    if (mode === 'bible') {
      return renderBibleResult({ item });
    } else {
      return renderHymnResult({ item });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.navBackground }]}>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
          {mode === 'bible' ? 'Recherche Bible' : 'Recherche Hymnes'}
        </Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { 
          backgroundColor: theme.colors.backgroundSecondary,
          borderColor: theme.colors.divider
        }]}>
          <MagnifyingGlass color={theme.colors.textSecondary} size={16} />
          <TextInput
            style={[styles.searchInput, { 
              color: theme.colors.textPrimary,
            }]}
            placeholder={mode === 'bible' ? 'Rechercher dans la Bible...' : 'Rechercher dans les hymnes...'}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#ff4444' }]}>
            {error}
          </Text>
        </View>
      )}

      {(isLoading || isSearching) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accentBlue} />
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => mode === 'bible' ? (item as BibleSearchResult).bookId.toString() : (item as HymnSearchResult).id}
          renderItem={renderResult}
          style={styles.resultsList}
        />
      ) : searchQuery.trim() ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {mode === 'bible' 
              ? 'Aucun résultat trouvé dans la Bible' 
              : 'Aucun résultat trouvé dans les hymnes'
            }
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  magnifierIcon: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '400',
  },
  magnifyingGlass: {
    position: 'relative',
    marginRight: 8,
  },
  magnifyingCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 50,
    top: 0,
    left: 0,
  },
  magnifyingHandle: {
    position: 'absolute',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    padding: 16,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 14,
  },
  resultSnippet: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
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

export default SearchScreen;

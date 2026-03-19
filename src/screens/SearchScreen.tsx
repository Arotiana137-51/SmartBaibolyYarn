import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, SectionList, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBibleSearch, BibleSearchResult } from '../hooks/useBibleSearch';
import { useHymnSearch, HymnSearchResult } from '../hooks/useHymnSearch';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { scaleFontSize } from '../constants/Typography';
import { getBibleBookShortName } from '../utils/bibleBookNames';
import AnimatedHamburger from '../components/AnimatedHamburger';

// SF Symbols-style magnifying glass component
const MagnifyingGlass = ({ color, size = 16 }: { color: string; size?: number }) => (
  <View style={[styles.magnifyingGlass, { width: size, height: size }]}>
    <View style={[styles.magnifyingCircle, { borderColor: color, width: size * 0.8, height: size * 0.8 }]} />
    <View style={[styles.magnifyingHandle, { backgroundColor: color, width: size * 0.3, height: size * 0.15, bottom: -size * 0.05, right: -size * 0.05 }]} />
  </View>
);

// Chevron right icon to indicate navigation
const ChevronRight = ({ color, size = 20 }: { color: string; size?: number }) => (
  <View style={[styles.chevronContainer, { width: size, height: size }]}>
    <View style={[styles.chevronArrow, { borderRightColor: color, borderTopColor: color, width: size * 0.4, height: size * 0.4 }]} />
  </View>
);

type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;
type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SearchDisplayMode = 'grouped' | 'raw';

const SearchScreen = () => {
  const route = useRoute<SearchScreenRouteProp>();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { mode } = route.params;
  const { theme } = useTheme();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchDisplayMode, setSearchDisplayMode] = useState<SearchDisplayMode>('grouped');
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [selectedBibleTestament, setSelectedBibleTestament] = useState<'old' | 'new'>('old');
  const [selectedHymnCategory, setSelectedHymnCategory] = useState<'ffpm' | 'ff' | 'antema'>('ffpm');

  const closeSettings = () => setIsSettingsOpen(false);

  // Header components defined as stable references
  const headerRight = React.useCallback(
    () => (
      <AnimatedHamburger
        isOpen={isSettingsOpen}
        onPress={() => setIsSettingsOpen(true)}
        accessibilityLabel={isSettingsOpen ? 'Close settings menu' : 'Open settings menu'}
      />
    ),
    [isSettingsOpen]
  );

  const headerLeft = React.useCallback(
    () =>
      mode === 'bible' ? (
        <View style={styles.headerLeftToggle}>
          <Pressable
            onPress={() => setSelectedBibleTestament('old')}
            style={[
              styles.headerToggleOption,
              selectedBibleTestament === 'old'
                ? { backgroundColor: theme.colors.accentBlue }
                : { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                styles.headerToggleText,
                { color: selectedBibleTestament === 'old' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              Taloha
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedBibleTestament('new')}
            style={[
              styles.headerToggleOption,
              selectedBibleTestament === 'new'
                ? { backgroundColor: theme.colors.accentBlue }
                : { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                styles.headerToggleText,
                { color: selectedBibleTestament === 'new' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              Vaovao
            </Text>
          </Pressable>
        </View>
      ) : null,
    [mode, selectedBibleTestament, theme]
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>

      <Modal
        visible={isSettingsOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSettings}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeSettings}>
          <Pressable
            style={[styles.settingsPanel, { backgroundColor: theme.colors.backgroundSecondary }]}
            onPress={() => null}
          >
            <Text style={[styles.settingsTitle, { color: theme.colors.textPrimary }]}>Paramètres</Text>
            <Text style={[styles.settingsSubtitle, { color: theme.colors.textSecondary }]}>Mode de recherche</Text>

            <Pressable
              onPress={() => setSearchDisplayMode('raw')}
              style={[styles.settingsOptionRow, { borderColor: theme.colors.divider }]}
            >
              <Text style={[styles.settingsOptionText, { color: theme.colors.textPrimary }]}>Recherche brute</Text>
              <Text style={[styles.settingsOptionMark, { color: theme.colors.accentBlue }]}>
                {searchDisplayMode === 'raw' ? '✓' : ''}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSearchDisplayMode('grouped')}
              style={[styles.settingsOptionRow, { borderColor: theme.colors.divider }]}
            >
              <Text style={[styles.settingsOptionText, { color: theme.colors.textPrimary }]}>
                Recherche par catégorie
              </Text>
              <Text style={[styles.settingsOptionMark, { color: theme.colors.accentBlue }]}>
                {searchDisplayMode === 'grouped' ? '✓' : ''}
              </Text>
            </Pressable>

            <Text style={[styles.settingsSubtitle, { color: theme.colors.textSecondary }]}>Correspondance</Text>

            <Pressable
              onPress={() => setMatchWholeWord(prev => !prev)}
              style={[styles.settingsOptionRow, { borderColor: theme.colors.divider }]}
            >
              <Text style={[styles.settingsOptionText, { color: theme.colors.textPrimary }]}>Mot entier</Text>
              <Text style={[styles.settingsOptionMark, { color: theme.colors.accentBlue }]}>
                {matchWholeWord ? '✓' : ''}
              </Text>
            </Pressable>

            <Pressable
              onPress={closeSettings}
              style={[styles.settingsCloseButton, { backgroundColor: theme.colors.accentBlue }]}
            >
              <Text style={styles.settingsCloseButtonText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {mode === 'bible' ? (
        <BibleSearchScreenContent
          navigation={navigation}
          displayMode={searchDisplayMode}
          matchWholeWord={matchWholeWord}
          selectedBibleTestament={selectedBibleTestament}
          onTestamentChange={setSelectedBibleTestament}
        />
      ) : (
        <HymnSearchScreenContent
          navigation={navigation}
          displayMode={searchDisplayMode}
          matchWholeWord={matchWholeWord}
          selectedHymnCategory={selectedHymnCategory}
          onCategoryChange={setSelectedHymnCategory}
        />
      )}
    </View>
  );
};

const BibleSearchScreenContent = ({
  navigation,
  displayMode,
  matchWholeWord,
  selectedBibleTestament,
  onTestamentChange,
}: {
  navigation: SearchScreenNavigationProp;
  displayMode: SearchDisplayMode;
  matchWholeWord: boolean;
  selectedBibleTestament: 'old' | 'new';
  onTestamentChange: (testament: 'old' | 'new' | ((prev: 'old' | 'new') => 'old' | 'new')) => void;
}) => {
  const { theme } = useTheme();
  const { searchBible, isLoading, error } = useBibleSearch();

  const getTestamentFromBookId = React.useCallback((bookId: number): 'old' | 'new' => {
    return bookId <= 39 ? 'old' : 'new';
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const hasOld = searchResults.some(r => getTestamentFromBookId(r.bookId) === 'old');
    const hasNew = searchResults.some(r => getTestamentFromBookId(r.bookId) === 'new');

    const nextTestament = (() => {
      const current = selectedBibleTestament;
      if (current === 'old' && hasOld) return current;
      if (current === 'new' && hasNew) return current;
      if (hasOld) return 'old';
      if (hasNew) return 'new';
      return current;
    })();

    if (nextTestament !== selectedBibleTestament) {
      onTestamentChange(nextTestament);
    }
  }, [getTestamentFromBookId, onTestamentChange, searchResults, selectedBibleTestament]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchBible(searchQuery, { matchWholeWord });
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchBible, matchWholeWord]);

  const oldTestamentCount = searchResults
    .filter(r => getTestamentFromBookId(r.bookId) === 'old')
    .reduce((sum, r) => sum + r.verseCount, 0);
  const newTestamentCount = searchResults
    .filter(r => getTestamentFromBookId(r.bookId) === 'new')
    .reduce((sum, r) => sum + r.verseCount, 0);
  const totalCount = oldTestamentCount + newTestamentCount;

  const handleBookPress = (bookId: number, bookName: string) => {
    navigation.navigate('VerseList', { bookId, bookName, query: searchQuery, matchWholeWord });
  };

  const bibleSections = (() => {
    if (displayMode === 'raw') {
      if (searchResults.length === 0) return [];
      return [{ title: '', data: searchResults }];
    }

    const filtered = searchResults.filter(r => getTestamentFromBookId(r.bookId) === selectedBibleTestament);
    const fallback = filtered.length ? filtered : searchResults;

    if (fallback.length === 0) return [];

    const title =
      fallback.every(r => getTestamentFromBookId(r.bookId) === 'old')
        ? 'Testamenta taloha'
        : fallback.every(r => getTestamentFromBookId(r.bookId) === 'new')
          ? 'Testamenta vaovao'
          : 'Testamenta';

    return [{ title, data: fallback }];
  })();

  const renderBibleResult = ({ item }: { item: BibleSearchResult }) => (
    <Pressable
      style={[styles.resultItem, { backgroundColor: theme.colors.backgroundSecondary }]}
      onPress={() => handleBookPress(item.bookId, item.bookName)}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultTextContainer}>
          <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>
            {getBibleBookShortName(item.bookName, item.bookId)}
          </Text>
          <Text style={[styles.resultCount, { color: theme.colors.accentBlue, fontWeight: '700' }]}>
            {item.verseCount} résultat{item.verseCount > 1 ? 's' : ''}
          </Text>
        </View>
        <ChevronRight color={theme.colors.textSecondary} size={28} />
      </View>
    </Pressable>
  );

  return (
    <>
      {displayMode === 'grouped' && (
        <View style={[styles.testamentToggleContainer, { borderColor: theme.colors.divider }]}>
          <Pressable
            onPress={() => onTestamentChange('old')}
            style={[
              styles.testamentToggleButton,
              selectedBibleTestament === 'old'
                ? { backgroundColor: theme.colors.navBackground }
                : { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                styles.testamentToggleText,
                { color: selectedBibleTestament === 'old' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              Testamenta taloha
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onTestamentChange('new')}
            style={[
              styles.testamentToggleButton,
              selectedBibleTestament === 'new'
                ? { backgroundColor: theme.colors.navBackground }
                : { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                styles.testamentToggleText,
                { color: selectedBibleTestament === 'new' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              Testamenta vaovao
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.backgroundSecondary,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <MagnifyingGlass color={theme.colors.textSecondary} size={16} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Rechercher dans la Bible..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchResults.length > 0 && (
            <Text style={[styles.searchCountWatermark, { color: theme.colors.textWatermark }]}>
              {displayMode === 'raw'
                ? `TT:${oldTestamentCount} | TV:${newTestamentCount}`
                : selectedBibleTestament === 'old'
                  ? `TT:${oldTestamentCount}`
                  : `TV:${newTestamentCount}`}
            </Text>
          )}
        </View>
        {searchResults.length > 0 && (
          <Text style={[styles.totalCountWatermark, { color: theme.colors.textWatermark }]}>
            Baiboly manontolo: {totalCount} andininy misy ny teny tadiavina
          </Text>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#ff4444' }]}>{error}</Text>
        </View>
      )}

      {isLoading || isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accentBlue} />
        </View>
      ) : searchResults.length > 0 ? (
        <SectionList
          sections={bibleSections as any}
          keyExtractor={(item, index) => `${(item as BibleSearchResult).bookId.toString()}:${index}`}
          renderItem={({ item }) => renderBibleResult({ item })}
          renderSectionHeader={({ section }) =>
            displayMode === 'grouped' && section.title ? (
              <View style={styles.sectionHeaderContainer}>
                <Text style={[styles.sectionHeaderText, { color: theme.colors.textSecondary }]}>{section.title}</Text>
              </View>
            ) : null
          }
          style={styles.resultsList}
          stickySectionHeadersEnabled={false}
        />
      ) : searchQuery.trim() ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Aucun résultat trouvé dans la Bible
          </Text>
        </View>
      ) : null}
    </>
  );
};

const HymnSearchScreenContent = ({
  navigation,
  displayMode,
  matchWholeWord,
  selectedHymnCategory,
  onCategoryChange,
}: {
  navigation: SearchScreenNavigationProp;
  displayMode: SearchDisplayMode;
  matchWholeWord: boolean;
  selectedHymnCategory: 'ffpm' | 'ff' | 'antema';
  onCategoryChange: (category: 'ffpm' | 'ff' | 'antema' | ((prev: 'ffpm' | 'ff' | 'antema') => 'ffpm' | 'ff' | 'antema')) => void;
}) => {
  const { theme } = useTheme();
  const { searchHymns, isLoading, error } = useHymnSearch();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HymnSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchHymns(searchQuery, { matchWholeWord });
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchHymns, matchWholeWord]);

  useEffect(() => {
    const hasFFPM = searchResults.some(r => {
      const cat = (r.category || '').trim().toLowerCase();
      return cat === 'ffpm' || cat === 'ffpm hymns';
    });
    const hasFF = searchResults.some(r => {
      const cat = (r.category || '').trim().toLowerCase();
      return cat === 'ff';
    });
    const hasAntema = searchResults.some(r => {
      const cat = (r.category || '').trim().toLowerCase();
      return cat === 'antema';
    });

    const nextCategory = (() => {
      const current = selectedHymnCategory;
      if (current === 'ffpm' && hasFFPM) return current;
      if (current === 'ff' && hasFF) return current;
      if (current === 'antema' && hasAntema) return current;
      if (hasFFPM) return 'ffpm';
      if (hasFF) return 'ff';
      if (hasAntema) return 'antema';
      return current;
    })();

    if (nextCategory !== selectedHymnCategory) {
      onCategoryChange(nextCategory);
    }
  }, [searchResults]);

  const handleHymnPress = (hymnId: string) => {
    navigation.navigate('Home', { mode: 'hymnal', selectedHymnId: hymnId });
  };

  const getHymnCategoryGroupTitle = (categoryRaw: string) => {
    const category = (categoryRaw || '').trim().toLowerCase();
    if (category === 'ffpm' || category === 'ffpm hymns') return 'FFPm hymns';
    if (category === 'ff') return 'FF';
    if (category === 'antema') return 'Antema';
    return categoryRaw ? categoryRaw : 'Hymnes';
  };

  const hymnSections = (() => {
    if (displayMode === 'raw') {
      if (searchResults.length === 0) return [];
      return [{ title: '', data: searchResults }];
    }

    // Filter by selected category
    const filtered = searchResults.filter(r => {
      const cat = (r.category || '').trim().toLowerCase();
      if (selectedHymnCategory === 'ffpm') return cat === 'ffpm' || cat === 'ffpm hymns';
      if (selectedHymnCategory === 'ff') return cat === 'ff';
      if (selectedHymnCategory === 'antema') return cat === 'antema';
      return true;
    });
    const fallback = filtered.length ? filtered : searchResults;

    if (fallback.length === 0) return [];

    const grouped = fallback.reduce<Record<string, HymnSearchResult[]>>((acc, item) => {
      const title = getHymnCategoryGroupTitle(item.category);
      (acc[title] ||= []).push(item);
      return acc;
    }, {});

    const order = ['FFPm hymns', 'FF', 'Antema'];
    const orderedSections = order
      .filter(title => grouped[title]?.length)
      .map(title => ({ title, data: grouped[title] }));

    const remainingTitles = Object.keys(grouped)
      .filter(title => !order.includes(title))
      .sort((a, b) => a.localeCompare(b));

    return [...orderedSections, ...remainingTitles.map(title => ({ title, data: grouped[title] }))];
  })();

  const highlightText = (text: string, query: string, baseColor: string) => {
    if (!query.trim()) return text;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    const lowerQuery = query.toLowerCase();

    return parts.map((part, index) => {
      const isMatch = part.toLowerCase() === lowerQuery;
      return (
        <Text
          key={index}
          style={isMatch ? { color: theme.colors.accentBlue, fontWeight: '600' } : { color: baseColor }}
        >
          {part}
        </Text>
      );
    });
  };

  const renderHymnResult = ({ item }: { item: HymnSearchResult }) => {
    const highlightedTitle = item.title
      ? highlightText(item.title, searchQuery, theme.colors.textSecondary)
      : item.title;
    const highlightedSnippet = item.matchedVerse
      ? highlightText(item.matchedVerse, searchQuery, theme.colors.textSecondary)
      : null;

    return (
      <Pressable
        style={[styles.resultItem, { backgroundColor: theme.colors.backgroundSecondary }]}
        onPress={() => handleHymnPress(item.id)}
      >
        <View style={styles.resultContent}>
          <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>
            {item.category ? `${item.category.toUpperCase()} ` : ''}Hymne {item.number}
          </Text>
          <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]}>{highlightedTitle}</Text>
          {highlightedSnippet && (
            <Text style={[styles.resultSnippet, { color: theme.colors.textSecondary }]}>{highlightedSnippet}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <>
      {displayMode === 'grouped' && (
        <View style={[styles.categoryToggleContainer, { borderColor: theme.colors.divider }]}>
          <Pressable
            onPress={() => onCategoryChange('ffpm')}
            style={[
              styles.categoryToggleButton,
              selectedHymnCategory === 'ffpm'
                ? { backgroundColor: theme.colors.navBackground }
                : { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                styles.categoryToggleText,
                { color: selectedHymnCategory === 'ffpm' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              FFPm
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onCategoryChange('ff')}
            style={[
              styles.categoryToggleButton,
              selectedHymnCategory === 'ff'
                ? { backgroundColor: theme.colors.navBackground }
                : { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                styles.categoryToggleText,
                { color: selectedHymnCategory === 'ff' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              FF
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onCategoryChange('antema')}
            style={[
              styles.categoryToggleButton,
              selectedHymnCategory === 'antema'
                ? { backgroundColor: theme.colors.navBackground }
                : { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                styles.categoryToggleText,
                { color: selectedHymnCategory === 'antema' ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              Antema
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.backgroundSecondary,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <MagnifyingGlass color={theme.colors.textSecondary} size={16} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Rechercher dans les hymnes..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchResults.length > 0 && (
            <Text style={[styles.searchCountWatermark, { color: theme.colors.textWatermark }]}>
              {searchResults.length}
            </Text>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#ff4444' }]}>{error}</Text>
        </View>
      )}

      {isLoading || isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accentBlue} />
        </View>
      ) : searchResults.length > 0 ? (
        <SectionList
          sections={hymnSections as any}
          keyExtractor={(item, index) =>
            `${(item as HymnSearchResult).id}:${(item as HymnSearchResult).verseNumber ?? 'na'}:${index}`
          }
          renderItem={({ item }) => renderHymnResult({ item })}
          renderSectionHeader={({ section }) =>
            displayMode === 'grouped' && section.title ? (
              <View style={styles.sectionHeaderContainer}>
                <Text style={[styles.sectionHeaderText, { color: theme.colors.textSecondary }]}>{section.title}</Text>
              </View>
            ) : null
          }
          style={styles.resultsList}
          stickySectionHeadersEnabled={false}
        />
      ) : searchQuery.trim() ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Aucun résultat trouvé dans les hymnes
          </Text>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLeftToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  headerToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  headerToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 66,
    paddingRight: 12,
  },
  settingsPanel: {
    width: 280,
    borderRadius: 14,
    padding: 14,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  settingsSubtitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  settingsOptionRow: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  settingsOptionMark: {
    width: 22,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '900',
  },
  settingsCloseButton: {
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingsCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
  searchCountWatermark: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  totalCountWatermark: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  resultsList: {
    flex: 1,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 17,
    fontWeight: '800',
  },
  testamentToggleContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  testamentToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testamentToggleText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryToggleContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryToggleText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronArrow: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  resultItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    padding: 16,
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTextContainer: {
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

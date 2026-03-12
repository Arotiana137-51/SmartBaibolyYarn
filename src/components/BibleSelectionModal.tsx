import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  SectionList,
  FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { useBibleData } from '../hooks/useBibleData';
import {useTheme} from '../contexts/ThemeContext';
import {getBibleBookShortName} from '../utils/bibleBookNames';

type SelectionStep = 'book' | 'chapter' | 'verse';

interface BibleSelectionModalOptimizedProps {
  onClose: () => void;
  onBibleSelect: (bookId: number, bookName: string, chapter: number, verse: number) => void;
}

const BibleSelectionModalOptimized: React.FC<BibleSelectionModalOptimizedProps> = ({
  onClose,
  onBibleSelect,
}) => {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();
  const { books, isLoading, getVerseCount } = useBibleData();
  const [currentStep, setCurrentStep] = useState<SelectionStep>('book');
  const [selectedBook, setSelectedBook] = useState<{ id: number; name: string; chapters: number } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [verseCount, setVerseCount] = useState(0);

  const bottomScrollSpacer =
    Math.max(insets.bottom, 0) +
    15 +
    8 +
    42 +
    4 * 2 +
    16;

  const bottomScrollSpacerAdjusted = Math.round(bottomScrollSpacer * 0.5) + 7;

  const selectedBookShortName = useMemo(() => {
    return selectedBook ? getBibleBookShortName(selectedBook.name, selectedBook.id) : '';
  }, [selectedBook]);

  // Memoize filtered books
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter(book => {
      const longName = book.name.toLowerCase();
      const shortName = getBibleBookShortName(book.name, book.id).toLowerCase();
      return longName.includes(q) || shortName.includes(q);
    });
  }, [books, searchQuery]);

  // Separate old and new testament books
  const oldTestament = useMemo(() => {
    return filteredBooks.filter(book => book.testament === 'old');
  }, [filteredBooks]);

  const newTestament = useMemo(() => {
    return filteredBooks.filter(book => book.testament === 'new');
  }, [filteredBooks]);

  // Generate chapter numbers
  const chapters = useMemo(() => {
    if (!selectedBook) return [];
    return Array.from({ length: selectedBook.chapters }, (_, i) => i + 1);
  }, [selectedBook]);

  useEffect(() => {
    let cancelled = false;

    if (currentStep !== 'verse' || !selectedBook || selectedChapter === null) {
      setVerseCount(0);
      return;
    }

    (async () => {
      const count = await getVerseCount(selectedBook.id, selectedChapter);
      if (!cancelled) {
        setVerseCount(count);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentStep, getVerseCount, selectedBook, selectedChapter]);

  const verses = useMemo(() => {
    if (selectedChapter === null || verseCount <= 0) {
      return [];
    }
    return Array.from({ length: verseCount }, (_, i) => i + 1);
  }, [selectedChapter, verseCount]);

  const handleBookPress = useCallback((bookId: number, bookName: string, chapters: number) => {
    setSelectedBook({ id: bookId, name: bookName, chapters });
    setCurrentStep('chapter');
  }, []);

  const handleChapterPress = useCallback((chapter: number) => {
    setSelectedChapter(chapter);
    setCurrentStep('verse');
  }, []);

  const handleVersePress = useCallback((verse: number) => {
    if (selectedBook && selectedChapter !== null) {
      onBibleSelect(selectedBook.id, selectedBook.name, selectedChapter, verse);
      handleClose();
    }
  }, [selectedBook, selectedChapter, onBibleSelect]);

  const handleClose = useCallback(() => {
    setCurrentStep('book');
    setSelectedBook(null);
    setSelectedChapter(null);
    setSearchQuery('');
    setVerseCount(0);
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    if (currentStep === 'verse') {
      setCurrentStep('chapter');
    } else if (currentStep === 'chapter') {
      setCurrentStep('book');
    }
  }, [currentStep]);

  const getStepTitle = useCallback(() => {
    switch (currentStep) {
      case 'book':
        return 'Sélectionner un Livre';
      case 'chapter':
        return `Sélectionner un Chapitre${selectedBook ? ` - ${selectedBookShortName}` : ''}`;
      case 'verse':
        return `Sélectionner un Verset${selectedBook && selectedChapter !== null ? ` - ${selectedBookShortName} ${selectedChapter}` : ''}`;
      default:
        return 'Sélectionner un Livre';
    }
  }, [currentStep, selectedBook, selectedBookShortName, selectedChapter]);

  const sections = [
    { title: 'Testamenta Taloha', data: oldTestament },
    { title: 'Testamenta Vaovao', data: newTestament },
  ];

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.backgroundSecondary}]}>
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: theme.colors.divider}]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={[styles.backButtonText, {color: theme.colors.accentBlue}]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, {color: theme.colors.textPrimary}]}>{getStepTitle()}</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={[styles.closeButtonText, {color: theme.colors.textPrimary}]}>×</Text>
        </Pressable>
      </View>

      {/* Search input for book selection */}
      {currentStep === 'book' && (
        <View style={[styles.searchContainer, {borderBottomColor: theme.colors.divider}]}> 
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.backgroundTertiary,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder="Mitady boky..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      )}

      {/* Content */}
      {currentStep === 'book' ? (
        <SectionList
          key="book-list"
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            {paddingBottom: 12 + bottomScrollSpacerAdjusted},
          ]}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.testamentTitle, {color: theme.colors.textSecondary}]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={styles.bookRow}
              onPress={() => handleBookPress(item.id, item.name, item.chapters)}
            >
              <Text style={[styles.bookName, {color: theme.colors.textPrimary}]}> {getBibleBookShortName(item.name, item.id)} </Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={[styles.separator, {backgroundColor: theme.colors.divider}]} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
          ListEmptyComponent={
            isLoading ? (
              <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>Mitady...</Text>
            ) : (
              <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>Tsy misy valiny.</Text>
            )
          }
        />
      ) : currentStep === 'chapter' && selectedBook ? (
        <FlatList
          key={`chapter-grid-${selectedBook.id}`}
          data={chapters}
          keyExtractor={(item) => item.toString()}
          style={styles.content}
          contentContainerStyle={[
            styles.gridContentContainer,
            {paddingBottom: 16 + bottomScrollSpacerAdjusted},
          ]}
          numColumns={6}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.chapterButton, {backgroundColor: theme.colors.backgroundTertiary}]}
              onPress={() => handleChapterPress(item)}
            >
              <Text style={[styles.chapterNumber, {color: theme.colors.textPrimary}]}>{item}</Text>
            </Pressable>
          )}
        />
      ) : currentStep === 'verse' && selectedBook && selectedChapter !== null ? (
        <FlatList
          key={`verse-grid-${selectedBook.id}-${selectedChapter}`}
          data={verses}
          keyExtractor={(item) => item.toString()}
          style={styles.content}
          contentContainerStyle={[
            styles.gridContentContainer,
            {paddingBottom: 16 + bottomScrollSpacerAdjusted},
          ]}
          numColumns={7}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>
              {verseCount === 0 ? 'Mitady...' : 'Tsy misy andininy.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.verseButton, {backgroundColor: theme.colors.backgroundTertiary}]}
              onPress={() => handleVersePress(item)}
            >
              <Text style={[styles.verseNumber, {color: theme.colors.textPrimary}]}>{item}</Text>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(77, 150, 255, 0.12)',
  },
  backButtonText: {
    color: '#1982C4',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  closeButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  searchInput: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111111',
  },
  searchPlaceholder: {
    color: 'rgba(0,0,0,0.45)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  testamentTitle: {
    color: '#1982C4',
    fontSize: 17,
    fontWeight: '800',
    paddingTop: 10,
    paddingBottom: 8,
  },
  bookRow: {
    paddingVertical: 14,
  },
  bookName: {
    fontSize: 18,
    color: '#111111',
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  sectionSpacer: {
    height: 14,
  },
  infoText: {
    paddingVertical: 18,
    color: 'rgba(0,0,0,0.55)',
    textAlign: 'center',
  },
  gridContentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    rowGap: 10,
  },
  chapterButton: {
    flex: 1,
    margin: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 50,
  },
  chapterNumber: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  verseButton: {
    flex: 1,
    margin: 6,
    backgroundColor: 'rgba(77, 150, 255, 0.12)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 45,
  },
  verseNumber: {
    color: '#3A86FF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default memo(BibleSelectionModalOptimized);

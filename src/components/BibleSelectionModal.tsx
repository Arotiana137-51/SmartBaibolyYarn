import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import { useBibleData } from '../hooks/useBibleData';

type SelectionStep = 'book' | 'chapter' | 'verse';

interface BibleSelectionModalOptimizedProps {
  visible: boolean;
  onClose: () => void;
  onBibleSelect: (bookId: number, bookName: string, chapter: number, verse: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const BibleSelectionModalOptimized: React.FC<BibleSelectionModalOptimizedProps> = ({
  visible,
  onClose,
  onBibleSelect,
}) => {
  const { books, isLoading } = useBibleData();
  const [currentStep, setCurrentStep] = useState<SelectionStep>('book');
  const [selectedBook, setSelectedBook] = useState<{ id: number; name: string; chapters: number } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize filtered books
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    return books.filter(book => 
      book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
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

  // Generate verse numbers
  const verses = useMemo(() => {
    if (!selectedChapter) return [];
    return Array.from({ length: 30 }, (_, i) => i + 1); // Max 30 verses per chapter
  }, [selectedChapter]);

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
        return `Sélectionner un Chapitre${selectedBook ? ` - ${selectedBook.name}` : ''}`;
      case 'verse':
        return `Sélectionner un Verset${selectedBook && selectedChapter !== null ? ` - ${selectedBook.name} ${selectedChapter}` : ''}`;
      default:
        return 'Sélectionner un Livre';
    }
  }, [currentStep, selectedBook, selectedChapter]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      transparent
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{getStepTitle()}</Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          {/* Search input for book selection */}
          {currentStep === 'book' && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un livre..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          )}

          {/* Content */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {currentStep === 'book' && (
              <View>
                {/* Old Testament */}
                <View style={styles.testamentSection}>
                  <Text style={styles.testamentTitle}>Ancien Testament</Text>
                  <View style={styles.bookGrid}>
                    {oldTestament.map(book => (
                      <Pressable
                        key={book.id}
                        style={styles.bookButton}
                        onPress={() => handleBookPress(book.id, book.name, book.chapters)}
                      >
                        <Text style={styles.bookButtonText}>{book.name}</Text>
                        <Text style={styles.bookChapters}>{book.chapters} chap.</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* New Testament */}
                <View style={styles.testamentSection}>
                  <Text style={styles.testamentTitle}>Nouveau Testament</Text>
                  <View style={styles.bookGrid}>
                    {newTestament.map(book => (
                      <Pressable
                        key={book.id}
                        style={styles.bookButton}
                        onPress={() => handleBookPress(book.id, book.name, book.chapters)}
                      >
                        <Text style={styles.bookButtonText}>{book.name}</Text>
                        <Text style={styles.bookChapters}>{book.chapters} chap.</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {currentStep === 'chapter' && selectedBook && (
              <View style={styles.chapterGrid}>
                {chapters.map(chapter => (
                  <Pressable
                    key={chapter}
                    style={styles.chapterButton}
                    onPress={() => handleChapterPress(chapter)}
                  >
                    <Text style={styles.chapterNumber}>{chapter}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {currentStep === 'verse' && selectedBook && selectedChapter !== null && (
              <View style={styles.verseGrid}>
                {verses.map(verse => (
                  <Pressable
                    key={verse}
                    style={styles.verseButton}
                    onPress={() => handleVersePress(verse)}
                  >
                    <Text style={styles.verseNumber}>{verse}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#34495e',
  },
  backButtonText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#ecf0f1',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
  },
  closeButtonText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  testamentSection: {
    marginBottom: 24,
  },
  testamentTitle: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  bookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookButton: {
    width: '48%',
    backgroundColor: '#34495e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 60,
  },
  bookButtonText: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  bookChapters: {
    color: '#95a5a6',
    fontSize: 12,
    textAlign: 'center',
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chapterButton: {
    width: '18%',
    backgroundColor: '#34495e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  chapterNumber: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '700',
  },
  verseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  verseButton: {
    width: '12%',
    backgroundColor: '#34495e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 45,
  },
  verseNumber: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default memo(BibleSelectionModalOptimized);

import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View, Dimensions} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import TopBar from '../components/TopBar';
import ReaderView from '../components/ReaderView';
import CustomBottomNav from '../components/CustomBottomNav';
import HymnSelectionModal from '../components/HymnSelectionModal';
import BibleSelectionModal from '../components/BibleSelectionModal';
import {BibleCrossReference, BibleVerse, useBibleData} from '../hooks/useBibleData';
import { useHymnsData } from '../hooks/useHymnsData';
import HamburgerMenuPopover, {
  HamburgerMenuItemKey,
} from '../components/HamburgerMenuPopover';

export type AppMode = 'bible' | 'hymnal';

type MainScreenProps = {
  navigation: any;
};

const MainScreen = ({navigation}: MainScreenProps) => {
  const insets = useSafeAreaInsets();
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  
  // Calculate adaptive safe area padding (1.5% of screen height, but only if inset is significant)
  const maxPadding = screenHeight * 0.015;
  const minSignificantInset = 20; // Only apply padding if inset is more than 20px
  const proportionalTopPadding = insets.top > minSignificantInset ? Math.min(insets.top, maxPadding) : 0;
  const proportionalBottomPadding = insets.bottom > minSignificantInset ? Math.min(insets.bottom, maxPadding) : 0;

  // Update screen height on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });
    return () => subscription?.remove();
  }, []);

  const [mode, setMode] = useState<AppMode>('bible');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  
  const [currentBook, setCurrentBook] = useState<{ id: number; name: string } | null>(null);
  const [currentChapter, setCurrentChapter] = useState(119);
  const [selectedVerseNumber, setSelectedVerseNumber] = useState<number | null>(null);
  const [bibleSelectionVisible, setBibleSelectionVisible] = useState(false);

  const { books, verses, loadVerses, isLoading, getCrossReferences } = useBibleData();
  const {
    hymns,
    verses: hymnVerses,
    loadHymnVerses,
    isLoading: isHymnsLoading,
  } = useHymnsData();

  const [crossRefModalVisible, setCrossRefModalVisible] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [crossRefs, setCrossRefs] = useState<BibleCrossReference[]>([]);
  const [isCrossRefsLoading, setIsCrossRefsLoading] = useState(false);

  const [currentHymnId, setCurrentHymnId] = useState<string | null>(null);
  const [currentHymnNumber, setCurrentHymnNumber] = useState<number | null>(null);
  const [currentHymnCategory, setCurrentHymnCategory] = useState<string | null>(null);

  // Hymn selection modal state
  const [hymnSelectionVisible, setHymnSelectionVisible] = useState(false);

  useEffect(() => {
    if (currentBook || books.length === 0) {
      return;
    }

    const defaultBook = books.find(b => b.name === 'Salamo') ?? books[0];
    setCurrentBook({ id: defaultBook.id, name: defaultBook.name });
  }, [books, currentBook]);

  useEffect(() => {
    if (mode === 'hymnal' && hymns.length > 0 && !currentHymnId) {
      const ffpm1 = hymns.find(h => h.id === 'ffpm_1' || (h.category === 'ffpm' && h.number === 1));
      const firstFfpm = hymns
        .filter(h => h.category === 'ffpm')
        .sort((a, b) => a.number - b.number)[0];
      const defaultHymn = ffpm1 ?? firstFfpm ?? hymns[0];

      console.log('Selecting default hymn:', { id: defaultHymn.id, number: defaultHymn.number, category: defaultHymn.category });
      setCurrentHymnId(defaultHymn.id);
      setCurrentHymnNumber(defaultHymn.number);
      setCurrentHymnCategory(defaultHymn.category || null);
    }
  }, [mode, hymns, currentHymnId]);

  useEffect(() => {
    if (mode === 'hymnal' && currentHymnId) {
      loadHymnVerses(currentHymnId);
    }
  }, [mode, currentHymnId, loadHymnVerses]);

  useEffect(() => {
    if (mode === 'bible' && currentBook) {
      loadVerses(currentBook.id, currentChapter);
    }
  }, [mode, currentBook, currentChapter, loadVerses]);

  useEffect(() => {
    if (mode !== 'bible') {
      setBibleSelectionVisible(false);
      setSelectedVerseNumber(null);
    }
  }, [mode]);

  const title =
    mode === 'bible'
      ? `${currentBook?.name ?? ''} ${currentChapter}`.trim()
      : `Fihirana ${currentHymnNumber ?? ''}${currentHymnCategory ? ` (${currentHymnCategory.toUpperCase()})` : ''}`.trim();

  const handlePreviousChapter = () => {
    if (mode === 'bible' && currentBook && currentChapter > 1) {
      setCurrentChapter(currentChapter - 1);
    } else if (mode === 'hymnal' && currentHymnNumber && currentHymnCategory && currentHymnNumber > 1) {
      // Find previous hymn within the same category
      const prevHymn = hymns.find(h => h.category === currentHymnCategory && h.number === currentHymnNumber - 1);
      if (prevHymn) {
        setCurrentHymnId(prevHymn.id);
        setCurrentHymnNumber(prevHymn.number);
        setCurrentHymnCategory(prevHymn.category || null);
      }
    }
  };

  const handleNextChapter = () => {
    if (mode === 'bible' && currentBook && currentChapter < 150) {
      setCurrentChapter(currentChapter + 1);
    } else if (mode === 'hymnal' && currentHymnNumber && currentHymnCategory) {
      // Find next hymn within the same category
      const nextHymn = hymns.find(h => h.category === currentHymnCategory && h.number === currentHymnNumber + 1);
      if (nextHymn) {
        setCurrentHymnId(nextHymn.id);
        setCurrentHymnNumber(nextHymn.number);
        setCurrentHymnCategory(nextHymn.category || null);
      }
    }
  };

  const handleMenuSelect = (key: HamburgerMenuItemKey) => {
    setIsMenuOpen(false);

    switch (key) {
      case 'favorites':
        navigation.navigate('Favorites');
        return;
      case 'history':
        navigation.navigate('History');
        return;
      case 'search':
        navigation.navigate('Search');
        return;
      case 'misc':
        navigation.navigate('Misc');
        return;
      case 'about':
        navigation.navigate('About');
        return;
      default: {
        const _exhaustiveCheck: never = key;
        return _exhaustiveCheck;
      }
    }
  };

  const openCrossReferences = async (verse: BibleVerse) => {
    if (!currentBook) {
      return;
    }

    setSelectedVerse(verse);
    setCrossRefs([]);
    setCrossRefModalVisible(true);
    setIsCrossRefsLoading(true);
    try {
      const refs = await getCrossReferences(verse.book_id, verse.chapter, verse.verse_number);
      setCrossRefs(refs);
    } finally {
      setIsCrossRefsLoading(false);
    }
  };

  const closeCrossReferences = () => {
    setCrossRefModalVisible(false);
    setSelectedVerse(null);
    setCrossRefs([]);
    setIsCrossRefsLoading(false);
  };

  const handleCrossRefPress = (ref: BibleCrossReference) => {
    setMode('bible');
    setCurrentBook({ id: ref.to_book_id, name: ref.to_book_name });
    setCurrentChapter(ref.to_chapter);
    closeCrossReferences();
  };

  const handleHymnSelect = (hymnId: string, category: string, number: number) => {
    setCurrentHymnId(hymnId);
    setCurrentHymnNumber(number);
    setCurrentHymnCategory(category);
  };

  const handleTitlePress = () => {
    if (mode === 'hymnal') {
      setHymnSelectionVisible(true);
      return;
    }

    if (mode === 'bible') {
      setBibleSelectionVisible(visible => !visible);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        appMode={mode}
        title={title}
        isMenuOpen={isMenuOpen}
        onMenuPress={() => setIsMenuOpen(open => !open)}
        onTitlePress={handleTitlePress}
        onPreviousPress={handlePreviousChapter}
        onNextPress={handleNextChapter}
      />
      <View style={styles.readerContainer}>
        {mode === 'bible' && bibleSelectionVisible ? (
          <BibleSelectionModal
            onClose={() => setBibleSelectionVisible(false)}
            onBibleSelect={(bookId, bookName, chapter, verse) => {
              setMode('bible');
              setCurrentBook({ id: bookId, name: bookName });
              setCurrentChapter(chapter);
              setSelectedVerseNumber(verse);
              setBibleSelectionVisible(false);
            }}
          />
        ) : (
          <ReaderView
            appMode={mode}
            verses={verses}
            hymnVerses={hymnVerses}
            isLoading={mode === 'bible' ? isLoading : isHymnsLoading}
            fontScale={fontScale}
            onVersePress={mode === 'bible' ? openCrossReferences : undefined}
            selectedVerseNumber={mode === 'bible' ? selectedVerseNumber : null}
          />
        )}
      </View>
      <CustomBottomNav activeMode={mode} onTabPress={setMode} />

      <Modal
        visible={crossRefModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCrossReferences}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeCrossReferences}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedVerse
                  ? `${currentBook?.name ?? ''} ${selectedVerse.chapter}:${selectedVerse.verse_number}`
                  : 'Cross references'}
              </Text>
              <Pressable onPress={closeCrossReferences}>
                <Text style={styles.modalClose}>HIDY</Text>
              </Pressable>
            </View>

            {isCrossRefsLoading ? (
              <Text style={styles.modalHint}>Mitady...</Text>
            ) : crossRefs.length === 0 ? (
              <Text style={styles.modalHint}>Tsy misy cross-reference.</Text>
            ) : (
              <View>
                {crossRefs.slice(0, 200).map(ref => {
                  const rangeText =
                    ref.to_verse_start === ref.to_verse_end
                      ? `${ref.to_verse_start}`
                      : `${ref.to_verse_start}-${ref.to_verse_end}`;
                  return (
                    <Pressable
                      key={ref.id}
                      style={styles.crossRefRow}
                      onPress={() => handleCrossRefPress(ref)}
                    >
                      <Text style={styles.crossRefText}>
                        {ref.to_book_name} {ref.to_chapter}:{rangeText}
                      </Text>
                      <Text style={styles.crossRefVotes}>{ref.votes}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <HamburgerMenuPopover
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelect={handleMenuSelect}
        topInset={insets.top + 50}
        menuTop={insets.top + 50 + 8}
        menuRight={12}
        caretRightOffset={12}
        fontControlsTop={insets.top}
        fontControlsRight={56}
        onIncreaseFont={() =>
          setFontScale(scale => Math.min(1.6, Math.round((scale + 0.1) * 10) / 10))
        }
        onDecreaseFont={() =>
          setFontScale(scale => Math.max(0.8, Math.round((scale - 0.1) * 10) / 10))
        }
      />

      <HymnSelectionModal
        visible={hymnSelectionVisible}
        hymns={hymns}
        currentCategory={currentHymnCategory}
        currentNumber={currentHymnNumber}
        onClose={() => setHymnSelectionVisible(false)}
        onHymnSelect={handleHymnSelect}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  readerContainer: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    flex: 1,
    paddingRight: 12,
  },
  modalClose: {
    fontSize: 12,
    fontWeight: '700',
    color: '#005a9e',
  },
  modalHint: {
    paddingVertical: 12,
    color: '#444',
  },
  crossRefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
  },
  crossRefText: {
    flex: 1,
    color: '#111',
    paddingRight: 12,
  },
  crossRefVotes: {
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
});

export default MainScreen;

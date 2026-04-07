import React, {useEffect, useMemo, useState, useRef} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  Platform,
  AppState,
  PanResponder,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import TopBar from '../components/TopBar';
import BibleReaderView from '../components/BibleReaderView';
import HymnReaderView from '../components/HymnReaderView';
import CustomBottomNav from '../components/CustomBottomNav';
import HymnSelectionModal from '../components/HymnSelectionModal';
import BibleSelectionModal from '../components/BibleSelectionModal';
import VerseActionPopover from '../components/VerseActionPopover';
import HymnActionPopover from '../components/HymnActionPopover';
import ReportIssueModal from '../components/ReportIssueModal';
import {BibleCrossReference, BibleVerse, useBibleData} from '../hooks/useBibleData';
import { useHymnsData, Hymn } from '../hooks/useHymnsData';
import { useFavorites } from '../hooks/useFavorites';
import { useHymnFavorites } from '../hooks/useHymnFavorites';
import { useBibleHistory } from '../hooks/useBibleHistory';
import { useHymnHistory } from '../hooks/useHymnHistory';
import HamburgerMenuPopover, {
  HamburgerMenuItemKey,
} from '../components/HamburgerMenuPopover';
import {useTheme} from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { TEXT_STYLES, scaleFontSize } from '../constants/Typography';
import { ISSUE_REPORT_ENDPOINT_URL } from '../constants/reporting';
import {getBibleBookShortName} from '../utils/bibleBookNames';
import {
  enqueueIssueReport,
  flushIssueReports,
  IssueReport,
} from '../services/reporting/issueReportQueue';

const TOP_BAR_TOOLBAR_HEIGHT = Platform.OS === 'android' ? 56 : 44;
const TOP_BAR_EXTRA_TOP_PADDING = 6;
const HAMBURGER_CARET_HEIGHT = 12;

export type AppMode = 'bible' | 'hymnal';

type MainScreenProps = {
  navigation: any;
};

const MainScreen = ({navigation}: MainScreenProps) => {
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const {theme, isDarkMode, setDarkMode} = useTheme();
  const insets = useSafeAreaInsets();
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const flatListRef = useRef<FlatList>(null);
  const [shouldScrollToVerse, setShouldScrollToVerse] = useState<number | null>(null);

  const appState = useRef(AppState.currentState);

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

  const [mode, setMode] = useState<AppMode>(route.params?.mode || 'bible');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  
  const [currentBook, setCurrentBook] = useState<{ id: number; name: string } | null>(
    route.params?.selectedBook || null
  );
  const [currentChapter, setCurrentChapter] = useState<number>(
    route.params?.selectedChapter || 119
  );
  const [selectedVerseNumber, setSelectedVerseNumber] = useState<number | null>(
    route.params?.selectedVerse || null
  );
  const [bibleSelectionVisible, setBibleSelectionVisible] = useState(false);

  const [currentHymnId, setCurrentHymnId] = useState<string | null>(
    route.params?.selectedHymnId || null
  );
  const [currentHymnNumber, setCurrentHymnNumber] = useState<number | null>(null);
  const [currentHymnCategory, setCurrentHymnCategory] = useState<string | null>(null);

  useEffect(() => {
    const params = route.params;
    if (!params) {
      return;
    }

    if (params.mode) {
      setMode(params.mode);
    }

    if (params.selectedBook) {
      setMode('bible');
      setCurrentBook(params.selectedBook);
    }

    if (typeof params.selectedChapter === 'number') {
      setMode('bible');
      setCurrentChapter(params.selectedChapter);
    }

    if (typeof params.selectedVerse === 'number') {
      setMode('bible');
      setSelectedVerseNumber(params.selectedVerse);
      setShouldScrollToVerse(params.selectedVerse);
    }

    if (params.selectedHymnId) {
      setMode('hymnal');
      setCurrentHymnId(params.selectedHymnId);
    }
  }, [route.params]);

  const { books, verses, loadVerses, isLoading, getCrossReferences } = useBibleData();
  const {
    hymns,
    verses: hymnVerses,
    loadHymnVerses,
    isLoading: isHymnsLoading,
  } = useHymnsData();
  const { addToFavorites: addToBibleFavorites } = useFavorites();
  const { addToFavorites: addToHymnFavorites } = useHymnFavorites();
  const { logAccess: logBibleAccess } = useBibleHistory();
  const { logAccess: logHymnAccess } = useHymnHistory();

  const [crossRefModalVisible, setCrossRefModalVisible] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [crossRefs, setCrossRefs] = useState<BibleCrossReference[]>([]);
  const [isCrossRefsLoading, setIsCrossRefsLoading] = useState(false);

  // Verse action popover state
  const [verseActionVisible, setVerseActionVisible] = useState(false);
  const [selectedVerseForAction, setSelectedVerseForAction] = useState<BibleVerse | null>(null);

  // Hymn action popover state
  const [hymnActionVisible, setHymnActionVisible] = useState(false);

  const [selectedHymnStanzaNumber, setSelectedHymnStanzaNumber] = useState<number | null>(null);
  const [selectedHymnStanzaText, setSelectedHymnStanzaText] = useState<string | null>(null);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReference, setReportReference] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportType, setReportType] = useState<'bible' | 'hymn'>('bible');

  // Hymn selection modal state
  const [hymnSelectionVisible, setHymnSelectionVisible] = useState(false);

  const swipeResponder = useMemo(() => {
    const SWIPE_MIN_DX = 60;
    const SWIPE_ACTIVATION_DX = 18;
    const SWIPE_MAX_DY = 80;

    const isSwipeEligible = () => {
      if (isMenuOpen) return false;
      if (bibleSelectionVisible) return false;
      if (verseActionVisible) return false;
      if (hymnActionVisible) return false;
      if (crossRefModalVisible) return false;
      if (reportModalVisible) return false;
      if (hymnSelectionVisible) return false;
      return true;
    };

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (!isSwipeEligible()) return false;

        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDy > SWIPE_MAX_DY) return false;

        return absDx > SWIPE_ACTIVATION_DX && absDx > absDy * 1.35;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isSwipeEligible()) return;

        const dx = gestureState.dx;
        const absDy = Math.abs(gestureState.dy);
        if (absDy > SWIPE_MAX_DY) return;

        if (dx >= SWIPE_MIN_DX) {
          if (mode !== 'hymnal') setMode('hymnal');
          return;
        }

        if (dx <= -SWIPE_MIN_DX) {
          if (mode !== 'bible') setMode('bible');
        }
      },
      onPanResponderTerminate: () => {
        return;
      },
    });
  }, [
    bibleSelectionVisible,
    crossRefModalVisible,
    hymnActionVisible,
    hymnSelectionVisible,
    isMenuOpen,
    mode,
    reportModalVisible,
    verseActionVisible,
  ]);

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
    } else if (mode === 'hymnal' && currentHymnId) {
      loadHymnVerses(currentHymnId);
    }
  }, [mode, currentBook, currentChapter, currentHymnId, loadVerses, loadHymnVerses]);

  useEffect(() => {
    if (mode !== 'hymnal') {
      return;
    }

    if (!currentHymnId || hymns.length === 0) {
      return;
    }

    const hymn = hymns.find(h => h.id === currentHymnId);
    if (!hymn) {
      return;
    }

    if (currentHymnNumber !== hymn.number) {
      setCurrentHymnNumber(hymn.number);
    }

    const nextCategory = hymn.category || null;
    if (currentHymnCategory !== nextCategory) {
      setCurrentHymnCategory(nextCategory);
    }
  }, [mode, currentHymnCategory, currentHymnId, currentHymnNumber, hymns]);

  // Auto-scroll to selected verse when verses are loaded
  useEffect(() => {
    if (shouldScrollToVerse !== null && verses.length > 0) {
      const verseIndex = verses.findIndex(verse => verse.verse_number === shouldScrollToVerse);
      if (verseIndex !== -1 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: verseIndex,
            viewPosition: 0.2, // Position verse at 20% from top
            animated: true,
          });
          setShouldScrollToVerse(null); // Reset after scrolling
        }, 100);
      }
    }
  }, [verses, shouldScrollToVerse]);

  useEffect(() => {
    if (mode === 'bible' && currentBook && verses.length > 0) {
      logBibleAccess(
        { book_id: currentBook.id, chapter: currentChapter, verse_number: 1, text: '', id: 0 } as BibleVerse,
        currentBook.name
      );
    } else if (mode === 'hymnal' && currentHymnId && hymnVerses.length > 0) {
      const currentHymn = hymns.find(h => h.id === currentHymnId);
      if (currentHymn) {
        logHymnAccess(currentHymn);
      }
    }
  }, [mode, currentBook, currentChapter, currentHymnId, verses, hymnVerses, hymns, logBibleAccess, logHymnAccess]);

  useEffect(() => {
    if (mode !== 'bible') {
      setBibleSelectionVisible(false);
      setSelectedVerseNumber(null);
    }
  }, [mode]);

  const bibleTitleShort = currentBook
    ? `${getBibleBookShortName(currentBook.name, currentBook.id)} ${currentChapter}`.trim()
    : `${currentChapter}`.trim();

  const getChapterText = (chapter: number) => chapter === 1 ? 'voalohany' : `faha-${chapter}`;

  const bibleTitleLong = currentBook
    ? (
        currentBook.id === 18 ||
        currentBook.id === 19 ||
        currentBook.id === 20 ||
        currentBook.id === 21 ||
        currentBook.id === 22 ||
        currentBook.id === 25
          ? `${getBibleBookShortName(currentBook.name, currentBook.id)} ${getChapterText(currentChapter)}`
          : `${currentBook.name}\nToko ${getChapterText(currentChapter)}`
      ).trim()
    : `${currentChapter}`.trim();

  const title =
    mode === 'bible'
      ? bibleTitleShort
      : `${
          currentHymnCategory
            ? currentHymnCategory === 'ff'
              ? 'F.Fanampiny '
              : `${currentHymnCategory.toUpperCase()} `
            : 'Fihirana '
        }${currentHymnNumber ?? ''}`.trim();

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
        navigation.navigate('Favorites', { mode });
        return;
      case 'history':
        navigation.navigate('History', { mode });
        return;
      case 'search':
        navigation.navigate('Search', { mode });
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

  const handleHymnStanzaLongPress = (stanzaNumber: number, stanzaText: string) => {
    setSelectedHymnStanzaNumber(stanzaNumber);
    setSelectedHymnStanzaText(stanzaText);
    setHymnActionVisible(true);
  };

  const handleAddHymnToFavorites = () => {
    if (currentHymnId) {
      const currentHymn = hymns.find(h => h.id === currentHymnId);
      if (currentHymn) {
        addToHymnFavorites(currentHymn);
      }
    }
  };

  const getCurrentHymn = (): Hymn | null => {
    if (currentHymnId) {
      return hymns.find(h => h.id === currentHymnId) || null;
    }
    return null;
  };

  const closeHymnAction = () => {
    setHymnActionVisible(false);
  };

  const closeReportModal = () => {
    setReportModalVisible(false);
  };

  const openBibleReportModal = (verse: BibleVerse) => {
    const ref = `${currentBook?.name ?? ''} ${verse.chapter}:${verse.verse_number}`.trim();
    setReportType('bible');
    setReportReference(ref);
    setReportText(verse.text);
    setReportModalVisible(true);
  };

  const openHymnReportModal = (payload: { stanzaNumber: number; stanzaText: string }) => {
    const hymn = getCurrentHymn();
    const titleRef = `Fihirana ${hymn?.number ?? ''}${hymn?.category ? ` (${hymn.category.toUpperCase()})` : ''}`.trim();
    const ref = `${titleRef} - Couplet ${payload.stanzaNumber}`.trim();

    setReportType('hymn');
    setReportReference(ref);
    setReportText(payload.stanzaText);
    setReportModalVisible(true);
  };

  const maybeFlushReports = async () => {
    if (!ISSUE_REPORT_ENDPOINT_URL || ISSUE_REPORT_ENDPOINT_URL.includes('PUT_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE')) {
      return;
    }

    try {
      await flushIssueReports(ISSUE_REPORT_ENDPOINT_URL);
    } catch (e) {
      // Keep queue for later retry
      console.log('flushIssueReports failed:', e);
    }
  };

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected) {
        maybeFlushReports();
      }
    });

    const appStateSub = AppState.addEventListener('change', nextAppState => {
      const prev = appState.current;
      appState.current = nextAppState;
      if (prev.match(/inactive|background/) && nextAppState === 'active') {
        maybeFlushReports();
      }
    });

    return () => {
      unsub();
      appStateSub.remove();
    };
  }, []);

  const handleVerseLongPress = (verse: BibleVerse) => {
    setSelectedVerseForAction(verse);
    setVerseActionVisible(true);
  };

  const handleViewCorrespondence = (verse: BibleVerse) => {
    openCrossReferences(verse);
  };

  const handleAddToFavorites = (verse: BibleVerse) => {
    if (currentBook) {
      addToBibleFavorites(verse, currentBook.name);
    }
  };

  const closeVerseAction = () => {
    setVerseActionVisible(false);
    setSelectedVerseForAction(null);
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
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.container, {backgroundColor: theme.colors.readerBackground}]}
    >
      <TopBar
        appMode={mode}
        title={title}
        isMenuOpen={isMenuOpen}
        onMenuPress={() => setIsMenuOpen(open => !open)}
        onTitlePress={handleTitlePress}
        onPreviousPress={handlePreviousChapter}
        onNextPress={handleNextChapter}
      />
      <View style={styles.readerContainer} {...swipeResponder.panHandlers}>
        {mode === 'bible' && bibleSelectionVisible ? (
          <BibleSelectionModal
            onClose={() => setBibleSelectionVisible(false)}
            onBibleSelect={(bookId, bookName, chapter, verse) => {
              setMode('bible');
              setCurrentBook({ id: bookId, name: bookName });
              setCurrentChapter(chapter);
              setSelectedVerseNumber(verse);
              setShouldScrollToVerse(verse);
              setBibleSelectionVisible(false);
            }}
          />
        ) : (
          mode === 'bible' ? (
            <BibleReaderView
              verses={verses}
              isLoading={isLoading}
              fontScale={fontScale}
              onVersePress={handleVerseLongPress}
              onVerseLongPress={handleVerseLongPress}
              selectedVerseNumber={selectedVerseNumber}
              flatListRef={flatListRef}
              headerText={mode === 'bible' ? bibleTitleLong : null}
            />
          ) : (
            <HymnReaderView
              hymnVerses={hymnVerses}
              isLoading={isHymnsLoading}
              hymnNumber={getCurrentHymn()?.number ?? null}
              hymnTitle={getCurrentHymn()?.title ?? null}
              fontScale={fontScale}
              onHymnLongPress={handleHymnStanzaLongPress}
            />
          )
        )}

      </View>
      <CustomBottomNav activeMode={mode} onTabPress={setMode} />

      <ReportIssueModal
        visible={reportModalVisible}
        reference={reportReference}
        text={reportText}
        onClose={closeReportModal}
        onSubmit={async (comment) => {
          const report: IssueReport = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            type: reportType,
            reference: reportReference,
            text: reportText,
            comment,
          };

          closeReportModal();
          await enqueueIssueReport(report);
          await maybeFlushReports();
        }}
      />

      <Modal
        visible={crossRefModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCrossReferences}
      >
        <Pressable style={[styles.modalBackdrop]} onPress={closeCrossReferences}>
          <Pressable
            style={[
              styles.modalCard,
              {backgroundColor: theme.colors.backgroundSecondary},
            ]}
            onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.colors.textPrimary}]}> 
                {selectedVerse
                  ? `${currentBook?.name ?? ''} ${selectedVerse.chapter}:${selectedVerse.verse_number}`
                  : 'Cross references'}
              </Text>
              <Pressable onPress={closeCrossReferences}>
                <Text style={[styles.modalClose, {color: theme.colors.accentBlue}]}>HIDY</Text>
              </Pressable>
            </View>

            {isCrossRefsLoading ? (
              <Text style={[styles.modalHint, {color: theme.colors.readerText}]}>Mitady...</Text>
            ) : crossRefs.length === 0 ? (
              <Text style={[styles.modalHint, {color: theme.colors.readerText}]}>Tsy misy cross-reference.</Text>
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
                      style={[styles.crossRefRow, {borderTopColor: theme.colors.divider}]}
                      onPress={() => handleCrossRefPress(ref)}
                    >
                      <Text style={[styles.crossRefText, {color: theme.colors.readerText}]}> 
                        {ref.to_book_name} {ref.to_chapter}:{rangeText}
                      </Text>
                      <Text style={[styles.crossRefVotes, {color: theme.colors.textSecondary}]}>{ref.votes}</Text>
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
        isDarkMode={isDarkMode}
        onToggleDarkMode={setDarkMode}
        fontScale={fontScale}
        topInset={insets.top + TOP_BAR_EXTRA_TOP_PADDING + TOP_BAR_TOOLBAR_HEIGHT}
        menuTop={
          insets.top +
          TOP_BAR_EXTRA_TOP_PADDING +
          TOP_BAR_TOOLBAR_HEIGHT -
          HAMBURGER_CARET_HEIGHT
        }
        menuRight={12}
        caretRightOffset={12}
        fontControlsTop={insets.top + TOP_BAR_EXTRA_TOP_PADDING}
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

      <VerseActionPopover
        visible={verseActionVisible}
        verse={selectedVerseForAction}
        verseBookName={currentBook?.name}
        onClose={closeVerseAction}
        onViewCorrespondence={handleViewCorrespondence}
        onAddToFavorites={handleAddToFavorites}
        onReportIssue={openBibleReportModal}
      />

      <HymnActionPopover
        visible={hymnActionVisible}
        hymn={getCurrentHymn()}
        stanzaNumber={selectedHymnStanzaNumber}
        stanzaText={selectedHymnStanzaText}
        onClose={closeHymnAction}
        onAddToFavorites={handleAddHymnToFavorites}
        onReportIssue={openHymnReportModal}
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
    paddingBottom: 24,
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

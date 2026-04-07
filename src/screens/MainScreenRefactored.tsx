// src/screens/MainScreenRefactored.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../components/TopBar';
import BibleReaderView from '../components/BibleReaderView';
import HymnReaderView from '../components/HymnReaderView';
import CustomBottomNav from '../components/CustomBottomNav';
import HamburgerMenuPopover from '../components/HamburgerMenuPopover';
import HymnSelectionModal from '../components/HymnSelectionModal';
import { BibleCrossReference, BibleVerse } from '../hooks/useBibleData';
import { Hymn } from '../hooks/useHymnsData';
import { useNavigationServices } from '../hooks/useNavigationServices';
import { useModalState } from '../hooks/useModalState';
import { useTheme } from '../contexts/ThemeContext';
import { AppMode } from './MainScreen';
import { CompositeNavigationManager } from '../services/navigation/NavigationService';

type MainScreenProps = {
  navigation: any;
};

const MainScreenRefactored: React.FC<MainScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode, setDarkMode } = useTheme();
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  
  // UI State
  const [mode, setMode] = useState<AppMode>('bible');
  const [fontScale, setFontScale] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentHymnalCategory, setCurrentHymnalCategory] = useState<string>('ffpm');
  
  // Modal states using custom hook
  const crossRefModal = useModalState<BibleVerse>();
  const hymnSelectionModal = useModalState();
  
  // Navigation services and data
  const {
    bibleState,
    bibleNavService,
    bibleLoading,
    hymnState,
    hymnNavService,
    hymnsLoading,
    books,
    hymns,
  } = useNavigationServices();

  // Create navigation manager
  const [navigationManager] = useState(() => 
    new CompositeNavigationManager(
      bibleNavService,
      hymnNavService,
      mode,
      books,
      hymns
    )
  );

  // Update navigation manager when dependencies change
  useEffect(() => {
    navigationManager.setMode(mode);
  }, [mode, navigationManager]);

  // Update screen height on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });
    return () => subscription?.remove();
  }, []);

  // Calculate adaptive safe area padding
  const maxPadding = screenHeight * 0.015;
  const minSignificantInset = 20;
  const proportionalTopPadding = insets.top > minSignificantInset ? Math.min(insets.top, maxPadding) : 0;
  const proportionalBottomPadding = insets.bottom > minSignificantInset ? Math.min(insets.bottom, maxPadding) : 0;

  // Get current title from navigation manager
  const title = navigationManager.getCurrentTitle();

  // Navigation handlers
  const handlePrevious = () => navigationManager.goPrevious();
  const handleNext = () => navigationManager.goNext();

  // Modal handlers
  const handleTitlePress = () => {
    if (mode === 'bible') {
      // Handle Bible mode title press if needed
    }
  };

  const handleHymnalCategoryChange = (category: string) => {
    setCurrentHymnalCategory(category);
    // Update the hymn navigation service with new category
    hymnNavService.setCategory(category);
  };

  const handleHymnSelect = (hymnId: string, category: string, number: number) => {
    hymnNavService.selectHymn(hymnId, category, number);
  };

  const openCrossReferences = async (verse: BibleVerse) => {
    crossRefModal.open(verse);
    // Load cross references logic would go here
  };

  const closeCrossReferences = () => {
    crossRefModal.close();
  };

  const handleMenuSelect = (key: string) => {
    setIsMenuOpen(false);
    // Navigation logic would go here
  };

  // Get current verses for display
  const currentVerses = mode === 'bible' ? [] : []; // This would come from data hooks
  const currentHymnVerses = mode === 'hymnal' ? [] : []; // This would come from data hooks
  const isLoading = mode === 'bible' ? bibleLoading : hymnsLoading;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.container, {backgroundColor: theme.colors.readerBackground}]}>
      <TopBar
        appMode={mode}
        title={title}
        isMenuOpen={isMenuOpen}
        onMenuPress={() => {
        if (isMenuOpen) {
          setIsMenuOpen(false); // Always close when open
        } else {
          setIsMenuOpen(true);  // Always open when closed
        }
      }}
        onTitlePress={handleTitlePress}
        onPreviousPress={handlePrevious}
        onNextPress={handleNext}
        currentHymnalCategory={currentHymnalCategory}
        onHymnalCategoryChange={handleHymnalCategoryChange}
      />
      
      <View style={styles.readerContainer}>
        {mode === 'bible' ? (
          <BibleReaderView
            verses={currentVerses}
            isLoading={bibleLoading}
            fontScale={fontScale}
            onVersePress={openCrossReferences}
            onVerseLongPress={openCrossReferences}
          />
        ) : (
          <HymnReaderView
            hymnVerses={currentHymnVerses}
            isLoading={hymnsLoading}
            hymnNumber={hymns.find(h => h.id === hymnState.currentHymnId)?.number ?? null}
            hymnTitle={hymns.find(h => h.id === hymnState.currentHymnId)?.title ?? null}
            fontScale={fontScale}
          />
        )}

        {isDarkMode ? (
          <View pointerEvents="none" style={styles.sepiaOverlay} />
        ) : null}
      </View>
      
      <CustomBottomNav 
        activeMode={mode} 
        onTabPress={setMode} 
      />

      {/* Cross References Modal */}
      <Modal
        visible={crossRefModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeCrossReferences}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeCrossReferences}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Cross References
              </Text>
              <Pressable onPress={closeCrossReferences}>
                <Text style={styles.modalClose}>HIDY</Text>
              </Pressable>
            </View>
            {/* Cross references content would go here */}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Hamburger Menu */}
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
        isDarkMode={isDarkMode}
        onToggleDarkMode={setDarkMode}
        fontScale={fontScale}
      />
      
      {/* Hymn Selection Modal */}
      <HymnSelectionModal
        visible={hymnSelectionModal.visible}
        hymns={hymns}
        currentCategory={hymnState.currentHymnCategory}
        currentNumber={hymnState.currentHymnNumber}
        onClose={hymnSelectionModal.close}
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
    paddingBottom: 24,
  },
  sepiaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 214, 160, 0.08)',
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
});

export default MainScreenRefactored;

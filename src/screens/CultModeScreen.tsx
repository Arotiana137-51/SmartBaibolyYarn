import React, {useCallback, useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import {useCultMode} from '../contexts/CultModeContext';
import {
  CultEntry,
  buildBibleLabel,
  buildHymnLabel,
} from '../types/cultMode';
import {useTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../navigation/RootNavigator';
import {TEXT_STYLES} from '../constants/Typography';
import {t} from '../i18n/strings';
import BibleSelectionModal, {
  VerseSelection,
} from '../components/BibleSelectionModal';
import HymnSelectionModal from '../components/HymnSelectionModal';
import {useHymnsData} from '../hooks/useHymnsData';

type CultModeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CultMode'
>;

const CultModeScreen = () => {
  const navigation = useNavigation<CultModeScreenNavigationProp>();
  const {theme} = useTheme();
  const {
    entries,
    addEntry,
    removeEntry,
    reorderEntries,
    isActive,
    toggleActive,
  } = useCultMode();
  const {hymns} = useHymnsData();

  const [bibleModalVisible, setBibleModalVisible] = useState(false);
  const [hymnModalVisible, setHymnModalVisible] = useState(false);

  const handleBibleSelect = useCallback(
    (
      bookId: number,
      bookName: string,
      chapter: number,
      selection: VerseSelection,
    ) => {
      let verseStart = 1;
      let verseEnd = 1;
      if (selection.kind === 'single') {
        verseStart = selection.verse;
        verseEnd = selection.verse;
      } else if (selection.kind === 'range') {
        verseStart = selection.start;
        verseEnd = selection.end;
      } else {
        // 'whole' chapter — sentinel verseEnd=999 tells the MainScreen
        // propagator to pass selectedVerseRange={null} to the reader.
        verseStart = 1;
        verseEnd = 999;
      }
      addEntry({
        type: 'bible',
        bookId,
        bookName,
        chapter,
        verseStart,
        verseEnd,
        label: buildBibleLabel(bookName, chapter, verseStart, verseEnd),
      });
      setBibleModalVisible(false);
    },
    [addEntry],
  );

  const handleHymnSelect = useCallback(
    (hymnId: string, category: string, number: number) => {
      // HymnSelectionModal's callback doesn't include the title, so look it up.
      const hymn = hymns.find(h => h.id === hymnId);
      const title = hymn?.title ?? '';
      addEntry({
        type: 'hymn',
        hymnId,
        category,
        hymnNumber: number,
        title,
        label: buildHymnLabel(category, number, title),
      });
      setHymnModalVisible(false);
    },
    [addEntry, hymns],
  );

  const handleRemove = useCallback(
    (entry: CultEntry) => {
      Alert.alert(t('cultMode.deleteTitle'), t('cultMode.deleteMessage'), [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => removeEntry(entry.id),
        },
      ]);
    },
    [removeEntry],
  );

  const renderItem = useCallback(
    ({item, drag, isActive: dragActive}: RenderItemParams<CultEntry>) => (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={200}
          style={[
            styles.itemContainer,
            {backgroundColor: theme.colors.backgroundSecondary},
            dragActive && styles.itemActive,
          ]}>
          <View style={styles.dragHandle}>
            <Text
              style={[
                styles.dragHandleText,
                {color: theme.colors.textSecondary},
              ]}>
              ☰
            </Text>
          </View>
          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, {color: theme.colors.textPrimary}]}
              numberOfLines={2}>
              {item.label}
            </Text>
            <Text
              style={[styles.itemType, {color: theme.colors.textSecondary}]}>
              {item.type === 'bible' ? 'Baiboly' : 'Fihirana'}
            </Text>
          </View>
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemove(item)}
            hitSlop={8}>
            <Text
              style={[
                styles.removeButtonText,
                {color: theme.colors.textSecondary},
              ]}>
              ×
            </Text>
          </Pressable>
        </Pressable>
      </ScaleDecorator>
    ),
    [theme.colors, handleRemove],
  );

  const headerComponent = useMemo(
    () => (
      <View style={styles.addSection}>
        <View style={styles.addButtonsRow}>
          <Pressable
            onPress={() => setBibleModalVisible(true)}
            style={[
              styles.addButton,
              {backgroundColor: theme.colors.navBackground},
            ]}>
            <Text style={styles.addButtonText}>
              {t('cultMode.addBible')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setHymnModalVisible(true)}
            style={[
              styles.addButton,
              {backgroundColor: theme.colors.navBackground},
            ]}>
            <Text style={styles.addButtonText}>
              {t('cultMode.addHymn')}
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [theme.colors],
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        {backgroundColor: theme.colors.backgroundPrimary},
      ]}>
      <View
        style={[styles.header, {backgroundColor: theme.colors.navBackground}]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={8}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={[TEXT_STYLES.heading, styles.headerTitle]}>
          {t('cultMode.title')}
        </Text>
      </View>

      <View
        style={[
          styles.activateRow,
          {backgroundColor: theme.colors.backgroundSecondary},
        ]}>
        <View style={{flex: 1}}>
          <Text
            style={[styles.activateLabel, {color: theme.colors.textPrimary}]}>
            {isActive ? t('cultMode.deactivate') : t('cultMode.activate')}
          </Text>
          {entries.length === 0 ? (
            <Text
              style={[
                styles.activateHint,
                {color: theme.colors.textSecondary},
              ]}>
              {t('cultMode.cannotActivateEmpty')}
            </Text>
          ) : null}
        </View>
        <Switch
          value={isActive}
          onValueChange={v => toggleActive(v)}
          disabled={entries.length === 0}
        />
      </View>

      {entries.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={() => 'never'}
          renderItem={() => null}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.introText,
                  {color: theme.colors.textSecondary},
                ]}>
                {t('cultMode.intro')}
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  {color: theme.colors.textSecondary},
                ]}>
                {t('cultMode.emptyState')}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <DraggableFlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          onDragEnd={({from, to}) => {
            if (from !== to) reorderEntries(from, to);
          }}
          ListHeaderComponent={headerComponent}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={bibleModalVisible}
        animationType="slide"
        onRequestClose={() => setBibleModalVisible(false)}>
        <SafeAreaView
          style={{flex: 1, backgroundColor: theme.colors.backgroundPrimary}}>
          <BibleSelectionModal
            onClose={() => setBibleModalVisible(false)}
            onBibleSelect={handleBibleSelect}
          />
        </SafeAreaView>
      </Modal>

      <HymnSelectionModal
        visible={hymnModalVisible}
        hymns={hymns}
        currentCategory={null}
        currentNumber={null}
        onClose={() => setHymnModalVisible(false)}
        onHymnSelect={handleHymnSelect}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {color: '#FFFFFF', marginLeft: 8},
  backButton: {paddingHorizontal: 4},
  backButtonText: {color: '#FFFFFF', fontSize: 28, lineHeight: 30},
  activateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  activateLabel: {fontSize: 15, fontWeight: '600'},
  activateHint: {fontSize: 12, marginTop: 2, fontStyle: 'italic'},
  addSection: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8},
  addButtonsRow: {flexDirection: 'row', gap: 8},
  addButton: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  listContent: {paddingBottom: 24},
  itemContainer: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  itemActive: {opacity: 0.85},
  dragHandle: {paddingRight: 12},
  dragHandleText: {fontSize: 18},
  itemContent: {flex: 1},
  itemTitle: {fontSize: 16, fontWeight: '600', marginBottom: 4},
  itemType: {fontSize: 12, fontStyle: 'italic'},
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginLeft: 8,
  },
  removeButtonText: {fontSize: 22, fontWeight: '300', lineHeight: 24},
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {fontSize: 16, textAlign: 'center'},
});

export default CultModeScreen;

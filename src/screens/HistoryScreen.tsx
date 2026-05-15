import React from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBibleHistory, BibleHistoryItem } from '../hooks/useBibleHistory';
import { useHymnHistory, HymnHistoryItem } from '../hooks/useHymnHistory';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import {t} from '../i18n/strings';

type HistoryScreenRouteProp = RouteProp<RootStackParamList, 'History'>;
type HistoryNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type HistoryItem = BibleHistoryItem | HymnHistoryItem;

const HistoryScreen = () => {
  const route = useRoute<HistoryScreenRouteProp>();
  const navigation = useNavigation<HistoryNavigationProp>();
  const { mode } = route.params;
  const {
    history: bibleHistory,
    clearHistory: clearBibleHistory,
    removeItem: removeBibleItem,
  } = useBibleHistory();
  const {
    history: hymnHistory,
    clearHistory: clearHymnHistory,
    removeItem: removeHymnItem,
  } = useHymnHistory();
  const { theme } = useTheme();

  const history: HistoryItem[] = mode === 'bible' ? bibleHistory : hymnHistory;
  const clearHistoryFn = mode === 'bible' ? clearBibleHistory : clearHymnHistory;
  const removeItemFn = mode === 'bible' ? removeBibleItem : removeHymnItem;

  const handleClearHistory = () => {
    Alert.alert(
      t('history.clearTitle'),
      t('history.clearMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.clear'), 
          style: 'destructive',
          onPress: clearHistoryFn
        }
      ]
    );
  };

  const handlePress = (item: HistoryItem) => {
    if (mode === 'bible') {
      // id shape: "<book_id>-<chapter>-<verse_number>"
      // title shape: "<bookName> <chapter>:<verse_number>"
      const parts = item.id.split('-');
      if (parts.length < 3) {
        return;
      }
      const bookId = Number(parts[0]);
      const chapter = Number(parts[1]);
      const verseNumber = Number(parts[2]);
      if (
        !Number.isFinite(bookId) ||
        !Number.isFinite(chapter) ||
        !Number.isFinite(verseNumber)
      ) {
        return;
      }
      // Recover the book name from the title (strip trailing " C:V").
      const trailing = ` ${chapter}:${verseNumber}`;
      const bookName = item.title.endsWith(trailing)
        ? item.title.slice(0, -trailing.length)
        : item.title;

      navigation.navigate('Home', {
        mode: 'bible',
        selectedBook: { id: bookId, name: bookName },
        selectedChapter: chapter,
        selectedVerse: verseNumber,
      });
    } else {
      navigation.navigate('Home', {
        mode: 'hymnal',
        selectedHymnId: item.id,
      });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('mg-MG', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    return (
      <Pressable
        style={[styles.itemContainer, { backgroundColor: theme.colors.backgroundSecondary }]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
            {item.title}
          </Text>
          <Text style={[styles.itemDate, { color: theme.colors.textSecondary }]}>
            {formatDate(item.lastAccessed)}
          </Text>
        </View>
        <Pressable
          // Stop the parent row from receiving the press.
          onPress={() => removeItemFn(item.id)}
          hitSlop={8}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.remove')}
        >
          <Text style={styles.deleteIcon}>×</Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.navBackground }]}>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>
          {mode === 'bible' ? t('history.titleBible') : t('history.titleHymnal')}
        </Text>
        {history.length > 0 && (
          <Pressable
            style={[styles.clearButton, { backgroundColor: theme.colors.accentBlue }]}
            onPress={handleClearHistory}
          >
            <Text style={styles.clearButtonText}>{t('history.clearAll')}</Text>
          </Pressable>
        )}
      </View>
      
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {mode === 'bible' 
              ? t('history.emptyBible')
              : t('history.emptyHymnal')
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item: HistoryItem) => item.id}
          renderItem={renderHistoryItem}
          style={styles.list}
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 22,
    lineHeight: 22,
    color: '#9E9E9E',
    fontWeight: '400',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 14,
    lineHeight: 20,
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
});

export default HistoryScreen;

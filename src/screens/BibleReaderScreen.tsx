import React, {useEffect, useMemo, useState, useRef} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {t} from '../i18n/strings';
import {useBibleData} from '../hooks/useBibleData';
import {getBibleBookShortName} from '../utils/bibleBookNames';
import {useJesusName} from '../contexts/JesusNameContext';

type RouteParams = {
  bookId: number;
  bookName: string;
  chapter: number;
  verse?: number;
};

const BibleReaderScreen = () => {
  const route = useRoute();
  const {bookId, bookName, chapter, verse} = route.params as RouteParams;
  const {verses, loadVerses, isLoading} = useBibleData();
  const {transformText} = useJesusName();
  const [fontSize, setFontSize] = useState(16);
  const flatListRef = useRef<FlatList>(null);

  const scrollToVerse = (targetVerse: number) => {
    if (!flatListRef.current) {
      return;
    }

    const verseIndex = verses.findIndex(v => v.verse_number === targetVerse);
    if (verseIndex < 0) {
      return;
    }

    flatListRef.current.scrollToIndex({
      index: verseIndex,
      animated: true,
      viewPosition: 0.25,
    });
  };

  useEffect(() => {
    loadVerses(bookId, chapter);
  }, [bookId, chapter, loadVerses]);

  // Auto-scroll to selected verse when verses are loaded
  useEffect(() => {
    if (verses.length > 0 && typeof verse === 'number') {
      const timeoutId = setTimeout(() => scrollToVerse(verse), 120);
      return () => clearTimeout(timeoutId);
    }
  }, [verses, verse]);

  const title = useMemo(
    () => t('bible.readerTitle', {book: getBibleBookShortName(bookName, bookId), chapter}),
    [bookName, bookId, chapter]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.fontControls}>
          <Pressable
            style={styles.fontButton}
            onPress={() => setFontSize(size => Math.max(12, size - 2))}>
            <Text style={styles.fontButtonText}>A-</Text>
          </Pressable>
          <Pressable
            style={styles.fontButton}
            onPress={() => setFontSize(size => Math.min(26, size + 2))}>
            <Text style={styles.fontButtonText}>A+</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <Text style={styles.infoText}>{t('bible.loading')}</Text>
      ) : (
        <FlatList
          ref={flatListRef}
          data={verses}
          keyExtractor={item => `${item.book_id}-${item.chapter}-${item.verse_number}`}
          onScrollToIndexFailed={(info) => {
            // Retry after a short delay once the list has computed item measurements
            setTimeout(() => {
              if (typeof verse === 'number') {
                scrollToVerse(verse);
              } else {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.25,
                });
              }
            }, 200);
          }}
          renderItem={({item}) => (
            <Text style={[styles.verseText, {fontSize}]}> 
              {`${item.verse_number}. ${transformText(item.text)}`}
            </Text>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  fontControls: {
    flexDirection: 'row',
    gap: 8,
  },
  fontButton: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  fontButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verseText: {
    marginBottom: 12,
    color: '#1c1c1c',
    lineHeight: 22,
  },
  infoText: {
    fontSize: 14,
    color: '#6f6f6f',
  },
});

export default BibleReaderScreen;

import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {t} from '../i18n/strings';
import {useBibleData} from '../hooks/useBibleData';

type RouteParams = {
  bookId: number;
  bookName: string;
  chapter: number;
};

const BibleReaderScreen = () => {
  const route = useRoute();
  const {bookId, bookName, chapter} = route.params as RouteParams;
  const {verses, loadVerses, isLoading} = useBibleData();
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    loadVerses(bookId, chapter);
  }, [bookId, chapter, loadVerses]);

  const title = useMemo(
    () => t('bible.readerTitle', {book: bookName, chapter}),
    [bookName, chapter]
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
          data={verses}
          keyExtractor={item => `${item.book_id}-${item.chapter}-${item.verse_number}`}
          renderItem={({item}) => (
            <Text style={[styles.verseText, {fontSize}]}> 
              {`${item.verse_number}. ${item.text}`}
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

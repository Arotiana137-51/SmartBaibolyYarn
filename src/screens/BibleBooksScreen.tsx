import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, TextInput, FlatList, Pressable} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useBibleData} from '../hooks/useBibleData';
import {t} from '../i18n/strings';

type BibleStackParamList = {
  BibleBooks: undefined;
  BibleChapters: {bookId: number; bookName: string; chapters: number};
  BibleReader: {bookId: number; bookName: string; chapter: number};
};

type NavigationProp = NativeStackNavigationProp<BibleStackParamList, 'BibleBooks'>;

const BibleBooksScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const {books, isLoading} = useBibleData();
  const [query, setQuery] = useState('');

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return books;
    }
    return books.filter(book => book.name.toLowerCase().includes(normalizedQuery));
  }, [books, query]);

  const oldTestament = filteredBooks.filter(book => book.testament === 'old');
  const newTestament = filteredBooks.filter(book => book.testament === 'new');

  const renderBook = (book: {id: number; name: string; chapters: number}) => (
    <Pressable
      key={book.id}
      style={styles.bookItem}
      onPress={() =>
        navigation.navigate('BibleChapters', {
          bookId: book.id,
          bookName: book.name,
          chapters: book.chapters,
        })
      }>
      <Text style={styles.bookName}>{book.name}</Text>
      <Text style={styles.bookChapters}>{book.chapters}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('bible.booksTitle')}</Text>
      <TextInput
        style={styles.search}
        placeholder={t('bible.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      {isLoading ? (
        <Text style={styles.infoText}>{t('bible.loading')}</Text>
      ) : (
        <FlatList
          data={[
            {title: t('bible.oldTestament'), data: oldTestament},
            {title: t('bible.newTestament'), data: newTestament},
          ]}
          keyExtractor={item => item.title}
          renderItem={({item}) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              {item.data.length === 0 ? (
                <Text style={styles.infoText}>{t('bible.noResults')}</Text>
              ) : (
                item.data.map(renderBook)
              )}
            </View>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  search: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookName: {
    fontSize: 16,
    color: '#1c1c1c',
  },
  bookChapters: {
    fontSize: 14,
    color: '#6f6f6f',
  },
  infoText: {
    fontSize: 14,
    color: '#6f6f6f',
    paddingVertical: 8,
  },
});

export default BibleBooksScreen;

import React, {useMemo} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {t} from '../i18n/strings';

type BibleStackParamList = {
  BibleBooks: undefined;
  BibleChapters: {bookId: number; bookName: string; chapters: number};
  BibleReader: {bookId: number; bookName: string; chapter: number};
};

type NavigationProp = NativeStackNavigationProp<BibleStackParamList, 'BibleChapters'>;

type RouteParams = {
  bookId: number;
  bookName: string;
  chapters: number;
};

const BibleChaptersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const {bookId, bookName, chapters} = route.params as RouteParams;

  const chapterList = useMemo(
    () => Array.from({length: chapters}, (_, index) => index + 1),
    [chapters]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{`${bookName} - ${t('bible.chaptersTitle')}`}</Text>
      <FlatList
        data={chapterList}
        keyExtractor={item => `${bookId}-${item}`}
        renderItem={({item}) => (
          <Pressable
            style={styles.chapterItem}
            onPress={() =>
              navigation.navigate('BibleReader', {
                bookId,
                bookName,
                chapter: item,
              })
            }>
            <Text style={styles.chapterText}>{item}</Text>
          </Pressable>
        )}
      />
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  chapterItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chapterText: {
    fontSize: 16,
  },
});

export default BibleChaptersScreen;

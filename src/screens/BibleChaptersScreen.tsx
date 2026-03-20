import React, {useMemo} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {t} from '../i18n/strings';
import {getBibleBookShortName} from '../utils/bibleBookNames';
import {useTheme} from '../contexts/ThemeContext';

type BibleStackParamList = {
  BibleBooks: undefined;
  BibleChapters: {bookId: number; bookName: string; chapters: number};
  BibleReader: {bookId: number; bookName: string; chapter: number; verse?: number};
};

type NavigationProp = NativeStackNavigationProp<BibleStackParamList, 'BibleChapters'>;

type RouteParams = {
  bookId: number;
  bookName: string;
  chapters: number;
  verse?: number;
};

const BibleChaptersScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const {bookId, bookName, chapters, verse} = route.params as RouteParams;

  const chapterList = useMemo(
    () => Array.from({length: chapters}, (_, index) => index + 1),
    [chapters]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{`${getBibleBookShortName(bookName, bookId)} - ${t('bible.chaptersTitle')}`}</Text>
      <FlatList
        data={chapterList}
        keyExtractor={item => `${bookId}-${item}`}
        renderItem={({item}) => (
          <Pressable
            style={({pressed}) => [
              styles.chapterItem,
              { backgroundColor: theme.colors.backgroundSecondary },
              pressed && {
                backgroundColor: theme.colors.accentBlue + '20',
                elevation: 4,
                shadowOpacity: 0.12,
                transform: [{scale: 0.995}],
              },
            ]}
            android_ripple={{
              color: theme.colors.accentBlue + '40',
              borderless: false,
            }}
            onPress={() =>
              navigation.navigate('BibleReader', {
                bookId,
                bookName,
                chapter: item,
                verse,
              })
            }>
            <Text style={[styles.chapterText, { color: theme.colors.textPrimary }]}>{item}</Text>
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
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  chapterItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  chapterText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.25,
  },
});

export default BibleChaptersScreen;

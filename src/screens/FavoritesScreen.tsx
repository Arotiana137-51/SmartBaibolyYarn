import React from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFavorites } from '../hooks/useFavorites';
import { useHymnFavorites } from '../hooks/useHymnFavorites';
import { useTheme } from '../contexts/ThemeContext';
import {useJesusName} from '../contexts/JesusNameContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { TEXT_STYLES, scaleFontSize } from '../constants/Typography';
import { getBibleBookShortName } from '../utils/bibleBookNames';

type FavoritesScreenRouteProp = RouteProp<RootStackParamList, 'Favorites'>;
type FavoritesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FavoritesScreen = () => {
  const route = useRoute<FavoritesScreenRouteProp>();
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { mode } = route.params;
  const { favorites: bibleFavorites, removeFromFavorites: removeFromBibleFavorites } = useFavorites();
  const { favorites: hymnFavorites, removeFromFavorites: removeFromHymnFavorites } = useHymnFavorites();
  const { theme } = useTheme();
  const {transformText} = useJesusName();

  const favorites = mode === 'bible' ? bibleFavorites : hymnFavorites;
  const handleRemoveFromFavorites = mode === 'bible' ? removeFromBibleFavorites : removeFromHymnFavorites;

  const handleRemoveFavorite = (item: any) => {
    Alert.alert(
      'Retirer des favoris',
      'Voulez-vous vraiment retirer cet élément des favoris ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Retirer', 
          style: 'destructive',
          onPress: () => handleRemoveFromFavorites(item)
        }
      ]
    );
  };

  const handlePress = (item: any) => {
    if (mode === 'bible') {
      const bibleItem = item as any;
      navigation.navigate('Home', {
        mode: 'bible',
        selectedBook: { id: bibleItem.book_id, name: bibleItem.bookName },
        selectedChapter: bibleItem.chapter,
        selectedVerse: bibleItem.verse_number
      });
    } else {
      const hymnItem = item as any;
      navigation.navigate('Home', {
        mode: 'hymnal',
        selectedHymnId: hymnItem.id
      });
    }
  };

  const renderFavoriteItem = ({ item }: { item: any }) => {
    if (mode === 'bible') {
      const bibleItem = item as any;
      return (
        <View style={[styles.itemContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <Pressable style={styles.pressableContent} onPress={() => handlePress(item)}>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
                {getBibleBookShortName(bibleItem.bookName, bibleItem.book_id)} {bibleItem.chapter}:{bibleItem.verse_number}
              </Text>
              <Text style={[styles.itemText, { color: theme.colors.textSecondary }]}>
                {transformText(bibleItem.text).substring(0, 100)}...
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.removeButton, { backgroundColor: 'transparent' }]}
            onPress={() => handleRemoveFavorite(item)}
          >
            <Text style={[styles.removeButtonText, { color: theme.colors.textSecondary }]}>×</Text>
          </Pressable>
        </View>
      );
    } else {
      const hymnItem = item as any;
      return (
        <View style={[styles.itemContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <Pressable style={styles.pressableContent} onPress={() => handlePress(item)}>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
                {hymnItem.category ? `${hymnItem.category.toUpperCase()} ` : ''}Hymne {hymnItem.number}
              </Text>
              <Text style={[styles.itemText, { color: theme.colors.textSecondary }]}>
                {hymnItem.title}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.removeButton, { backgroundColor: 'transparent' }]}
            onPress={() => handleRemoveFavorite(item)}
          >
            <Text style={[styles.removeButtonText, { color: theme.colors.textSecondary }]}>×</Text>
          </Pressable>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.navBackground }]}>
        <Text style={[TEXT_STYLES.heading, { color: '#FFFFFF' }]}>
          {mode === 'bible' ? 'Favoris Bible' : 'Favoris Hymnes'}
        </Text>
      </View>
      
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {mode === 'bible' 
              ? 'Aucun verset biblique en favoris' 
              : 'Aucune hymne en favoris'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderFavoriteItem}
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
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  pressableContent: {
    flex: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 24,
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

export default FavoritesScreen;

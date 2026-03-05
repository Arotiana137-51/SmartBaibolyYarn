import React from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useFavorites } from '../hooks/useFavorites';
import { useHymnFavorites } from '../hooks/useHymnFavorites';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';
import { TEXT_STYLES, scaleFontSize } from '../constants/Typography';

type FavoritesScreenRouteProp = RouteProp<RootStackParamList, 'Favorites'>;

const FavoritesScreen = () => {
  const route = useRoute<FavoritesScreenRouteProp>();
  const { mode } = route.params;
  const { favorites: bibleFavorites, removeFromFavorites: removeFromBibleFavorites } = useFavorites();
  const { favorites: hymnFavorites, removeFromFavorites: removeFromHymnFavorites } = useHymnFavorites();
  const { theme } = useTheme();

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
    // Navigate back to item
    // This would need navigation implementation
    console.log('Navigate to:', item);
  };

  const renderFavoriteItem = ({ item }: { item: any }) => {
    if (mode === 'bible') {
      const bibleItem = item as any;
      return (
        <Pressable
          style={[styles.itemContainer, { backgroundColor: theme.colors.backgroundSecondary }]}
          onPress={() => handlePress(item)}
        >
          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
              {bibleItem.bookName} {bibleItem.chapter}:{bibleItem.verse_number}
            </Text>
            <Text style={[styles.itemText, { color: theme.colors.textSecondary }]}>
              {bibleItem.text.substring(0, 100)}...
            </Text>
          </View>
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemoveFavorite(item)}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </Pressable>
        </Pressable>
      );
    } else {
      const hymnItem = item as any;
      return (
        <Pressable
          style={[styles.itemContainer, { backgroundColor: theme.colors.backgroundSecondary }]}
          onPress={() => handlePress(item)}
        >
          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
              {hymnItem.category ? `${hymnItem.category.toUpperCase()} ` : ''}Hymne {hymnItem.number}
            </Text>
            <Text style={[styles.itemText, { color: theme.colors.textSecondary }]}>
              {hymnItem.title}
            </Text>
          </View>
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemoveFavorite(item)}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </Pressable>
        </Pressable>
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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

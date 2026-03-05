import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BibleVerse } from '../hooks/useBibleData';

export interface FavoriteVerse extends BibleVerse {
  bookName: string;
  addedAt: string;
}

const FAVORITES_KEY = 'favorites_verses';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from storage
  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored);
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a verse to favorites
  const addToFavorites = useCallback(async (verse: BibleVerse, bookName: string) => {
    try {
      const favoriteVerse: FavoriteVerse = {
        ...verse,
        bookName,
        addedAt: new Date().toISOString(),
      };

      setFavorites(prev => {
        // Check if verse is already in favorites
        const exists = prev.some(
          fav => 
            fav.book_id === verse.book_id && 
            fav.chapter === verse.chapter && 
            fav.verse_number === verse.verse_number
        );
        
        if (exists) {
          return prev; // Don't add if already exists
        }

        const updated = [...prev, favoriteVerse];
        // Save to storage
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }, []);

  // Remove a verse from favorites
  const removeFromFavorites = useCallback(async (verse: BibleVerse) => {
    try {
      setFavorites(prev => {
        const updated = prev.filter(
          fav => 
            !(fav.book_id === verse.book_id && 
              fav.chapter === verse.chapter && 
              fav.verse_number === verse.verse_number)
        );
        // Save to storage
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  }, []);

  // Check if a verse is in favorites
  const isFavorite = useCallback((verse: BibleVerse) => {
    return favorites.some(
      fav => 
        fav.book_id === verse.book_id && 
        fav.chapter === verse.chapter && 
        fav.verse_number === verse.verse_number
    );
  }, [favorites]);

  // Clear all favorites
  const clearFavorites = useCallback(async () => {
    try {
      setFavorites([]);
      await AsyncStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  }, []);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearFavorites,
    loadFavorites,
  };
};

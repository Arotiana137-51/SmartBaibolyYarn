import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Hymn } from '../hooks/useHymnsData';

export interface FavoriteHymn extends Hymn {
  addedAt: string;
}

const FAVORITES_KEY = 'favorites_hymns';

export const useHymnFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteHymn[]>([]);
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
      console.error('Error loading hymn favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a hymn to favorites
  const addToFavorites = useCallback(async (hymn: Hymn) => {
    try {
      const favoriteHymn: FavoriteHymn = {
        ...hymn,
        addedAt: new Date().toISOString(),
      };

      setFavorites(prev => {
        // Check if hymn is already in favorites
        const exists = prev.some(fav => fav.id === hymn.id);
        
        if (exists) {
          return prev; // Don't add if already exists
        }

        const updated = [...prev, favoriteHymn];
        // Save to storage
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error adding hymn to favorites:', error);
    }
  }, []);

  // Remove a hymn from favorites
  const removeFromFavorites = useCallback(async (hymn: Hymn) => {
    try {
      setFavorites(prev => {
        const updated = prev.filter(fav => fav.id !== hymn.id);
        // Save to storage
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error removing hymn from favorites:', error);
    }
  }, []);

  // Check if a hymn is in favorites
  const isFavorite = useCallback((hymn: Hymn) => {
    return favorites.some(fav => fav.id === hymn.id);
  }, [favorites]);

  // Clear all favorites
  const clearFavorites = useCallback(async () => {
    try {
      setFavorites([]);
      await AsyncStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Error clearing hymn favorites:', error);
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

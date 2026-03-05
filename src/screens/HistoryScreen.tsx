import React from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useBibleHistory } from '../hooks/useBibleHistory';
import { useHymnHistory } from '../hooks/useHymnHistory';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type HistoryScreenRouteProp = RouteProp<RootStackParamList, 'History'>;

const HistoryScreen = () => {
  const route = useRoute<HistoryScreenRouteProp>();
  const { mode } = route.params;
  const { history: bibleHistory, clearHistory: clearBibleHistory } = useBibleHistory();
  const { history: hymnHistory, clearHistory: clearHymnHistory } = useHymnHistory();
  const { theme } = useTheme();

  const history = mode === 'bible' ? bibleHistory : hymnHistory;
  const clearHistoryFn = mode === 'bible' ? clearBibleHistory : clearHymnHistory;

  const handleClearHistory = () => {
    Alert.alert(
      'Effacer l\'historique',
      'Voulez-vous vraiment effacer tout l\'historique ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive',
          onPress: clearHistoryFn
        }
      ]
    );
  };

  const handlePress = (item: any) => {
    // Navigate back to the item
    console.log('Navigate to:', item);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
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
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {mode === 'bible' ? 'Historique Bible' : 'Historique Hymnes'}
        </Text>
        {history.length > 0 && (
          <Pressable
            style={[styles.clearButton, { backgroundColor: theme.colors.accentBlue }]}
            onPress={handleClearHistory}
          >
            <Text style={styles.clearButtonText}>Effacer tout</Text>
          </Pressable>
        )}
      </View>
      
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {mode === 'bible' 
              ? 'Aucun historique biblique' 
              : 'Aucun historique de hymnes'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item: any) => item.id}
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
  },
  itemContent: {
    flex: 1,
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

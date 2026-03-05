import React from 'react';
import { Pressable, Text, View, StyleSheet, Modal } from 'react-native';
import { Hymn } from '../hooks/useHymnsData';
import { useTheme } from '../contexts/ThemeContext';

interface HymnActionPopoverProps {
  visible: boolean;
  hymn: Hymn | null;
  onClose: () => void;
  onAddToFavorites: (hymn: Hymn) => void;
}

const HymnActionPopover: React.FC<HymnActionPopoverProps> = ({
  visible,
  hymn,
  onClose,
  onAddToFavorites,
}) => {
  const { theme } = useTheme();

  if (!hymn) return null;

  const handleAddToFavorites = () => {
    onAddToFavorites(hymn);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.popoverContainer, { backgroundColor: theme.colors.backgroundSecondary }]}
          onPress={() => {}}
        >
          <View style={styles.popoverHeader}>
            <Text style={[styles.hymnTitle, { color: theme.colors.textPrimary }]}>
              {hymn.title}
            </Text>
            <Text style={[styles.hymnReference, { color: theme.colors.textSecondary }]}>
              {hymn.category ? `${hymn.category.toUpperCase()} ` : ''}Hymne {hymn.number}
            </Text>
          </View>
          
          <View style={styles.menuItems}>
            <Pressable
              style={styles.menuItem}
              onPress={handleAddToFavorites}
            >
              <Text style={[styles.menuItemText, { color: theme.colors.textPrimary }]}>
                Ajouter aux favoris
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popoverContainer: {
    borderRadius: 12,
    padding: 16,
    minWidth: 280,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popoverHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  hymnTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  hymnReference: {
    fontSize: 14,
    textAlign: 'center',
  },
  menuItems: {
    marginTop: 4,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  menuItemText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HymnActionPopover;

// src/components/HymnSelectionModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Hymn {
  id: string;
  number: number;
  category?: string;
  title: string;
  authors: string[];
}

interface HymnSelectionModalProps {
  visible: boolean;
  hymns: Hymn[];
  currentCategory: string | null;
  currentNumber: number | null;
  onClose: () => void;
  onHymnSelect: (hymnId: string, category: string, number: number) => void;
}

const CATEGORIES = [
  { key: 'ffpm', label: 'Fihirana' },
  { key: 'antema', label: 'Antema' },
  { key: 'ff', label: 'F. Fanampiny' },
];

const HymnSelectionModal: React.FC<HymnSelectionModalProps> = ({
  visible,
  hymns,
  currentCategory,
  currentNumber,
  onClose,
  onHymnSelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory || 'ffpm');
  const [inputNumber, setInputNumber] = useState<string>(currentNumber?.toString() || '');
  const insets = useSafeAreaInsets();

  const filteredHymns = hymns.filter(hymn => hymn.category === selectedCategory);

  const handleNumberInput = (num: string) => {
    if (inputNumber.length < 4) {
      setInputNumber(inputNumber + num);
    }
  };

  const handleBackspace = () => {
    setInputNumber(inputNumber.slice(0, -1));
  };

  const handleClear = () => {
    setInputNumber('');
  };

  const handleOk = () => {
    const number = parseInt(inputNumber);
    if (number && number > 0) {
      const hymn = filteredHymns.find(h => h.number === number);
      if (hymn) {
        onHymnSelect(hymn.id, selectedCategory, number);
        onClose();
      }
    }
  };

  const handleHymnPress = (hymn: Hymn) => {
    onHymnSelect(hymn.id, selectedCategory, hymn.number);
    onClose();
  };

  const renderKeypad = () => {
    const buttons = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['⌫', '0', '✓'],
    ];

    return (
      <View style={styles.keypadContainer}>
        {buttons.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((button) => (
              <TouchableOpacity
                key={button}
                style={[
                  styles.keypadButton,
                  button === '✓' && styles.okButton,
                  button === '⌫' && styles.backspaceButton,
                ]}
                onPress={() => {
                  if (button === '✓') handleOk();
                  else if (button === '⌫') handleBackspace();
                  else handleNumberInput(button);
                }}
              >
                <Text style={[
                  styles.keypadText,
                  (button === '✓' || button === '⌫') && styles.keypadSpecialText
                ]}>
                  {button}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalContainer, { paddingTop: insets.top }]} onPress={() => {}}>
          {/* Category Tabs */}
          <View style={styles.categoryTabs}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.key && styles.activeCategoryTab,
                ]}
                onPress={() => {
                  setSelectedCategory(category.key);
                  setInputNumber('');
                }}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category.key && styles.activeCategoryTabText,
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hymn List */}
          <ScrollView style={styles.hymnListContainer}>
            <View style={styles.hymnList}>
              {filteredHymns.map((hymn) => (
                <TouchableOpacity
                  key={hymn.id}
                  style={[
                    styles.hymnItem,
                    hymn.number === currentNumber && selectedCategory === currentCategory && styles.currentHymnItem,
                  ]}
                  onPress={() => handleHymnPress(hymn)}
                >
                  <Text style={styles.hymnNumber}>{hymn.number}</Text>
                  <Text style={styles.hymnTitle} numberOfLines={1}>
                    {hymn.title || 'Tsy lohateny'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Number Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputField} onPress={() => {}}>
              <Text style={styles.inputText}>
                {inputNumber || 'Safidio ny laharana'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Fafao</Text>
            </TouchableOpacity>
          </View>

          {/* Numeric Keypad */}
          {renderKeypad()}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryTabs: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeCategoryTab: {
    backgroundColor: '#2196F3',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  activeCategoryTabText: {
    color: 'white',
  },
  hymnListContainer: {
    flex: 1,
  },
  hymnList: {
    padding: 8,
  },
  hymnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentHymnItem: {
    backgroundColor: '#e3f2fd',
  },
  hymnNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  hymnTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inputText: {
    fontSize: 18,
    color: '#333',
  },
  clearButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    backgroundColor: '#ff5252',
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  keypadContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  keypadButton: {
    width: 90,
    height: 90,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  okButton: {
    backgroundColor: '#4CAF50',
  },
  backspaceButton: {
    backgroundColor: '#ff5252',
  },
  keypadText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  keypadSpecialText: {
    fontSize: 20,
  },
});

export default HymnSelectionModal;

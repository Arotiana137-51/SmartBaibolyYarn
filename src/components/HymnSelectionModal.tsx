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
  
  // Check if current category should show titles (only F. Fanampiny)
  const shouldShowTitles = selectedCategory === 'ff';

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
      ['0', 'OK'],
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
                  button === 'OK' && styles.okButton,
                  button === 'OK' && styles.doubleWidthButton,
                ]}
                onPress={() => {
                  if (button === 'OK') handleOk();
                  else handleNumberInput(button);
                }}
              >
                <Text style={[
                  styles.keypadText,
                  button === 'OK' && styles.keypadSpecialText
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalContainer, { paddingTop: insets.top }]} onPress={() => {}}>
          {/* Category Tabs - Now at top like navigation */}
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

          {/* Hymn List - REMOVED */}

          {/* Number Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputField} onPress={() => {}}>
              <Text style={styles.inputText}>
                {inputNumber || 'Safidio ny laharana'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backspaceButton} onPress={handleBackspace}>
              <Text style={styles.backspaceIcon}>⌫</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    height: 'auto',
    maxHeight: '80%',
    backgroundColor: 'rgba(44, 62, 80, 0.98)',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 60,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryTabs: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  categoryTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeCategoryTab: {
    backgroundColor: '#34495e',
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ecf0f1',
  },
  activeCategoryTabText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  hymnListContainer: {
    maxHeight: 300,
    backgroundColor: 'rgba(44, 62, 80, 0.95)',
    marginHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  hymnList: {
    padding: 8,
  },
  hymnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 73, 94, 0.5)',
  },
  currentHymnItem: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
  },
  hymnNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  hymnTitle: {
    flex: 1,
    fontSize: 16,
    color: '#ecf0f1',
    marginLeft: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#34495e',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  inputField: {
    flex: 2,
    height: 50,
    backgroundColor: 'rgba(52, 73, 94, 0.8)',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.5)',
  },
  inputText: {
    fontSize: 18,
    color: '#ecf0f1',
  },
  backspaceButton: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(52, 73, 94, 0.8)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.5)',
  },
  backspaceIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  keypadContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  keypadButton: {
    width: 80,
    height: 80,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  okButton: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  doubleWidthButton: {
    flexGrow: 1,
    width: 'auto',
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

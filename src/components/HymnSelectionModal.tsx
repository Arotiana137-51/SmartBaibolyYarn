// src/components/HymnSelectionModal.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hymn } from '../hooks/useHymnsData';

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

const CATEGORY_MAX: Record<string, number> = {
  ffpm: 827,
  ff: 54,
  antema: 24,
};

const HymnSelectionModal: React.FC<HymnSelectionModalProps> = ({
  visible,
  hymns,
  currentCategory,
  currentNumber,
  onClose,
  onHymnSelect,
 }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory || 'ffpm');
  const [inputNumber, setInputNumber] = useState<string>('');

  const maxNumber = CATEGORY_MAX[selectedCategory] ?? 9999;
  const maxDigits = String(maxNumber).length;

  const keypadWidth = useMemo(() => {
    return Math.min(320, Math.floor(windowWidth * 0.75));
  }, [windowWidth]);

  const keypadButtonSize = useMemo(() => {
    const base = Math.min(80, Math.floor(windowWidth * 0.22));
    return Math.max(52, Math.floor(base * 0.8));
  }, [windowWidth]);

  const filteredHymns = useMemo(() => {
    return hymns
      .filter(hymn => hymn.category === selectedCategory)
      .sort((a, b) => a.number - b.number);
  }, [hymns, selectedCategory]);

  const currentHymn = useMemo(() => {
    return filteredHymns.find(h => h.number === currentNumber);
  }, [filteredHymns, currentNumber]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setInputNumber('');
  }, []);

  const handleNumberInput = useCallback((num: string) => {
    setInputNumber(prev => {
      if (prev.length >= maxDigits) {
        return prev;
      }

      const next = prev + num;
      const nextValue = parseInt(next, 10);
      if (!Number.isNaN(nextValue) && nextValue > maxNumber) {
        return prev;
      }

      return next;
    });
  }, [maxDigits, maxNumber]);

  const handleBackspace = useCallback(() => {
    setInputNumber(prev => prev.slice(0, -1));
  }, []);

  const handleOk = useCallback(() => {
    const number = parseInt(inputNumber, 10);
    if (Number.isNaN(number) || number <= 0) {
      return;
    }

    if (number > maxNumber) {
      Alert.alert('Tsy mety', `Tsy maintsy latsaky na mitovy amin'ny ${maxNumber} ny laharana.`);
      return;
    }

    const hymn = filteredHymns.find(h => h.number === number);
    if (!hymn) {
      Alert.alert('Tsy hita', `Tsy misy hira laharana ${number} amin'ity sokajy ity.`);
      return;
    }

    onHymnSelect(hymn.id, hymn.category || '', hymn.number);
    onClose();
  }, [inputNumber, filteredHymns, maxNumber, onHymnSelect, onClose]);

  const handleClose = useCallback(() => {
    setInputNumber('');
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (!visible) {
      setInputNumber('');
    }
  }, [visible]);

  const renderKeypad = () => {
    const buttons = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['0', 'OK'],
    ];

    return (
      <View style={[styles.keypadContainer, { width: keypadWidth }]}>
        {buttons.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((button) => (
              <Pressable
                key={button}
                style={[
                  styles.keypadButton,
                  { height: keypadButtonSize, borderRadius: Math.max(8, Math.floor(keypadButtonSize * 0.12)) },
                  button === 'OK' && styles.okButton,
                  button === 'OK' && styles.doubleWidthButton,
                ]}
                onPress={() => {
                  if (button === 'OK') handleOk();
                  else handleNumberInput(button);
                }}
              >
                <Text
                  style={[
                    styles.keypadText,
                    button === 'OK' && styles.keypadSpecialText,
                  ]}
                >
                  {button}
                </Text>
              </Pressable>
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
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={handleClose}>
        <View style={styles.modalContent} pointerEvents="box-none">
          <View style={[styles.categoryTabs, { paddingTop: insets.top }]}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category.key}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.key && styles.activeCategoryTab,
                ]}
                onPress={() => handleCategoryChange(category.key)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category.key && styles.activeCategoryTabText,
                  ]}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.keypadPanel, { paddingTop: insets.top + 56 + 16 }]} pointerEvents="box-none">
            <Pressable style={styles.keypadCard} onPress={() => {}}>
              <View style={[styles.inputContainer, { width: keypadWidth }]}>
                <View style={styles.inputField}>
                  <Text style={styles.inputText}>
                    {inputNumber || (currentHymn ? currentHymn.number.toString() : '')}
                  </Text>
                </View>
                <Pressable style={styles.backspaceButton} onPress={handleBackspace}>
                  <Text style={styles.backspaceIcon}>⌫</Text>
                </Pressable>
              </View>

              {renderKeypad()}
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
 };

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    flex: 1,
  },
  categoryTabs: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#1976D2',
  },
  categoryTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.4)',
  },
  activeCategoryTab: {
    backgroundColor: '#1565C0',
  },
  categoryTabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeCategoryTabText: {
    color: '#FFFFFF',
  },
  keypadPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  keypadCard: {
    alignItems: 'center',
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
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  inputField: {
    flex: 1,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: 'rgba(25, 118, 210, 0.35)',
  },
  inputText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
  },
  backspaceButton: {
    width: 86,
    height: 56,
    backgroundColor: '#1976D2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  backspaceIcon: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  keypadContainer: {
    alignItems: 'center',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  keypadButton: {
    flex: 1,
    height: 80,
    backgroundColor: '#1976D2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(25, 118, 210, 0.55)',
  },
  doubleWidthButton: {
    flex: 2,
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

// src/components/HymnSelectionModalOptimized.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Hymn } from '../hooks/useHymnsData';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Constants for design
const TAB_HEIGHT = 56;
const KEYPAD_BUTTON_SIZE = 96;
const KEYPAD_SPACING = 12;
const KEYPAD_HEIGHT = KEYPAD_BUTTON_SIZE * 4 + KEYPAD_SPACING * 3;
const INPUT_FIELD_HEIGHT = 60;

// Memoized category tabs component
const CategoryTabs = memo(({ 
  selectedCategory, 
  onCategoryChange 
}: { 
  selectedCategory: string; 
  onCategoryChange: (category: string) => void;
}) => {
  const categories = [
    { key: 'ffpm', label: 'Fihirana' },
    { key: 'antema', label: 'Antema' },
    { key: 'ff', label: 'F. Fanampiny' }
  ];

  return (
    <View style={styles.tabsContainer}>
      {categories.map((category) => (
        <Pressable
          key={category.key}
          style={[
            styles.tab,
            selectedCategory === category.key && styles.activeTab
          ]}
          onPress={() => onCategoryChange(category.key)}
        >
          <Text style={[
            styles.tabText,
            selectedCategory === category.key && styles.activeTabText
          ]}>
            {category.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

// Memoized keypad button component
const KeypadButton = memo(({ 
  onPress, 
  text, 
  isSpecial = false 
}: { 
  onPress: () => void; 
  text: string; 
  isSpecial?: boolean;
}) => (
  <Pressable style={styles.keypadButton} onPress={onPress}>
    <Text style={styles.keypadButtonText}>{text}</Text>
  </Pressable>
));

// Memoized numeric keypad component
const NumericKeypad = memo(({ 
  onNumberPress, 
  onBackspace, 
  onOk 
}: { 
  onNumberPress: (num: string) => void; 
  onBackspace: () => void; 
  onOk: () => void;
}) => {
  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['x', '0', 'OK']
  ];

  return (
    <View style={styles.keypadContainer}>
      {buttons.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keypadRow}>
          {row.map((button) => {
            if (button === 'x') {
              return (
                <KeypadButton
                  key="backspace"
                  onPress={onBackspace}
                  text="x"
                  isSpecial={true}
                />
              );
            } else if (button === 'OK') {
              return (
                <KeypadButton
                  key="ok"
                  onPress={onOk}
                  text="OK"
                  isSpecial={true}
                />
              );
            } else {
              return (
                <KeypadButton
                  key={button}
                  onPress={() => onNumberPress(button)}
                  text={button}
                />
              );
            }
          })}
        </View>
      ))}
    </View>
  );
});

// Memoized hymn list component
const HymnList = memo(({ 
  hymns, 
  onHymnPress, 
  currentNumber 
}: { 
  hymns: Hymn[]; 
  onHymnPress: (hymn: Hymn) => void; 
  currentNumber: number | null;
}) => (
  <ScrollView style={styles.hymnListContainer}>
    {hymns.map((hymn) => (
      <Pressable
        key={hymn.id}
        style={[
          styles.hymnItem,
          currentNumber === hymn.number && styles.currentHymnItem
        ]}
        onPress={() => onHymnPress(hymn)}
      >
        <Text style={[
          styles.hymnItemText,
          currentNumber === hymn.number && styles.currentHymnItemText
        ]}>
          {hymn.number}. {hymn.title || `Hira ${hymn.number}`}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
));

interface HymnSelectionModalOptimizedProps {
  visible: boolean;
  hymns: Hymn[];
  currentCategory: string | null;
  currentNumber: number | null;
  onClose: () => void;
  onHymnSelect: (hymnId: string, category: string, number: number) => void;
}

const HymnSelectionModalOptimized: React.FC<HymnSelectionModalOptimizedProps> = ({
  visible,
  hymns,
  currentCategory,
  currentNumber,
  onClose,
  onHymnSelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'ffpm');
  const [inputNumber, setInputNumber] = useState('');

  // Memoize filtered hymns by category
  const filteredHymns = useMemo(() => {
    return hymns
      .filter(hymn => hymn.category === selectedCategory)
      .sort((a, b) => a.number - b.number);
  }, [hymns, selectedCategory]);

  // Memoize current hymn
  const currentHymn = useMemo(() => {
    return filteredHymns.find(h => h.number === currentNumber);
  }, [filteredHymns, currentNumber]);

  // Optimized handlers with useCallback
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setInputNumber('');
  }, []);

  const handleNumberPress = useCallback((num: string) => {
    setInputNumber(prev => prev + num);
  }, []);

  const handleBackspace = useCallback(() => {
    setInputNumber(prev => prev.slice(0, -1));
  }, []);

  const handleOk = useCallback(() => {
    const number = parseInt(inputNumber);
    if (!isNaN(number) && number > 0) {
      const hymn = filteredHymns.find(h => h.number === number);
      if (hymn) {
        onHymnSelect(hymn.id, hymn.category || '', hymn.number);
        onClose();
      }
    }
  }, [inputNumber, filteredHymns, onHymnSelect, onClose]);

  const handleHymnPress = useCallback((hymn: Hymn) => {
    onHymnSelect(hymn.id, hymn.category || '', hymn.number);
    onClose();
  }, [onHymnSelect, onClose]);

  const handleClose = useCallback(() => {
    setInputNumber('');
    onClose();
  }, [onClose]);

  // Reset input when modal closes
  React.useEffect(() => {
    if (!visible) {
      setInputNumber('');
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        {/* Blurred background with hymn content */}
        <View style={styles.blurContainer}>
          <HymnList
            hymns={filteredHymns}
            onHymnPress={handleHymnPress}
            currentNumber={currentNumber}
          />
        </View>

        {/* Input field */}
        <View style={styles.inputFieldContainer}>
          <Text style={styles.inputFieldText}>
            {inputNumber || (currentHymn ? currentHymn.number.toString() : '')}
          </Text>
        </View>

        {/* Numeric keypad */}
        <View style={styles.keypadOverlay}>
          <NumericKeypad
            onNumberPress={handleNumberPress}
            onBackspace={handleBackspace}
            onOk={handleOk}
          />
        </View>

        {/* Category tabs */}
        <View style={styles.tabsOverlay}>
          <CategoryTabs
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  blurContainer: {
    flex: 1,
    marginBottom: KEYPAD_HEIGHT + INPUT_FIELD_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TAB_HEIGHT,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 2,
    borderBottomColor: '#1976D2',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  activeTabText: {
    color: '#1976D2',
    fontWeight: '700',
  },
  hymnListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: TAB_HEIGHT + 16,
  },
  hymnItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  currentHymnItem: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  hymnItemText: {
    fontSize: 16,
    color: '#212121',
    lineHeight: 22,
  },
  currentHymnItemText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  inputFieldContainer: {
    position: 'absolute',
    bottom: KEYPAD_HEIGHT,
    left: 16,
    right: 16,
    height: INPUT_FIELD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputFieldText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  keypadOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: KEYPAD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  keypadContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: KEYPAD_SPACING,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadButton: {
    width: KEYPAD_BUTTON_SIZE,
    height: KEYPAD_BUTTON_SIZE,
    backgroundColor: '#1976D2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HymnSelectionModalOptimized;

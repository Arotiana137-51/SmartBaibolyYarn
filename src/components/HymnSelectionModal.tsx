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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hymn } from '../hooks/useHymnsData';
import { useTheme } from '../contexts/ThemeContext';

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

const TAB_ROW_HEIGHT = 60;

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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const tabsTopInset = Platform.OS === 'ios' ? insets.top : 0;
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
                style={({pressed}) => [
                  styles.keypadButton,
                  { 
                    height: keypadButtonSize, 
                    borderRadius: Math.max(8, Math.floor(keypadButtonSize * 0.12)),
                    backgroundColor: theme.colors.navBackground,
                  },
                  button === 'OK' && { backgroundColor: theme.colors.accentBlue },
                  button === 'OK' && styles.doubleWidthButton,
                  pressed && { opacity: 0.8 },
                ]}
                android_ripple={{
                  color: theme.colors.accentBlue + '40',
                  borderless: true,
                }}
                onPress={() => {
                  if (button === 'OK') handleOk();
                  else handleNumberInput(button);
                }}
              >
                <Text
                  style={[
                    styles.keypadText,
                    { color: '#FFFFFF' },
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
      <Pressable style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.15)' }]} onPress={handleClose}>
        <View style={styles.modalContent} pointerEvents="box-none">
          <View style={[styles.categoryTabsSafeArea, { paddingTop: tabsTopInset, backgroundColor: theme.colors.navBackground }]}>
            <View style={styles.categoryTabsRow}>
              {CATEGORIES.map((category) => (
                <Pressable
                  key={category.key}
                  style={({pressed}) => [
                    styles.categoryTab,
                    { borderRightColor: 'rgba(255,255,255,0.4)' },
                    selectedCategory === category.key && { backgroundColor: theme.colors.accentBlue },
                    pressed && { opacity: 0.9 },
                  ]}
                  android_ripple={{
                    color: theme.colors.accentBlue + '40',
                    borderless: true,
                  }}
                  onPress={() => handleCategoryChange(category.key)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      { color: '#FFFFFF' },
                    ]}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.keypadPanel, { top: tabsTopInset + TAB_ROW_HEIGHT }]} pointerEvents="box-none">
            <Pressable style={styles.keypadCard} onPress={() => {}}>
              <View style={[styles.inputContainer, { width: keypadWidth }]}>
                <View style={[
                  styles.inputField, 
                  { 
                    marginRight: Math.max(8, Math.floor(keypadButtonSize * 0.12)),
                    backgroundColor: theme.colors.backgroundPrimary,
                    borderColor: theme.colors.divider,
                  }
                ]}>
                  <Text style={[styles.inputText, { color: theme.colors.textPrimary }]}>
                    {inputNumber}
                  </Text>
                </View>
                <Pressable
                  style={({pressed}) => [
                    styles.backspaceButton,
                    {
                      width: Math.round(keypadButtonSize * 1.3),
                      height: keypadButtonSize,
                      backgroundColor: theme.colors.accentBlue,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  android_ripple={{
                    color: theme.colors.accentBlue + '40',
                    borderless: true,
                  }}
                  onPress={handleBackspace}
                >
                  <Text style={[styles.backspaceIcon, { color: '#FFFFFF' }]}>⌫</Text>
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
    justifyContent: 'flex-start',
  },
  modalContent: {
    flex: 1,
  },
  categoryTabsSafeArea: {
    // backgroundColor set dynamically via theme
  },
  categoryTabsRow: {
    flexDirection: 'row',
    height: TAB_ROW_HEIGHT,
  },
  categoryTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    // borderRightColor and backgroundColor set dynamically
  },
  categoryTabText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  keypadPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: TAB_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadCard: {
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  inputField: {
    flexGrow: 0,
    flexShrink: 1,
    width: '55%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  inputText: {
    fontSize: 22,
    fontWeight: '700',
  },
  backspaceButton: {
    width: 100,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  backspaceIcon: {
    fontSize: 28,
    fontWeight: '900',
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
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  doubleWidthButton: {
    flex: 2,
  },
  keypadText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  keypadSpecialText: {
    fontSize: 20,
  },
});

export default HymnSelectionModal;

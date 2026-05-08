import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

export interface SearchToggleOption<T extends string> {
  key: T;
  label: string;
}

interface SearchToggleBarProps<T extends string> {
  options: ReadonlyArray<SearchToggleOption<T>>;
  selected: T;
  onChange: (key: T) => void;
}

function SearchToggleBarInner<T extends string>({
  options,
  selected,
  onChange,
}: SearchToggleBarProps<T>) {
  const {theme} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.backgroundSecondary,
          borderColor: theme.colors.divider,
        },
      ]}
    >
      {options.map(option => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            android_ripple={{color: theme.colors.accentBlue + '40', borderless: false}}
            style={[
              styles.button,
              {
                backgroundColor: active ? theme.colors.accentBlue : 'transparent',
                elevation: active ? 3 : 0,
                shadowColor: active ? '#000' : undefined,
                shadowOffset: active ? {width: 0, height: 2} : undefined,
                shadowOpacity: active ? 0.15 : 0,
                shadowRadius: active ? 4 : 0,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                {color: active ? '#FFFFFF' : theme.colors.textSecondary},
                active && {fontWeight: '600'},
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 28,
    padding: 4,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  button: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

const SearchToggleBar = React.memo(SearchToggleBarInner) as typeof SearchToggleBarInner;

export default SearchToggleBar;

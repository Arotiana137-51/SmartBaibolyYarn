import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {t} from '../i18n/strings';
import {useTheme} from '../contexts/ThemeContext';
import MainScreen from '../screens/MainScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SearchScreen from '../screens/SearchScreen';
import VerseListScreen from '../screens/VerseListScreen';
import MiscScreen from '../screens/MiscScreen';
import AboutScreen from '../screens/AboutScreen';

export type RootStackParamList = {
  Home:
    | {
        mode?: 'bible' | 'hymnal';
        selectedBook?: { id: number; name: string };
        selectedChapter?: number;
        selectedVerse?: number;
        selectedHymnId?: string;
      }
    | undefined;
  Favorites: { mode: 'bible' | 'hymnal' };
  History: { mode: 'bible' | 'hymnal' };
  Search: { mode: 'bible' | 'hymnal' };
  VerseList: { bookId: number; bookName: string; query: string };
  Misc: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const {theme} = useTheme();

  const headerOptions = {
    headerStyle: {backgroundColor: theme.colors.navBackground},
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {color: '#FFFFFF'},
  } as const;

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={MainScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{title: t('menu.favorites'), ...headerOptions}}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{title: t('menu.history'), ...headerOptions}}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={({route}) => ({
          title: route.params.mode === 'bible' ? 'Recherche Bible' : 'Recherche Fihirana',
          ...headerOptions,
        })}
      />
      <Stack.Screen
        name="VerseList"
        component={VerseListScreen}
        options={{title: 'Résultats de recherche'}}
      />
      <Stack.Screen
        name="Misc"
        component={MiscScreen}
        options={{title: t('menu.misc')}}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{title: t('menu.about')}}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;

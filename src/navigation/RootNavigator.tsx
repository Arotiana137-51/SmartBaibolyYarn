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
import FanekemDetailsScreen from '../screens/FanekemDetailsScreen';
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
  VerseList: { bookId: number; bookName: string; query: string; matchWholeWord?: boolean };
  Misc: undefined;
  FanekemDetails: {title: string; content: string};
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const {theme} = useTheme();

  const headerOptions = {
    headerStyle: {backgroundColor: theme.colors.navBackground},
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.15,
    },
    headerBackTitleVisible: false,
    headerShadowVisible: true,
    statusBarColor: theme.colors.navBackground,
    statusBarStyle: 'light',
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
        options={{title: 'Résultats de recherche', ...headerOptions}}
      />
      <Stack.Screen
        name="Misc"
        component={MiscScreen}
        options={{title: t('menu.misc'), ...headerOptions}}
      />
      <Stack.Screen
        name="FanekemDetails"
        component={FanekemDetailsScreen}
        options={({route}) => ({
          title: route.params.title,
          ...headerOptions,
        })}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{title: t('menu.about'), ...headerOptions}}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;

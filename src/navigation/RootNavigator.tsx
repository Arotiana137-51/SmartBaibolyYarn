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
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import PersonalizationScreen from '../screens/PersonalizationScreen';
import CultModeScreen from '../screens/CultModeScreen';
import DevotionalScreen from '../screens/DevotionalScreen';

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
  PrivacyPolicy: {mandatory?: boolean} | undefined;
  Personalization: {firstRun?: boolean} | undefined;
  CultMode: undefined;
  Devotional: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  initialRouteName?: keyof RootStackParamList;
  privacyPolicyMandatory?: boolean;
};

const RootNavigator = ({
  initialRouteName,
  privacyPolicyMandatory,
}: RootNavigatorProps) => {
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
    <Stack.Navigator initialRouteName={initialRouteName}>
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
          title: route.params.mode === 'bible' ? t('search.titleBible') : t('search.titleHymnal'),
          ...headerOptions,
        })}
      />
      <Stack.Screen
        name="VerseList"
        component={VerseListScreen}
        options={{title: t('verseList.title'), ...headerOptions}}
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
      <Stack.Screen
        name="Personalization"
        component={PersonalizationScreen}
        options={{title: t('personalization.title'), ...headerOptions}}
      />
      <Stack.Screen
        name="CultMode"
        component={CultModeScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Devotional"
        component={DevotionalScreen}
        options={{
          // Header chrome only — the screen sets its own (empty) title and
          // close-button affordance via setOptions. Devotional content is
          // its own visual identity; a "Fampahatsiarovana" header label
          // would compete with the M3 hero card.
          title: '',
          ...headerOptions,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        initialParams={
          privacyPolicyMandatory
            ? {
                mandatory: true,
              }
            : undefined
        }
        options={{title: t('about.privacyPolicy'), ...headerOptions}}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {t} from '../i18n/strings';
import MainScreen from '../screens/MainScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SearchScreen from '../screens/SearchScreen';
import MiscScreen from '../screens/MiscScreen';
import AboutScreen from '../screens/AboutScreen';

export type RootStackParamList = {
  Home: undefined;
  Favorites: { mode: 'bible' | 'hymnal' };
  History: { mode: 'bible' | 'hymnal' };
  Search: undefined;
  Misc: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
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
        options={{title: t('menu.favorites')}}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{title: t('menu.history')}}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{title: t('menu.search')}}
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

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import BibleBooksScreen from '../screens/BibleBooksScreen';
import BibleChaptersScreen from '../screens/BibleChaptersScreen';
import BibleReaderScreen from '../screens/BibleReaderScreen';
import HymnsHomeScreen from '../screens/HymnsHomeScreen';
import {t} from '../i18n/strings';

type BibleStackParamList = {
  BibleBooks: undefined;
  BibleChapters: {bookId: number; bookName: string; chapters: number; verse?: number};
  BibleReader: {bookId: number; bookName: string; chapter: number; verse?: number};
};

type RootTabParamList = {
  BibleTab: undefined;
  HymnsTab: undefined;
};

const BibleStack = createNativeStackNavigator<BibleStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();

const BibleStackNavigator = () => (
  <BibleStack.Navigator screenOptions={{headerShown: false}}>
    <BibleStack.Screen name="BibleBooks" component={BibleBooksScreen} />
    <BibleStack.Screen name="BibleChapters" component={BibleChaptersScreen} />
    <BibleStack.Screen name="BibleReader" component={BibleReaderScreen} />
  </BibleStack.Navigator>
);

const AppNavigator = () => (
  <Tabs.Navigator
    screenOptions={{
      headerShown: false,
    }}>
    <Tabs.Screen
      name="BibleTab"
      component={BibleStackNavigator}
      options={{title: t('tabs.bible')}}
    />
    <Tabs.Screen
      name="HymnsTab"
      component={HymnsHomeScreen}
      options={{title: t('tabs.hymns')}}
    />
  </Tabs.Navigator>
);

export default AppNavigator;

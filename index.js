/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// react-native-draggable-flatlist@4.0.3 (latest) still calls the
// InteractionManager API that RN 0.83 deprecated. Harmless — the API works in
// 0.83; this only silences the console noise until the library catches up.
LogBox.ignoreLogs(['InteractionManager has been deprecated']);

AppRegistry.registerComponent(appName, () => App);

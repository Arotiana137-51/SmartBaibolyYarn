package com.ebaiboly.app

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "eBaiboly"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    // Pass null to prevent restoration of react-native-screens fragments
    // (see https://github.com/software-mansion/react-native-screens/issues/17)
    super.onCreate(null)

    val controller = WindowCompat.getInsetsController(window, window.decorView)
    controller.isAppearanceLightStatusBars = true
    controller.isAppearanceLightNavigationBars = true
  }

  // Belt-and-suspenders for the rnscreens "Screen fragments should never be
  // restored" crash. Passing null to super.onCreate handles the warm path, but
  // on process-death restore the FragmentManager rehydrates from the saved
  // bundle anyway via BundlableSavedStateRegistry. Strip the keys here so
  // there is literally nothing to restore.
  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.remove("android:support:fragments")
    outState.remove("androidx.lifecycle.BundlableSavedStateRegistry.key")
  }
}

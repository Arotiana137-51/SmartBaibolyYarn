package com.ebaiboly.app

import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.OrientationEventListener
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

  // Android has no manifest orientation value for "sensor-driven minus
  // reverse-portrait", so block that one orientation at runtime instead.
  // Old phones with a drifting/faulty G-sensor otherwise flip upside-down
  // on their own; everything else still follows the sensor freely.
  private val orientationListener by lazy {
    object : OrientationEventListener(this) {
      override fun onOrientationChanged(angle: Int) {
        if (angle == ORIENTATION_UNKNOWN) return
        val desired = if (angle in 135..225) {
          ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else {
          ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
        }
        if (requestedOrientation != desired) {
          requestedOrientation = desired
        }
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    // Pass null to prevent restoration of react-native-screens fragments
    // (see https://github.com/software-mansion/react-native-screens/issues/17)
    super.onCreate(null)

    val controller = WindowCompat.getInsetsController(window, window.decorView)
    controller.isAppearanceLightStatusBars = true
    controller.isAppearanceLightNavigationBars = true
  }

  override fun onResume() {
    super.onResume()
    orientationListener.enable()
  }

  override fun onPause() {
    orientationListener.disable()
    super.onPause()
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

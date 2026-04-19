package com.ebaiboly.app

import android.os.Bundle
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "eBaiboly"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Enable edge-to-edge display for Android 15+ with proper window inset handling
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Enable edge-to-edge display with backward compatibility
    enableEdgeToEdge()
  }

  /**
   * Enable edge-to-edge display with proper window inset handling
   * This provides backward compatibility for Android versions before 15
   */
  private fun enableEdgeToEdge() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    
    val controller = WindowCompat.getInsetsController(window, window.decorView)
    controller?.let {
      it.show(WindowInsetsCompat.Type.systemBars())
      it.isAppearanceLightStatusBars = true
      it.isAppearanceLightNavigationBars = true
    }
  }
}

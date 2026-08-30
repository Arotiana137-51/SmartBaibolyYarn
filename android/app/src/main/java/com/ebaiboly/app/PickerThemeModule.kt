package com.ebaiboly.app

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Applies one of the generated `PickerAccent_<id>` styles (see
 * scripts/generateAndroidThemeColors.js) onto the current Activity's theme,
 * so a native picker opened right after (e.g. the reading-reminder time
 * picker) matches the app's currently active accent color instead of the
 * static default baked into AppTheme. Android themes only resolve compiled
 * resources, never an arbitrary runtime RGB value, so the caller must map
 * the live color to one of the finite generated style names first.
 */
class PickerThemeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "PickerTheme"

    @ReactMethod
    fun applyAccentStyle(styleName: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        activity.runOnUiThread {
            val resId = activity.resources.getIdentifier(styleName, "style", activity.packageName)
            if (resId != 0) {
                activity.theme.applyStyle(resId, true)
            }
            promise.resolve(resId != 0)
        }
    }
}

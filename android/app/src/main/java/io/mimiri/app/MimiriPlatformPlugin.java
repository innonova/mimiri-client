package io.mimiri.app;

import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.provider.Settings;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.window.core.layout.WindowHeightSizeClass;
import androidx.window.core.layout.WindowSizeClass;
import androidx.window.core.layout.WindowWidthSizeClass;
import androidx.window.layout.WindowMetrics;
import androidx.window.layout.WindowMetricsCalculator;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "MimiriPlatform")
public class MimiriPlatformPlugin extends Plugin {
  private boolean isEmulator = false;

  @PluginMethod()
  public void info(PluginCall call) {
    JSObject info = new JSObject();
    WindowMetrics metrics = WindowMetricsCalculator.getOrCreate()
            .computeCurrentWindowMetrics(getActivity());

    isEmulator = Build.MANUFACTURER.equals("Google") && Build.MODEL.equals("sdk_gphone64_x86_64") && Build.HARDWARE.equals("ranchu");

    int width = metrics.getBounds().width();
    int height = metrics.getBounds().height();
    float density = getActivity().getResources().getDisplayMetrics().density;
    WindowSizeClass windowSizeClass = WindowSizeClass.compute(width / density, height / density);
    WindowWidthSizeClass widthWindowSizeClass = windowSizeClass.getWindowWidthSizeClass();
    WindowHeightSizeClass heightWindowSizeClass = windowSizeClass.getWindowHeightSizeClass();

    if (widthWindowSizeClass == WindowWidthSizeClass.COMPACT || heightWindowSizeClass == WindowHeightSizeClass.COMPACT) {
      info.put("mode", "phone");
    } else {
      info.put("mode", "tablet");
    }

    BiometricManager biometricManager = BiometricManager.from(getContext());
    int biometrics = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG |
            BiometricManager.Authenticators.BIOMETRIC_WEAK
    );
    info.put("biometrics", isEmulator || biometrics == BiometricManager.BIOMETRIC_SUCCESS);
    call.resolve(info);
  }

  private void computeWindowSizeClasses() {
  }

  @PluginMethod()
  public void verifyBiometry(PluginCall call) {
    final Runnable verifyBiometryRunnable = new Runnable() {
      public void run() {
        try {
          if (isEmulator) {
            call.resolve(new JSObject().put("verified", true));
            return;
          }

          BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                  .setTitle("Authenticate")
                  .setSubtitle(null)
                  .setDescription(null);

          builder.setNegativeButtonText("Cancel");

          BiometricPrompt.PromptInfo promptInfo = builder.build();

          Executor executor;
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            executor = getContext().getMainExecutor();
          } else {
            executor = command -> new Handler().post(command);
          }

          BiometricPrompt biometricPrompt = new BiometricPrompt(getActivity(), executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
              super.onAuthenticationError(errorCode, errString);
              call.resolve(new JSObject().put("verified", false).put("errorCode", errorCode).put("error", errString.toString()));
            }

            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
              super.onAuthenticationSucceeded(result);
              call.resolve(new JSObject().put("verified", true));
            }

            @Override
            public void onAuthenticationFailed() {
              super.onAuthenticationFailed();
              call.resolve(new JSObject().put("verified", false));
            }
          });
          biometricPrompt.authenticate(promptInfo);
        } catch (Exception e) {
          call.resolve(new JSObject().put("verified", false).put("error", e.toString()));
        }
      }
    };
    getActivity().runOnUiThread(verifyBiometryRunnable);
  }

  @PluginMethod()
  public void enrollBiometry(PluginCall call) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      final Intent enrollIntent;
      enrollIntent = new Intent(Settings.ACTION_BIOMETRIC_ENROLL);
      getContext().startActivity(enrollIntent);
      startActivityForResult(call, enrollIntent, "verifyResult");
    }
    call.resolve(new JSObject());
  }


}

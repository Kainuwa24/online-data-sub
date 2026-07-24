package app.onlinedatasub.mobile;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    private static final int AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_STRONG |
        BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int status = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        JSObject ret = new JSObject();
        ret.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
        ret.put("status", status);
        call.resolve(ret);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        int status = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        if (status != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject("Biometric verification is not available on this device.");
            return;
        }

        String title = call.getString("title", "Verify identity");
        String subtitle = call.getString("subtitle", "Use biometrics or device lock to continue");
        String description = call.getString("description", "");

        Executor executor = ContextCompat.getMainExecutor(getActivity());
        BiometricPrompt prompt = new BiometricPrompt(
            getActivity(),
            executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    JSObject ret = new JSObject();
                    ret.put("verified", true);
                    call.resolve(ret);
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    call.reject(errString != null ? errString.toString() : "Biometric verification failed");
                }

                @Override
                public void onAuthenticationFailed() {
                    // Keep the prompt open and let Android handle retry feedback.
                }
            }
        );

        BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(AUTHENTICATORS);

        if (description != null && !description.isEmpty()) {
            builder.setDescription(description);
        }

        prompt.authenticate(builder.build());
    }
}

package online.datasub;

import android.app.Activity;
import android.content.Intent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "GoogleNativeAuth")
public class GoogleNativeAuthPlugin extends Plugin {
    private GoogleSignInClient signInClient;

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = getConfig().getString("serverClientId", "");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Google native sign-in is not configured. Set GOOGLE_CLIENT_ID before Capacitor sync.");
            return;
        }

        GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(serverClientId)
                .requestEmail()
                .requestProfile()
                .build();

        signInClient = GoogleSignIn.getClient(getActivity(), options);
        boolean forceAccountPicker = call.getBoolean("forceAccountPicker", true);

        if (forceAccountPicker) {
            signInClient.signOut().addOnCompleteListener(task -> launchSignIn(call));
        } else {
            launchSignIn(call);
        }
    }

    private void launchSignIn(PluginCall call) {
        Intent intent = signInClient.getSignInIntent();
        startActivityForResult(call, intent, "handleSignInResult");
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Google sign-in was cancelled");
            return;
        }

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account.getIdToken();
            if (idToken == null || idToken.isEmpty()) {
                call.reject("Google did not return an ID token");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("email", account.getEmail());
            ret.put("name", account.getDisplayName());
            call.resolve(ret);
        } catch (ApiException e) {
            call.reject("Google sign-in failed", e);
        }
    }
}

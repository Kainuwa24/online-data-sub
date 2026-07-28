import type { CapacitorConfig } from "@capacitor/cli";

/** Production app origin (custom domain). Railway remains a fallback host. */
const PRODUCTION_APP_URL = "https://onlinedatasub.com.ng";
const RAILWAY_FALLBACK_HOST = "online-data-sub-production.up.railway.app";

/**
 * Native shell loads the production web app.
 *
 * Priority:
 *   1. CAPACITOR_SERVER_URL
 *   2. NEXT_PUBLIC_APP_URL (if not localhost)
 *   3. PRODUCTION_APP_URL (custom domain)
 *
 * Override when syncing:
 *   CAPACITOR_SERVER_URL=https://other-host.example npm run cap:sync
 */
function resolveServerUrl() {
  const fromCap = (process.env.CAPACITOR_SERVER_URL || "").replace(/\/$/, "");
  if (fromCap) return fromCap;

  const fromPublic = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  // Never bake localhost into the Android shell
  if (fromPublic && !/localhost|127\.0\.0\.1/i.test(fromPublic)) {
    return fromPublic;
  }

  return PRODUCTION_APP_URL;
}

const serverUrl = resolveServerUrl();
const serverHost = serverUrl ? new URL(serverUrl).hostname : "";
const googleServerClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";

const config: CapacitorConfig = {
  appId: "app.onlinedatasub.mobile",
  appName: "Online Data Sub",
  // Placeholder assets; WebView loads server.url when set
  webDir: "native-www",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
        // Local branded page when the remote app cannot load (no network / DNS / timeout)
        errorPath: "offline.html",
        allowNavigation: [
          serverHost,
          "onlinedatasub.com.ng",
          "*.onlinedatasub.com.ng",
          RAILWAY_FALLBACK_HOST,
          "*.up.railway.app",
          "accounts.google.com",
          "*.google.com",
          "*.googleapis.com",
          "*.gstatic.com",
          "api.flutterwave.com",
        ],
      }
    : {
        // Local-only mode still gets a branded offline/placeholder experience
        errorPath: "offline.html",
      },
  plugins: {
    GoogleNativeAuth: {
      serverClientId: googleServerClientId,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#F7F8FA",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#F7F8FA",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#F7F8FA",
  },
};

export default config;

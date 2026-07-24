import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell loads the production web app (Next.js on Railway).
 *
 * Set CAPACITOR_SERVER_URL when syncing, e.g.:
 *   CAPACITOR_SERVER_URL=https://your-app.up.railway.app npx cap sync
 *
 * Or set NEXT_PUBLIC_APP_URL to that origin in the environment used for sync.
 */
const serverUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  ""
).replace(/\/$/, "");
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
        allowNavigation: [
          serverHost,
          "*.up.railway.app",
          "accounts.google.com",
          "*.google.com",
          "*.googleapis.com",
          "*.gstatic.com",
          "api.flutterwave.com",
        ],
      }
    : undefined,
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

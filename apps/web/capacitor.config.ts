import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.chetana.consciousness",
  appName: "Chetana",
  webDir: "out",
  server: {
    // In production, the app loads from the bundled static files.
    // For development, uncomment the line below and set your local IP:
    // url: "http://192.168.1.x:3000",
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "Chetana",
    backgroundColor: "#030712",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#030712",
      showSpinner: false,
      launchFadeOutDuration: 500,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#030712",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
    },
  },
};

export default config;

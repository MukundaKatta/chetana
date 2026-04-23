import type { CapacitorConfig } from '@capacitor/cli';

// iOS ships the bundled `out/` contents (see ios-fallback.html in this folder).
// The bundled page is a branded landing that opens chetana.vercel.app on tap
// rather than auto-redirecting. This prevents the App Review "error on launch"
// rejection (2.1a) when the reviewer's network is slow or flaky.
const config: CapacitorConfig = {
  appId: 'com.officethree.chetana',
  appName: 'Chetana',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['chetana.vercel.app'],
  },
};

export default config;

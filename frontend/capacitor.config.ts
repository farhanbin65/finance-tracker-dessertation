import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.farhanhossain.finsight',
  appName: 'FinSight',
  webDir: 'dist'
  // server.url removed — app now serves the built dist/ bundle locally
  // API calls to Render backend still work fine since those are separate HTTPS requests
};

export default config;
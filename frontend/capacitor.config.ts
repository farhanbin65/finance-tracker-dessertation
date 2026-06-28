import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.finsight.app',
  appName: 'FinSight',
  webDir: 'dist',
  server: {
    url: 'https://finance-tracker-five-umber.vercel.app',
    cleartext: true,
  }
};
export default config;

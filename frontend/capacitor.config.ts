import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.farhanhossain.finsight',
  appName: 'FinSight',
  webDir: 'dist',
  server: {
    url: 'https://finance-tracker-five-umber.vercel.app',
    cleartext: true,
    allowNavigation: ['*']
  }
};
export default config;

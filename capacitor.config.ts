import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dhivehilanguagehub.app',
  appName: 'Dhivehi Language Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#0D6E6E',
    },
  },
};

export default config;

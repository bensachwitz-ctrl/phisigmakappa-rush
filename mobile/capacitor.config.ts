import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.greekstack.app',
  appName: 'Greekstack',
  webDir: 'www',
  server: {
    url: 'https://greekstack.com',
    cleartext: true,
    allowNavigation: [
      '*.greekstack.com',
      'greekstack.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#4a111d',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#fcfaf2'
    }
  }
};

export default config;

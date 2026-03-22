import { ExpoConfig } from 'expo/config';

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: [
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow WERA to access your photos',
        cameraPermission: 'Allow WERA to access your camera'
      }
    ]
  ],
  android: {
    ...config.android,
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES', 'READ_EXTERNAL_STORAGE'],
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBMaaaRImPN23o9TkNStcArSR4lHm7Kqc8',
      },
    },
  },
  extra: {
    API_URL: process.env.API_URL || 'http://localhost:5000/api',
    EAS_PROJECT_ID: process.env.EAS_PROJECT_ID || "c02bdc28-8ad9-42e6-9db8-a6ee76fa9eec",
    eas: {
      projectId: process.env.EAS_PROJECT_ID || "c02bdc28-8ad9-42e6-9db8-a6ee76fa9eec",
    },
  },
});

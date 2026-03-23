import { ExpoConfig } from 'expo/config';

const DEFAULT_EAS_PROJECT_ID = 'd0e7c38c-09d1-48db-8447-b8f63effd81b';

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const easProjectId = process.env.EAS_PROJECT_ID || DEFAULT_EAS_PROJECT_ID;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
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
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
    extra: {
      API_URL: process.env.API_URL || 'http://localhost:5000/api',
      EAS_PROJECT_ID: easProjectId,
      eas: {
        projectId: easProjectId,
      },
    },
  };
};

import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
  weights: {
    regular: '400',
    medium: '500',
    bold: '700',
    heavy: '800',
  } as const,
  sizes: {
    xs: 12,
    s: 14,
    m: 16,
    l: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeights: {
    xs: 16,
    s: 20,
    m: 24,
    l: 28,
    xl: 28,
    xxl: 32,
    xxxl: 40,
  },
};

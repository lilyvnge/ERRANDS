import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface TextProps extends RNTextProps {
  variant?: keyof typeof typography.sizes;
  weight?: keyof typeof typography.weights;
  color?: string;
  centered?: boolean;
}

export const Text: React.FC<TextProps> = ({
  children,
  style,
  variant = 'm',
  weight = 'regular',
  color = colors.text,
  centered,
  ...props
}) => {
  const textStyle: TextStyle = {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes[variant],
    lineHeight: typography.lineHeights[variant],
    fontWeight: typography.weights[weight] as any,
    color,
    textAlign: centered ? 'center' : undefined,
  };

  return (
    <RNText style={[textStyle, style]} {...props}>
      {children}
    </RNText>
  );
};

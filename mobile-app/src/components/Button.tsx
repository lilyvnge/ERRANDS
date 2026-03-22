import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { Text } from './Text';
import { colors } from '../theme/colors';
import { layout, spacing } from '../theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false, 
  disabled = false,
  style,
  textStyle 
}: ButtonProps) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isText = variant === 'text';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isOutline && styles.outline,
        isText && styles.text,
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textInverted : colors.primary} />
      ) : (
        <Text 
          variant="s" 
          weight="bold" 
          style={[
            isPrimary ? { color: colors.textInverted } : { color: colors.primary },
            variant === 'secondary' && { color: colors.text },
            isText && { color: colors.textSecondary },
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.l,
    borderRadius: layout.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: colors.primary,
    // Subtle shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
        shadowColor: colors.primary,
      },
    }),
  },
  secondary: {
    backgroundColor: colors.surfaceHighlight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    minHeight: 0,
  },
  disabled: {
    opacity: 0.5,
  },
});

import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors } from '../theme/colors';
import { layout, spacing } from '../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = ({ label, error, containerStyle, style, ...props }: InputProps) => {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="xs" color={focused ? colors.primary : colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer, 
        focused && styles.focused,
        !!error && styles.errorBorder
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textLight}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
          {...props}
        />
      </View>
      {error && (
        <Text variant="xs" color={colors.error} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.m,
  },
  label: {
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius.m,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  input: {
    padding: spacing.m,
    color: colors.text,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});

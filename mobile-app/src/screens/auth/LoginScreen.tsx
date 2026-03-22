import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18n } from '../../i18n/I18nProvider';
import { useToast } from '../../components/Toast/ToastProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function LoginScreen() {
  const nav = useNavigation<any>();
  const login = useAuthStore((s) => s.login);
  const toast = useToast();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.show('Please enter email and password', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      toast.show(e?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text 
            variant="xxxl" 
            weight="heavy" 
            color={colors.primary} 
            centered
          >
            WERA
          </Text>
          <Text variant="m" color={colors.textSecondary} centered style={{ marginTop: spacing.s }}>
            Your trusted marketplace for everyday tasks.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('auth.email')}
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label={t('auth.password')}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          
          <Button
            title={loading ? 'Signing in...' : t('auth.login')}
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing.m }}
          />

          <TouchableOpacity onPress={() => nav.navigate('Register')} style={styles.footerLink}>
            <Text variant="s" color={colors.textSecondary}>
              Don’t have an account? <Text variant="s" weight="bold" color={colors.primary}>{t('auth.register')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    justifyContent: 'center',
    flex: 1,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  form: {
    gap: spacing.s,
  },
  footerLink: {
    marginTop: spacing.l,
    alignItems: 'center',
  },
});

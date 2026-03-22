import React from 'react';
import { View, StyleSheet, StatusBar, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safeArea?: boolean;
  scroll?: boolean;
}

export const Screen = ({ children, style, safeArea = true, scroll = false }: ScreenProps) => {
  const Container = safeArea ? SafeAreaView : View;
  const content = scroll ? (
    <ScrollView 
      contentContainerStyle={[styles.scrollContent, style]} 
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, style]}>{children}</View>
  );

  return (
    <Container style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {content}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

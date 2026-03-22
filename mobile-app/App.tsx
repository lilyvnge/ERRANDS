import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/components/Toast/ToastProvider';
import { I18nProvider } from './src/i18n/I18nProvider';

const client = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <AppNavigator />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

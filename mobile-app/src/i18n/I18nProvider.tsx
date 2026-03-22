import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, type SupportedLang } from './translations';

type I18nContextValue = {
  lang: SupportedLang;
  setLanguage: (lang: SupportedLang) => void;
  t: (key: keyof typeof translations['en']) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = 'app_language';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<SupportedLang>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value && (value === 'en' || value === 'sw' || value === 'fr')) {
        setLang(value);
      }
    });
  }, []);

  const setLanguage = async (next: SupportedLang) => {
    setLang(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: keyof typeof translations['en']) => {
      const table = translations[lang] || translations.en;
      return table[key] || translations.en[key] || key;
    };
    return { lang, setLanguage, t };
  }, [lang]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

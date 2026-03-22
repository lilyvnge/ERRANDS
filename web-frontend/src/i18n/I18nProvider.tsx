import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations, type SupportedLang } from './translations';

type I18nContextValue = {
  lang: SupportedLang;
  setLanguage: (lang: SupportedLang) => void;
  t: (key: keyof typeof translations['en'], fallback?: string) => string;
  languages: { code: SupportedLang; label: string }[];
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stored = (typeof window !== 'undefined' && (localStorage.getItem('lang') as SupportedLang)) || 'en';
  const [lang, setLang] = useState<SupportedLang>(stored);

  const setLanguage = (next: SupportedLang) => {
    setLang(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', next);
    }
  };

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: keyof typeof translations['en'], fallback?: string) => {
      const table = translations[lang] || translations.en;
      return table[key] || fallback || translations.en[key] || key;
    };
    return {
      lang,
      setLanguage,
      t,
      languages: [
        { code: 'en', label: 'English' },
        { code: 'sw', label: 'Kiswahili' },
        { code: 'fr', label: 'Français' },
      ]
    };
  }, [lang]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
};

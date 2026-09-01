import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '@/i18n/translations';

type TranslationValue = string | { [key: string]: TranslationValue };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved && ['en', 'fr', 'de', 'it'].includes(saved) ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: TranslationValue = translations[language];
    
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as { [key: string]: TranslationValue })[k];
      } else {
        // Fallback to English
        value = translations.en;
        for (const fallbackKey of keys) {
          if (typeof value === 'object' && value !== null && fallbackKey in value) {
            value = (value as { [key: string]: TranslationValue })[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

import { useLanguageStore } from './useLanguageStore';
import { translations } from '@/constants/translations';
import { useEffect } from 'react';

export function useTranslation() {
  const { locale, initLanguage } = useLanguageStore();

  useEffect(() => {
    initLanguage();
  }, []);

  const t = (key: string): string => {
    const dictionary = translations[locale] || translations.vi;
    const parts = key.split('.');
    let current: any = dictionary;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return key;
      }
    }
    return typeof current === 'string' ? current : key;
  };

  return { t, locale, setLanguage: useLanguageStore.getState().setLanguage };
}
export type UseTranslationType = ReturnType<typeof useTranslation>;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector) // Use the language detector
  .use(initReactI18next)
  .init({
    // lng: 'pt', // Let the detector set the language
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'es', 'fr', 'de'],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    ns: ['common', 'config', 'planner'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },
    react: {
      useSuspense: true, // Enable suspense
    },
  });

export default i18n;

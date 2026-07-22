import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import translationEN from "../locales/en.json";
import translationFR from "../locales/fr.json";
import translationES from "../locales/es.json";
import translationDE from "../locales/de.json";
import translationPT from "../locales/pt.json";

const resources = {
  en: {
    translation: translationEN,
  },
  fr: {
    translation: translationFR,
  },
  es: {
    translation: translationES,
  },
  de: {
    translation: translationDE,
  },
  pt: {
    translation: translationPT,
  },
};

const defaultLanguage = (typeof window !== 'undefined' && (window as any).KYRO_LANG) ? (window as any).KYRO_LANG : "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    lng: defaultLanguage,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

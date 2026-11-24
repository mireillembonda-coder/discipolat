import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr";
import en from "./locales/en";

export const SUPPORTED_LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English (partiel)" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "pp.language";

function initialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    /* stockage indisponible */
  }
  return "fr";
}

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});

export default i18n;

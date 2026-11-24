import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr'
import en from './locales/en'
import { DEFAULT_LOCALE } from '@/lib/config'

/**
 * Internationalisation : le français est la langue principale et la langue de repli.
 * Pour ajouter une langue : créer src/i18n/locales/<code>.ts, l'enregistrer ici et dans SUPPORTED_LOCALES.
 */
void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: DEFAULT_LOCALE,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n

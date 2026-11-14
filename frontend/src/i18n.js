import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';
import en from './locales/en.json';
import ru from './locales/ru.json';
import { pageLocales, metricLocales, roomUiLocales, roomExtraLocales, feedbackLocales, voiceUiLocales, cameraUiLocales, authLayoutLocales, validationLocales, stageLocales, reportDynamicLocales, chartLocales } from './locales/pages';
import { landingLocales } from './locales/landing';

const saved = (() => { try { return localStorage.getItem('interviewai:language'); } catch { return null; } })();
i18n.use(initReactI18next).init({
  resources: { uz: { translation: { ...uz, ...pageLocales.uz, metrics: metricLocales.uz, charts: chartLocales.uz, roomUI: { ...roomUiLocales.uz, ...roomExtraLocales.uz }, feedback: { ...feedbackLocales.uz, stages: stageLocales.uz }, reportDynamic: reportDynamicLocales.uz, voiceUI: voiceUiLocales.uz, cameraUI: cameraUiLocales.uz, authLayout: authLayoutLocales.uz, validation: validationLocales.uz, landing: landingLocales.uz } }, en: { translation: { ...en, ...pageLocales.en, metrics: metricLocales.en, charts: chartLocales.en, roomUI: { ...roomUiLocales.en, ...roomExtraLocales.en }, feedback: { ...feedbackLocales.en, stages: stageLocales.en }, reportDynamic: reportDynamicLocales.en, voiceUI: voiceUiLocales.en, cameraUI: cameraUiLocales.en, authLayout: authLayoutLocales.en, validation: validationLocales.en, landing: landingLocales.en } }, ru: { translation: { ...ru, ...pageLocales.ru, metrics: metricLocales.ru, charts: chartLocales.ru, roomUI: { ...roomUiLocales.ru, ...roomExtraLocales.ru }, feedback: { ...feedbackLocales.ru, stages: stageLocales.ru }, reportDynamic: reportDynamicLocales.ru, voiceUI: voiceUiLocales.ru, cameraUI: cameraUiLocales.ru, authLayout: authLayoutLocales.ru, validation: validationLocales.ru, landing: landingLocales.ru } } },
  lng: ['uz', 'en', 'ru'].includes(saved) ? saved : 'uz', fallbackLng: 'en',
  interpolation: { escapeValue: false }, returnNull: false,
});

export default i18n;

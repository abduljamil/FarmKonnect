import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Shared translation catalogs with the web app — both `en.json` and `ur.json`
// are byte-for-byte copies of frontend/src/locales/*. Mobile uses the same
// dotted-key namespace ("auth.signIn.button", "marketplace.title", etc.) so
// screens can be ported between platforms without re-translating strings.
import en from '../locales/en.json';
import ur from '../locales/ur.json';

// Mobile-only overlays — keys the native app needs that don't exist on web.
// Kept here (not in the shared JSON) so we don't pollute the web catalog
// with mobile-specific labels like nav bar / push permission strings.
const mobileExtras = {
  en: {
    mobile: {
      tabs: {
        home: 'Home',
        market: 'Market',
        chat: 'Chat',
        activity: 'Activity',
        profile: 'Profile',
      },
      welcome: {
        skip: 'Skip',
        next: 'Next',
        getStarted: 'Get Started',
      },
      common: {
        retry: 'Retry',
        viewAll: 'View All',
        seeMore: 'See More',
        noData: 'No data available',
        loading: 'Loading...',
      },
      permissions: {
        locationDenied: 'Location permission denied — using default city.',
      },
      notifications: {
        empty: "No notifications yet",
        emptyHint: "You'll see alerts here when your price targets are hit or when there's activity on your account.",
      },
      settings: {
        preferences: 'Preferences',
        darkMode: 'Dark Mode',
        language: 'Language',
        appPermissions: 'App Permissions',
        pushNotifications: 'Push Notifications',
        locationServices: 'Location Services',
        logOut: 'Log Out',
        version: 'Version 1.0.0 (Build 42)',
      },
      activity: {
        title: 'Activity',
        filterAll: 'All',
        filterActive: 'Active',
        filterHistory: 'History',
        empty: 'No transactions found.',
        buying: 'BUYING',
        selling: 'SELLING',
        marketItem: 'Market Item',
        units: 'units',
      },
    },
  },
  ur: {
    mobile: {
      tabs: {
        home: 'ہوم',
        market: 'منڈی',
        chat: 'چیٹ',
        activity: 'سرگرمی',
        profile: 'پروفائل',
      },
      welcome: {
        skip: 'چھوڑیں',
        next: 'اگلا',
        getStarted: 'شروع کریں',
      },
      common: {
        retry: 'دوبارہ کوشش کریں',
        viewAll: 'سب دیکھیں',
        seeMore: 'مزید دیکھیں',
        noData: 'کوئی ڈیٹا دستیاب نہیں',
        loading: 'لوڈ ہو رہا ہے...',
      },
      permissions: {
        locationDenied: 'مقام کی اجازت نہیں ملی — پہلے سے طے شدہ شہر استعمال کیا جا رہا ہے۔',
      },
      notifications: {
        empty: 'ابھی تک کوئی اطلاع نہیں',
        emptyHint: 'جب آپ کی قیمت کا ہدف پورا ہو گا یا آپ کے اکاؤنٹ پر کوئی سرگرمی ہو گی تو یہاں اطلاعات نظر آئیں گی۔',
      },
      settings: {
        preferences: 'ترجیحات',
        darkMode: 'ڈارک موڈ',
        language: 'زبان',
        appPermissions: 'ایپ اجازتیں',
        pushNotifications: 'پش اطلاعات',
        locationServices: 'مقام کی خدمات',
        logOut: 'لاگ آؤٹ',
        version: 'ورژن 1.0.0 (بلڈ 42)',
      },
      activity: {
        title: 'سرگرمی',
        filterAll: 'سب',
        filterActive: 'فعال',
        filterHistory: 'تاریخ',
        empty: 'کوئی لین دین نہیں ملا۔',
        buying: 'خرید',
        selling: 'فروخت',
        marketItem: 'منڈی کی شے',
        units: 'یونٹس',
      },
    },
  },
};

const merge = (a, b) => {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = (typeof a[k] === 'object' && a[k] && typeof b[k] === 'object' && b[k])
      ? merge(a[k], b[k])
      : b[k];
  }
  return out;
};

const resources = {
  en: { translation: merge(en, mobileExtras.en) },
  ur: { translation: merge(ur, mobileExtras.ur) },
};

// Get device language (defaults to English unless Urdu is the system locale)
const deviceLanguage = Localization.getLocales?.()[0]?.languageCode || 'en';
const defaultLanguage = deviceLanguage === 'ur' ? 'ur' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false, // Disable suspense for mobile
    },
  });

// Load saved language preference
AsyncStorage.getItem('language').then((savedLanguage) => {
  if (savedLanguage && savedLanguage !== i18n.language) {
    i18n.changeLanguage(savedLanguage);
  }
}).catch(() => { /* non-fatal */ });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem('language', lng).catch(() => { /* non-fatal */ });
});

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const resources = {
  en: {
    translation: {
      "signup": "Sign Up",
      "signin": "Sign In",
      "title": "Welcome to FarmKonnect",
      "subtitle": "Sign In to your account",
      "settings": "Settings",
      "language": "Language",
      "theme": "Dark Theme",
      "english": "English",
      "urdu": "Urdu",
      "username": "Username",
      "password": "Password",
      "email": "Email",
      "no_account": "Don't have an account?",
      "have_account": "Already have an account?",
      "dark_mode": "Dark Mode",
      "preferences": "Preferences",
      "app_permissions": "App Permissions",
      "push_notifications": "Push Notifications",
      "location_services": "Location Services",
      "log_out": "Log Out",
      "version": "Version 1.0.0 (Build 42)",
      "email_address": "Email Address",
      "enter_email": "Enter your email",
      "enter_password": "Enter your password",
      "sign_in": "Sign In",
      "forgot_password": "Forgot Password?"
    }
  },
  ur: {
    translation: {
      "signup": "سائن اپ کریں",
      "signin": "سائن ان کریں",
      "title": "فارم کنیکٹ میں خوش آمدید",
      "subtitle": "اپنے اکاؤنٹ میں سائن ان کریں",
      "settings": "ترتیبات",
      "language": "زبان",
      "theme": "ڈارک تھیم",
      "english": "انگریزی",
      "urdu": "اردو",
      "username": "صارف کا نام",
      "password": "پاس ورڈ",
      "email": "ای میل",
      "no_account": "کیا آپ کا اکاؤنٹ نہیں ہے؟",
      "have_account": "کیا آپ کا پہلے سے اکاؤنٹ ہے؟",
      "dark_mode": "ڈارک موڈ",
      "preferences": "ترجیحات",
      "app_permissions": "ایپ اجازتیں",
      "push_notifications": "پش اطلاعات",
      "location_services": "مقام کی خدمات",
      "log_out": "لاگ آؤٹ",
      "version": "ورژن 1.0.0 (بلڈ 42)",
      "email_address": "ای میل ایڈریس",
      "enter_email": "اپنی ای میل درج کریں",
      "enter_password": "اپنا پاس ورڈ درج کریں",
      "sign_in": "سائن ان کریں",
      "forgot_password": "پاس ورڈ بھول گئے؟"
    }
  }
};

// Get device language
const deviceLanguage = Localization.getLocales()[0].languageCode;
const defaultLanguage = deviceLanguage === 'ur' ? 'ur' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false // Disable suspense for mobile
    }
  });

// Load saved language preference
AsyncStorage.getItem('language').then((savedLanguage) => {
  if (savedLanguage) {
    console.log('Loading saved language:', savedLanguage);
    i18n.changeLanguage(savedLanguage);
  }
});

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  console.log('Language changed to:', lng);
  AsyncStorage.setItem('language', lng).catch(err => {
    console.error('Error saving language:', err);
  });
});

export default i18n;

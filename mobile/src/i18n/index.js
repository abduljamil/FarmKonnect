import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
      "have_account": "Already have an account?"
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
      "have_account": "کیا آپ کا پہلے سے اکاؤنٹ ہے؟"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

export default i18n;

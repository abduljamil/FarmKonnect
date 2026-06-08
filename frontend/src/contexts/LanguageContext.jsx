/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import en from "../locales/en.json";
import ur from "../locales/ur.json";

const LanguageContext = createContext();

const translations = { en, ur };

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem("language");
        return saved || "en";
    });

    const isUrdu = language === "ur";
    const isRTL = false; // Disable RTL mirroring per user request

    useEffect(() => {
        localStorage.setItem("language", language);
        // Honor RTL for Urdu so the layout actually mirrors. Pair with
        // Tailwind's `rtl:` variant on directional utilities (ml-/mr-, pl-/pr-,
        // text-left/right) when porting components, or use logical properties
        // (`ms-`, `me-`, `ps-`, `pe-`, `start`/`end`) for new code.
        document.documentElement.dir = isRTL ? "rtl" : "ltr";
        document.documentElement.lang = language;

        if (isUrdu) {
            document.body.classList.add("font-urdu");
        } else {
            document.body.classList.remove("font-urdu");
        }
    }, [language, isRTL, isUrdu]);

    const toggleLanguage = () => {
        setLanguage((prev) => (prev === "en" ? "ur" : "en"));
    };

    const setLang = (lang) => {
        if (lang === "en" || lang === "ur") {
            setLanguage(lang);
        }
    };

    // Translation function
    const t = (key, params = {}) => {
        const keys = key.split(".");
        let value = translations[language];

        for (const k of keys) {
            if (value && typeof value === "object") {
                value = value[k];
            } else {
                value = undefined;
                break;
            }
        }

        // Fallback to English if translation not found
        if (value === undefined) {
            value = translations.en;
            for (const k of keys) {
                if (value && typeof value === "object") {
                    value = value[k];
                } else {
                    value = key; // Return key if not found in English either
                    break;
                }
            }
        }

        // Replace parameters like {name} with actual values. In Urdu mode, wrap
        // every interpolated value in Unicode isolates (FSI…PDI) so embedded
        // left-to-right fragments — prices, IDs, names, numbers — keep their own
        // internal order instead of being reordered by the surrounding bidi
        // context. This fixes "English words out of order" without touching layout.
        if (typeof value === "string" && Object.keys(params).length > 0) {
            const FSI = String.fromCharCode(0x2068), PDI = String.fromCharCode(0x2069); // First-Strong-Isolate … Pop-Directional-Isolate
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                const injected = isUrdu ? `${FSI}${paramValue}${PDI}` : String(paramValue);
                value = value.replace(new RegExp(`{${paramKey}}`, "g"), injected);
            });
        }

        return value || key;
    };

    return (
        <LanguageContext.Provider
            value={{
                language,
                isUrdu,
                isRTL,
                toggleLanguage,
                setLanguage: setLang,
                t,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageContext;

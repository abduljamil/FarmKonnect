import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import Button from "../components/Button";
import { useLanguage } from "../contexts/LanguageContext";

const EmailSent = () => {
    const { t } = useLanguage();
    // Get email from URL params or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get("email") || sessionStorage.getItem("pendingVerificationEmail") || "your email";
    const type = urlParams.get("type") || "verification"; // verification or reset

    const isReset = type === "reset";

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                    {/* Logo */}
                    <Link to="/" className="inline-flex items-center gap-3 mb-8">
                        <span className="text-4xl">🌾</span>
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                            FarmKonnect
                        </span>
                    </Link>

                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <Mail className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    {/* Content */}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {t("emailSent.title")}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {isReset ? t("emailSent.sentReset") : t("emailSent.sentVerification")}
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-6">
                        {email}
                    </p>

                    {/* Instructions */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {t("emailSent.nextSteps")}
                        </h3>
                        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                            <li>{t("emailSent.step1")}</li>
                            <li>{t("emailSent.step2")}</li>
                            <li>{isReset ? t("emailSent.step3Reset") : t("emailSent.step3Verify")}</li>
                            {!isReset && <li>{t("emailSent.step4AutoSignIn")}</li>}
                        </ol>
                    </div>

                    {/* Didn't receive email */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t("emailSent.spamNote")}{" "}
                        <button
                            onClick={() => {
                                window.location.href = `/signin?resend=${email}`;
                            }}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                        >
                            {t("emailSent.resendIt")}
                        </button>
                    </p>

                    {/* Back to sign in */}
                    <Link to="/signin">
                        <Button variant="secondary" className="w-full">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t("auth.forgotPassword.backToSignIn")}
                        </Button>
                    </Link>
                </div>

                {/* Help text */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    {isReset ? t("emailSent.expiryReset") : t("emailSent.expiryVerification")}
                </p>
            </div>
        </div>
    );
};

export default EmailSent;

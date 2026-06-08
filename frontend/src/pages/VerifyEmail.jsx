import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { authAPI } from "../utils/api";
import Button from "../components/Button";
import { useLanguage } from "../contexts/LanguageContext";

const VerifyEmail = () => {
    const { t } = useLanguage();
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("loading"); // loading, success, error
    const [message, setMessage] = useState("");
    const [user, setUser] = useState(null);
    const hasVerified = useRef(false);

    useEffect(() => {
        const verifyEmail = async () => {
            // Prevent double execution in React StrictMode
            if (hasVerified.current) return;
            hasVerified.current = true;

            try {
                const response = await authAPI.verifyEmail(token);

                // apiCall returns data directly, not wrapped in response.data
                if (response.success) {
                    setStatus("success");
                    setMessage(response.message);
                    setUser(response.user);

                    // Store user in session (include token for socket authentication)
                    const userWithToken = {
                        ...response.user,
                        token: response.token,
                    };
                    sessionStorage.setItem("user", JSON.stringify(userWithToken));

                    // Redirect to dashboard after 3 seconds
                    setTimeout(() => {
                        navigate("/dashboard");
                    }, 3000);
                }
            } catch (error) {
                setStatus("error");
                setMessage(error.message || "Failed to verify email. The link may be invalid or expired.");
            }
        };

        if (token) {
            verifyEmail();
        } else {
            setStatus("error");
            setMessage("Invalid verification link.");
        }
    }, [token, navigate]);

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

                    {status === "loading" && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t("verifyEmailPage.title")}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t("verifyEmailPage.verifyingDesc")}
                            </p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t("verifyEmailPage.successTitle")}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>
                            {user && (
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-6">
                                    {t("verifyEmailPage.welcomeMsg", { name: user.name })}
                                </p>
                            )}
                            <Button onClick={() => navigate("/dashboard")} className="w-full">
                                {t("verifyEmailPage.goToDashboard")}
                            </Button>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t("verifyEmailPage.errorTitle")}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>
                            <div className="space-y-3">
                                <Button onClick={() => navigate("/signin")} className="w-full">
                                    {t("verifyEmailPage.goToSignIn")}
                                </Button>
                                <Link
                                    to="/signin"
                                    className="block text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                >
                                    {t("verifyEmailPage.resendLink")}
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                {/* Help text */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    {t("verifyEmailPage.troubleText")}{" "}
                    <a href="mailto:support@farmkonnect.com" className="text-emerald-600 hover:underline">
                        {t("verifyEmailPage.contactSupportLink")}
                    </a>
                </p>
            </div>
        </div>
    );
};

export default VerifyEmail;

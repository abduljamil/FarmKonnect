import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { authAPI } from "../utils/api";
import Button from "../components/Button";
import Input from "../components/Input";
import { useLanguage } from "../contexts/LanguageContext";

const ResetPassword = () => {
    const { t } = useLanguage();
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validate passwords
        if (password.length < 6) {
            setError(t("resetPassword.errMinChars"));
            return;
        }

        if (password !== confirmPassword) {
            setError(t("resetPassword.errMismatch"));
            return;
        }

        setLoading(true);

        try {
            const response = await authAPI.resetPassword(token, password);

            // apiCall returns data directly
            if (response.success) {
                setSuccess(true);
                // Redirect to sign in after 3 seconds
                setTimeout(() => {
                    navigate("/signin");
                }, 3000);
            }
        } catch (err) {
            setError(err.message || "Failed to reset password. The link may be invalid or expired.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
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

                        {/* Success Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t("resetPassword.successTitle")}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {t("resetPassword.successMsg")}
                        </p>

                        <Button onClick={() => navigate("/signin")} className="w-full">
                            {t("resetPassword.signInNow")}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-3">
                            <span className="text-4xl">🌾</span>
                            <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                                FarmKonnect
                            </span>
                        </Link>
                    </div>

                    {/* Icon */}
                    <div className="w-16 h-16 mx-auto mb-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                        {t("resetPassword.title")}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                        {t("resetPassword.subtitle")}
                    </p>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 mb-6">
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    label={t("resetPassword.newPassword")}
                                    placeholder={t("resetPassword.newPasswordPlaceholder")}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <Input
                                type={showPassword ? "text" : "password"}
                                label={t("resetPassword.confirmPassword")}
                                placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t("resetPassword.resetting")}
                                </>
                            ) : (
                                t("resetPassword.button")
                            )}
                        </Button>
                    </form>

                    {/* Back to sign in */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/signin"
                            className="text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
                        >
                            {t("resetPassword.backToSignIn")}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

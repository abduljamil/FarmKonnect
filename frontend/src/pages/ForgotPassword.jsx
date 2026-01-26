import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { authAPI } from "../utils/api";
import Button from "../components/Button";
import Input from "../components/Input";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await authAPI.forgotPassword(email);

            // apiCall returns data directly
            if (response.success) {
                setSuccess(true);
            }
        } catch (err) {
            setError(err.message || "Failed to send reset email. Please try again.");
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
                            Check Your Email
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                            If an account exists with the email:
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-6">
                            {email}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            You'll receive a password reset link shortly.
                        </p>

                        <Link to="/signin">
                            <Button variant="secondary" className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Sign In
                            </Button>
                        </Link>
                    </div>

                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                        Reset link expires in 1 hour
                    </p>
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
                        <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                        Forgot Password?
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                        No worries! Enter your email and we'll send you a reset link.
                    </p>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <Input
                                type="email"
                                label="Email Address"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Send Reset Link"
                            )}
                        </Button>
                    </form>

                    {/* Back to sign in */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/signin"
                            className="inline-flex items-center text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

import React, { useState, useEffect } from "react";
import API_URL from "../config";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import ErrorMessage from "../components/ErrorMessage";
import GuestNavbar from "../components/GuestNavbar";
import { authAPI } from "../utils/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const SignIn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  // Check for OAuth errors or resend requests in URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const resendEmail = searchParams.get("resend");
    const authSuccess = searchParams.get("auth");

    if (errorParam === "google_auth_failed") {
      setError("Google sign-in failed. Please try again.");
    }

    if (resendEmail) {
      setUnverifiedEmail(resendEmail);
      setRequiresVerification(true);
    }

    const fetchUserData = async () => {
      try {
        const response = await authAPI.getMe();
        const userData = response.data?.user || response.user;
        const token = response.data?.token || response.token;
        if (userData) {
          const userWithToken = {
            ...userData,
            token: token,  // Include token for socket authentication
          };
          sessionStorage.setItem("user", JSON.stringify(userWithToken));
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("Failed to fetch user data after OAuth:", err);
      }
    };

    if (authSuccess === "success") {
      // OAuth was successful, fetch user data
      setGoogleLoading(true);
      fetchUserData();
    }
  }, [searchParams, navigate]);



  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setError("");

    try {
      await authAPI.resendVerification(unverifiedEmail);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    // Small delay to show loading state before redirect
    setTimeout(() => {
      window.location.href = `${API_URL}/auth/google`;
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setRequiresVerification(false);

    // Validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if email verification is required
        if (data.requiresVerification) {
          setRequiresVerification(true);
          setUnverifiedEmail(data.email || formData.email);
          throw new Error(data.message);
        }
        throw new Error(data.message || "Login failed");
      }

      // Store user data in sessionStorage (include token for socket connection)
      const userWithToken = {
        ...data.user,
        token: data.token,  // Include token for socket authentication
      };
      sessionStorage.setItem("user", JSON.stringify(userWithToken));

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Full-page Google OAuth loading overlay
  if (googleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-white dark:bg-gray-800 shadow-lg">
            <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connecting to Google
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we redirect you...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <GuestNavbar />
      <div className="flex justify-center items-center px-5 py-12 pt-24">
        <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 text-center">
            Sign in to your FarmKonnect account
          </p>

          {/* Verification Required Message */}
          {requiresVerification && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Email Verification Required
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                    Please verify your email address to continue. Check your inbox for the verification link.
                  </p>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendSuccess}
                    className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Sending...
                      </span>
                    ) : resendSuccess ? (
                      "✓ Verification email sent!"
                    ) : (
                      "Resend verification email"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ErrorMessage message={error} onClose={() => setError("")} />

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 min-h-[44px] mb-6 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              label="Email Address"
              required
            />

            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              label="Password"
              required
            />

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span>Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth loading={loading} className="mt-6">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;

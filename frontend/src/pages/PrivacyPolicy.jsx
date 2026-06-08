import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";

const PrivacyPolicy = () => {
    const { t } = useLanguage();
    const userData = sessionStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {user ? <Navbar user={user} /> : <GuestNavbar />}

            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-emerald-600 dark:from-primary-800 dark:to-emerald-800 text-white pt-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("staticPages.privacy.title")}</h1>
                    <p className="text-xl text-white/90">
                        {t("staticPages.privacy.lastUpdated")}: January 2026
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12">
                    <div className="prose dark:prose-invert max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                Welcome to FarmKonnect. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                We collect information that you provide directly to us, including:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                <li>Name, email address, and phone number</li>
                                <li>Profile information and profile pictures</li>
                                <li>Listing details including product descriptions and images</li>
                                <li>Transaction history and payment information</li>
                                <li>Communications between users</li>
                                <li>Location data for marketplace features</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                We use the information we collect to:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                <li>Provide, maintain, and improve our services</li>
                                <li>Process transactions and send related information</li>
                                <li>Send notifications about price alerts and market updates</li>
                                <li>Respond to your comments, questions, and customer service requests</li>
                                <li>Monitor and analyze trends, usage, and activities</li>
                                <li>Detect, investigate, and prevent fraudulent transactions</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Information Sharing</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                We do not sell, trade, or otherwise transfer your personal information to outside parties. We may share your information only in the following circumstances: with your consent, to comply with legal obligations, to protect our rights, or with service providers who assist in our operations.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Your Rights</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                You have the right to:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                <li>Access and receive a copy of your personal data</li>
                                <li>Rectify or update your personal information</li>
                                <li>Request deletion of your personal data</li>
                                <li>Object to processing of your personal data</li>
                                <li>Withdraw consent at any time</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Contact Us</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                If you have any questions about this Privacy Policy, please contact us at{" "}
                                <a href="mailto:privacy@farmkonnect.pk" className="text-primary-600 dark:text-primary-400 hover:underline">
                                    privacy@farmkonnect.pk
                                </a>{" "}
                                or visit our{" "}
                                <Link to="/contact" className="text-primary-600 dark:text-primary-400 hover:underline">
                                    Contact Page
                                </Link>.
                            </p>
                        </section>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default PrivacyPolicy;

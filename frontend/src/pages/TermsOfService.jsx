import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";

const TermsOfService = () => {
    const userData = sessionStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {user ? <Navbar user={user} /> : <GuestNavbar />}

            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-emerald-600 dark:from-primary-800 dark:to-emerald-800 text-white pt-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
                    <p className="text-xl text-white/90">
                        Last updated: January 2026
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12">
                    <div className="prose dark:prose-invert max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                By accessing and using FarmKonnect, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. These terms apply to all users, including farmers, buyers, and visitors.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                FarmKonnect is an agricultural marketplace platform that connects farmers directly with buyers. Our services include real-time commodity prices, price forecasting, listing management, direct messaging, and transaction facilitation.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. User Accounts</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                To use certain features, you must create an account. You agree to:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                <li>Provide accurate and complete information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Notify us immediately of any unauthorized access</li>
                                <li>Be responsible for all activities under your account</li>
                                <li>Not create multiple accounts for deceptive purposes</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Listing Guidelines</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                When creating listings, you must:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                <li>Provide accurate descriptions of your products</li>
                                <li>Use genuine images of your actual products</li>
                                <li>Set fair and reasonable prices</li>
                                <li>Not list prohibited or illegal items</li>
                                <li>Respond to buyer inquiries in a timely manner</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Transactions</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                FarmKonnect facilitates transactions between buyers and sellers but is not a party to any transaction. We are not responsible for the quality, safety, or legality of items listed. Buyers and sellers are responsible for fulfilling their respective obligations.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Prohibited Activities</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                You agree not to:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                <li>Violate any applicable laws or regulations</li>
                                <li>Post false, misleading, or fraudulent content</li>
                                <li>Harass, abuse, or harm other users</li>
                                <li>Attempt to manipulate prices or market data</li>
                                <li>Use automated systems to access our platform</li>
                                <li>Interfere with the proper functioning of the service</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Intellectual Property</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                All content on FarmKonnect, including logos, designs, text, and graphics, is owned by FarmKonnect or its licensors and is protected by intellectual property laws. You may not copy, modify, or distribute our content without permission.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Limitation of Liability</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                FarmKonnect is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you paid to us in the past twelve months.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Termination</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                We may suspend or terminate your account at any time for violations of these terms or for any other reason at our discretion. Upon termination, your right to use the platform ceases immediately.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Changes to Terms</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the platform. Your continued use after changes constitutes acceptance of the new terms.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Contact Us</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                If you have any questions about these Terms of Service, please contact us at{" "}
                                <a href="mailto:legal@farmkonnect.pk" className="text-primary-600 dark:text-primary-400 hover:underline">
                                    legal@farmkonnect.pk
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

export default TermsOfService;

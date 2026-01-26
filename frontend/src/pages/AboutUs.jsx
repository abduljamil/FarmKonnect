import React from "react";
import { Link } from "react-router-dom";
import { Users, Target, Heart, Shield, Leaf, TrendingUp } from "lucide-react";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";

const AboutUs = () => {
    const userData = sessionStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    const values = [
        {
            icon: Heart,
            title: "Farmer First",
            description: "Every decision we make prioritizes the welfare and success of Pakistani farmers.",
        },
        {
            icon: Shield,
            title: "Trust & Transparency",
            description: "Building trust through transparent pricing, secure transactions, and honest dealings.",
        },
        {
            icon: Leaf,
            title: "Sustainability",
            description: "Promoting sustainable farming practices for a greener future.",
        },
        {
            icon: TrendingUp,
            title: "Innovation",
            description: "Leveraging technology to solve age-old agricultural challenges.",
        },
    ];

    const team = [
        {
            name: "Muhammad Ali",
            role: "Founder & CEO",
            description: "Agricultural engineer with 10+ years of experience in farming technology.",
        },
        {
            name: "Fatima Hassan",
            role: "Head of Operations",
            description: "Expert in supply chain management and rural development initiatives.",
        },
        {
            name: "Ahmed Khan",
            role: "Tech Lead",
            description: "Full-stack developer passionate about building solutions for rural communities.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {user ? <Navbar user={user} /> : <GuestNavbar />}

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary-600 to-emerald-600 dark:from-primary-800 dark:to-emerald-800 text-white pt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Empowering Pakistani Farmers
                    </h1>
                    <p className="text-xl text-white/90 max-w-3xl mx-auto">
                        FarmKonnect is Pakistan's leading digital agricultural marketplace, connecting farmers directly with buyers
                        and providing real-time market intelligence to maximize profits.
                    </p>
                </div>
            </div>

            {/* Mission Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="w-6 h-6 text-primary-600" />
                            <span className="text-primary-600 font-semibold uppercase tracking-wide text-sm">Our Mission</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                            Revolutionizing Agriculture in Pakistan
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                            We believe that every farmer deserves access to fair prices, transparent markets, and modern technology.
                            FarmKonnect was born from the idea that by connecting farmers directly with buyers, we can eliminate
                            middlemen and ensure farmers receive the true value of their hard work.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            Our platform provides real-time market prices, AI-powered price predictions, and a secure marketplace
                            where farmers can list their produce and connect with buyers across Pakistan.
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-primary-100 to-emerald-100 dark:from-primary-900/30 dark:to-emerald-900/30 rounded-2xl p-8">
                        <div className="grid grid-cols-2 gap-6 text-center">
                            <div>
                                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">50K+</div>
                                <div className="text-gray-600 dark:text-gray-400">Registered Farmers</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">1M+</div>
                                <div className="text-gray-600 dark:text-gray-400">Transactions</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">100+</div>
                                <div className="text-gray-600 dark:text-gray-400">Districts Covered</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">24/7</div>
                                <div className="text-gray-600 dark:text-gray-400">Support Available</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Values Section */}
            <div className="bg-white dark:bg-gray-900 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Values</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            These core principles guide everything we do at FarmKonnect.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {values.map((value, index) => (
                            <div key={index} className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <value.icon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{value.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Team Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Users className="w-6 h-6 text-primary-600" />
                        <span className="text-primary-600 font-semibold uppercase tracking-wide text-sm">Our Team</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Meet the People Behind FarmKonnect</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {team.map((member, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-emerald-400 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                                {member.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">{member.name}</h3>
                            <p className="text-primary-600 dark:text-primary-400 text-sm text-center mb-3">{member.role}</p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm text-center">{member.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section - Only show when not logged in */}
            {!user && (
                <div className="bg-gradient-to-r from-primary-600 to-emerald-600 dark:from-primary-800 dark:to-emerald-800 py-16">
                    <div className="max-w-4xl mx-auto px-4 text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">Ready to Join FarmKonnect?</h2>
                        <p className="text-white/90 mb-8">
                            Start selling your produce directly to buyers and get the best prices for your hard work.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/signup"
                                className="px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                            >
                                Get Started Free
                            </Link>
                            <Link
                                to="/contact"
                                className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                            >
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default AboutUs;

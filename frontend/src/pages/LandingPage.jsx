import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import GuestNavbar from "../components/GuestNavbar";
import Navbar from "../components/Navbar";
import {
    TrendingUp,
    MessageCircle,
    Shield,
    MapPin,
    BarChart3,
    Zap,
    ArrowRight,
    Star,
    CheckCircle,
    ChevronRight,
    Users,
    Package,
    DollarSign,
} from "lucide-react";
import Button from "../components/Button";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";

const LandingPage = () => {
    const navigate = useNavigate();
    const { t, isUrdu } = useLanguage();
    const [user, setUser] = useState(null);

    // Check if user is logged in
    useEffect(() => {
        const userData = sessionStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem("user");
        setUser(null);
        navigate("/signin");
    };

    const features = [
        {
            icon: TrendingUp,
            title: t("landing.features.liveMandiPrices.title"),
            description: t("landing.features.liveMandiPrices.description"),
            color: "from-emerald-500 to-green-600",
        },
        {
            icon: BarChart3,
            title: t("landing.features.aiForecasts.title"),
            description: t("landing.features.aiForecasts.description"),
            color: "from-blue-500 to-indigo-600",
        },
        {
            icon: MessageCircle,
            title: t("landing.features.directChat.title"),
            description: t("landing.features.directChat.description"),
            color: "from-purple-500 to-violet-600",
        },
        {
            icon: Shield,
            title: t("landing.features.securePayments.title"),
            description: t("landing.features.securePayments.description"),
            color: "from-amber-500 to-orange-600",
        },
        {
            icon: Package,
            title: t("landing.features.easyListings.title"),
            description: t("landing.features.easyListings.description"),
            color: "from-rose-500 to-pink-600",
        },
        {
            icon: MapPin,
            title: t("landing.features.locationSearch.title"),
            description: t("landing.features.locationSearch.description"),
            color: "from-cyan-500 to-teal-600",
        },
    ];

    const steps = [
        {
            number: "01",
            title: t("landing.howItWorks.step1.title"),
            description: t("landing.howItWorks.step1.description"),
        },
        {
            number: "02",
            title: t("landing.howItWorks.step2.title"),
            description: t("landing.howItWorks.step2.description"),
        },
        {
            number: "03",
            title: t("landing.howItWorks.step3.title"),
            description: t("landing.howItWorks.step3.description"),
        },
    ];

    const testimonials = [
        {
            name: t("landing.testimonials.testimonial1.name"),
            role: t("landing.testimonials.testimonial1.role"),
            image: "/images/testimonial-1.jpg",
            quote: t("landing.testimonials.testimonial1.quote"),
            rating: 5,
        },
        {
            name: t("landing.testimonials.testimonial2.name"),
            role: t("landing.testimonials.testimonial2.role"),
            image: "/images/testimonial-2.jpg",
            quote: t("landing.testimonials.testimonial2.quote"),
            rating: 5,
        },
        {
            name: t("landing.testimonials.testimonial3.name"),
            role: t("landing.testimonials.testimonial3.role"),
            image: "/images/testimonial-3.jpg",
            quote: t("landing.testimonials.testimonial3.quote"),
            rating: 5,
        },
    ];

    const stats = [
        { value: "10,000+", label: t("landing.stats.farmersRegistered"), icon: Users },
        { value: "₨50M+", label: t("landing.stats.monthlyVolume"), icon: DollarSign },
        { value: "15", label: t("landing.stats.citiesCovered"), icon: MapPin },
        { value: "4.8★", label: t("landing.stats.userRating"), icon: Star },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950" dir={isUrdu ? "rtl" : "ltr"}>
            {user ? <Navbar user={user} onLogout={handleLogout} /> : <GuestNavbar />}

            {/* Hero Section */}
            <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0">
                    <img
                        src="/images/hero-farmer.jpg"
                        alt="Agricultural landscape"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        fetchpriority="low"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/80 to-gray-900/60 dark:from-gray-950/95 dark:via-gray-950/85 dark:to-gray-950/70" />
                </div>

                {/* Content */}
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`max-w-3xl ${isUrdu ? 'mr-0 ml-auto' : ''}`}>
                        {/* Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 text-sm font-medium mb-6 sm:mb-8 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                            <Zap className="w-4 h-4" />
                            <span>{t("landing.hero.badge")}</span>
                        </div>

                        {/* Headline */}
                        <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 ${isUrdu ? 'text-right' : 'text-left'}`}>
                            {t("landing.hero.title1")}{" "}
                            <span className="bg-gradient-to-r from-primary-400 to-emerald-400 bg-clip-text text-transparent">
                                {t("landing.hero.title2")}
                            </span>{" "}
                            {t("landing.hero.title3")}
                        </h1>

                        {/* Subheadline */}
                        <p className={`text-lg sm:text-xl text-gray-300 mb-8 sm:mb-10 leading-relaxed ${isUrdu ? 'text-right' : 'text-left'}`}>
                            {t("landing.hero.subtitle")}
                        </p>

                        {/* CTAs */}
                        <div className={`flex flex-col sm:flex-row gap-4 ${isUrdu ? 'sm:flex-row-reverse' : ''}`}>
                            <Button
                                onClick={() => navigate("/signup")}
                                className={`px-8 py-4 text-lg flex items-center justify-center gap-2 group ${isUrdu ? 'flex-row-reverse' : ''}`}
                            >
                                {t("landing.hero.cta")}
                                <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isUrdu ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                            </Button>
                            <Button
                                onClick={() => {
                                    navigate("/dashboard");
                                    setTimeout(() => {
                                        const element = document.getElementById("price-chart");
                                        if (element) {
                                            const offset = 100;
                                            const elementPosition = element.getBoundingClientRect().top;
                                            const offsetPosition = elementPosition + window.pageYOffset - offset;
                                            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                                        }
                                    }, 100);
                                }}
                                variant="outline"
                                className="px-8 py-4 text-lg border-white/30 text-white hover:bg-white/10"
                            >
                                {t("landing.hero.viewPrices")}
                            </Button>
                        </div>

                        {/* Trust Indicators */}
                        <div className={`flex flex-wrap items-center gap-6 mt-10 pt-10 border-t border-white/10 ${isUrdu ? 'justify-end' : ''}`}>
                            <div className={`flex items-center gap-2 text-gray-300 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                                <CheckCircle className="w-5 h-5 text-primary-400" />
                                <span>{t("landing.hero.noCommission")}</span>
                            </div>
                            <div className={`flex items-center gap-2 text-gray-300 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                                <CheckCircle className="w-5 h-5 text-primary-400" />
                                <span>{t("landing.hero.verifiedUsers")}</span>
                            </div>
                            <div className={`flex items-center gap-2 text-gray-300 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                                <CheckCircle className="w-5 h-5 text-primary-400" />
                                <span>{t("landing.hero.securePayments")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="relative -mt-8 z-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-3">
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            {t("landing.features.title")}
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            {t("landing.features.subtitle")}
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800"
                            >
                                <div
                                    className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-5 group-hover:scale-110 transition-transform`}
                                >
                                    <feature.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 sm:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            {t("landing.howItWorks.title")}
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            {t("landing.howItWorks.subtitle")}
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="grid md:grid-cols-3 gap-8 md:gap-12 lg:gap-16">
                        {steps.map((step, index) => (
                            <div key={index} className="relative">
                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`hidden md:block absolute top-12 h-0.5 ${isUrdu ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-green-500 to-green-500/30`}
                                        style={isUrdu ? {
                                            right: '50%',
                                            left: '-50%',
                                        } : {
                                            left: '50%',
                                            right: '-50%',
                                        }}
                                    />
                                )}

                                <div className="text-center px-2">
                                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 text-white text-3xl font-bold mb-6 shadow-lg shadow-primary-500/30 relative z-10">
                                        <span dir="ltr">{step.number}</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed break-words">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="text-center mt-12">
                        <Button
                            onClick={() => navigate("/signup")}
                            className="px-8 py-4 text-lg inline-flex items-center gap-2"
                        >
                            {t("landing.cta.createFreeAccount")}
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-20 sm:py-28 bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-gray-900 dark:to-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            {t("landing.testimonials.title")}
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            {t("landing.testimonials.subtitle")}
                        </p>
                    </div>

                    {/* Testimonials Grid */}
                    <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
                            >
                                {/* Rating */}
                                <div className={`flex gap-1 mb-4 ${isUrdu ? 'justify-end' : ''}`}>
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className="w-5 h-5 text-yellow-400 fill-yellow-400"
                                        />
                                    ))}
                                </div>

                                {/* Quote */}
                                <p className={`text-gray-700 dark:text-gray-300 mb-6 leading-relaxed ${isUrdu ? 'text-right' : 'text-left'}`}>
                                    "{testimonial.quote}"
                                </p>

                                {/* Author */}
                                <div className={`flex items-center gap-4 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                                    <img
                                        src={testimonial.image}
                                        alt={testimonial.name}
                                        className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="hidden w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg">
                                        {testimonial.name?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                    <div className={isUrdu ? 'text-right' : 'text-left'}>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {testimonial.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {testimonial.role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-20 sm:py-28">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-gradient-to-br from-primary-600 to-emerald-600 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl shadow-primary-500/20">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                            {t("landing.cta.title")}
                        </h2>
                        <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                            {t("landing.cta.subtitle")}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => navigate("/signup")}
                                className="px-8 py-4 text-lg font-semibold bg-white text-primary-700 hover:bg-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                {t("landing.cta.getStarted")}
                            </button>
                            <button
                                onClick={() => navigate("/signin")}
                                className="px-8 py-4 text-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-primary-700 rounded-xl transition-all duration-300"
                            >
                                {t("landing.cta.signIn")}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default LandingPage;

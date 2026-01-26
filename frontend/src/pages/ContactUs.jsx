import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, CheckCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import API_URL from "../config";
import Button from "../components/Button";

const ContactUs = () => {
    const navigate = useNavigate();
    const userData = sessionStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        subject: "",
        category: "other",
        message: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
      const response = await fetch(`${API_URL}/support/tickets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    subject: formData.subject,
                    category: formData.category,
                    message: formData.message,
                    guestName: formData.name,
                    guestEmail: formData.email,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setFormData({
                    name: user?.name || "",
                    email: user?.email || "",
                    subject: "",
                    category: "other",
                    message: "",
                });
            } else {
                setError(data.message || "Failed to send message");
            }
        } catch (err) {
            console.error("Contact form error:", err);
            setError("Failed to send message. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const contactInfo = [
        {
            icon: Mail,
            title: "Email Us",
            details: "support@farmkonnect.pk",
            subtext: "We'll respond within 24 hours",
        },
        {
            icon: Phone,
            title: "Call Us",
            details: "+92 300 123 4567",
            subtext: "Mon-Sat, 9AM-6PM PKT",
        },
        {
            icon: MapPin,
            title: "Visit Us",
            details: "Lahore, Punjab, Pakistan",
            subtext: "Head Office",
        },
        {
            icon: Clock,
            title: "Working Hours",
            details: "Mon - Sat: 9AM - 6PM",
            subtext: "Sunday: Closed",
        },
    ];

    const categories = [
        { value: "other", label: "General Inquiry" },
        { value: "technical", label: "Technical Support" },
        { value: "account", label: "Account Issues" },
        { value: "payment", label: "Payment & Billing" },
        { value: "dispute", label: "Dispute Resolution" },
        { value: "delivery", label: "Delivery Issues" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {user ? <Navbar user={user} /> : <GuestNavbar />}

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary-600 to-emerald-600 dark:from-primary-800 dark:to-emerald-800 text-white pt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Get in Touch
                    </h1>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Have questions? We're here to help. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Contact Info */}
                    <div className="lg:col-span-1">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Contact Information</h2>
                        <div className="space-y-6">
                            {contactInfo.map((info, index) => (
                                <div key={index} className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <info.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{info.title}</h3>
                                        <p className="text-gray-900 dark:text-white">{info.details}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{info.subtext}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Links */}
                        <div className="mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
                            <div className="space-y-3">
                                {user && (
                                    <Link
                                        to="/support"
                                        className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        View My Support Tickets
                                    </Link>
                                )}
                                <Link
                                    to="/about"
                                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                                >
                                    About FarmKonnect
                                </Link>
                                <Link
                                    to="/listings"
                                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                                >
                                    Browse Marketplace
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                            {success ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Thank you for contacting us. We'll get back to you within 24 hours.
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <Button onClick={() => setSuccess(false)}>Send Another Message</Button>
                                        {user && (
                                            <Button variant="secondary" onClick={() => navigate("/support")}>
                                                View My Tickets
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Send us a Message</h2>

                                    {error && (
                                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Your Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    placeholder="Enter your name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Email Address <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    placeholder="Enter your email"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Subject <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="subject"
                                                    value={formData.subject}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    placeholder="What's this about?"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Category
                                                </label>
                                                <select
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    className="w-full min-w-[150px] px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer shadow-sm"
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat.value} value={cat.value} className="bg-white dark:bg-gray-700">{cat.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Message <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                rows={6}
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                                placeholder="Tell us how we can help..."
                                            />
                                        </div>

                                        <Button type="submit" loading={loading} className="w-full md:w-auto">
                                            <Send className="w-4 h-4 mr-2" />
                                            Send Message
                                        </Button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default ContactUs;

import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Facebook,
  Twitter,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t, isUrdu } = useLanguage();

  const footerLinks = {
    marketplace: [
      { label: "Browse Listings", href: "/listings" },
      { label: "Post a Listing", href: "/listings/create" },
      { label: "My Listings", href: "/listings" },
      { label: "Categories", href: "/listings" },
    ],
    resources: [
      { label: "Live Prices", href: "/dashboard" },
      { label: "Price Forecasts", href: "/dashboard" },
      { label: "Market Insights", href: "/dashboard" },
      { label: "How It Works", href: "/#how-it-works" },
    ],
    support: [
      { label: "Help Center", href: "/support" },
      { label: "Contact Us", href: "/contact" },
      { label: "About Us", href: "/about" },
      { label: "FAQs", href: "/contact" },
    ],
    legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  };

  const socialLinks = [
    {
      label: "Facebook",
      icon: Facebook,
      href: "https://facebook.com",
      color: "hover:text-blue-500",
    },
    {
      label: "Twitter",
      icon: Twitter,
      href: "https://twitter.com",
      color: "hover:text-sky-500",
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: "https://wa.me/923001234567",
      color: "hover:text-green-500",
    },
  ];

  return (
    <footer className="bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🌾</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 dark:from-primary-400 to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
                FarmKonnect
              </span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">
              {t("footer.description")}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="mailto:support@farmkonnect.pk"
                className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>support@farmkonnect.pk</span>
              </a>
              <a
                href="tel:+923001234567"
                className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>+92 300 123 4567</span>
              </a>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <MapPin className="w-5 h-5" />
                <span>Lahore, Punjab, Pakistan</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 ${social.color} transition-colors`}
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Marketplace Links */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("nav.marketplace")}</h3>
            <ul className="space-y-3">
              {footerLinks.marketplace.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("footer.resources")}</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("footer.contact")}</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Payment Methods */}
            <div className="mt-6">
              <h4 className="text-gray-900 dark:text-white font-semibold mb-3 text-sm">Payment Partners</h4>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded text-xs font-medium text-green-600 dark:text-green-400">
                  Easypaisa
                </div>
                <div className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded text-xs font-medium text-red-600 dark:text-red-400">
                  JazzCash
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-300 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 dark:text-gray-500 text-sm text-center sm:text-left">
              {t("footer.copyright")} {t("footer.madeWith")} 💚 {t("footer.forFarmers")}
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-500">
              <Link to="#" className="hover:text-primary-600 dark:hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="#" className="hover:text-primary-600 dark:hover:text-white transition-colors">
                Terms
              </Link>
              <Link to="#" className="hover:text-primary-600 dark:hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

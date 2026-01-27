import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Facebook,
  Twitter,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const Footer = () => {
  const { t, isUrdu } = useLanguage();
  const location = useLocation();

  // Handle link click - scroll to top if already on the page
  const handleLinkClick = (href) => {
    if (location.pathname === href) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    <footer
      className="bg-gray-100 dark:bg-gray-950 text-gray-600 dark:text-gray-300"
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" onClick={() => handleLinkClick("/")} className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🌾</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                FarmKonnect
              </span>
            </Link>
            <p className={`text-gray-600 dark:text-gray-400 mb-6 max-w-xs leading-relaxed ${isUrdu ? 'text-right' : 'text-left'}`}>
              {t("footer.description")}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="mailto:support@farmkonnect.pk"
                className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
              >
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span dir="ltr">support@farmkonnect.pk</span>
              </a>
              <a
                href="tel:+923001234567"
                className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors"
              >
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span dir="ltr">+92 300 123 4567</span>
              </a>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span>{isUrdu ? "لاہور، پنجاب، پاکستان" : "Lahore, Punjab, Pakistan"}</span>
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
            <h3 className={`text-gray-900 dark:text-white font-semibold mb-4 ${isUrdu ? 'text-right' : 'text-left'}`}>
              {t("nav.marketplace")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/listings"
                  onClick={() => handleLinkClick("/listings")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.browseListings")}
                </Link>
              </li>
              <li>
                <Link
                  to="/listings/create"
                  onClick={() => handleLinkClick("/listings/create")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.postListing")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className={`text-gray-900 dark:text-white font-semibold mb-4 ${isUrdu ? 'text-right' : 'text-left'}`}>
              {t("footer.resources")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/dashboard"
                  onClick={() => handleLinkClick("/dashboard")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.dashboard")}
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  onClick={() => handleLinkClick("/dashboard")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.priceTrends")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className={`text-gray-900 dark:text-white font-semibold mb-4 ${isUrdu ? 'text-right' : 'text-left'}`}>
              {t("footer.contact")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/contact"
                  onClick={() => handleLinkClick("/contact")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.contactUs")}
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  onClick={() => handleLinkClick("/support")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.support")}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  onClick={() => handleLinkClick("/about")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className={`text-gray-900 dark:text-white font-semibold mb-4 ${isUrdu ? 'text-right' : 'text-left'}`}>
              {t("footer.legal")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/privacy"
                  onClick={() => handleLinkClick("/privacy")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  onClick={() => handleLinkClick("/terms")}
                  className={`block text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-white transition-colors ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {t("footer.termsOfService")}
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-300 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isUrdu ? 'sm:flex-row-reverse' : ''}`}>
            <p className={`text-gray-500 dark:text-gray-500 text-sm ${isUrdu ? 'text-right' : 'text-center sm:text-left'}`}>
              {t("footer.copyright")} {t("footer.madeWith")} 💚 {t("footer.forFarmers")}
            </p>
            <div className={`flex items-center gap-4 text-sm ${isUrdu ? 'flex-row-reverse' : ''}`}>
              <Link
                to="/privacy"
                onClick={() => handleLinkClick("/privacy")}
                className="text-gray-500 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {t("footer.privacyPolicy")}
              </Link>
              <Link
                to="/terms"
                onClick={() => handleLinkClick("/terms")}
                className="text-gray-500 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {t("footer.termsOfService")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

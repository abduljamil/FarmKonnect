import React from "react";
import { Link } from "react-router-dom";
import {
  Database,
  Layers,
  Cpu,
  GitBranch,
  Activity,
  LineChart,
  RefreshCw,
  Sparkles,
  Info,
  ArrowRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";

const Methodology = () => {
  const { t } = useLanguage();
  const userData = sessionStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  const steps = [
    { icon: Database, title: t("methodology.step1Title"), desc: t("methodology.step1Desc") },
    { icon: Layers, title: t("methodology.step2Title"), desc: t("methodology.step2Desc") },
    { icon: Cpu, title: t("methodology.step3Title"), desc: t("methodology.step3Desc") },
    { icon: GitBranch, title: t("methodology.step4Title"), desc: t("methodology.step4Desc") },
    { icon: Activity, title: t("methodology.step5Title"), desc: t("methodology.step5Desc") },
    { icon: LineChart, title: t("methodology.step6Title"), desc: t("methodology.step6Desc") },
    { icon: RefreshCw, title: t("methodology.step7Title"), desc: t("methodology.step7Desc") },
  ];

  const stats = [
    { value: t("methodology.statHorizons"), label: t("methodology.statHorizonsLabel") },
    { value: t("methodology.statData"), label: t("methodology.statDataLabel") },
    { value: t("methodology.statCadence"), label: t("methodology.statCadenceLabel") },
    { value: t("methodology.statModels"), label: t("methodology.statModelsLabel") },
  ];

  const readItems = [
    {
      swatch: <span className="inline-block w-8 h-0.5 border-t-2 border-dashed border-orange-500" />,
      title: t("methodology.readForecastTitle"),
      desc: t("methodology.readForecastDesc"),
    },
    {
      swatch: <span className="inline-block w-8 h-4 bg-orange-500/20 rounded-sm" />,
      title: t("methodology.readBandTitle"),
      desc: t("methodology.readBandDesc"),
    },
    {
      swatch: <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">±%</span>,
      title: t("methodology.readErrorTitle"),
      desc: t("methodology.readErrorDesc"),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {user ? <Navbar user={user} /> : <GuestNavbar />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-emerald-600 dark:from-primary-800 dark:to-emerald-800 text-white pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/90 text-sm font-medium mb-5">
            <Sparkles className="w-4 h-4" />
            {t("methodology.heroBadge")}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5">
            {t("methodology.heroTitle")}
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto">
            {t("methodology.heroSubtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Pipeline steps */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">
            {t("methodology.stepsTitle")}
          </h2>
          <div className="relative">
            {/* Vertical connector line on larger screens */}
            <div className="hidden sm:block absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-primary-300 to-emerald-300 dark:from-primary-700 dark:to-emerald-700" />
            <ol className="space-y-5">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={i} className="relative flex items-start gap-4 sm:gap-5">
                    <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary-500 dark:text-primary-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
            {t("methodology.statsTitle")}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 text-center shadow-sm"
              >
                <p className="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {s.value}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How to read a forecast */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
            {t("methodology.readTitle")}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {readItems.map((item, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm"
              >
                <div className="h-8 flex items-center mb-3">{item.swatch}</div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-5 sm:p-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              {t("methodology.disclaimerTitle")}
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-200/80 leading-relaxed">
              {t("methodology.disclaimerBody")}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20 border border-primary-100 dark:border-primary-800/30 rounded-2xl p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t("methodology.ctaTitle")}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t("methodology.ctaSubtitle")}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
          >
            {t("methodology.ctaButton")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default Methodology;

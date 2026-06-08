import { useNavigate } from "react-router-dom";
import { MessageCircle, Bell, ChevronRight } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";

// AttentionStrip — a compact, actionable row that surfaces what the user should
// act on (unread messages, triggered price alerts). Uses data already in
// context, so no extra fetches. Renders nothing when there's nothing to flag.
const AttentionStrip = ({ user, unreadCount = 0 }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { triggeredAlerts = [] } = useNotifications();

  if (!user) return null;

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const items = [];
  if (unreadCount > 0) {
    items.push({
      icon: MessageCircle,
      label: t("dashboard.attention.messages", { count: unreadCount }),
      styles: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
      onClick: () => navigate("/chat"),
    });
  }
  if (triggeredAlerts.length > 0) {
    items.push({
      icon: Bell,
      label: t("dashboard.attention.alerts", { count: triggeredAlerts.length }),
      styles: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
      onClick: () => scrollTo("price-alerts"),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
        {t("dashboard.attention.title")}
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={item.onClick}
              className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors text-left"
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${item.styles}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                {item.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AttentionStrip;

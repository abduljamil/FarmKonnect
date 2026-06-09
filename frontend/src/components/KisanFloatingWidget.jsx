import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  Wrench,
  Search,
  TrendingUp,
  CloudSun,
  ShoppingBag,
  Sparkles,
  RotateCcw,
} from "lucide-react";

// FarmKonnect brand mark — single source of truth used everywhere Kisan's
// avatar appears (FAB, header, message bubbles, welcome).
const BRAND_EMOJI = "🌾";
import kisanAPI from "../utils/kisanApi";

// Pages where the widget should NOT appear
const HIDDEN_PATHS = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/email-sent",
];

const QUICK_ACTIONS = [
  {
    label: "Wheat price in Lahore",
    prompt: "What's the wheat price in Lahore right now?",
    icon: TrendingUp,
    color: "from-amber-500 to-amber-600",
  },
  {
    label: "Find rice listings",
    prompt: "Show me Rice Basmati listings on the marketplace",
    icon: ShoppingBag,
    color: "from-sky-500 to-sky-600",
  },
  {
    label: "Forecast cotton price",
    prompt: "What's the 4-week price forecast for Cotton in Multan?",
    icon: Sparkles,
    color: "from-purple-500 to-purple-600",
  },
  {
    label: "Weather in Faisalabad",
    prompt: "What's the weather like in Faisalabad for farming today?",
    icon: CloudSun,
    color: "from-cyan-500 to-cyan-600",
  },
];

const TOOL_PRESENTATION = {
  searchListings: { label: "Searching marketplace", icon: Search },
  getCommodityPrice: { label: "Checking mandi prices", icon: TrendingUp },
  getPriceForecast: { label: "Running AI forecast", icon: Sparkles },
  getWeather: { label: "Fetching weather", icon: CloudSun },
  createSupportTicket: { label: "Creating support ticket", icon: Wrench },
};

const STORAGE_KEY = "kisan_widget_state_v1";

export default function KisanFloatingWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Hide widget on auth/landing pages and when not logged in
  const shouldHide =
    !user ||
    location.pathname === "/" ||
    HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  // Restore conversation from sessionStorage on mount
  useEffect(() => {
    if (!user) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.conversationId) setConversationId(saved.conversationId);
    } catch {}
  }, [user]);

  // Persist conversation id
  useEffect(() => {
    if (conversationId) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ conversationId })
      );
    }
  }, [conversationId]);

  // First-visit hint bubble — shows for 6s
  useEffect(() => {
    if (shouldHide || open) return;
    const seen = localStorage.getItem("kisan_hint_seen");
    if (seen) return;
    const t = setTimeout(() => setShowHint(true), 2000);
    const t2 = setTimeout(() => {
      setShowHint(false);
      localStorage.setItem("kisan_hint_seen", "1");
    }, 9000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [shouldHide, open]);

  // Autoscroll on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  // Load messages when opening with an existing conversation
  useEffect(() => {
    if (!open || !conversationId || messages.length > 0) return;
    (async () => {
      try {
        const res = await kisanAPI.getMessages(conversationId);
        setMessages(res.data || []);
      } catch (e) {
        console.warn("Kisan widget: load messages failed", e?.message);
      }
    })();
  }, [open, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || sending) return;

      setSending(true);
      setInput("");
      setShowHint(false);

      const tempMsg = {
        _id: `tmp-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, tempMsg]);

      try {
        let convoId = conversationId;
        if (!convoId) {
          const startRes = await kisanAPI.startConversation(text);
          convoId = startRes.data?._id;
          setConversationId(convoId);
        }

        const res = await kisanAPI.sendMessage(convoId, text);
        const { reply, toolCalls, messageId } = res.data || {};
        setMessages((prev) => [
          ...prev,
          {
            _id: messageId || `m-${Date.now()}`,
            role: "model",
            content: reply || "Sorry, I couldn't generate a response.",
            toolCalls,
            createdAt: new Date(),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            _id: `err-${Date.now()}`,
            role: "model",
            content: `Sorry, something went wrong: ${err.message}`,
            error: true,
            createdAt: new Date(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [input, sending, conversationId]
  );

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    sessionStorage.removeItem(STORAGE_KEY);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (shouldHide) return null;

  return (
    <>
      <KisanAnimations />

      {/* Floating bubble (closed state) */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
          {showHint && (
            <div className="kisan-hint-pop relative max-w-[240px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 px-4 py-3 mr-1">
              <div className="text-sm text-gray-800 dark:text-gray-200">
                <span className="font-semibold">Hi 👋</span> I'm Kisan, your
                FarmKonnect AI. Tap to ask me anything!
              </div>
              <button
                onClick={() => {
                  setShowHint(false);
                  localStorage.setItem("kisan_hint_seen", "1");
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-[-8px] right-6 w-4 h-4 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45" />
            </div>
          )}

          <button
            onClick={() => setOpen(true)}
            className="kisan-fab group relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-green-600 text-white shadow-2xl shadow-green-500/40 hover:scale-110 transition-transform duration-300 flex items-center justify-center"
            aria-label="Open Kisan AI"
          >
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30 group-hover:opacity-50" />
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-600" />
            <span
              className="relative text-3xl leading-none drop-shadow-md"
              role="img"
              aria-label="FarmKonnect"
            >
              {BRAND_EMOJI}
            </span>
            <span className="absolute -top-1 -right-1 bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md tracking-wider">
              AI
            </span>
          </button>
        </div>
      )}

      {/* Chat panel (open state) */}
      {open && (
        <div
          className={`fixed z-[60] kisan-panel-pop ${
            expanded
              ? "inset-4 sm:inset-8"
              : "bottom-5 right-5 left-5 sm:left-auto sm:bottom-5 sm:right-5 sm:w-[400px] h-[min(640px,calc(100vh-40px))]"
          }`}
        >
          <div className="relative w-full h-full rounded-3xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col backdrop-blur-xl">
            {/* Gradient header */}
            <div className="relative px-4 py-4 bg-gradient-to-br from-emerald-500 via-green-600 to-green-700 text-white flex-shrink-0">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center kisan-avatar-pulse">
                      <span className="text-2xl leading-none">{BRAND_EMOJI}</span>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-green-700 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base leading-tight">
                        Kisan AI
                      </h2>
                      <span className="text-[10px] font-semibold bg-white/20 backdrop-blur px-1.5 py-0.5 rounded-md">
                        BETA
                      </span>
                    </div>
                    <p className="text-[11px] text-green-100 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                      Online · FarmKonnect Assistant
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={handleNewChat}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                      title="New chat"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors hidden sm:block"
                    title={expanded ? "Shrink" : "Expand"}
                  >
                    {expanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900"
            >
              {messages.length === 0 ? (
                <WelcomeBlock onPick={(p) => handleSend(p)} />
              ) : (
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <MessageBubble
                      key={m._id}
                      message={m}
                      isFirst={i === 0}
                    />
                  ))}
                  {sending && <ThinkingBubble />}
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="px-3 pt-2 pb-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl px-3 py-1.5 border border-gray-200 dark:border-gray-700 focus-within:border-green-500 dark:focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-500/20 transition">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about prices, listings, weather…"
                  rows={1}
                  disabled={sending}
                  className="flex-1 bg-transparent outline-none resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 max-h-28 py-1.5"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white transition-all flex-shrink-0 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] text-gray-400">
                  Powered by Gemini · Verify important info
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/kisan");
                  }}
                  className="text-[10px] text-green-600 dark:text-green-400 hover:underline font-medium"
                >
                  Open full chat →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WelcomeBlock({ onPick }) {
  return (
    <div className="kisan-welcome">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white flex-shrink-0 shadow-md kisan-avatar-bounce">
          <span className="text-xl leading-none">{BRAND_EMOJI}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-block max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 border border-green-200/60 dark:border-gray-700">
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
              <span className="font-semibold">Hi, I'm Kisan AI 🌾</span>
              <br />
              How can I help you today?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Ask me about <span className="font-medium text-green-700 dark:text-green-400">mandi prices</span>,{" "}
              <span className="font-medium text-green-700 dark:text-green-400">marketplace listings</span>,{" "}
              <span className="font-medium text-green-700 dark:text-green-400">weather</span>, or{" "}
              <span className="font-medium text-green-700 dark:text-green-400">AI forecasts</span> for
              Wheat, Rice, Cotton, Sugar &amp; Maize.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
        ✨ Try asking
      </p>
      <div className="grid grid-cols-1 gap-2">
        {QUICK_ACTIONS.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => onPick(a.prompt)}
              className="kisan-suggestion text-left flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-md transition-all"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center text-white flex-shrink-0`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate">
                {a.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ message, isFirst }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end kisan-message-slide-right">
        <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-gradient-to-br from-green-500 to-green-600 text-white text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${!isFirst ? "kisan-message-slide-left" : ""}`}>
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
        <span className="text-sm leading-none">{BRAND_EMOJI}</span>
      </div>
      <div className="flex-1 min-w-0">
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {message.toolCalls.map((tc, i) => {
              const pres = TOOL_PRESENTATION[tc.name] || {
                label: tc.name,
                icon: Wrench,
              };
              const ToolIcon = pres.icon;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                >
                  <ToolIcon className="w-2.5 h-2.5" />
                  {pres.label}
                </span>
              );
            })}
          </div>
        )}
        <div
          className={`inline-block max-w-[90%] px-3.5 py-2 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap break-words shadow-sm ${
            message.error
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2 kisan-message-slide-left">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
        <span className="text-sm leading-none">{BRAND_EMOJI}</span>
      </div>
      <div className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full kisan-typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full kisan-typing-dot" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full kisan-typing-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function KisanAnimations() {
  return (
    <style>{`
      @keyframes kisan-fab-pulse {
        0%, 100% { box-shadow: 0 10px 25px -5px rgba(34, 197, 94, 0.4), 0 0 0 0 rgba(34, 197, 94, 0.4); }
        50% { box-shadow: 0 10px 25px -5px rgba(34, 197, 94, 0.6), 0 0 0 12px rgba(34, 197, 94, 0); }
      }
      .kisan-fab { animation: kisan-fab-pulse 2.6s ease-in-out infinite; }

      @keyframes kisan-panel-pop {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .kisan-panel-pop { animation: kisan-panel-pop 280ms cubic-bezier(0.16, 1, 0.3, 1); transform-origin: bottom right; }

      @keyframes kisan-hint-pop {
        from { opacity: 0; transform: translateY(8px) scale(0.94); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .kisan-hint-pop { animation: kisan-hint-pop 280ms cubic-bezier(0.16, 1, 0.3, 1); }

      @keyframes kisan-avatar-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .kisan-avatar-pulse { animation: kisan-avatar-pulse 2.4s ease-in-out infinite; }

      @keyframes kisan-avatar-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      .kisan-avatar-bounce { animation: kisan-avatar-bounce 1.8s ease-in-out infinite; }

      @keyframes kisan-suggestion-in {
        from { opacity: 0; transform: translateX(-6px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .kisan-suggestion { animation: kisan-suggestion-in 320ms ease-out backwards; }

      @keyframes kisan-msg-left {
        from { opacity: 0; transform: translateX(-8px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .kisan-message-slide-left { animation: kisan-msg-left 220ms ease-out; }

      @keyframes kisan-msg-right {
        from { opacity: 0; transform: translateX(8px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .kisan-message-slide-right { animation: kisan-msg-right 220ms ease-out; }

      @keyframes kisan-typing {
        0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
        30% { opacity: 1; transform: scale(1.1); }
      }
      .kisan-typing-dot { animation: kisan-typing 1.2s ease-in-out infinite; }
    `}</style>
  );
}

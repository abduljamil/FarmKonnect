import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Sprout,
  Plus,
  Trash2,
  Loader2,
  Wrench,
  MessageSquare,
} from "lucide-react";
import kisanAPI from "../utils/kisanApi";

const SUGGESTIONS = [
  "What's the tomato price in Lahore today?",
  "Find me wheat seeds under PKR 5000",
  "Weather forecast for Multan",
  "How do I treat yellow leaves on my wheat crop?",
];

const TOOL_LABELS = {
  searchListings: "Searching marketplace",
  getCommodityPrice: "Checking prices",
  getWeather: "Fetching weather",
  createSupportTicket: "Creating support ticket",
};

export default function Kisan() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    refreshConversations();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const refreshConversations = async () => {
    try {
      const res = await kisanAPI.listConversations();
      setConversations(res.data || []);
    } catch (e) {
      console.error("Kisan: failed to list conversations", e);
    }
  };

  const loadMessages = async (id) => {
    setLoadingMessages(true);
    try {
      const res = await kisanAPI.getMessages(id);
      setMessages(res.data || []);
    } catch (e) {
      console.error("Kisan: failed to load messages", e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setSidebarOpen(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await kisanAPI.deleteConversation(id);
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      await refreshConversations();
    } catch (err) {
      console.error("Kisan: delete failed", err);
    }
  };

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    const tempUserMsg = {
      _id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let convoId = activeId;
      if (!convoId) {
        const startRes = await kisanAPI.startConversation(text);
        convoId = startRes.data._id;
        setActiveId(convoId);
        setConversations((prev) => [startRes.data, ...prev]);
      }

      const sendRes = await kisanAPI.sendMessage(convoId, text);
      const { reply, toolCalls, messageId } = sendRes.data;

      setMessages((prev) => [
        ...prev,
        {
          _id: messageId || `m-${Date.now()}`,
          role: "model",
          content: reply,
          toolCalls,
          createdAt: new Date(),
        },
      ]);
      refreshConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          _id: `err-${Date.now()}`,
          role: "model",
          content: `Sorry, something went wrong: ${err.message}`,
          createdAt: new Date(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-7rem)]">

          <aside
            className={`${sidebarOpen ? "block" : "hidden"} lg:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 overflow-hidden flex flex-col`}
          >
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              New chat
            </button>

            <div className="mt-4 flex-1 overflow-y-auto -mx-2 px-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
                History
              </p>
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 px-2 py-4">
                  No conversations yet
                </p>
              ) : (
                <ul className="space-y-1">
                  {conversations.map((c) => (
                    <li key={c._id}>
                      <button
                        onClick={() => {
                          setActiveId(c._id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex items-center justify-between gap-2 ${
                          activeId === c._id
                            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <span className="truncate flex-1">{c.title}</span>
                        <Trash2
                          onClick={(e) => handleDelete(c._id, e)}
                          className="w-4 h-4 opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-red-500 flex-shrink-0"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <main className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
            <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900 dark:text-white">
                    Kisan
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your FarmKonnect AI assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen((s) => !s)}
                className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                aria-label="Toggle history"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4"
            >
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyState onPick={(s) => handleSend(s)} />
              ) : (
                messages.map((m) => <MessageRow key={m._id} message={m} />)
              )}
              {sending && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kisan is thinking…
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 px-3 sm:px-4 py-3">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl px-3 py-2 border border-gray-200 dark:border-gray-700 focus-within:border-green-500 dark:focus-within:border-green-400 transition">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Kisan about prices, listings, weather…"
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm max-h-32 py-1.5"
                  disabled={sending}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  className="p-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                Kisan can make mistakes — verify important info.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-10">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white mb-4 shadow-lg">
        <Sprout className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Hi, I'm Kisan 🌾
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
        Ask about market prices, find listings, check weather, or get farming
        advice. I have live access to FarmKonnect data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full px-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm text-gray-700 dark:text-gray-300 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({ message }) {
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-green-600 text-white text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
        <Sprout className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              >
                <Wrench className="w-3 h-3" />
                {TOOL_LABELS[tc.name] || tc.name}
              </span>
            ))}
          </div>
        )}
        <div
          className={`inline-block max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm whitespace-pre-wrap break-words ${
            message.error
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

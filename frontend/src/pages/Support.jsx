import React, { useState, useEffect, useRef } from "react";
import API_URL from "../config";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { MessageSquare, Send, ArrowLeft, Clock, CheckCircle, AlertCircle, User, Shield, Plus } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";

const Support = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const transactionId = searchParams.get("transaction");
    const ticketIdParam = searchParams.get("ticket");

    const userData = sessionStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [newTicketForm, setNewTicketForm] = useState({
        subject: "",
        category: transactionId ? "dispute" : "other",
        message: "",
    });
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate("/signin?redirect=/support");
            return;
        }
        fetchTickets();
    }, [user, navigate]);

    useEffect(() => {
        if (transactionId) {
            setShowNewTicket(true);
            setNewTicketForm(prev => ({
                ...prev,
                category: "dispute",
                subject: `Issue with Transaction #${transactionId.slice(-6)}`,
            }));
        }
    }, [transactionId]);

    // Handle ticket ID from URL (from notification click)
    useEffect(() => {
        if (ticketIdParam && tickets.length > 0) {
            const ticket = tickets.find(t => t._id === ticketIdParam);
            if (ticket) {
                fetchTicket(ticket._id);
            }
        }
    }, [ticketIdParam, tickets]);

    const fetchTickets = async () => {
        try {
      const response = await fetch(`${API_URL}/support/tickets`, {
                credentials: "include",
            });
            const data = await response.json();
            if (data.success) {
                setTickets(data.data);
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicket = async (ticketId) => {
        try {
      const response = await fetch(`${API_URL}/support/tickets/${ticketId}`, {
                credentials: "include",
            });
            const data = await response.json();
            if (data.success) {
                setSelectedTicket(data.data);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        } catch (error) {
            console.error("Error fetching ticket:", error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicket) return;

        setSending(true);
        try {
      const response = await fetch(`${API_URL}/support/tickets/${selectedTicket._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content: newMessage }),
            });

            const data = await response.json();
            if (data.success) {
                setSelectedTicket(data.data);
                setNewMessage("");
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!newTicketForm.subject || !newTicketForm.message) return;

        setSending(true);
        try {
      const response = await fetch(`${API_URL}/support/tickets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ...newTicketForm,
                    transactionId: transactionId || undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setShowNewTicket(false);
                setNewTicketForm({ subject: "", category: "other", message: "" });
                await fetchTickets();
                setSelectedTicket(data.data);
            }
        } catch (error) {
            console.error("Error creating ticket:", error);
        } finally {
            setSending(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
            resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
        };
        const labels = {
            open: "Open",
            in_progress: "In Progress",
            resolved: "Resolved",
            closed: "Closed",
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleString("en-PK", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (!user) return null;

    if (loading) {
        return <Loader fullScreen size="lg" />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col pt-16 sm:pt-20">
            <Navbar user={user} />

            <div className="flex-1 container mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h1>
                    </div>
                    <Button onClick={() => setShowNewTicket(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Ticket
                    </Button>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                    {/* Tickets List */}
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="font-semibold text-gray-900 dark:text-white">My Tickets</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {tickets.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No support tickets yet</p>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="mt-4"
                                        onClick={() => setShowNewTicket(true)}
                                    >
                                        Create your first ticket
                                    </Button>
                                </div>
                            ) : (
                                tickets.map((ticket) => (
                                    <button
                                        key={ticket._id}
                                        onClick={() => fetchTicket(ticket._id)}
                                        className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedTicket?._id === ticket._id ? "bg-primary-50 dark:bg-primary-900/20" : ""
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate pr-2">
                                                {ticket.subject}
                                            </h3>
                                            {getStatusBadge(ticket.status)}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(ticket.updatedAt)}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                        {showNewTicket ? (
                            <div className="flex-1 p-6 overflow-y-auto">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Create New Ticket</h2>
                                <form onSubmit={handleCreateTicket} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                                        <input
                                            type="text"
                                            value={newTicketForm.subject}
                                            onChange={(e) => setNewTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Brief description of your issue"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                        <select
                                            value={newTicketForm.category}
                                            onChange={(e) => setNewTicketForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full min-w-[150px] px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer shadow-sm"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                                        >
                                            <option value="other" className="bg-white dark:bg-gray-700">General</option>
                                            <option value="dispute" className="bg-white dark:bg-gray-700">Transaction Dispute</option>
                                            <option value="payment" className="bg-white dark:bg-gray-700">Payment Issue</option>
                                            <option value="delivery" className="bg-white dark:bg-gray-700">Delivery Issue</option>
                                            <option value="technical" className="bg-white dark:bg-gray-700">Technical Problem</option>
                                            <option value="account" className="bg-white dark:bg-gray-700">Account Issue</option>
                                        </select>
                                    </div>
                                    {transactionId && (
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                                            📋 This ticket will be linked to Transaction #{transactionId.slice(-6)}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                                        <textarea
                                            value={newTicketForm.message}
                                            onChange={(e) => setNewTicketForm(prev => ({ ...prev, message: e.target.value }))}
                                            rows={6}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                            placeholder="Describe your issue in detail..."
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button type="button" variant="secondary" onClick={() => setShowNewTicket(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" loading={sending}>
                                            Create Ticket
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        ) : selectedTicket ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{selectedTicket.subject}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Category: {selectedTicket.category?.replace("_", " ")} • {getStatusBadge(selectedTicket.status)}
                                        </p>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                    {selectedTicket.messages?.map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div className={`max-w-[70%] ${msg.sender === "user" ? "order-2" : ""}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {msg.sender === "admin" ? (
                                                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                                            <Shield className="w-3 h-3" /> Support
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <User className="w-3 h-3" /> {msg.senderName || "You"}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                                                </div>
                                                <div
                                                    className={`p-3 rounded-lg ${msg.sender === "user"
                                                            ? "bg-primary-600 text-white"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        }`}
                                                >
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Reply Input */}
                                {selectedTicket.status !== "closed" && (
                                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type your message..."
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <Button type="submit" loading={sending} disabled={!newMessage.trim()}>
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <div className="text-center">
                                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Select a ticket to view the conversation</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Support;

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import ConfirmModal from "../components/ConfirmModal";
import API_URL from "../config";
import { useAuth } from "../utils/auth";
import chatAPI from "../utils/chatApi";
import socketService from "../utils/socket";
import useUserSync from "../hooks/useUserSync";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-sync user data (role updates)
  useUserSync(user, setUser, navigate);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalUsers: 0,
    totalConversations: 0,
    totalTransactions: 0,
  });
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState(null);
  const [supportTicketTab, setSupportTicketTab] = useState("user"); // "user" or "guest"
  const [activeTab, setActiveTab] = useState("listings"); // listings, users, transactions, or support
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editedRole, setEditedRole] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState("");
  const [scrapeError, setScrapeError] = useState("");
  const [scraperStatus, setScraperStatus] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "user",
  });
  const [copiedId, setCopiedId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
    variant: "danger",
  });

  // Dispute resolution state
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [disputeResolutionForm, setDisputeResolutionForm] = useState({
    resolution: "",
    newOrderStatus: "",
    newPaymentStatus: "",
  });

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const userData = sessionStorage.getItem("user");

    if (!userData) {
      navigate("/signin");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Only admins can access this page
    if (parsedUser.role !== "admin") {
      alert("Access denied. Admin only.");
      navigate("/dashboard");
      return;
    }

    loadUnreadCount();
    fetchAdminData();
    fetchScraperStatus();

    // Poll scraper status every 10 seconds
    const statusInterval = setInterval(fetchScraperStatus, 10000);

    // Connect socket with authentication token
    if (parsedUser.token) {
      socketService.connect(parsedUser.token);
    }

    // Listen for new messages directly on socket (don't use onNewMessage - it conflicts with Chat.jsx)
    if (socketService.socket) {
      socketService.socket.on("new_message", async () => {
        await fetchAdminData();
        await loadUnreadCount();
      });
    }

    // Listen for new conversations
    socketService.socket?.on("new_conversation", () => {
      fetchAdminData();
    });

    // Listen for deleted conversations
    socketService.socket?.on("conversation_deleted", () => {
      fetchAdminData();
    });

    // Listen for new listings (should come from backend)
    socketService.socket?.on("new_listing", () => {
      fetchAdminData();
    });

    // Listen for new users (should come from backend)
    socketService.socket?.on("new_user", () => {
      fetchAdminData();
    });

    // Listen for unread count updates (when messages are marked as read)
    socketService.onUnreadCountUpdated(async () => {
      await loadUnreadCount();
    });

    // Listen for order status updates
    socketService.onOrderStatusUpdate((update) => {
      setTransactions((prev) =>
        prev.map((t) => {
          if (t._id === update.transactionId) {
            if (update.newStatus === "paid") {
              return { ...t, paymentStatus: "paid", orderStatus: "confirmed" };
            }
            return { ...t, orderStatus: update.newStatus };
          }
          return t;
        })
      );
    });

    // Listen for new orders
    socketService.onNewOrder(() => {
      fetchAdminData();
    });

    return () => {
      clearInterval(statusInterval);
      // Cleanup listeners if component unmounts
      socketService.socket?.off("new_listing");
      socketService.socket?.off("new_user");
      socketService.socket?.off("new_conversation");
      socketService.socket?.off("conversation_deleted");
      socketService.offOrderStatusUpdate();
      socketService.offNewOrder();
    };
  }, [navigate]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch all listings with large limit to get accurate counts
      const listingsResponse = await fetch(
        `${API_URL}/listings?status=all&limit=1000`,
        {
          credentials: "include",
        }
      );
      const listingsData = await listingsResponse.json();

      // Fetch total users count
      const usersResponse = await fetch(
        `${API_URL}/auth/stats/users`,
        {
          credentials: "include",
        }
      );
      const usersData = await usersResponse.json();

      // Fetch total conversations count
      const conversationsResponse = await fetch(
        `${API_URL}/chat/stats/conversations`,
        {
          credentials: "include",
        }
      );
      const conversationsData = await conversationsResponse.json();

      // Fetch all users
      const allUsersResponse = await fetch(
        `${API_URL}/auth/users`,
        {
          credentials: "include",
        }
      );
      const allUsersData = await allUsersResponse.json();

      // Fetch all transactions
      const transactionsResponse = await fetch(
        `${API_URL}/admin/transactions`,
        {
          credentials: "include",
        }
      );
      const transactionsData = await transactionsResponse.json();

      if (listingsData.success) {
        const allListings = listingsData.data || [];
        const activeListings = allListings.filter((p) => p.status === "active");

        setListings(allListings);
        setStats({
          totalListings: allListings.length,
          activeListings: activeListings.length,
          totalUsers: usersData.success ? usersData.total : 0,
          totalConversations: conversationsData.success ? conversationsData.count : 0,
          totalTransactions: transactionsData.success ? transactionsData.data.length : 0,
        });
      }

      if (allUsersData.success && allUsersData.users) {
        setUsers(allUsersData.users);
      }

      if (transactionsData.success) {
        setTransactions(transactionsData.data);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteProduct = (productId, productTitle) => {
    setConfirmModal({
      open: true,
      title: "Delete Listing",
      message: `Are you sure you want to delete "${productTitle}"? This action cannot be undone.`,
      variant: "danger",
      onConfirm: () => handleDeleteProduct(productId),
    });
  };

  const handleDeleteProduct = async (productId) => {
    setConfirmModal(prev => ({ ...prev, open: false }));

    try {
      const response = await fetch(
        `${API_URL}/listings/${productId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setListings((prev) => prev.filter((p) => p._id !== productId));
        setStats((prev) => ({
          ...prev,
          totalListings: prev.totalListings - 1,
        }));
      } else {
        alert(data.message || "Failed to delete listing");
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Failed to delete listing");
    }
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      const response = await fetch(
        `${API_URL}/listings/${productId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setListings((prev) =>
          prev.map((p) =>
            p._id === productId ? { ...p, status: newStatus } : p
          )
        );
        setStats((prev) => ({
          ...prev,
          activeListings:
            newStatus === "active"
              ? prev.activeListings + 1
              : prev.activeListings - 1,
        }));
        alert("Listing status updated successfully!");
      } else {
        alert(`Error: ${data.message || "Failed to update status"}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const confirmDeleteUser = (userId, userName) => {
    // Check if user is an admin
    const userToDelete = users.find((u) => u._id === userId);
    if (userToDelete && userToDelete.role === "admin") {
      alert("Cannot delete an admin user. Please change their role first.");
      return;
    }

    setConfirmModal({
      open: true,
      title: "Delete User",
      message: `Are you sure you want to delete "${userName}"? This action cannot be undone.`,
      variant: "danger",
      onConfirm: () => handleDeleteUser(userId),
    });
  };

  const handleDeleteUser = async (userId) => {
    setConfirmModal(prev => ({ ...prev, open: false }));

    try {
      const response = await fetch(
        `${API_URL}/auth/users/${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        setStats((prev) => ({
          ...prev,
          totalUsers: prev.totalUsers - 1,
        }));
      } else {
        alert(data.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (data.success) {
        setUsers((prev) => [...prev, data.data]);
        setStats((prev) => ({
          ...prev,
          totalUsers: prev.totalUsers + 1,
        }));
        setShowCreateModal(false);
        setNewUser({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "user",
        });
        alert("User created successfully!");
      } else {
        alert(data.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user");
    }
  };

  const handleUpdateUserRole = async (userId) => {
    if (!editedRole) {
      alert("Please select a role");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/auth/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ role: editedRole }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Force a fresh array to trigger re-render
        setUsers((prev) => {
          const updated = prev.map((u) => {
            if (u._id === userId) {
              return { ...u, role: editedRole };
            }
            return u;
          });
          return updated;
        });

        // If the edited user is the currently logged-in user, update sessionStorage
        const currentUser = JSON.parse(sessionStorage.getItem("user"));
        if (currentUser && (currentUser._id === userId || currentUser.id === userId)) {
          const updatedCurrentUser = { ...currentUser, role: editedRole };
          sessionStorage.setItem("user", JSON.stringify(updatedCurrentUser));
          setUser(updatedCurrentUser);
        }

        setEditingUser(null);
        setEditedRole("");
        alert("User role updated successfully! The user will see the change within 30 seconds or when they refresh/refocus the page.");
      } else {
        alert(data.message || "Failed to update user role");
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role");
    }
  };

  const fetchScraperStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/scrape/status`, {
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setScraperStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch scraper status:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const { authAPI } = await import("../utils/api");
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    sessionStorage.removeItem("user");
    socketService.disconnect();
    navigate("/signin");
  };

  const handleManualScrape = async () => {
    try {
      setScrapeLoading(true);
      setScrapeMessage("");
      setScrapeError("");

      const response = await fetch(`${API_URL}/admin/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setScrapeError("Session expired. Please sign in again.");
        } else if (response.status === 403) {
          setScrapeError("Access denied. Admin only.");
        } else if (response.status === 409) {
          setScrapeError("Scraper is already running. Please wait.");
        } else {
          setScrapeError(data.message || "Failed to start scraper");
        }
        return;
      }

      setScrapeMessage(data.message || "Scraper started successfully!");

      // Fetch updated status
      fetchScraperStatus();

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setScrapeMessage("");
      }, 5000);
    } catch (error) {
      console.error("Manual scrape error:", error);
      setScrapeError(error.message || "Network error. Please check your connection.");
    } finally {
      setScrapeLoading(false);
    }
  };

  const confirmDeleteTransaction = (transactionId) => {
    setConfirmModal({
      open: true,
      title: "Delete Transaction",
      message: "Are you sure you want to delete this transaction? This action cannot be undone.",
      variant: "danger",
      onConfirm: () => handleDeleteTransaction(transactionId),
    });
  };

  const handleDeleteTransaction = async (transactionId) => {
    setConfirmModal(prev => ({ ...prev, open: false }));

    try {
      const response = await fetch(
        `${API_URL}/admin/transactions/${transactionId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setTransactions((prev) => prev.filter((t) => t._id !== transactionId));
        setStats((prev) => ({
          ...prev,
          totalTransactions: prev.totalTransactions - 1,
        }));
      } else {
        alert(data.message || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    }
  };

  const handleUpdateTransactionStatus = async (transactionId, statusType, newStatus) => {
    try {
      const updateData = {};
      updateData[statusType] = newStatus;

      const response = await fetch(
        `${API_URL}/admin/transactions/${transactionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();

      if (data.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            t._id === transactionId ? { ...t, [statusType]: newStatus } : t
          )
        );
        alert("Transaction status updated successfully!");
      } else {
        alert(data.message || "Failed to update transaction status");
      }
    } catch (error) {
      console.error("Error updating transaction status:", error);
      alert("Failed to update transaction status");
    }
  };

  const handleResolveDispute = async (transactionId) => {
    if (!disputeResolutionForm.resolution.trim()) {
      alert("Please enter a resolution description");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/transactions/${transactionId}/resolve-dispute`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(disputeResolutionForm),
        }
      );

      const data = await response.json();

      if (data.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            t._id === transactionId
              ? {
                ...t,
                orderStatus: disputeResolutionForm.newOrderStatus || t.orderStatus,
                paymentStatus: disputeResolutionForm.newPaymentStatus || t.paymentStatus,
                disputeResolution: disputeResolutionForm.resolution,
                disputeResolvedAt: new Date().toISOString(),
              }
              : t
          )
        );
        setSelectedDispute(null);
        setDisputeResolutionForm({
          resolution: "",
          newOrderStatus: "",
          newPaymentStatus: "",
        });
        alert("✅ Dispute resolved successfully!");
      } else {
        alert(data.message || "Failed to resolve dispute");
      }
    } catch (error) {
      console.error("Error resolving dispute:", error);
      alert("Failed to resolve dispute");
    }
  };

  // Support ticket functions
  const fetchSupportTickets = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/support/tickets`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setSupportTickets(data.data);
      }
    } catch (error) {
      console.error("Error fetching support tickets:", error);
    }
  };

  const handleSendSupportReply = async (ticketId, content) => {
    try {
      const response = await fetch(`${API_URL}/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedSupportTicket(data.data);
        setSupportTickets(prev => prev.map(t => t._id === ticketId ? data.data : t));
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      const response = await fetch(`${API_URL}/support/tickets/${ticketId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        setSupportTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status } : t));
        if (selectedSupportTicket?._id === ticketId) {
          setSelectedSupportTicket(prev => ({ ...prev, status }));
        }
        alert("Ticket status updated!");
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const confirmDeleteSupportTicket = (ticketId) => {
    setConfirmModal({
      open: true,
      title: "Delete Support Ticket",
      message: "Are you sure you want to delete this support ticket? This action cannot be undone.",
      variant: "danger",
      onConfirm: () => handleDeleteSupportTicket(ticketId),
    });
  };

  const handleDeleteSupportTicket = async (ticketId) => {
    setConfirmModal(prev => ({ ...prev, open: false }));
    try {
      const response = await fetch(`${API_URL}/admin/support/tickets/${ticketId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setSupportTickets(prev => prev.filter(t => t._id !== ticketId));
        if (selectedSupportTicket?._id === ticketId) {
          setSelectedSupportTicket(null);
        }
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
    }
  };

  // Fetch support tickets when tab changes
  useEffect(() => {
    if (activeTab === "support") {
      fetchSupportTickets();
    }
  }, [activeTab]);

  // Handle URL parameters for tab and ticket selection
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const ticketParam = searchParams.get("ticket");

    if (tabParam === "support") {
      setActiveTab("support");

      // If ticket ID is provided, find and select it after tickets are loaded
      if (ticketParam && supportTickets.length > 0) {
        const ticket = supportTickets.find(t => t._id === ticketParam);
        if (ticket) {
          setSelectedSupportTicket(ticket);
          // Set the correct sub-tab based on whether it's a user or guest ticket
          setSupportTicketTab(ticket.user ? "user" : "guest");
        }
      }
    }
  }, [searchParams, supportTickets]);

  // Helper to count unread tickets (last message is from user, meaning admin hasn't replied yet)
  const getUnreadTicketCount = (tickets) => {
    return tickets.filter(ticket => {
      // Closed or resolved tickets are not unread
      if (ticket.status === "closed" || ticket.status === "resolved") return false;
      // No messages means it's a new ticket needing attention
      if (!ticket.messages || ticket.messages.length === 0) return true;
      // Check if last message is from user (needs admin reply)
      const lastMessage = ticket.messages[ticket.messages.length - 1];
      return lastMessage.sender === "user";
    }).length;
  };

  const userTickets = supportTickets.filter(t => t.user);
  const guestTickets = supportTickets.filter(t => !t.user);
  const unreadUserTickets = getUnreadTicketCount(userTickets);
  const unreadGuestTickets = getUnreadTicketCount(guestTickets);
  const totalUnreadTickets = unreadUserTickets + unreadGuestTickets;

  if (loading) {
    return <Loader fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {user && (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      )}
      <div className="container mx-auto px-4 py-4 sm:py-8 pt-20 sm:pt-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </h1>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualScrape}
                loading={scrapeLoading}
              >
                Manual Scrape
              </Button>
              {scraperStatus && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className={`flex items-center gap-1 ${scraperStatus.isRunning
                      ? 'text-blue-600 dark:text-blue-400'
                      : scraperStatus.status?.includes('Error') || scraperStatus.status?.includes('Failed')
                        ? 'text-red-600 dark:text-red-400'
                        : scraperStatus.status?.includes('Completed')
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                      <span className={`inline-block w-2 h-2 rounded-full ${scraperStatus.isRunning
                        ? 'bg-blue-600 animate-pulse'
                        : scraperStatus.status?.includes('Error') || scraperStatus.status?.includes('Failed')
                          ? 'bg-red-600'
                          : scraperStatus.status?.includes('Completed')
                            ? 'bg-green-600'
                            : 'bg-gray-400'
                        }`}></span>
                      {scraperStatus.isRunning ? 'Running...' : scraperStatus.status || 'Idle'}
                    </span>
                  </div>
                  {scraperStatus.lastRun && !scraperStatus.isRunning && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last run: {new Date(scraperStatus.lastRun).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
            {scrapeMessage && (
              <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                {scrapeMessage}
              </span>
            )}
            {scrapeError && (
              <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                {scrapeError}
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 sm:p-4">
            <h3 className="text-xs sm:text-lg font-semibold mb-1 sm:mb-2">Total Listings</h3>
            <p className="text-2xl sm:text-4xl font-bold">{stats.totalListings}</p>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 sm:p-4">
            <h3 className="text-xs sm:text-lg font-semibold mb-1 sm:mb-2">Active Listings</h3>
            <p className="text-2xl sm:text-4xl font-bold">{stats.activeListings}</p>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-3 sm:p-4">
            <h3 className="text-xs sm:text-lg font-semibold mb-1 sm:mb-2">Total Users</h3>
            <p className="text-2xl sm:text-4xl font-bold">{stats.totalUsers}</p>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-3 sm:p-4">
            <h3 className="text-xs sm:text-lg font-semibold mb-1 sm:mb-2">Conversations</h3>
            <p className="text-2xl sm:text-4xl font-bold">{stats.totalConversations}</p>
          </Card>
          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-3 sm:p-4">
            <h3 className="text-xs sm:text-lg font-semibold mb-1 sm:mb-2">Transactions</h3>
            <p className="text-2xl sm:text-4xl font-bold">{stats.totalTransactions}</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 sm:space-x-4 mb-6 sm:mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("listings")}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === "listings"
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
          >
            Listings
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === "users"
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === "transactions"
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
          >
            Transactions
          </button>
          <button
            onClick={() => {
              setActiveTab("support");
              // Dispatch event to reset support notifications in Navbar
              window.dispatchEvent(new CustomEvent("resetSupportNotifications"));
            }}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm sm:text-base flex items-center gap-2 ${activeTab === "support"
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
          >
            Support
            {totalUnreadTickets > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                {totalUnreadTickets}
              </span>
            )}
          </button>
        </div>

        {/* Listings Management */}
        {activeTab === "listings" && (
          <Card className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              All Listings
            </h2>
            {listings.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No listings found
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Listing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Created By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {listings.map((product) => (
                        <tr key={product._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {product.images?.[0] && (
                                <img
                                  src={product.images[0]}
                                  alt={product.title}
                                  className="h-10 w-10 rounded object-cover mr-3"
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {product.title}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {product.category}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {product.createdBy?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {product.createdBy?.email || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              Rs. {product.price.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === "active"
                                ? "bg-green-100 text-green-800"
                                : product.status === "sold"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-yellow-100 text-yellow-800"
                                }`}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() =>
                                handleToggleStatus(product._id, product.status)
                              }
                              className={`mr-3 px-3 py-1 rounded ${product.status === "active"
                                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                                }`}
                              disabled={product.status === "sold"}
                            >
                              {product.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => confirmDeleteProduct(product._id, product.title)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {listings.map((product) => (
                    <div key={product._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="h-16 w-16 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{product.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{product.category}</p>
                          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">Rs. {product.price.toLocaleString()}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${product.status === "active"
                            ? "bg-green-100 text-green-800"
                            : product.status === "sold"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                            }`}
                        >
                          {product.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Created By: {product.createdBy?.name || 'Unknown'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(product._id, product.status)}
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium ${product.status === "active"
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                          disabled={product.status === "sold"}
                        >
                          {product.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => confirmDeleteProduct(product._id, product.title)}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Users Management */}
        {activeTab === "users" && (
          <Card className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                All Users
              </h2>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-sm sm:text-base"
              >
                + Add User
              </Button>
            </div>
            {!users || users.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No users found
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === user._id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={editedRole}
                                  onChange={(e) => setEditedRole(e.target.value)}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                  <option value="user">user</option>
                                  <option value="admin">admin</option>
                                </select>
                              </div>
                            ) : (
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-green-100 text-green-800"
                                  }`}
                              >
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {user.phone || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {editingUser === user._id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateUserRole(user._id)}
                                  className="mr-3 text-green-600 hover:text-green-900"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditedRole("");
                                  }}
                                  className="mr-3 text-gray-600 hover:text-gray-900"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              user.role !== "admin" && (
                                <button
                                  onClick={() => {
                                    setEditingUser(user._id);
                                    setEditedRole(user.role);
                                  }}
                                  className="mr-3 text-blue-600 hover:text-blue-900"
                                >
                                  Edit Role
                                </button>
                              )
                            )}
                            <button
                              onClick={() => confirmDeleteUser(user._id, user.name)}
                              className={`${user.role === "admin"
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-red-600 hover:text-red-900"
                                }`}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {users.map((userItem) => (
                    <div key={userItem._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{userItem.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{userItem.email}</p>
                          {userItem.phone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{userItem.phone}</p>
                          )}
                        </div>
                        {editingUser === userItem._id ? (
                          <select
                            value={editedRole}
                            onChange={(e) => setEditedRole(e.target.value)}
                            className="px-2 py-1 text-xs font-semibold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${userItem.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                              }`}
                          >
                            {userItem.role}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {editingUser === userItem._id ? (
                          <>
                            <button
                              onClick={() => handleUpdateUserRole(userItem._id)}
                              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setEditedRole("");
                              }}
                              className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {userItem.role !== "admin" && (
                              <button
                                onClick={() => {
                                  setEditingUser(userItem._id);
                                  setEditedRole(userItem.role);
                                }}
                                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
                              >
                                Edit Role
                              </button>
                            )}
                            <button
                              onClick={() => confirmDeleteUser(userItem._id, userItem.name)}
                              disabled={userItem.role === "admin"}
                              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${userItem.role === "admin"
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-red-500 hover:bg-red-600 text-white"
                                }`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Add New User
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full min-w-[120px] px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer shadow-sm"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                  >
                    <option value="user" className="bg-white dark:bg-gray-900">User</option>
                    <option value="admin" className="bg-white dark:bg-gray-900">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    Create User
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewUser({
                        name: "",
                        email: "",
                        password: "",
                        phone: "",
                        role: "user",
                      });
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Transactions Management */}
        {activeTab === "transactions" && (
          <Card className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              All Transactions
            </h2>
            {transactions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No transactions found
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Listing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Buyer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Seller
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Order Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {transactions.map((transaction) => (
                        <tr key={transaction._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400" title={transaction._id}>
                                ...{transaction._id.substring(transaction._id.length - 6)}
                              </span>
                              <button
                                onClick={() => handleCopy(transaction._id)}
                                className="text-gray-400 hover:text-emerald-500 transition-colors"
                                title="Copy ID"
                              >
                                {copiedId === transaction._id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {transaction.listing?.title || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {transaction.buyer?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {transaction.buyer?.email || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {transaction.seller?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {transaction.seller?.email || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              Rs. {transaction.amount?.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${transaction.paymentMethod === "jazzcash"
                                ? "bg-red-100 text-red-800"
                                : transaction.paymentMethod === "easypaisa"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {transaction.paymentMethod === "cod"
                                ? "COD"
                                : transaction.paymentMethod === "jazzcash"
                                  ? "JazzCash"
                                  : transaction.paymentMethod === "easypaisa"
                                    ? "EasyPaisa"
                                    : transaction.paymentMethod || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={transaction.paymentStatus}
                              onChange={(e) =>
                                handleUpdateTransactionStatus(
                                  transaction._id,
                                  "paymentStatus",
                                  e.target.value
                                )
                              }
                              className={`px-2 py-1 text-xs font-semibold rounded-full border-0 ${transaction.paymentStatus === "paid"
                                ? "bg-green-100 text-green-800"
                                : transaction.paymentStatus === "released"
                                  ? "bg-blue-100 text-blue-800"
                                  : transaction.paymentStatus === "failed"
                                    ? "bg-red-100 text-red-800"
                                    : transaction.paymentStatus === "refunded"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="released">Released</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={transaction.orderStatus}
                              onChange={(e) =>
                                handleUpdateTransactionStatus(
                                  transaction._id,
                                  "orderStatus",
                                  e.target.value
                                )
                              }
                              className={`px-2 py-1 text-xs font-semibold rounded-full border-0 ${transaction.orderStatus === "completed"
                                ? "bg-green-100 text-green-800"
                                : transaction.orderStatus === "delivered"
                                  ? "bg-blue-100 text-blue-800"
                                  : transaction.orderStatus === "disputed"
                                    ? "bg-red-100 text-red-800"
                                    : transaction.orderStatus === "cancelled"
                                      ? "bg-gray-100 text-gray-800"
                                      : transaction.orderStatus === "confirmed"
                                        ? "bg-indigo-100 text-indigo-800"
                                        : "bg-yellow-100 text-yellow-800"
                                }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="delivered">Delivered</option>
                              <option value="completed">Completed</option>
                              <option value="disputed">Disputed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              {transaction.orderStatus === "disputed" && (
                                <button
                                  onClick={() => setSelectedDispute(transaction)}
                                  className="text-orange-600 hover:text-orange-900 font-semibold"
                                >
                                  Resolve
                                </button>
                              )}
                              <button
                                onClick={() => confirmDeleteTransaction(transaction._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {transaction.listing?.title || 'N/A'}
                        </h3>
                        <button
                          onClick={() => handleCopy(transaction._id)}
                          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-500"
                        >
                          <span className="font-mono">#{transaction._id.substring(transaction._id.length - 4)}</span>
                          {copiedId === transaction._id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="space-y-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Buyer: </span>
                          <span className="text-gray-900 dark:text-white">{transaction.buyer?.name || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Seller: </span>
                          <span className="text-gray-900 dark:text-white">{transaction.seller?.name || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Amount: </span>
                          <span className="font-semibold text-primary-600 dark:text-primary-400">
                            Rs. {transaction.amount?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Method: </span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${transaction.paymentMethod === "jazzcash"
                            ? "bg-red-100 text-red-800"
                            : transaction.paymentMethod === "easypaisa"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                            }`}>
                            {transaction.paymentMethod === "cod"
                              ? "COD"
                              : transaction.paymentMethod === "jazzcash"
                                ? "JazzCash"
                                : transaction.paymentMethod === "easypaisa"
                                  ? "EasyPaisa"
                                  : transaction.paymentMethod || "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Status</label>
                          <select
                            value={transaction.paymentStatus}
                            onChange={(e) =>
                              handleUpdateTransactionStatus(
                                transaction._id,
                                "paymentStatus",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-xs font-semibold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="released">Released</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Order Status</label>
                          <select
                            value={transaction.orderStatus}
                            onChange={(e) =>
                              handleUpdateTransactionStatus(
                                transaction._id,
                                "orderStatus",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-xs font-semibold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                            <option value="completed">Completed</option>
                            <option value="disputed">Disputed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => confirmDeleteTransaction(transaction._id)}
                        className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
                      >
                        Delete Transaction
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Support Tickets Management */}
        {activeTab === "support" && (
          <Card className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Support Tickets
            </h2>

            {/* Sub-tabs for User vs Guest tickets */}
            <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSupportTicketTab("user");
                  setSelectedSupportTicket(null);
                }}
                className={`px-4 py-2 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
                  supportTicketTab === "user"
                    ? "border-green-600 text-green-600 dark:text-green-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-green-600"
                }`}
              >
                User Tickets ({userTickets.length})
                {unreadUserTickets > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                    {unreadUserTickets}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setSupportTicketTab("guest");
                  setSelectedSupportTicket(null);
                }}
                className={`px-4 py-2 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
                  supportTicketTab === "guest"
                    ? "border-green-600 text-green-600 dark:text-green-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-green-600"
                }`}
              >
                Guest Tickets ({guestTickets.length})
                {unreadGuestTickets > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                    {unreadGuestTickets}
                  </span>
                )}
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6" style={{ minHeight: "500px" }}>
              {/* Ticket List */}
              <div className="lg:col-span-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {supportTicketTab === "user" ? "User" : "Guest"} Tickets ({supportTicketTab === "user" ? userTickets.length : guestTickets.length})
                  </h3>
                </div>
                <div className="max-h-[450px] overflow-y-auto">
                  {(supportTicketTab === "user" ? userTickets : guestTickets).length === 0 ? (
                    <p className="p-4 text-gray-500 dark:text-gray-400 text-center">No {supportTicketTab} tickets</p>
                  ) : (
                    (supportTicketTab === "user" ? userTickets : guestTickets).map((ticket) => (
                      <button
                        key={ticket._id}
                        onClick={() => setSelectedSupportTicket(ticket)}
                        className={`w-full p-3 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedSupportTicket?._id === ticket._id ? "bg-green-50 dark:bg-green-900/20" : ""}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-900 dark:text-white text-sm truncate pr-2">{ticket.subject}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${ticket.status === "open" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                              ticket.status === "in_progress" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                ticket.status === "resolved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                  "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                            }`}>{ticket.status?.replace("_", " ")}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.user?.name || ticket.guestName || "Guest"}</p>
                        <p className="text-xs text-gray-400">{ticket.category} • {new Date(ticket.updatedAt).toLocaleDateString()}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Ticket Detail & Chat */}
              <div className="lg:col-span-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
                {selectedSupportTicket ? (
                  <>
                    {/* Header */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{selectedSupportTicket.subject}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedSupportTicket.user?.name || selectedSupportTicket.guestName} • {selectedSupportTicket.user?.email || selectedSupportTicket.guestEmail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedSupportTicket.status}
                            onChange={(e) => handleUpdateTicketStatus(selectedSupportTicket._id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            onClick={() => confirmDeleteSupportTicket(selectedSupportTicket._id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {selectedSupportTicket.transaction && (
                        <p className="text-xs mt-1 text-orange-600 dark:text-orange-400">
                          📋 Linked to Transaction #{selectedSupportTicket.transaction._id?.slice(-6) || selectedSupportTicket.transaction}
                        </p>
                      )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-[300px]">
                      {selectedSupportTicket.messages?.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] p-2 rounded-lg ${msg.sender === "admin" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"}`}>
                            <p className="text-xs opacity-75 mb-1">{msg.senderName} • {new Date(msg.createdAt).toLocaleString()}</p>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply Input - Only for user tickets */}
                    {selectedSupportTicket.user ? (
                      selectedSupportTicket.status !== "closed" && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.target.elements.replyContent;
                            if (input.value.trim()) {
                              handleSendSupportReply(selectedSupportTicket._id, input.value.trim());
                              input.value = "";
                            }
                          }}
                          className="p-3 border-t border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex gap-2">
                            <input
                              name="replyContent"
                              type="text"
                              placeholder="Type your reply..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <Button type="submit" size="sm">Send</Button>
                          </div>
                        </form>
                      )
                    ) : (
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          This is a guest ticket. Contact via email: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedSupportTicket.guestEmail}</span>
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Select a ticket to view
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Dispute Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🚨 Resolve Dispute
                </h3>
                <button
                  onClick={() => {
                    setSelectedDispute(null);
                    setDisputeResolutionForm({
                      resolution: "",
                      newOrderStatus: "",
                      newPaymentStatus: "",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {/* Dispute Details */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Dispute Details</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Listing:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedDispute.listing?.title || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Buyer:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedDispute.buyer?.name || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Seller:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedDispute.seller?.name || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Amount:</span> <span className="font-medium text-gray-900 dark:text-white">Rs. {selectedDispute.amount?.toLocaleString()}</span></p>
                  <p><span className="text-gray-500">Reason:</span> <span className="font-medium text-red-600 dark:text-red-400">{selectedDispute.disputeReason?.replace(/_/g, ' ') || 'Not specified'}</span></p>
                  {selectedDispute.disputeDescription && (
                    <p><span className="text-gray-500">Description:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedDispute.disputeDescription}</span></p>
                  )}
                  <p><span className="text-gray-500">Payment Method:</span> <span className="font-medium text-gray-900 dark:text-white">{selectedDispute.paymentMethod?.toUpperCase()}</span></p>
                </div>
              </div>

              {/* Resolution Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={disputeResolutionForm.resolution}
                    onChange={(e) => setDisputeResolutionForm(prev => ({ ...prev, resolution: e.target.value }))}
                    placeholder="Describe how the dispute was resolved..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Order Status
                    </label>
                    <select
                      value={disputeResolutionForm.newOrderStatus}
                      onChange={(e) => setDisputeResolutionForm(prev => ({ ...prev, newOrderStatus: e.target.value }))}
                      className="w-full min-w-[120px] px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer shadow-sm"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                    >
                      <option value="" className="bg-white dark:bg-gray-700">Keep current</option>
                      <option value="completed" className="bg-white dark:bg-gray-700">Completed</option>
                      <option value="cancelled" className="bg-white dark:bg-gray-700">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Payment Status
                    </label>
                    <select
                      value={disputeResolutionForm.newPaymentStatus}
                      onChange={(e) => setDisputeResolutionForm(prev => ({ ...prev, newPaymentStatus: e.target.value }))}
                      className="w-full min-w-[120px] px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer shadow-sm"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                    >
                      <option value="" className="bg-white dark:bg-gray-700">Keep current</option>
                      <option value="paid" className="bg-white dark:bg-gray-700">Paid</option>
                      <option value="refunded" className="bg-white dark:bg-gray-700">Refunded</option>
                      <option value="cancelled" className="bg-white dark:bg-gray-700">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setSelectedDispute(null);
                      setDisputeResolutionForm({
                        resolution: "",
                        newOrderStatus: "",
                        newPaymentStatus: "",
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResolveDispute(selectedDispute._id)}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                  >
                    Resolve Dispute
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        variant={confirmModal.variant}
      />
    </div>
  );
};

export default AdminPanel;

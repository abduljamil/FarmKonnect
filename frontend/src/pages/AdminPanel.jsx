import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import chatAPI from "../utils/chatApi";
import socketService from "../utils/socket";
import useUserSync from "../hooks/useUserSync";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-sync user data (role updates)
  useUserSync(user, setUser, navigate);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalUsers: 0,
    totalConversations: 0,
  });
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("listings"); // listings or users
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editedRole, setEditedRole] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "buyer",
  });

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    const token = sessionStorage.getItem("token");

    if (!userData || !token) {
      navigate("/signin");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Only admins can access this page
    if (parsedUser.role !== "admin") {
      alert("Access denied. Admin only.");
      navigate("/");
      return;
    }

    loadUnreadCount();
    fetchAdminData();

    // Connect socket and listen for real-time updates
    socketService.connect(token);

    // Listen for new messages (affects conversation count and unread)
    socketService.onNewMessage(async () => {
      await fetchAdminData();
      await loadUnreadCount();
    });

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

    return () => {
      // Cleanup listeners if component unmounts
      socketService.socket?.off("new_listing");
      socketService.socket?.off("new_user");
      socketService.socket?.off("new_conversation");
      socketService.socket?.off("conversation_deleted");
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
      const token = sessionStorage.getItem("token");

      // Fetch all listings (including inactive and sold)
      const productsResponse = await fetch(
        "http://localhost:3000/api/listings?status=all",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const productsData = await productsResponse.json();

      // Fetch total users count
      const usersResponse = await fetch(
        "http://localhost:3000/api/auth/stats/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const usersData = await usersResponse.json();

      // Fetch total conversations count
      const conversationsResponse = await fetch(
        "http://localhost:3000/api/chat/stats/conversations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const conversationsData = await conversationsResponse.json();

      // Fetch all users
      const allUsersResponse = await fetch(
        "http://localhost:3000/api/auth/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const allUsersData = await allUsersResponse.json();

      if (productsData.success) {
        const allProducts = productsData.data;
        setProducts(allProducts);
        setStats({
          totalListings: allProducts.length,
          activeListings: allProducts.filter((p) => p.status === "active")
            .length,
          totalUsers: usersData.success ? usersData.count : 0,
          totalConversations: conversationsData.success ? conversationsData.count : 0,
        });
      }
      
      if (allUsersData.success) {
        setUsers(allUsersData.data);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/listings/${productId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setProducts((prev) => prev.filter((p) => p._id !== productId));
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
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/listings/${productId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setProducts((prev) =>
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

  const handleDeleteUser = async (userId) => {
    // Check if user is an admin
    const userToDelete = users.find((u) => u._id === userId);
    if (userToDelete && userToDelete.role === "admin") {
      alert("❌ Cannot delete an admin user. Please change their role first.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/auth/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        setStats((prev) => ({
          ...prev,
          totalUsers: prev.totalUsers - 1,
        }));
        alert("✓ User deleted successfully!");
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
      const token = sessionStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/auth/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
          role: "buyer",
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
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/auth/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  if (loading) {
    return <Loader fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {user && (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      )}
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Admin Panel
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 sm:space-x-4 mb-6 sm:mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("listings")}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "listings"
                ? "bg-green-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Listings
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "users"
                ? "bg-green-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Users
          </button>
        </div>

        {/* Listings Management */}
        {activeTab === "listings" && (
          <Card className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              All Listings
            </h2>
          {products.length === 0 ? (
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
                        Seller
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
                    {products.map((product) => (
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
                            {product.seller.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {product.seller.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            Rs. {product.price.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              product.status === "active"
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
                            className={`mr-3 px-3 py-1 rounded ${
                              product.status === "active"
                                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                            disabled={product.status === "sold"}
                          >
                            {product.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
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
                {products.map((product) => (
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
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.status === "active"
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
                      Seller: {product.seller.name}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(product._id, product.status)}
                        className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                          product.status === "active"
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                        disabled={product.status === "sold"}
                      >
                        {product.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
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
            {users.length === 0 ? (
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
                                  <option value="buyer">buyer</option>
                                  <option value="seller">seller</option>
                                  <option value="admin">admin</option>
                                </select>
                              </div>
                            ) : (
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : user.role === "seller"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
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
                              onClick={() => handleDeleteUser(user._id)}
                              className={`${
                                user.role === "admin"
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
                            <option value="buyer">buyer</option>
                            <option value="seller">seller</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              userItem.role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : userItem.role === "seller"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
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
                              onClick={() => handleDeleteUser(userItem._id)}
                              disabled={userItem.role === "admin"}
                              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                                userItem.role === "admin"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
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
                        role: "buyer",
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
      </div>
    </div>
  );
};

export default AdminPanel;

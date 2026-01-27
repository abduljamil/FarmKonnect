
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Copy, Check, MessageSquare, AlertTriangle, Package, CreditCard, CheckCircle, XCircle, Camera, X, Image } from "lucide-react";
import { paymentsAPI } from "../utils/api";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import MapLocationPicker from "../components/MapLocationPicker";
import Button from "../components/Button";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import useUserSync from "../hooks/useUserSync";
import socketService from "../utils/socket";

import API_URL from "../config";

export default function TransactionDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const { addNotification } = useNotifications();
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [actionLoading, setActionLoading] = useState("");
    const [disputeReason, setDisputeReason] = useState("");
    const [disputeDescription, setDisputeDescription] = useState("");
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [user, setUser] = useState(JSON.parse(sessionStorage.getItem("user") || "{}"));
    const [deliveryProofImages, setDeliveryProofImages] = useState([]);
    const [uploadingProof, setUploadingProof] = useState(false);
    const [showProofModal, setShowProofModal] = useState(false);
    const [selectedProofImage, setSelectedProofImage] = useState(null);
    const fileInputRef = useRef(null);

    useUserSync(user, setUser, navigate);

    // Store previous transaction state for comparison
    const prevTransactionRef = useRef(null);

    // Function to silently refresh transaction data
    const silentRefresh = useCallback(async () => {
        try {
            const response = await paymentsAPI.getTransaction(id);
            const newData = response.data;

            // Check if data has changed
            const prev = prevTransactionRef.current;
            if (prev && (
                prev.orderStatus !== newData.orderStatus ||
                prev.buyerConfirmedDelivery !== newData.buyerConfirmedDelivery ||
                prev.buyerConfirmedPayment !== newData.buyerConfirmedPayment ||
                prev.sellerConfirmedPayment !== newData.sellerConfirmedPayment
            )) {

                // If order is completed, redirect
                if (newData.orderStatus === "completed" && prev.orderStatus !== "completed") {
                    addNotification("Order completed successfully! 🎉", "success");
                    setTimeout(() => {
                        navigate("/transactions");
                    }, 1500);
                    return;
                }
            }

            setTransaction(prevState => ({
                ...newData,
                listing: newData.listing?.images ? newData.listing : (prevState?.listing || newData.listing)
            }));
            prevTransactionRef.current = newData;
        } catch (err) { // eslint-disable-line no-unused-vars
            console.error("Error in silent refresh:", err);
        }
    }, [id, navigate, addNotification]);

    const fetchTransaction = useCallback(async () => {
        try {
            setLoading(true);
            const response = await paymentsAPI.getTransaction(id);
            setTransaction(response.data);
            prevTransactionRef.current = response.data;
        } catch (err) {
            setError(err.message || "Failed to load transaction details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTransaction();

        // Socket listener for real-time updates
        const userData = sessionStorage.getItem("user");
        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                if (parsedUser.token) {
                    socketService.connect(parsedUser.token);
                }
            } catch (e) {
                console.error("Error parsing user data for socket:", e);
            }
        }

        socketService.onOrderStatusUpdate((update) => {
            // More robust comparison - handle both string and ObjectId formats
            const updateId = update.transactionId?.toString?.() || update.transactionId;
            const currentId = id?.toString?.() || id;

            if (updateId === currentId) {
                silentRefresh();
            }
        }, `transaction_${id}`);

        // Polling fallback - refresh every 5 seconds to catch missed updates
        const pollInterval = setInterval(() => {
            silentRefresh();
        }, 5000);

        return () => {
            socketService.offOrderStatusUpdate(`transaction_${id}`);
            clearInterval(pollInterval);
        };
    }, [id, fetchTransaction, silentRefresh]);

    const handleBack = () => {
        navigate(-1);
    };

    // Helper to update transaction while preserving listing data
    const updateTransactionData = (newData) => {
        setTransaction(prev => ({
            ...newData,
            // Preserve the listing with images if the new data doesn't include it fully
            listing: newData.listing?.images ? newData.listing : (prev?.listing || newData.listing)
        }));
    };

    // Handle delivery proof image upload
    const handleProofImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (deliveryProofImages.length + files.length > 5) {
            addNotification("Maximum 5 images allowed", "warning");
            return;
        }

        setUploadingProof(true);
        const formData = new FormData();
        files.forEach(file => formData.append("images", file));

        try {
            const response = await fetch(`${API_URL}/upload/delivery-proof`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                setDeliveryProofImages(prev => [...prev, ...data.data.images]);
                addNotification("Images uploaded successfully", "success");
            } else {
                addNotification(data.message || "Failed to upload images", "error");
            }
        } catch (err) { // eslint-disable-line no-unused-vars
            addNotification("Error uploading images", "error");
        } finally {
            setUploadingProof(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // Remove a delivery proof image
    const removeProofImage = (index) => {
        setDeliveryProofImages(prev => prev.filter((_, i) => i !== index));
    };

    // COD Flow Handlers
    const handleConfirmDelivery = async () => {
        setActionLoading("confirmDelivery");
        try {
            const response = await fetch(`${API_URL}/payments/transactions/${id}/confirm-delivery`, {
                method: "PUT",
                credentials: "include",
            });
            const data = await response.json();
            if (data.success) {
                updateTransactionData(data.data);
                addNotification("Delivery confirmed successfully!", "success");
            } else {
                addNotification(data.message || "Failed to confirm delivery", "error");
            }
        } catch (err) { // eslint-disable-line no-unused-vars
            addNotification("Error confirming delivery", "error");
        } finally {
            setActionLoading("");
        }
    };

    const handleConfirmPayment = async () => {
        setActionLoading("confirmPayment");
        try {
            const response = await fetch(`${API_URL}/payments/transactions/${id}/confirm-payment`, {
                method: "PUT",
                credentials: "include",
            });
            const data = await response.json();
            if (data.success) {
                updateTransactionData(data.data);
                addNotification("Payment confirmation sent to seller!", "success");
            } else {
                addNotification(data.message || "Failed to confirm payment", "error");
            }
        } catch (err) { // eslint-disable-line no-unused-vars
            addNotification("Error confirming payment", "error");
        } finally {
            setActionLoading("");
        }
    };

    const handleSellerConfirmPayment = async () => {
        setActionLoading("sellerConfirm");
        try {
            const response = await fetch(`${API_URL}/payments/transactions/${id}/seller-confirm-payment`, {
                method: "PUT",
                credentials: "include",
            });
            const data = await response.json();
            if (data.success) {
                updateTransactionData(data.data);
                addNotification("Payment confirmed! Transaction complete. 🎉", "success");
                // Redirect to orders page after completion
                setTimeout(() => {
                    navigate("/transactions");
                }, 1500);
            } else {
                addNotification(data.message || "Failed to confirm payment", "error");
            }
        } catch (err) { // eslint-disable-line no-unused-vars
            addNotification("Error confirming payment", "error");
        } finally {
            setActionLoading("");
        }
    };

    const handleRaiseDispute = async () => {
        if (!disputeReason) {
            addNotification("Please select a dispute reason", "warning");
            return;
        }
        setActionLoading("dispute");
        try {
            const response = await fetch(`${API_URL}/payments/transactions/${id}/dispute`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ reason: disputeReason, description: disputeDescription }),
            });
            const data = await response.json();
            if (data.success) {
                updateTransactionData(data.data);
                setShowDisputeForm(false);
                addNotification("Dispute raised. Admin will review shortly.", "warning");
            } else {
                addNotification(data.message || "Failed to raise dispute", "error");
            }
        } catch (err) { // eslint-disable-line no-unused-vars
            addNotification("Error raising dispute", "error");
        } finally {
            setActionLoading("");
        }
    };

    const handleMarkDelivered = async () => {
        setActionLoading("markDelivered");
        try {
            const response = await fetch(`${API_URL}/payments/transactions/${id}/deliver`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ deliveryProofImages }),
            });
            const data = await response.json();
            if (data.success) {
                updateTransactionData(data.data);
                setDeliveryProofImages([]); // Clear local state after successful submit
                addNotification("Order marked as delivered! Buyer will be notified.", "success");
            } else {
                addNotification(data.message || "Failed to mark as delivered", "error");
            }
        } catch (err) { // eslint-disable-line no-unused-vars
            addNotification("Error marking as delivered", "error");
        } finally {
            setActionLoading("");
        }
    };

    if (loading) {
        return <Loader fullScreen />;
    }

    if (error) {
        return (
            <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} pt-16 sm:pt-20`}>
                <Navbar user={user} />
                <div className="container mx-auto px-4 py-8">
                    <ErrorMessage message={error} />
                    <button
                        onClick={handleBack}
                        className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        Back to Transactions
                    </button>
                </div>
            </div>
        );
    }

    if (!transaction) return null;

    const userId = user?._id || user?.id;
    const isBuyer = transaction?.buyer?._id?.toString() === userId?.toString();
    const isSeller = transaction?.seller?._id?.toString() === userId?.toString();

    // Format delivery location for map
    let initialMapLocation = null;
    const loc = transaction.deliveryLocation;
    if (loc) {
        if (loc.coordinates) {
            initialMapLocation = {
                lat: loc.coordinates[1],
                lng: loc.coordinates[0],
                address: transaction.deliveryAddress
            };
        } else if (loc.latitude || loc.lat) {
            // Handle legacy/flat format
            initialMapLocation = {
                lat: loc.latitude || loc.lat,
                lng: loc.longitude || loc.lng,
                address: transaction.deliveryAddress
            };
        }
    }

    return (
        <div className={`min-h-screen ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"} pt-16 sm:pt-20`}>
            <Navbar user={user} />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <button
                    onClick={handleBack}
                    className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    ← Back to Transactions
                </button>

                <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">Transaction Details</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">ID: {transaction._id}</p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(transaction._id);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-emerald-500 transition-colors"
                                        title="Copy Transaction ID"
                                    >
                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize
                  ${transaction.orderStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        transaction.orderStatus === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                            transaction.orderStatus === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                    {transaction.orderStatus}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize
                  ${transaction.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        transaction.paymentStatus === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                    {transaction.paymentMethod}: {transaction.paymentStatus}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Order Info */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Item Details</h3>
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        <img
                                            src={transaction.listing?.images?.[0] || "/placeholder.jpg"}
                                            alt={transaction.listing?.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-lg">{transaction.listing?.title}</h4>
                                        <p className="text-gray-500 dark:text-gray-400">Quantity: {transaction.quantity}</p>
                                        <p className="text-primary-600 dark:text-primary-400 font-bold mt-1">
                                            Rs. {transaction.amount?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Parties Involved</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Seller</p>
                                        <p className="font-medium">{transaction.seller?.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {transaction.sellerPhone || transaction.seller?.phone}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Buyer</p>
                                        <p className="font-medium">{transaction.buyer?.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {transaction.buyerPhone || transaction.buyer?.phone}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Proof Images - Show if available */}
                            {transaction.deliveryProofImages && transaction.deliveryProofImages.length > 0 && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                                        <Camera className="w-5 h-5" />
                                        Delivery Proof Photos
                                    </h4>
                                    <div className="flex gap-3 flex-wrap">
                                        {transaction.deliveryProofImages.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedProofImage(img);
                                                    setShowProofModal(true);
                                                }}
                                                className="w-20 h-20 rounded-lg overflow-hidden border-2 border-green-300 dark:border-green-700 hover:border-green-500 transition-colors shadow-sm"
                                            >
                                                <img src={img} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                        Click on an image to view full size
                                    </p>
                                </div>
                            )}

                            {/* Seller: Upload Delivery Proof & Mark as Delivered */}
                            {isSeller && transaction.orderStatus === "confirmed" && (
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                    <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        Mark Order as Delivered
                                    </h4>

                                    {/* Delivery Proof Upload */}
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                                            <Camera className="w-4 h-4" />
                                            Add Delivery Proof (Optional)
                                        </p>
                                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
                                            Upload photos as proof of delivery to build buyer trust
                                        </p>

                                        {/* Preview uploaded images */}
                                        {deliveryProofImages.length > 0 && (
                                            <div className="flex gap-2 flex-wrap mb-3">
                                                {deliveryProofImages.map((img, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <img
                                                            src={img}
                                                            alt={`Proof ${idx + 1}`}
                                                            className="w-16 h-16 object-cover rounded-lg border border-purple-300"
                                                        />
                                                        <button
                                                            onClick={() => removeProofImage(idx)}
                                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleProofImageUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingProof || deliveryProofImages.length >= 5}
                                            className="w-full py-2 px-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {uploadingProof ? (
                                                <>Uploading...</>
                                            ) : (
                                                <>
                                                    <Image className="w-4 h-4" />
                                                    {deliveryProofImages.length > 0
                                                        ? `Add More (${deliveryProofImages.length}/5)`
                                                        : "Upload Photos"}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <Button
                                        onClick={handleMarkDelivered}
                                        loading={actionLoading === "markDelivered"}
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Package className="w-4 h-4 mr-2" />
                                        Mark as Delivered
                                    </Button>
                                </div>
                            )}

                            {/* COD Actions Section */}
                            {transaction.paymentMethod === "cod" && transaction.orderStatus !== "completed" && transaction.orderStatus !== "cancelled" && transaction.orderStatus !== "disputed" && transaction.orderStatus !== "confirmed" && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                                        <CreditCard className="w-5 h-5" />
                                        COD Payment Flow
                                    </h4>

                                    {/* Progress Steps */}
                                    <div className="flex items-center justify-between mb-4 text-xs">
                                        <div className={`flex flex-col items-center ${transaction.orderStatus === "delivered" || transaction.buyerConfirmedDelivery ? "text-green-600" : "text-gray-400"}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.orderStatus === "delivered" || transaction.buyerConfirmedDelivery ? "bg-green-100" : "bg-gray-100"}`}>
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <span className="mt-1">Delivered</span>
                                        </div>
                                        <div className={`flex-1 h-1 mx-2 ${transaction.buyerConfirmedDelivery ? "bg-green-400" : "bg-gray-200"}`} />
                                        <div className={`flex flex-col items-center ${transaction.buyerConfirmedDelivery ? "text-green-600" : "text-gray-400"}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.buyerConfirmedDelivery ? "bg-green-100" : "bg-gray-100"}`}>
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <span className="mt-1">Received</span>
                                        </div>
                                        <div className={`flex-1 h-1 mx-2 ${transaction.buyerConfirmedPayment ? "bg-green-400" : "bg-gray-200"}`} />
                                        <div className={`flex flex-col items-center ${transaction.buyerConfirmedPayment ? "text-green-600" : "text-gray-400"}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.buyerConfirmedPayment ? "bg-green-100" : "bg-gray-100"}`}>
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <span className="mt-1">Paid</span>
                                        </div>
                                        <div className={`flex-1 h-1 mx-2 ${transaction.sellerConfirmedPayment ? "bg-green-400" : "bg-gray-200"}`} />
                                        <div className={`flex flex-col items-center ${transaction.sellerConfirmedPayment ? "text-green-600" : "text-gray-400"}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.sellerConfirmedPayment ? "bg-green-100" : "bg-gray-100"}`}>
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="mt-1">Verified</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        {/* Buyer: Confirm Delivery Received */}
                                        {isBuyer && transaction.orderStatus === "delivered" && !transaction.buyerConfirmedDelivery && (
                                            <Button
                                                onClick={handleConfirmDelivery}
                                                loading={actionLoading === "confirmDelivery"}
                                                className="w-full"
                                            >
                                                <Package className="w-4 h-4 mr-2" />
                                                I Received the Delivery
                                            </Button>
                                        )}

                                        {/* Buyer: Confirm Payment Made (after confirming delivery) */}
                                        {isBuyer && transaction.buyerConfirmedDelivery && !transaction.buyerConfirmedPayment && (
                                            <Button
                                                onClick={handleConfirmPayment}
                                                loading={actionLoading === "confirmPayment"}
                                                className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                💵 I Made the Payment (Cash)
                                            </Button>
                                        )}

                                        {/* Seller: Payment Received / Not Received buttons */}
                                        {isSeller && transaction.orderStatus === "delivered" && transaction.buyerConfirmedPayment && !transaction.sellerConfirmedPayment && (
                                            <div className="space-y-2">
                                                <p className="text-sm text-center text-blue-600 dark:text-blue-400 mb-2">
                                                    💵 Buyer has marked this order as PAID
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={handleSellerConfirmPayment}
                                                        loading={actionLoading === "sellerConfirm"}
                                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Payment Received
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setDisputeReason("payment_not_received");
                                                            setShowDisputeForm(true);
                                                        }}
                                                        className="flex-1 bg-red-600 hover:bg-red-700"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Not Received
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                        {/* Status Messages */}
                                        {isBuyer && transaction.buyerConfirmedPayment && !transaction.sellerConfirmedPayment && (
                                            <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
                                                ✅ You marked as paid. Waiting for seller to confirm...
                                            </p>
                                        )}

                                        {isSeller && transaction.orderStatus === "delivered" && !transaction.buyerConfirmedPayment && (
                                            <p className="text-sm text-blue-600 dark:text-blue-400 text-center">
                                                ⏳ Waiting for buyer to mark payment as made...
                                            </p>
                                        )}

                                        {/* Dispute Form (shown when Not Received is clicked) */}
                                        {showDisputeForm && (
                                            <div className="pt-3 border-t border-blue-200 dark:border-blue-700 space-y-3">
                                                <p className="text-sm font-medium text-red-600">Raise a Dispute</p>
                                                <select
                                                    value={disputeReason}
                                                    onChange={(e) => setDisputeReason(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                                >
                                                    <option value="">Select reason...</option>
                                                    <option value="payment_not_received">Payment not received</option>
                                                    <option value="wrong_amount">Wrong payment amount</option>
                                                    <option value="product_issue">Product quality issue</option>
                                                    <option value="delivery_issue">Delivery problem</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <textarea
                                                    value={disputeDescription}
                                                    onChange={(e) => setDisputeDescription(e.target.value)}
                                                    placeholder="Describe the issue..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setShowDisputeForm(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleRaiseDispute}
                                                        loading={actionLoading === "dispute"}
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Submit Dispute
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Delivery Info (Visible to Seller too) */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Delivery Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Address</p>
                                        <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            {transaction.deliveryAddress || "No address provided"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Instructions</p>
                                        <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg italic text-gray-600 dark:text-gray-300">
                                            {transaction.deliveryNotes || "No specific instructions"}
                                        </p>
                                    </div>

                                    {transaction.deliveryLocation && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pinned Location</p>
                                            <MapLocationPicker
                                                initialLocation={initialMapLocation}
                                                readonly={true}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Need Help Section */}
                            {(transaction.orderStatus === "disputed" || transaction.orderStatus === "cancelled" || transaction.paymentStatus === "failed") && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-red-800 dark:text-red-300">Need Help?</h4>
                                            <p className="text-sm text-red-600 dark:text-red-400 mt-1 mb-3">
                                                {transaction.orderStatus === "disputed"
                                                    ? "This transaction is under dispute. Contact support for assistance."
                                                    : transaction.paymentStatus === "failed"
                                                        ? "There was an issue with the payment. Get help from our support team."
                                                        : "Having issues with this transaction? We're here to help."}
                                            </p>
                                            <Link
                                                to={`/support?transaction=${transaction._id}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Contact Support
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* General Help Link */}
                            {transaction.orderStatus !== "disputed" && transaction.orderStatus !== "cancelled" && transaction.paymentStatus !== "failed" && (
                                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Link
                                        to={`/support?transaction=${transaction._id}`}
                                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 inline-flex items-center gap-1"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Having an issue? Contact Support
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delivery Proof Image Modal */}
            {showProofModal && selectedProofImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                    onClick={() => setShowProofModal(false)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setShowProofModal(false)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={selectedProofImage}
                            alt="Delivery Proof"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

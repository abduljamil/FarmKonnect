const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/auth");
const {
  createTransaction,
  processPayment,
  markDelivered,
  completeTransaction,
  cancelTransaction,
  getMyTransactions,
  getTransaction,
  getPaymentStatus,
  confirmDeliveryReceived,
  confirmPaymentMade,
  sellerConfirmPayment,
  raiseDispute,
  rejectDelivery,
  processRefund,
  autoReleaseEscrow,
} = require("../controllers/paymentController");

// Public routes
router.get("/status", getPaymentStatus);

// Protected routes
router.use(protect);

// Transaction routes
router.post("/transactions", createTransaction);
router.get("/transactions", getMyTransactions);
router.get("/transactions/:id", getTransaction);
router.post("/transactions/:id/pay", processPayment);
router.put("/transactions/:id/confirm", require("../controllers/paymentController").confirmOrder);
router.put("/transactions/:id/deliver", markDelivered);
router.put("/transactions/:id/complete", completeTransaction);
router.put("/transactions/:id/cancel", cancelTransaction);

// COD confirmation routes
router.put("/transactions/:id/confirm-delivery", confirmDeliveryReceived);
router.put("/transactions/:id/confirm-payment", confirmPaymentMade);
router.put("/transactions/:id/seller-confirm-payment", sellerConfirmPayment);
router.put("/transactions/:id/dispute", raiseDispute);

// Buyer rejection route
router.put("/transactions/:id/reject-delivery", rejectDelivery);

// Refund route — admin only (would otherwise let any logged-in buyer refund
// arbitrary transactions).
router.post("/transactions/:id/refund", isAdmin, processRefund);

// Escrow auto-release route — admin only. Previously gated only by `protect`,
// which meant any authenticated user could trigger payouts for every expired
// transaction in the system. The internal cron (see services/escrowService)
// calls the controller directly and bypasses the HTTP layer.
router.post("/escrow/auto-release", isAdmin, autoReleaseEscrow);

module.exports = router;


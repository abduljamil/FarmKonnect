const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const adminController = require("../controllers/adminController");
const supportController = require("../controllers/supportController");

router.post("/scrape", protect, authorize("admin"), adminController.triggerScraper);
router.get("/scrape/status", protect, authorize("admin"), adminController.getScraperStatus);

// Transaction management routes
router.get("/transactions", protect, authorize("admin"), adminController.getAllTransactions);
router.put("/transactions/:id", protect, authorize("admin"), adminController.updateTransactionStatus);
router.delete("/transactions/:id", protect, authorize("admin"), adminController.deleteTransaction);
router.put("/transactions/:id/resolve-dispute", protect, authorize("admin"), adminController.resolveDispute);

// Support ticket management routes
router.get("/support/tickets", protect, authorize("admin"), supportController.getAllTickets);
router.delete("/support/tickets/:id", protect, authorize("admin"), supportController.deleteTicket);

module.exports = router;

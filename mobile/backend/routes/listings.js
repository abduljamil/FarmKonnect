const express = require("express");
const router = express.Router();
const listingController = require("../controllers/listingController");
const { protect } = require("../middleware/auth");

// Public routes
router.get("/", listingController.getAllListings);

// Protected routes (require authentication)
router.post("/", protect, listingController.createListing);
router.get("/my/listings", protect, listingController.getMyListings);
router.put("/:id", protect, listingController.updateListing);
router.patch("/:id/status", protect, listingController.updateListingStatus);
router.delete("/:id", protect, listingController.deleteListing);

// Dynamic routes (must come after specific routes)
router.get("/:id", listingController.getListingById);

module.exports = router;

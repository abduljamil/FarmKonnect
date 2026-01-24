const Listing = require("../models/Listing");

// Create a new listing
exports.createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      images,
      location,
      quantity,
      unit,
    } = req.body;

    const listing = await Listing.create({
      title,
      description,
      price,
      category,
      images,
      location,
      quantity,
      unit,
      seller: req.user._id,
    });

    // Emit event to admin panel for real-time update
    if (req.io) {
      req.io.emit("new_listing", { listing });
    }

    res.status(201).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all listings (with filters)
exports.getAllListings = async (req, res) => {
  try {
    const { category, status, search, minPrice, maxPrice } = req.query;

    let query = {};

    if (category) query.category = category;
    if (status && status !== "all") query.status = status;
    else if (!status) query.status = "active"; // Default to active listings only if no status specified

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const listings = await Listing.find(query)
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: listings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get listing by ID
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "seller",
      "name email role"
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get seller's listings
exports.getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: listings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update listing
exports.updateListing = async (req, res) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check if user is the seller or admin
    if (
      listing.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing",
      });
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete listing
exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check if user is the seller or admin
    if (
      listing.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this listing",
      });
    }

    await listing.deleteOne();

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update listing status (activate/deactivate)
exports.updateListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'sold'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active', 'inactive', or 'sold'",
      });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check if user is the seller or admin
    if (
      listing.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing status",
      });
    }

    listing.status = status;
    await listing.save();

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

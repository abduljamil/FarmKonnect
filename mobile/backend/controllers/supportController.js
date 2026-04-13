const SupportTicket = require("../models/SupportTicket");
const User = require("../models/User");

// @desc    Create a new support ticket
// @route   POST /api/support/tickets
// @access  Public (authenticated users get linked, guests provide email)
exports.createTicket = async (req, res) => {
  try {
    const { subject, category, message, transactionId, guestEmail, guestName } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    const ticketData = {
      subject,
      category: category || "other",
      messages: [{
        sender: "user",
        senderName: req.user?.name || guestName || "Guest",
        senderId: req.user?._id,
        content: message,
      }],
    };

    // Link to user if authenticated
    if (req.user) {
      ticketData.user = req.user._id;
    } else {
      // Guest ticket
      if (!guestEmail) {
        return res.status(400).json({
          success: false,
          message: "Email is required for guest tickets",
        });
      }
      ticketData.guestEmail = guestEmail;
      ticketData.guestName = guestName || "Guest";
    }

    // Link to transaction if provided
    if (transactionId) {
      ticketData.transaction = transactionId;
      ticketData.category = "dispute";
      ticketData.priority = "high";
    }

    const ticket = await SupportTicket.create(ticketData);

    // Notify admins via socket
    const io = req.io;
    if (io) {
      const admins = await User.find({ role: "admin" }, "_id");
      admins.forEach((admin) => {
        io.to(`user:${admin._id}`).emit("adminNotification", {
          type: "support_ticket",
          ticketId: ticket._id,
          subject: ticket.subject,
          category: ticket.category,
          userName: req.user?.name || guestName || "Guest",
          message: `📩 New support ticket: "${ticket.subject}"`,
          createdAt: new Date(),
        });
      });
    }

    res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create support ticket",
    });
  }
};

// @desc    Get user's support tickets
// @route   GET /api/support/tickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .populate("transaction", "amount orderStatus paymentStatus")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tickets",
    });
  }
};

// @desc    Get single ticket
// @route   GET /api/support/tickets/:id
// @access  Private (owner or admin)
exports.getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate("user", "name email")
      .populate("transaction", "amount orderStatus paymentStatus listing")
      .populate({
        path: "transaction",
        populate: {
          path: "listing",
          select: "title",
        },
      });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check ownership or admin
    const isOwner = ticket.user && ticket.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this ticket",
      });
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch ticket",
    });
  }
};

// @desc    Add message to ticket
// @route   POST /api/support/tickets/:id/messages
// @access  Private (owner or admin)
exports.addMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check ownership or admin
    const isOwner = ticket.user && ticket.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to message on this ticket",
      });
    }

    const newMessage = {
      sender: isAdmin ? "admin" : "user",
      senderName: req.user.name,
      senderId: req.user._id,
      content,
    };

    ticket.messages.push(newMessage);
    
    // Update status if admin replies
    if (isAdmin && ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    // Notify the other party
    const io = req.io;
    if (io) {
      if (isAdmin && ticket.user) {
        // Notify user of admin reply
        io.to(`user:${ticket.user}`).emit("supportUpdate", {
          ticketId: ticket._id,
          subject: ticket.subject,
          message: `📬 Support replied to your ticket: "${ticket.subject}"`,
          createdAt: new Date(),
        });
      } else {
        // Notify admins of user reply
        const admins = await User.find({ role: "admin" }, "_id");
        admins.forEach((admin) => {
          io.to(`user:${admin._id}`).emit("adminNotification", {
            type: "support_reply",
            ticketId: ticket._id,
            subject: ticket.subject,
            userName: req.user.name,
            message: `💬 New reply on ticket: "${ticket.subject}"`,
            createdAt: new Date(),
          });
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Message added successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Add message error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add message",
    });
  }
};

// @desc    Update ticket status (Admin only)
// @route   PUT /api/support/tickets/:id/status
// @access  Admin
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required",
        validStatuses,
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    ticket.status = status;
    if (status === "resolved") ticket.resolvedAt = new Date();
    if (status === "closed") ticket.closedAt = new Date();

    await ticket.save();

    // Notify user
    const io = req.io;
    if (io && ticket.user) {
      io.to(`user:${ticket.user}`).emit("supportUpdate", {
        ticketId: ticket._id,
        subject: ticket.subject,
        newStatus: status,
        message: `🎫 Your ticket "${ticket.subject}" status changed to: ${status}`,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket status updated",
      data: ticket,
    });
  } catch (error) {
    console.error("Update ticket status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update ticket status",
    });
  }
};

// @desc    Get all tickets (Admin only)
// @route   GET /api/admin/support/tickets
// @access  Admin
exports.getAllTickets = async (req, res) => {
  try {
    const { status, category } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tickets = await SupportTicket.find(filter)
      .populate("user", "name email")
      .populate("transaction", "amount orderStatus")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Get all tickets error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tickets",
    });
  }
};

// @desc    Delete ticket (Admin only)
// @route   DELETE /api/admin/support/tickets/:id
// @access  Admin
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Delete ticket error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete ticket",
    });
  }
};

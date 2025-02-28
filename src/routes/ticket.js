const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const authVerify = require("../middlewares/authVerify");



// Get all tickets and metrics
router.get("/", authVerify, ticketController.getAllTickets);
router.get("/metrics", authVerify, ticketController.getTicketMetrics);

// Create new ticket
router.post("/", authVerify, ticketController.createTicket);

// Get, update status, and add response to specific ticket
router.get("/:id", authVerify, ticketController.getTicketById);
router.patch("/:id/status", authVerify, ticketController.updateTicketStatus);
router.post("/:id/response", authVerify, ticketController.addResponse);

module.exports = router; 
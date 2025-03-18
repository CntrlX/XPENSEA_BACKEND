const Ticket = require("../models/ticketModel");
const responseHandler = require("../helpers/responseHandler");
const { createTicketSchema, updateStatusSchema, addResponseSchema } = require("../validations/index");
const { checkAccess } = require("../helpers/checkAccess");

exports.createTicket = async (req, res) => {
  try {
    const createTicketValidator = createTicketSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createTicketValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createTicketValidator.error}`
      );
    }

    const ticket = await Ticket.create({
      subject: req.body.subject,
      description: req.body.description,
      priority: req.body.priority,
      metadata: req.body.metadata,
      admin: req.userId,
      company: req.companyId
    });

    if (!ticket) {
      return responseHandler(res, 400, "Ticket creation failed!");
    }

    return responseHandler(res, 201, "Ticket created successfully", ticket);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const permissions = await checkAccess(req.roleId, "permissions");
    if (!permissions || !permissions.includes("ticket_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const { status, priority, search } = req.query;
    let query = { company: req.companyId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await Ticket.find(query)
      .populate('admin', 'name email')
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    return responseHandler(res, 200, "Tickets retrieved successfully", tickets);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const permissions = await checkAccess(req.roleId, "permissions");
    if (!permissions || !permissions.includes("ticket_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      company: req.companyId
    })
      .populate('admin', 'name email')
      .populate('company', 'name')
      .populate('responses.admin', 'name email');

    if (!ticket) {
      return responseHandler(res, 404, "Ticket not found");
    }

    return responseHandler(res, 200, "Ticket retrieved successfully", ticket);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const statusValidator = updateStatusSchema.validate(req.body, {
      abortEarly: true,
    });
    if (statusValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${statusValidator.error}`
      );
    }

    const permissions = await checkAccess(req.roleId, "permissions");
    if (!permissions || !permissions.includes("ticket_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { status: req.body.status },
      { new: true }
    );

    if (!ticket) {
      return responseHandler(res, 404, "Ticket not found");
    }

    return responseHandler(res, 200, "Ticket status updated successfully", ticket);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.addResponse = async (req, res) => {
  try {
    const responseValidator = addResponseSchema.validate(req.body, {
      abortEarly: true,
    });
    if (responseValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${responseValidator.error}`
      );
    }

    const permissions = await checkAccess(req.roleId, "permissions");
    if (!permissions || !permissions.includes("ticket_respond")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      {
        $push: {
          responses: {
            admin: req.userId,
            message: req.body.message
          }
        }
      },
      { new: true }
    ).populate('responses.admin', 'name email');

    if (!ticket) {
      return responseHandler(res, 404, "Ticket not found");
    }

    return responseHandler(res, 200, "Response added successfully", ticket);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getTicketMetrics = async (req, res) => {
  try {
    const permissions = await checkAccess(req.roleId, "permissions");
    if (!permissions || !permissions.includes("ticket_metrics_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const query = { company: req.companyId };

    const [
      openTickets,
      inProgressTickets,
      resolvedTickets,
      totalTickets
    ] = await Promise.all([
      Ticket.countDocuments({ ...query, status: "Open" }),
      Ticket.countDocuments({ ...query, status: "In Progress" }),
      Ticket.countDocuments({ ...query, status: "Resolved" }),
      Ticket.countDocuments(query)
    ]);

    const metrics = {
      openTickets,
      inProgressTickets,
      resolvedTickets,
      resolutionRate: totalTickets ? ((resolvedTickets / totalTickets) * 100).toFixed(1) : 0
    };

    return responseHandler(res, 200, "Metrics retrieved successfully", metrics);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
}; 
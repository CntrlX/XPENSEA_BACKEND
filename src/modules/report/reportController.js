const responseHandler = require("../../helpers/responseHandler");
const Report = require("./reportModel");
const Expense = require("../expense/expenseModel");
const Notification = require("../notification/notificationModel");
const User = require("../user/userModel");
const Event = require("../event/eventModel");
const Department = require("../department/departmentModel");
const moment = require("moment-timezone");
const { createReportSchema } = require("../../validations");

exports.createReport = async (req, res) => {
  try {
    const createReportValidator = createReportSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createReportValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createReportValidator.error.message}`
      );
    }

    const reportCount = await Report.countDocuments();
    const nextReportNumber = reportCount + 1;
    const formattedReportNumber = nextReportNumber.toString().padStart(3, "0");
    req.body.reportId = `Rep#${formattedReportNumber}`;

    const expenseIds = req.body.expenses;
    if (expenseIds.length === 0) {
      return responseHandler(res, 400, "Expenses are required");
    }
    const expenses = await Expense.find({ _id: { $in: expenseIds } });
    const userId = req.userId;

    // Fetch user and populate tier information
    const user = await User.findOne({ _id: userId }).populate("tier");

    // Function to find a user's department
    const findUserDepartment = async (userId) => {
      return await Department.findOne({ 
        users: { $in: [userId] },
        company: req.companyId
      }).populate("departmentThresholdManager");
    };

    // Function to create a new report and send notification
    const createNewReport = async (customApprover = null) => {
      req.body.user = req.userId;
      req.body.company = req.companyId;
      
      // If a custom approver is provided, use it instead of the default user approver
      if (customApprover) {
        req.body.approverModel = "Admin";
        req.body.approver = customApprover;
      }
      
      const newReport = await Report.create(req.body);
      if (newReport) {
        const data = {
          content: newReport._id,
          user: req.userId,
          status: newReport.status,
        };
        await Notification.create(data);
        
        // Send notification to the appropriate approver
        const approverNotification = {
          content: newReport._id,
          user: customApprover || user.approver,
          status: newReport.status,
        };
        await Notification.create(approverNotification);
        return responseHandler(
          res,
          200,
          `Report created successfully..!`,
          newReport
        );
      } else {
        return responseHandler(res, 400, `Report creation failed...!`);
      }
    };

    // Check if it is an event created by admin
    if (req.body.event) {
      const event = await Event.findOne({ _id: req.body.event });
      if (event.type === "Admin") {
        await Expense.updateMany(
          { _id: { $in: expenseIds } },
          { status: "mapped" }
        );
        return await createNewReport();
      }
      if (!event) {
        return responseHandler(res, 404, "Event not found");
      }
    }

    // Object to keep track of total amounts per category
    const categoryTotals = {};

    for (let expense of expenses) {
      if (expense.status === "mapped") {
        return responseHandler(
          res,
          400,
          `Expense with title ${expense.title} is already mapped.`
        );
      }

      if (categoryTotals[expense.category]) {
        categoryTotals[expense.category] += expense.amount;
      } else {
        categoryTotals[expense.category] = expense.amount;
      }
    }

    // Check if any category total exceeds the user's tier category max amount
    for (const [title, value] of Object.entries(categoryTotals)) {
      const lowerCaseTitle = title.toLowerCase();
      const tierCategory = user.tier.categories.find(
        (cat) => cat.title.toLowerCase() === lowerCaseTitle
      );
      if (!tierCategory) {
        return responseHandler(res, 400, `Category ${title} not found.`);
      }
      if (tierCategory && tierCategory.status === false) {
        return responseHandler(res, 400, `Category ${title} is disabled.`);
      }
      if (tierCategory && value > tierCategory.maxAmount) {
        return responseHandler(
          res,
          400,
          `Total amount for category ${title} exceeds the maximum allowed.`
        );
      }
    }

    const existingReport = await Report.findOne({
      expenses: { $in: expenseIds },
      status: { $in: ["approved", "reimbursed"] },
    });
    if (existingReport) {
      return responseHandler(
        res,
        400,
        `${existingReport.title} is already included some expenses you mapped.`
      );
    }

    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment().endOf("month");

    const existingReports = await Report.find({
      reportDate: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
      status: { $in: ["approved", "reimbursed"] },
    });

    let existingTotalAmount = 0;
    for (let report of existingReports) {
      const reportExpenses = await Expense.find({
        _id: { $in: report.expenses },
      });
      for (let expense of reportExpenses) {
        existingTotalAmount += expense.amount;
      }
    }

    if (existingTotalAmount > user.tier.totalAmount) {
      // Find the user's department instead of returning an error
      const userDepartment = await findUserDepartment(userId);
      
      if (!userDepartment || !userDepartment.departmentThresholdManager) {
        return responseHandler(
          res,
          400,
          `The total amount of existing reports within the last 30 days exceeds your tier limit of ${user.tier.totalAmount}, and no department threshold manager was found.`
        );
      }
      
      // Use the department threshold manager as the approver
      await Expense.updateMany(
        { _id: { $in: expenseIds } },
        { status: "mapped" }
      );
      
      return await createNewReport(userDepartment.departmentThresholdManager);
    }

    await Expense.updateMany(
      { _id: { $in: expenseIds } },
      { status: "mapped" }
    );

    return await createNewReport();
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { isEvent } = req.query;
    const user = req.userId;
    if (!id) {
      return responseHandler(res, 404, "Report ID is required");
    }
    let report;

    if (isEvent == null) {
      report = await Report.findOne({ _id: id, user }).populate("expenses");
    } else if (isEvent) {
      report = await Report.findOne({ event: id, user }).populate("expenses");
      if (!report) {
        const event = await Event.findOne({ _id: id, staffs: { $in: [user] } });
        report = await Report.create({
          user: user,
          event: id,
          expenses: [],
          title: event.eventName,
          description: event.description,
          location: "Event Location",
          status: "drafted",
          reportDate: new Date(),
        });
      }
    } else {
      report = await Report.findOne({ _id: id, user }).populate("expenses");
    }

    if (!report) {
      return responseHandler(
        res,
        404,
        id + " " + isEvent + " Report not found"
      );
    }
    let eventStatus = null;
    if (report.event) {
      const eventDetails = await Event.findOne({ _id: report.event });
      if (eventDetails) {
        eventStatus = eventDetails.status;
      }
    }

    const mappedData = {
      _id: report._id,
      reportId: report.reportId,
      title: report.title,
      status: report.status,
      totalAmount: report.expenses.reduce((acc, exp) => acc + exp.amount, 0),
      expenseCount: report.expenses.length,
      Event: report.event,
      eventStatus: eventStatus,
      expenses: report.expenses.map((expense) => ({
        _id: expense._id,
        title: expense.title,
        amount: expense.amount,
        date: moment(expense.date).format("MMM DD YYYY"),
        status: expense.status,
        category: expense.category,
        image: expense.image,
        description: expense.description,
      })),
      date: moment(report.reportDate).format("MMM DD YYYY"),
      reason: report.reason,
    };

    return responseHandler(res, 200, "Report found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Report ID is required");
    }

    const findReport = await Report.findById(id);
    if (!findReport) {
      return responseHandler(res, 404, "Report not found");
    }

    const reportExpenses = (findReport.expenses || []).map((expense) =>
      expense.toString()
    );
    const requestExpenses = req.body.expenses || [];

    if (requestExpenses.length > 0) {
      const expensesOnlyInRequest = requestExpenses.filter(
        (expense) => !reportExpenses.includes(expense)
      );

      const expensesOnlyInReport = reportExpenses.filter(
        (expense) => !requestExpenses.includes(expense)
      );

      if (expensesOnlyInRequest.length > 0) {
        await Expense.updateMany(
          { _id: { $in: expensesOnlyInRequest } },
          { status: "mapped" }
        );
      }

      if (expensesOnlyInReport.length > 0) {
        await Expense.updateMany(
          { _id: { $in: expensesOnlyInReport } },
          { status: "draft" }
        );
      }
    }

    if (findReport.reportId == undefined) {
      const reportCount = await Report.countDocuments();
      const nextReportNumber = reportCount + 1;
      const formattedReportNumber = nextReportNumber
        .toString()
        .padStart(3, "0");
      req.body.reportId = `Rep#${formattedReportNumber}`;
    }

    const updatedReport = await Report.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    return responseHandler(
      res,
      200,
      "Report updated successfully",
      updatedReport
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
}; 
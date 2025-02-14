const moment = require("moment-timezone");
const responseHandler = require("../helpers/responseHandler");
const { sendOtp } = require("../helpers/sendOtp");
const Expense = require("../models/expenseModel");
const Notification = require("../models/notificationModel");
const Report = require("../models/reportModel");
const User = require("../models/userModel");
const { hashPassword, comparePasswords } = require("../utils/bcrypt");
const { generateOTP } = require("../utils/generateOTP");
const { generateToken } = require("../utils/generateToken");
const {
  createExpenseSchema,
  createReportSchema,
  problemSchema,
  createUserEventSchema,
  createUserEventEditSchema,
  createTransactionSchema,
  createCompanySchema,
} = require("../validations");
const Problem = require("../models/problemModel");
const Event = require("../models/eventModel");
const mongoose = require("mongoose");
const runOCR = require("../jobs/billAnalysis");
const analyzeImage = require("../jobs/imageAnalysis");
const transaction = require("../models/transactionModel");
const Policy = require("../models/policyModel");
const Deduction = require("../models/deductionModel");
const Location = require("../models/locationModel");
const sendMail = require("../utils/sendMail");
const Company = require("../models/companyModel");
const Stripe = require("stripe");
const Payment = require("../models/paymentModel");
const stripe = Stripe(process.env.STRIPE_SECRET);
const path = require("path");
const generateMail = require("../utils/generateMail");

/* The `exports.sendOtp` function is responsible for sending an OTP (One Time Password) to a user's
mobile number for verification purposes. Here is a breakdown of what the function is doing: */
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return responseHandler(res, 400, "Email is required");
    }
    const user = await User.findOne({ email });
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }
    const otp = generateOTP(4);
    const sendOtpFn = await sendMail(email, otp);
    if (sendOtpFn.status == "failure") {
      return responseHandler(res, 400, "OTP sent failed");
    } else {
      user.otp = otp;
      await user.save();
      return responseHandler(res, 200, "OTP sent successfully");
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.verifyUser` function is responsible for verifying a user based on the OTP (One Time
Password) provided by the user. Here is a breakdown of what the function is doing: */
exports.verifyUser = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp) {
      return responseHandler(res, 400, "OTP is required");
    }
    if (!email) {
      return responseHandler(res, 400, "Email is required");
    }
    const user = await User.findOne({ email });
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }
    if (user.otp !== Number(otp)) {
      return responseHandler(res, 400, "Invalid OTP");
    }
    user.otp = null;
    user.isVerified = true;
    user.status = true;
    await user.save();

    return responseHandler(res, 200, "User verified successfully");
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.mpinHandler` function is responsible for handling the MPIN (Mobile Personal
Identification Number) related operations for a user. Here is a breakdown of what the function is
doing: */
exports.mpinHandler = async (req, res) => {
  try {
    const { email, mpin } = req.body;

    if (!email) {
      return responseHandler(res, 400, "Email is required");
    }
    if (!mpin) {
      return responseHandler(res, 400, "MPIN is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    if (user.mpin) {
      const comparePassword = await comparePasswords(mpin, user.mpin);
      if (!comparePassword) {
        return responseHandler(res, 401, "Invalid MPIN");
      }

      const token = generateToken(user._id, user.userType, user.company);
      return responseHandler(res, 200, "Login successfull..!", {
        _id: user._id,
        token,
        userType: user.userType,
        username: user.name,
        employeeId: user.employeeId,
      });
    }

    const hashedPassword = await hashPassword(mpin);
    user.mpin = hashedPassword;
    const updateUser = await user.save();

    if (updateUser) {
      return responseHandler(res, 200, "User MPIN added successfully..!");
    } else {
      return responseHandler(res, 400, "User MPIN update failed...!");
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that checks if a user with a specific phone number is
verified. It first retrieves the phone number from the request parameters, then queries the database
to find a user with that phone number. If the user is not found, it returns a 404 status code with
the message "User not found". If the user is found, it checks if the user is verified or not. If the
user is verified, it returns a 200 status code with the message "User is verified" and the value of
the isVerified property from the user object. If the user is */
exports.checkVerified = async (req, res) => {
  try {
    const { phone } = req.params;
    const user = await User.findOne({ mobile: phone });
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }
    if (user.isVerified) {
      return responseHandler(res, 200, "User is verified", user.isVerified);
    } else {
      return responseHandler(res, 400, "User is not verified", user.isVerified);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.createExpense` function is responsible for creating a new expense record. Here is a
breakdown of what the function is doing: */
exports.createExpense = async (req, res) => {
  try {
    const createExpenseValidator = createExpenseSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createExpenseValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createExpenseValidator.error}`
      );
    }
    req.body.user = req.userId;
    req.body.company = req.companyId;
    const newExpense = await Expense.create(req.body);
    if (newExpense) {
      await runOCR(newExpense._id);
      return responseHandler(
        res,
        200,
        `Expense created successfully..!`,
        newExpense
      );
    } else {
      return responseHandler(res, 400, `Expense creation failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.createReport` function is responsible for creating a new report record. Here is a
breakdown of what the function is doing: */
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

    // Function to create a new report and send notification
    const createNewReport = async () => {
      req.body.user = req.userId;
      req.body.company = req.companyId;
      const newReport = await Report.create(req.body);
      if (newReport) {
        const data = {
          content: newReport._id,
          user: req.userId,
          status: newReport.status,
        };
        await Notification.create(data);
        const approverNotification = {
          content: newReport._id,
          user: user.approver,
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
      return responseHandler(
        res,
        400,
        `The total amount of existing reports within the last 30 days exceeds your tier limit of ${user.tier.totalAmount}.`
      );
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

/* The above code is a list controller function in a Node.js application that handles requests to fetch
data based on the specified type (reports, expenses, notifications) and page number. Here's a
breakdown of what the code is doing: */
exports.listController = async (req, res) => {
  try {
    const { type, pageNo = 1, status } = req.query;
    const skipCount = 10 * (pageNo - 1);
    const filter = {
      user: req.userId,
    };

    if (type !== "notifications") {
      filter.company = req.companyId;
    }

    if (type === "reports") {
      try {
        // Count total number of documents
        const totalCount = await Report.countDocuments(filter);

        // Fetch reports with expenses populated
        const fetchReports = await Report.find(filter)
          .populate({
            path: "expenses",
            select: "amount",
          })
          .skip(skipCount)
          .limit(10)
          .sort({ createdAt: -1 })
          .lean();

        // Check if reports were found
        if (!fetchReports || fetchReports.length === 0) {
          return responseHandler(res, 200, "No Reports found", [], totalCount);
        }

        // Use Promise.all to handle async map operations
        const mappedData = await Promise.all(
          fetchReports.map(async (item) => {
            if (!item) {
              throw new Error("Report item is undefined.");
            }

            let isEvent = false;
            let eventType = null;

            // Check if there's an associated event
            if (item.event) {
              const eventDetails = await Event.findOne({ _id: item.event });
              if (eventDetails) {
                eventType = eventDetails.type;
              }
              isEvent = true;
            }

            // Calculate the total expense amount
            const totalAmount = item.expenses.reduce(
              (acc, exp) => acc + exp.amount,
              0
            );

            // Return the processed data for each report
            return {
              _id: item._id,
              title: item.title,
              status: item.status,
              isEvent: isEvent,
              eventType: eventType,
              totalAmount,
              expenseCount: item.expenses.length,
              date: moment(item.reportDate).format("MMM DD YYYY"),
            };
          })
        );

        // Return the response with the processed data and total count
        return responseHandler(
          res,
          200,
          "Reports found",
          mappedData,
          totalCount
        );
      } catch (error) {
        console.error("Error fetching reports:", error.message);
        return responseHandler(res, 500, "Internal Server Error", [
          error.message,
        ]);
      }
    } else if (type === "expenses") {
      const totalCount = await Expense.countDocuments(filter);
      const fetchExpenses = await Expense.find(filter)
        .skip(skipCount)
        .limit(10)
        .sort({ createdAt: -1 })
        .lean();
      if (!fetchExpenses || fetchExpenses.length === 0) {
        return responseHandler(res, 200, "No Expenses found", []);
      }

      const mappedData = fetchExpenses.map((item) => {
        return {
          _id: item._id,
          title: item.title,
          status: item.status,
          amount: item.amount,
          category: item.category,
          description: item.description,
          image: item.image,
          date: moment(item.createdAt).format("MMM DD YYYY"),
        };
      });

      return responseHandler(
        res,
        200,
        "Expenses found",
        mappedData,
        totalCount
      );
    } else if (type === "notifications") {
      filter.isRead = false;
      const totalCount = await Notification.countDocuments(filter);
      const fetchNotifications = await Notification.find(filter)
        .populate("content", "title reportId")
        .populate({
          path: "content",
          populate: {
            path: "expenses",
            select: "amount",
          },
        })
        .skip(skipCount)
        .limit(10)
        .sort({ createdAt: -1 })
        .lean();
      if (!fetchNotifications || fetchNotifications.length === 0) {
        return responseHandler(res, 200, "No Notifications found", []);
      }

      await Notification.updateMany(filter);

      // const mappedData = fetchNotifications.map((item) => {
      //   const totalAmount = item.content.expenses.reduce(
      //     (acc, exp) => acc + exp.amount,
      //     0
      //   );
      //   return {
      //     _id: item._id,
      //     title: item.content.title,
      //     status: item.status,
      //     totalAmount,
      //     expenseCount: item.content.expenses.length,
      //     date: moment(item.createdAt).format("MMM DD YYYY"),
      //   };
      // });

      return responseHandler(
        res,
        200,
        "Notifications found",
        fetchNotifications,
        totalCount
      );
    } else if (type === "events") {
      const query = {
        staffs: { $in: [req.userId] },
      };
      if (status) {
        query.status = status;
      }
      const totalCount = await Event.countDocuments(query);
      const fetchEvents = await Event.find(query)
        .skip(skipCount)
        .limit(10)
        .sort({ createdAt: -1 })
        .lean();
      if (!fetchEvents || fetchEvents.length === 0) {
        return responseHandler(res, 200, "No Event found", []);
      }

      const mappedData = fetchEvents.map((item) => {
        return {
          _id: item._id,
          eventName: item.eventName,
          startDate: moment(item.startDate).format("YYYY MM DD"),
          endDate: moment(item.endDate).format("YYYY MM DD"),
          startTime: moment(item.startTime).format("hh:mm A"),
          endTime: moment(item.endTime).format("hh:mm A"),
          description: item.description,
          location: item.location,
          status: item.status,
          type: item.type,
        };
      });

      return responseHandler(
        res,
        200,
        "Expenses found",
        mappedData,
        totalCount
      );
    } else if (type === "approvals") {
      const user = await User.findById(req.userId).populate("tier");

      if (!user) {
        return responseHandler(res, 404, "User not found");
      }

      if (user.userType !== "approver") {
        return responseHandler(
          res,
          404,
          "You don't have permission to perform this action"
        );
      }

      const result = await Report.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $lookup: {
            from: "expenses",
            localField: "expenses",
            foreignField: "_id",
            as: "expenseDetails",
          },
        },
        {
          $lookup: {
            from: "tiers",
            localField: "userDetails.tier",
            foreignField: "_id",
            as: "tierDetails",
          },
        },
        { $unwind: "$tierDetails" },
        {
          $match: {
            "userDetails.approver": new mongoose.Types.ObjectId(req.userId),
          },
        },
        {
          $addFields: {
            totalAmount: {
              $reduce: {
                input: "$expenseDetails",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.amount"] },
              },
            },
            expenseCount: { $size: "$expenseDetails" },
            formattedDate: {
              $dateToString: { format: "%b %d %Y", date: "$reportDate" },
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            status: 1,
            totalAmount: 1,
            expenseCount: 1,
            date: "$formattedDate",
          },
        },
        {
          $facet: {
            reports: [
              { $skip: skipCount },
              { $limit: 10 },
              { $sort: { createdAt: -1 } },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ]);

      if (!result || result[0].reports.length === 0) {
        return responseHandler(res, 200, "No Reports found", []);
      }

      const mappedData = result[0].reports.map((item) => {
        return {
          _id: item._id,
          title: item.title,
          status: item.status,
          totalAmount: item.totalAmount,
          expenseCount: item.expenseCount,
          date: item.date,
        };
      });

      const totalCount = result[0].totalCount[0]
        ? result[0].totalCount[0].count
        : 0;
      return responseHandler(
        res,
        200,
        "Approvals found",
        mappedData,
        totalCount
      );
    } else {
      return responseHandler(res, 404, "Invalid type..!");
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.getExpense` function is responsible for fetching a specific expense record based on the
provided expense ID. Here is a breakdown of what the function is doing: */
exports.getExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.userId);
    const userid = req.userId;

    if (!id) {
      return responseHandler(res, 404, "Expense ID is required");
    }

    let expense;

    if (user.userType === "approver") {
      expense = await Expense.findById(id);
      console.log(expense);
      // TODO :make find one work
    } else {
      expense = await Expense.findById(id);
      console.log(expense);
    }

    if (!expense) {
      return responseHandler(res, 404, "Expense not found");
    }

    const mappedData = {
      _id: expense._id,
      title: expense.title,
      status: expense.status,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      image: expense.image,
      date: moment(expense.createdAt).format("MMM DD YYYY"),
      location: expense.address,
    };

    // Conditionally add aiScores if available
    if (expense.aiScores) {
      mappedData.aiScores = expense.aiScores;
    }

    return responseHandler(res, 200, "Expense found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.getReport` function is responsible for fetching a specific report record based on the
provided report ID. Here is a breakdown of what the function is doing: */
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

/* The `exports.getCategory` function is responsible for fetching a list of categories. Here is a
breakdown of what the function is doing: */
exports.getCategory = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("tier");
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }
    const mappedData = user.tier.categories
      .filter((item) => item.status)
      .map((item) => ({
        title: item.title.charAt(0).toUpperCase() + item.title.slice(1),
      }));

    return responseHandler(res, 200, "Categories found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that is used to change the MPIN (Mobile Personal
Identification Number) for a user. It takes in the mobile number, new MPIN, and OTP (One Time
Password) as input from the request body. Here is a breakdown of the code: */
exports.changeMpin = async (req, res) => {
  try {
    const { mobile, mpin, oldmpin } = req.body;
    if (!mobile) {
      return responseHandler(res, 400, "Mobile number is required");
    }
    if (!mpin) {
      return responseHandler(res, 400, "MPIN is required");
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    const comparePassword = await comparePasswords(oldmpin, user.mpin);
    if (!comparePassword) {
      return responseHandler(res, 401, "Invalid MPIN");
    }
    // user.otp = null;
    const hashedPassword = await hashPassword(mpin);
    user.mpin = hashedPassword;
    await user.save();
    return responseHandler(res, 200, "MPIN changed successfully");
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that handles reporting a problem. Here is a breakdown of
what the code is doing: */
exports.reportProblem = async (req, res) => {
  try {
    const problemSchemaValidator = problemSchema.validate(req.body, {
      abortEarly: true,
    });
    if (problemSchemaValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${problemSchemaValidator.error}`
      );
    }
    req.body.user = req.userId;
    req.body.company = req.companyId;
    const report = Problem(req.body);
    if (!report) return responseHandler(res, 400, `Report creation failed`);
    return responseHandler(res, 200, "Reported added successfully");
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that handles the creation of an event. Here is a breakdown
of what the code does: */
exports.createEvent = async (req, res) => {
  try {
    const createEventValidator = createUserEventSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createEventValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createEventValidator.error}`
      );
    }
    req.body.type = "User";
    req.body.creator = req.userId;
    req.body.staffs = [req.userId];
    req.body.company = req.companyId;
    const newEvent = await Event.create(req.body);
    if (newEvent) {
      return responseHandler(
        res,
        200,
        `Event created successfully..!`,
        newEvent
      );
    } else {
      return responseHandler(res, 400, `Event creation failed...!`);
    }
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

exports.getWalletUsed = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("tier");
    if (!user) return responseHandler(res, 404, "User not found");
    const totalAmount = user.tier.totalAmount;

    const startOfMonth = moment().startOf("month");
    const endOfMonth = moment().endOf("month");

    const expenses = await Expense.find({
      createdAt: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
      status: { $in: ["mapped", "approved"] },
      user: req.userId,
    });

    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    const mappedData = expenses.map((exp) => {
      return {
        _id: exp._id,
        category: exp.category,
        amount: exp.amount,
        image: exp.image,
        title: exp.title,
      };
    });

    const categories = user.tier.categories;

    return responseHandler(res, 200, "Wallet used successfully", {
      totalAmount,
      totalExpenses,
      expenses: mappedData,
      categories,
    });
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Event ID is required");
    }

    const findEvent = await Event.findById(id);
    if (!findEvent) {
      return responseHandler(res, 404, "Event not found");
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    return responseHandler(
      res,
      200,
      "Event updated successfully",
      updatedEvent
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getApproval = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Approval ID is required");
    }

    const fetchReport = await Report.findById(id)
      .populate({
        path: "user",
        populate: { path: "tier" },
      })
      .populate("expenses")
      .populate("approver", "name")
      .lean();

    if (!fetchReport) {
      return responseHandler(res, 404, "Report not found");
    }

    const mappedData = {
      _id: fetchReport._id,
      user: fetchReport.user.name,
      employeeId: fetchReport.user.employeeId,
      tier: fetchReport.user.tier.title,
      reportId: fetchReport.reportId,
      title: fetchReport.title,
      description: fetchReport.description,
      location: fetchReport.location,
      status: fetchReport.status,
      approver: fetchReport?.approver?.name,
      date: moment(fetchReport.reportDate).format("MMM DD YYYY"),
      expenses: fetchReport.expenses.map((expense) => {
        return {
          _id: expense._id,
          title: expense.title,
          amount: expense.amount,
          createdAt: moment(expense.createdAt).format("MMM DD YYYY"),
          location: expense.location,
          status: expense.status,
          category: expense.category,
          image: expense.image,
        };
      }),
      totalAmount: fetchReport.expenses.reduce(
        (acc, curr) => acc + curr.amount,
        0
      ),
      reportDate: moment(fetchReport.reportDate).format("MMM DD YYYY"),
      createdAt: moment(fetchReport.createdAt).format("MMM DD YYYY"),
      updatedAt: moment(fetchReport.updatedAt).format("MMM DD YYYY"),
    };

    return responseHandler(res, 200, "Report found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.updateApproval = async (req, res) => {
  try {
    const { id, action } = req.params;
    const { expenses, reason } = req.body;

    if (expenses.length === 0) {
      return responseHandler(res, 400, "Expenses are required");
    }

    if (!id) {
      return responseHandler(res, 400, "Approval ID is required");
    }

    const findApproval = await Report.findById(id);
    if (!findApproval) {
      return responseHandler(res, 404, "Approval not found");
    }

    if (findApproval.status !== "pending") {
      return responseHandler(res, 404, "Approval has already done");
    }

    const isApproveAction = action === "approve";
    const newStatus = isApproveAction ? "approved" : "rejected";

    if (isApproveAction) {
      const findApprovalExpensesIds = findApproval.expenses.map((expense) =>
        expense._id.toString()
      );

      if (
        findApprovalExpensesIds.length !== expenses.length ||
        !expenses.every((expenseId) =>
          findApprovalExpensesIds.includes(expenseId.toString())
        )
      ) {
        return responseHandler(res, 400, "Expenses do not match");
      }
    }

    const updateApproval = await Report.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        approverModel: "User",
        approver: req.userId,
        $push: { reason: reason },
      },
      { new: true }
    );

    if (!updateApproval) {
      return responseHandler(res, 400, `Approval ${newStatus} failed`);
    }

    await Notification.create({
      content: updateApproval._id,
      user: updateApproval.user,
      status: updateApproval.status,
    });

    if (isApproveAction) {
      await Expense.updateMany(
        { _id: { $in: expenses } },
        { $set: { status: newStatus } },
        { new: true }
      );
    } else {
      await Expense.updateMany(
        { _id: { $in: expenses } },
        { $set: { status: "rejected" } },
        { new: true }
      );

      const remainingExpenses = findApproval.expenses
        .map((expense) => expense._id.toString())
        .filter((id) => !expenses.includes(id));

      await Expense.updateMany(
        { _id: { $in: remainingExpenses } },
        { $set: { status: "approved" } },
        { new: true }
      );
    }

    return responseHandler(res, 200, `Approval ${newStatus} successfully`);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getFinance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Approval ID is required");
    }

    const fetchReport = await Report.findById(id)
      .populate({
        path: "user",
        populate: { path: "tier" },
      })
      .populate("expenses")
      .populate("approver", "name")
      .populate("reimburser", "name")
      .lean();

    if (!fetchReport) {
      return responseHandler(res, 404, "Report not found");
    }

    const mappedData = {
      _id: fetchReport._id,
      user: fetchReport.user.name,
      employeeId: fetchReport.user.employeeId,
      tier: fetchReport.user.tier.title,
      reportId: fetchReport.reportId,
      title: fetchReport.title,
      description: fetchReport.description,
      location: fetchReport.location,
      status: fetchReport.status,
      approver: fetchReport?.approver?.name,
      expenses: fetchReport.expenses.map((expense) => {
        return {
          _id: expense._id,
          title: expense.title,
          amount: expense.amount,
          createdAt: moment(expense.createdAt).format("MMM DD YYYY"),
          location: expense.location,
          status: expense.status,
          category: expense.category,
          image: expense.image,
        };
      }),
      totalAmount: fetchReport.expenses.reduce(
        (acc, curr) => acc + curr.amount,
        0
      ),
      reportDate: moment(fetchReport.reportDate).format("MMM DD YYYY"),
      createdAt: moment(fetchReport.createdAt).format("MMM DD YYYY"),
      updatedAt: moment(fetchReport.updatedAt).format("MMM DD YYYY"),
    };

    return responseHandler(res, 200, "Report found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.reimburseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { descriptionFinance, amount } = req.body;
    if (!id) {
      return responseHandler(res, 400, "Approval ID is required");
    }

    const fetchReport = await Report.findById(id);

    if (!fetchReport) return responseHandler(res, 400, "Report not found");

    if (amount > 0) {
      await Deduction.create({
        user: fetchReport.user,
        amount,
        deductBy: req.userId,
        deductOn: Date.now(),
        report: id,
        mode: "bank",
      });
    }

    const reimburse = await Report.findByIdAndUpdate(
      id,
      {
        status: "reimbursed",
        descriptionFinance,
        reimburserModel: "Admin",
        reimburser: req.userId,
      },
      { new: true }
    );

    await Notification.create({
      content: reimburse._id,
      user: reimburse.user,
      status: reimburse.status,
    });

    if (!reimburse) return responseHandler(res, 400, "Reimbursed failed");

    return responseHandler(res, 200, `Reimbursed successfully`);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.imageAnalysis = async (req, res) => {
  try {
    const { imageUrl } = req.query;
    console.log("Received imageUrl:", imageUrl);

    if (!imageUrl) {
      return responseHandler(res, 400, "Image URL is required");
    }

    const response = await analyzeImage(imageUrl);

    if (response) {
      return responseHandler(res, 200, "Image analyzed successfully", response);
    } else {
      return responseHandler(res, 400, "Image analysis failed");
    }
  } catch (error) {
    console.error("Error during image analysis:", error);
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.createtransaction = async (req, res) => {
  try {
    let transactionData = req.body;

    // Validate input data (Assuming you have a validation schema)
    const validation = createTransactionSchema.validate(transactionData, {
      abortEarly: false,
    });

    if (validation.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${validation.error.details
          .map((err) => err.message)
          .join(", ")}`
      );
    }

    // Create the advance payment record
    transactionData.company = req.companyId;
    const newtransaction = await transaction.create(transactionData);

    if (newtransaction) {
      return responseHandler(
        res,
        201,
        `Transaction created successfully!`,
        newtransaction
      );
    } else {
      return responseHandler(res, 400, `Transaction creation failed`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.viewtransactionById = async (req, res) => {
  try {
    const transactionId = req.params.id;

    // Find the advance payment by ID
    const transaction = await transaction
      .findById(transactionId)
      .populate("requestedBy.sender", "name") // Populate admin's name
      .populate("requestedBy.receiver", "name") // Populate staff's name
      .populate("paidBy", "name"); // Populate financer name

    if (!transaction) {
      return responseHandler(res, 404, `Advance payment not found`);
    }

    return responseHandler(res, 200, `Advance payment found`, transaction);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getWallet = async (req, res) => {
  try {
    // Find the user and verify their existence
    const user = await User.findById(req.userId);
    if (!user) return responseHandler(res, 404, "User not found");

    // Calculate the start and end of the current month
    const startOfMonth = moment.utc().startOf("month").toDate();
    const endOfMonth = moment.utc().endOf("month").toDate();

    // Calculate the total amount of all advances paid to the user
    const advances = await transaction
      .find({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        "requestedBy.receiver": req.userId,
        status: "completed", // Only include completed payments
      })
      .populate("requestedBy.sender", "name");

    const mappedAdvances = advances.map((advance) => ({
      _id: `#transaction_${String(advance._id).slice(0, 6)}`,
      amount: advance.amount,
      date: advance.createdAt,
      mode: "credit",
      admin: advance.requestedBy.sender
        ? advance.requestedBy.sender.name
        : "User",
    }));

    const totalAmount = advances.reduce(
      (acc, advance) => acc + advance.amount,
      0
    );

    // Fetch all expenses for the user within the current month
    const expenses = await Deduction.find({
      deductOn: { $gte: startOfMonth, $lte: endOfMonth },
      mode: "wallet",
      status: true,
      user: req.userId,
    }).populate("deductBy", "name");

    // Calculate the total expenses
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    // Calculate the balance amount (total advances paid minus total expenses)
    const balanceAmount = totalAmount - totalExpenses;

    // Map the expense data for response
    const mappedData = expenses.map((exp) => ({
      _id: `#transaction_${String(exp._id).slice(0, 6)}`,
      amount: exp.amount,
      date: exp.deductOn,
      mode: "debit",
      admin: exp.deductBy.name,
    }));

    // Get the user's tier categories (assuming it's relevant for the resp0onse)
    const categories = user.tier.categories;

    const finalMappedData = [...mappedAdvances, ...mappedData];

    // Respond with the wallet details
    return responseHandler(res, 200, "Wallet details retrieved successfully", {
      totalAmount,
      totalExpenses,
      balanceAmount,
      expenses: finalMappedData,
      categories,
    });
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getPolicy = async (req, res) => {
  try {
    const getTier = await User.findById(req.userId);
    const getPolicy = await Policy.findOne({ tier: getTier.tier }).populate(
      "tier",
      "title"
    );
    if (!getPolicy) return responseHandler(res, 400, "Policy not found");
    const mappedData = {
      ...getPolicy._doc,
      tier: getPolicy.tier.title,
    };
    return responseHandler(
      res,
      200,
      "Policy retrieved successfully",
      mappedData
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.saveLocation = async (req, res) => {
  try {
    const { eventName, eventId, location } = req.body;

    if (!eventName || !location) {
      return responseHandler(res, 400, "Event name and location are required");
    }

    // Assuming req.userId represents the user making the request
    const locationData = await Location.create({
      eventName,
      eventId: eventId || null, // Optional event ID
      location,
      user: req.userId,
      timeRecorded: Date.now(), // Explicitly recording the time
    });

    return responseHandler(res, 200, "Location saved successfully");
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.registerCompany = async (req, res) => {
  try {
    const createCompanyValidator = createCompanySchema.validate(req.body, {
      abortEarly: true,
    });
    if (createCompanyValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createCompanyValidator.error}`
      );
    }
    const newCompany = new Company(req.body);
    await newCompany.save();
    await newCompany.populate("plan");
    if (newCompany) {
      const baseUrl = `${req.protocol}://${req.get("host")}/api/v1`;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: newCompany.plan.name,
                description: `Access to ${newCompany.plan.name} plan`,
              },
              unit_amount: Number(newCompany.plan.price) * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: newCompany.ownerEmail, 
        billing_address_collection: "required",
        customer_creation: "always",
        success_url: `${baseUrl}/user/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/user/payment/failure?session_id={CHECKOUT_SESSION_ID}`,
      });

      const successUrl = `${baseUrl}/user/payment/success?session_id=${session.id}`;
      const cancelUrl = `${baseUrl}/user/payment/failure?session_id=${session.id}`;
      session.success_url = successUrl;
      session.cancel_url = cancelUrl;

      const dateRandom = new Date().getTime();
      const paymentData = {
        company: newCompany._id,
        gatewayId: session.id,
        amount: newCompany.plan.price,
        currency: "INR",
        status: "created",
        receipt: `order_id${dateRandom}`,
      };

      await Payment.create(paymentData);
      await generateMail({
        to: `info@xpensea.com`,
        subject: "New Company Registration",
        text: `New company ${newCompany.name} has been registered.`,
      });
      return responseHandler(
        res,
        200,
        `Company created successfully..!`,
        session.url
      );
    } else {
      return responseHandler(res, 400, `Company creation failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.successPayment = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const updatePayment = await Payment.findOneAndUpdate(
      { gatewayId: sessionId },
      {
        status: "completed",
      },
      { new: true }
    );

    await Company.findByIdAndUpdate(
      updatePayment.company,
      { status: true },
      { new: true }
    );
    res.sendFile(path.join(__dirname, "../views/success.html"));
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.failurePayment = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    await Payment.findOneAndUpdate(
      { gatewayId: sessionId },
      {
        status: "failed",
      },
      { new: true }
    );
    res.sendFile(path.join(__dirname, "../views/cancel.html"));
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// exports.createtransaction = async (req, res) => {
//   try {
//     const transactionData = req.body;

//     const validation = createTransactionSchema.validate(transactionData, {
//       abortEarly: false,
//     });

//     if (validation.error) {
//       return responseHandler(
//         res,
//         400,
//         `Invalid input: ${validation.error.details
//           .map((err) => err.message)
//           .join(", ")}`
//       );
//     }

//     // Create the advance payment record
//     const newtransaction = await transaction.create(transactionData);

//     if (newtransaction) {
//       return responseHandler(
//         res,
//         201,
//         `Transaction created successfully!`,
//         newtransaction
//       );
//     } else {
//       return responseHandler(res, 400, `Transaction creation failed`);
//     }
//   } catch (error) {
//     return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
//   }
// };

const moment = require("moment-timezone");
const responseHandler = require("../../helpers/responseHandler");
const { sendOtp } = require("../../helpers/sendOtp");
const Expense = require("../models/expenseModel");
const Notification = require("../models/notificationModel");
const Report = require("../models/reportModel");
const User = require("../models/userModel");
const { hashPassword, comparePasswords } = require("../../utils/bcrypt");
const { generateOTP } = require("../../utils/generateOTP");
const { generateToken } = require("../../utils/generateToken");
const {
  createExpenseSchema,
  createReportSchema,
  problemSchema,
  createUserEventSchema,
  createUserEventEditSchema,
  createTransactionSchema,
  createCompanySchema,
} = require("../../validations");
const Problem = require("../models/problemModel");
const Event = require("../models/eventModel");
const mongoose = require("mongoose");
const runOCR = require("../../jobs/billAnalysis");
const analyzeImage = require("../../jobs/imageAnalysis");
const transaction = require("../models/transactionModel");
const Policy = require("../models/policyModel");
const Deduction = require("../models/deductionModel");
const Location = require("../models/locationModel");
const sendMail = require("../../utils/sendMail");
const Company = require("../models/companyModel");
const Stripe = require("stripe");
const Payment = require("../models/paymentModel");
const stripe = Stripe(process.env.STRIPE_SECRET);
const path = require("path");
const generateMail = require("../../utils/generateMail");
const Admin = require("../models/adminModel");
const { generateRandomPassword } = require("../../utils/generateRandomPassword");

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

    const company = await Company.findByIdAndUpdate(
      updatePayment.company,
      { status: true },
      { new: true }
    );

    const generatedPassword = generateRandomPassword();

    const hashedPassword = await hashPassword(generatedPassword);

    const newAdmin = await Admin.create({
      company: company._id,
      name: company.admin_name,
      designation: "Admin",
      email: company.email,
      mobile: company.phone,
      role: "666c1a3895a6b176b7f2bcf7",
      password: hashedPassword,
      status: true,
    });

    if (newAdmin) {
      await generateMail({
        to: newAdmin.email,
        subject: "Welcome to Admin Panel",
        text: `Hi ${newAdmin.name},\n
        Welcome to Admin Panel.\n
        Your account has been created successfully.\n
        Username: ${newAdmin.email}\n
        Password: ${generatedPassword}\n
        Use the link https://dashboard.xpensea.com for login.\n
        Login to your account and start managing your expenses and reports.`,
      });
    }

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

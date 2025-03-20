const responseHandler = require("../helpers/responseHandler");
const transaction = require("../transaction/transactionModel");
const Deduction = require("../deduction/deductionModel");
const User = require("../user/userModel");
const Expense = require("../expense/expenseModel");
const Report = require("../report/reportModel");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const { createTransactionSchema } = require("../validations");

exports.createtransaction = async (req, res) => {
  try {
    let transactionData = req.body;

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

exports.viewTransactionsAndDeductions = async (req, res) => {
  try {
    const { type, staffId } = req.query;

    let transactions = [];
    let deductions = [];

    const filter = {};
    const query = {};
    if (staffId) {
      filter["requestedBy.receiver"] = new mongoose.Types.ObjectId(staffId);
      query.user = new mongoose.Types.ObjectId(staffId);
    }

    if (!type || type === "credit") {
      filter.company = req.companyId;
      transactions = await transaction
        .find(filter)
        .populate("requestedBy.sender requestedBy.receiver paidBy", "name");
    }

    if (!type || type === "debit") {
      query.company = req.companyId;
      deductions = await Deduction.find(query).populate(
        "user deductBy report",
        "name"
      );
    }

    const transactionList = transactions.map((transaction) => ({
      _id: transaction._id,
      amount: transaction.amount,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      type: "credit",
      date: transaction.paidOn || transaction.requestedOn,
      description: transaction.description,
      user: transaction.requestedBy.receiver?.name,
      performedBy: transaction.requestedBy.sender?.name
        ? transaction.requestedBy.sender?.name
        : transaction.requestedBy.receiver?.name,
    }));

    const deductionList = deductions.map((deduction) => ({
      _id: deduction._id,
      amount: deduction.amount,
      paymentMethod: deduction.mode,
      status: deduction.status ? "deducted" : "failed",
      type: "debit",
      date: deduction.deductOn,
      description: `Deduction: ${
        deduction.report ? "Report ID: " + deduction.report : "No report"
      }`,
      user: deduction.user?.name,
      performedBy: deduction.deductBy?.name,
    }));

    let combinedList = [];
    if (!type) {
      combinedList = [...transactionList, ...deductionList];
    } else if (type === "credit") {
      combinedList = transactionList;
    } else if (type === "debit") {
      combinedList = deductionList;
    }

    combinedList.sort((a, b) => new Date(b.date) - new Date(a.date));

    return responseHandler(
      res,
      200,
      "Transactions and deductions retrieved successfully",
      combinedList
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.viewtransactionById = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transactionRecord = await transaction
      .findById(transactionId)
      .populate("requestedBy.sender requestedBy.receiver paidBy", "name");

    if (!transactionRecord) {
      return responseHandler(res, 404, `Transaction not found`);
    }

    return responseHandler(res, 200, `Transaction found`, transactionRecord);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.transactionMarkCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (!id) {
      return responseHandler(res, 400, "Advance Payment ID is required");
    }

    const advance = await transaction.findByIdAndUpdate(
      id,
      {
        status: "completed",
        paymentMethod: req.body.paymentMethod,
        description,
        paidBy: req.userId,
        paidOn: new Date(),
      },
      { new: true }
    );

    if (!advance) {
      return responseHandler(
        res,
        400,
        "Reimbursement failed or Advance Payment not found"
      );
    }

    return responseHandler(res, 200, "Reimbursed successfully", advance);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getWallet = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "User ID is required");
    }
    const user = await User.findById(id);
    if (!user) return responseHandler(res, 404, "User not found");

    const advances = await transaction.find({
      "requestedBy.receiver": id,
      status: "completed",
    });

    const totalAmount = advances.reduce(
      (acc, advance) => acc + advance.amount,
      0
    );

    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    const expenses = await Expense.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $in: ["mapped", "approved"] },
      user: id,
    });

    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    const balanceAmount = totalAmount - totalExpenses;

    const mappedData = expenses.map((exp) => ({
      _id: exp._id,
      category: exp.category,
      amount: exp.amount,
      image: exp.image,
      title: exp.title,
    }));

    const categories = user.tier.categories;

    const totalReportSubmitted = await Report.countDocuments({
      user: id,
    });

    const totalReportReimbursed = await Report.countDocuments({
      user: id,
      status: "reimbursed",
    });

    const totalReportRejected = await Report.countDocuments({
      user: id,
      status: "rejected",
    });

    const totalReportPending = await Report.countDocuments({
      user: id,
      status: "pending",
    });

    return responseHandler(res, 200, "Wallet details retrieved successfully", {
      totalAmount,
      totalExpenses,
      balanceAmount,
      expenses: mappedData,
      categories,
      totalReportSubmitted,
      totalReportReimbursed,
      totalReportRejected,
      totalReportPending,
    });
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
}; 
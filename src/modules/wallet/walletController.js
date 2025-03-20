const responseHandler = require("../../helpers/responseHandler");
const User = require("../user/userModel");
const Expense = require("../expense/expenseModel");
const Report = require("../report/reportModel");
const transaction = require("../transaction/transactionModel");
const Deduction = require("../deduction/deductionModel");
const moment = require("moment-timezone");

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

exports.deductWallet = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount) {
      return responseHandler(res, 400, "User ID and amount are required");
    }

    const user = await User.findById(userId);
    if (!user) return responseHandler(res, 404, "User not found");

    const advances = await transaction.find({
      "requestedBy.receiver": userId,
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
      user: userId,
    });

    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    const balanceAmount = totalAmount - totalExpenses;

    if (balanceAmount < amount) {
      return responseHandler(res, 400, "Insufficient balance");
    }

    const deduction = await Deduction.create({
      user: userId,
      amount,
      deductBy: req.userId,
      deductOn: new Date(),
    });

    return responseHandler(res, 200, "Amount deducted successfully", deduction);
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
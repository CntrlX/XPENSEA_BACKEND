const responseHandler = require("../../helpers/responseHandler");
const Expense = require("../expense/expenseModel");
const User = require("../user/userModel");
const runOCR = require("../../jobs/billAnalysis");
const{createExpenseSchema} = require("../../validations");

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
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
}; 
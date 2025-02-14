const mongoose = require("mongoose");
//test
const expenseSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    title: { type: String },
    amount: { type: Number },
    date: { type: Date },
    time: { type: Date },
    location: { type: String },
    address: { type: String },
    category: { type: String },
    description: { type: String },
    image: [{ type: String }], // TODO: change name as document
    documentOcrText: [{ type: String }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      default: "draft",
      enum: ["draft", "mapped", "rejected", "accepted", "approved"], //TODO added approved for testing remove it later
    },
    reason: { type: String },
    aiScores: {
      authenticity: { type: Number, min: 0, max: 10 }, //Evaluates the legitimacy of the bill. This score could be determined by checking for common signs of tampering, the presence of a recognizable vendor logo, date formatting, etc.
      accuracy: { type: Number, min: 0, max: 10 }, //Measures how accurately the expense details match the company's reimbursement policy. This can include verifying amounts, dates, and the nature of the expense.
      compliance: { type: Number, min: 0, max: 10 }, //Assesses how well the expense adheres to company policies and guidelines. Factors may include spending limits, approved vendors, and relevant categories.
      completeness: { type: Number, min: 0, max: 10 }, //Ensures that all required information is present and correctly filled out on the bill. Missing information or illegible entries could lower this score.
      relevance: { type: Number, min: 0, max: 10 }, //Evaluates how relevant the expense is to the employee's job function and current projects. Non-relevant expenses might score lower.
    },
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;

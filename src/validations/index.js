const Joi = require("joi");

exports.createAdminSchema = Joi.object({
  name: Joi.string().required(),
  designation: Joi.string().required(),
  email: Joi.string().required(),
  mobile: Joi.string().required(),
  password: Joi.string().required(),
  role: Joi.string().required(),
  company: Joi.string().required(),
  status: Joi.boolean(),
});

exports.editAdminSchema = Joi.object({
  name: Joi.string(),
  designation: Joi.string(),
  email: Joi.string(),
  mobile: Joi.string(),
  role: Joi.string(),
  company: Joi.string(),
  status: Joi.boolean(),
});

exports.createRoleSchema = Joi.object({
  roleName: Joi.string().required(),
  description: Joi.string(),
  permissions: Joi.array(),
  locationAccess: Joi.array(),
  status: Joi.boolean(),
});

exports.editRoleSchema = Joi.object({
  roleName: Joi.string(),
  description: Joi.string(),
  permissions: Joi.array(),
  locationAccess: Joi.array(),
  status: Joi.boolean(),
});

exports.createTierSchema = Joi.object({
  title: Joi.string().required(),
  activationDate: Joi.date().required(),
  categories: Joi.array(),
  status: Joi.boolean(),
  totalAmount: Joi.number(),
  level: Joi.number().required(),
});

exports.editTierSchema = Joi.object({
  title: Joi.string(),
  activationDate: Joi.date(),
  categories: Joi.array(),
  status: Joi.boolean(),
  totalAmount: Joi.number(),
  level: Joi.number(),
});

exports.createUserSchema = Joi.object({
  employeeId: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().required(),
  mobile: Joi.string().required(),
  tier: Joi.string().required(),
  userType: Joi.string().required(),
  location: Joi.string().required(),
  designation: Joi.string().required(),
  approver: Joi.string(),
  status: Joi.boolean(),
});

exports.editUserSchema = Joi.object({
  employeeId: Joi.string(),
  name: Joi.string(),
  email: Joi.string(),
  mobile: Joi.string(),
  tier: Joi.string(),
  userType: Joi.string(),
  location: Joi.string(),
  status: Joi.boolean(),
});

exports.editUserSchema = Joi.object({
  employeeId: Joi.string(),
  name: Joi.string(),
  email: Joi.string(),
  mobile: Joi.string(),
  tier: Joi.string(),
  userType: Joi.string(),
  location: Joi.string(),
  status: Joi.boolean(),
});

exports.createExpenseSchema = Joi.object({
  title: Joi.string().required(),
  amount: Joi.number().required(),
  date: Joi.date().required(),
  time: Joi.date().required(),
  location: Joi.string().required(),
  address: Joi.string().required(),
  category: Joi.string().required(),
  description: Joi.string().required(),
  image: Joi.array().required(),
});

exports.createReportSchema = Joi.object({
  title: Joi.string().required(),
  reportDate: Joi.date().required(),
  description: Joi.string().required(),
  expenses: Joi.array().required(),
  location: Joi.string().required(),
  type: Joi.string().required(),
  status: Joi.string(),
  event: Joi.string(),
});

exports.createEventSchema = Joi.object({
  eventName: Joi.string().required(),
  days: Joi.number().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().required(),
  description: Joi.string().required(),
  location: Joi.string().required(),
  staffs: Joi.array().required(),
});

exports.createUserEventSchema = Joi.object({
  eventName: Joi.string().required(),
  days: Joi.number().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().required(),
  description: Joi.string().required(),
  status: Joi.string(),
});

exports.createUserEventEditSchema = Joi.object({
  eventName: Joi.string(),
  days: Joi.number(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  startTime: Joi.date(),
  endTime: Joi.date(),
  description: Joi.string(),
});

exports.editEventSchema = Joi.object({
  eventName: Joi.string(),
  days: Joi.number(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  startTime: Joi.date(),
  endTime: Joi.date(),
  description: Joi.string(),
  location: Joi.string(),
  staffs: Joi.array(),
  status: Joi.string(),
});

exports.problemSchema = Joi.object({
  description: Joi.string().required(),
  to: Joi.string().required(),
});

exports.createTransactionSchema = Joi.object({
  requestedBy: Joi.object({
    sender: Joi.string().required(), // Admin who requested
    receiver: Joi.string().required(), // Staff who requested
  }).required(),
  requestedOn: Joi.date().default(Date.now), // Request date
  amount: Joi.number().required(), // Amount of payment
  paidBy: Joi.string().optional(), // Financer who paid
  status: Joi.string()
    .valid("pending", "completed", "cancelled") // Status of the payment
    .default("pending"),
  paidOn: Joi.date().optional(), // Date of payment
  paymentMethod: Joi.string()
    .valid("Bank Transfer", "Cash", "Credit Card", "Other") // Payment method
    .optional(),
  description: Joi.string().optional(), // Description of the payment
});

exports.createPolicySchema = Joi.object({
  policyTitle: Joi.string().required(),
  tier: Joi.string().required(), // Assuming the ObjectId is represented as a string
  userType: Joi.string().optional(),
  activationDate: Joi.date().required(),
  location: Joi.string().required(),
  policyDetails: Joi.string().optional(),
  accuracy: Joi.string().required(),
  authenticity: Joi.string().required(),
  compliance: Joi.string().required(),
  relevance: Joi.string().required(),
  completeness: Joi.string().required(),
});

exports.createDeductionSchema = Joi.object({
  amount: Joi.number().required(),
  report: Joi.string().required(),
});

exports.createPlanSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required(),
  maxUsers: Joi.number().required(),
  features: Joi.array().required(),
});

exports.updatePlanSchema = Joi.object({
  name: Joi.string(),
  price: Joi.number(),
  maxUsers: Joi.number(),
  features: Joi.array(),
  status: Joi.boolean(),
});

exports.createCompanySchema = Joi.object({
  name: Joi.string().required(),
  ownerEmail: Joi.string().required(),
  address: Joi.string().required(),
  industry: Joi.string().required(),
  plan: Joi.string().required(),
});

exports.editCompanySchema = Joi.object({
  name: Joi.string(),
  ownerEmail: Joi.string(),
  address: Joi.string(),
  industry: Joi.string(),
  plan: Joi.string(),
});

//nodemailer code

// var nodemailer = require('nodemailer');

// var transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'help.xpensea@gmail.com',
//     pass: 'bvix uhjn cvwf wczw'
//   }
// });

// var mailOptions = {
//   from: 'help.xpensea@gmail.com',
//   to: 'rishariyad@gmail.com',
//   subject: 'Sending Email using Node.js',
//   text: 'This is a test email!'
// };

// transporter.sendMail(mailOptions, function(error, info){
//   if (error) {
//     console.log(error);
//   } else {
//     console.log('Email sent: ' + info.response);
//   }
// });

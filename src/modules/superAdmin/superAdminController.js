const responseHandler = require("../../helpers/responseHandler");
const Company = require("../models/companyModel");
const Plan = require("../models/planModel");
const Payment = require("../models/paymentModel");
const checkAccess = require("../../helpers/checkAccess");
const moment = require("moment-timezone");
const {
  createCompanyAdminSchema,
  createCompanySchema,
} = require("../../validations");
const { hashPassword, comparePasswords } = require("../../utils/bcrypt");
const generateMail = require("../../utils/generateMail");
const Admin = require("../models/adminModel");
const Transaction = require("../models/transactionModel");
const { generateToken } = require("../../utils/generateTokenSuperAdmin");
const { generateOTP } = require("../../utils/generateOTP");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET);

exports.superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return responseHandler(res, 400, "Email and password are required");
    }

    const findAdmin = await Admin.findOne({ email });
    if (!findAdmin) {
      return responseHandler(res, 404, "Admin not found");
    }

    const comparePassword = await comparePasswords(
      password,
      findAdmin.password
    );
    if (!comparePassword) {
      return responseHandler(res, 401, "Invalid password");
    }

    const token = generateToken(findAdmin.role);

    return responseHandler(res, 200, "Login successfull", token);
  } catch (error) {
    return responseHandler(
      res,
      500,
      `Internal Server Error ${error.message}`,
      null
    );
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

    // Check if the company exists
    let existingCompany = await Company.findOne({ email: req.body.ownerEmail });
    if (!existingCompany) {
      return responseHandler(
        res,
        404,
        "Company not found. Please request an OTP first."
      );
    }

    // Update company details
    existingCompany.set(req.body);
    await existingCompany.save();
    await existingCompany.populate("plan");

    const baseUrl = `${req.protocol}://${req.get("host")}/api/v1`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: existingCompany.plan.name,
              description: `Access to ${existingCompany.plan.name} plan`,
            },
            unit_amount: Number(existingCompany.plan.price) * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: existingCompany.email,
      billing_address_collection: "required",
      customer_creation: "always",
      success_url: `${baseUrl}/user/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/user/payment/failure?session_id={CHECKOUT_SESSION_ID}`,
    });

    const dateRandom = new Date().getTime();
    const paymentData = {
      company: existingCompany._id,
      gatewayId: session.id,
      amount: existingCompany.plan.price,
      currency: "INR",
      status: "created",
      receipt: `order_id${dateRandom}`,
      plan: existingCompany.plan.name,
    };

    await Payment.create(paymentData);
    await generateMail({
      to: "info@xpensea.com",
      subject: "Company Registration Updated",
      text: `Company ${existingCompany.name} has been updated and is proceeding with payment.`,
    });

    return responseHandler(
      res,
      200,
      `Company updated successfully..!`,
      session.url
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getAllCompanies = async (req, res) => {
  try {
    const { pageNo = 1, limit = 10, status } = req.query;
    const skipCount = limit * (pageNo - 1);
    const filter = {};

    if (status !== undefined) {
      filter.status = status === "true";
    }

    const totalCount = await Company.countDocuments(filter);
    const companies = await Company.find(filter)
      .populate("plan", "name price maxUsers features")
      .skip(skipCount)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    if (!companies || companies.length === 0) {
      return responseHandler(res, 404, "No companies found");
    }

    const mappedData = companies.map((company) => ({
      ...company,
      createdAt: moment(company.createdAt).format("MMM DD YYYY"),
    }));

    return responseHandler(res, 200, "Companies found", mappedData, totalCount);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return responseHandler(res, 400, "Company ID is required");
    }

    const company = await Company.findById(companyId)
      .populate("plan", "name price maxUsers features")
      .lean();

    if (!company) {
      return responseHandler(res, 404, "Company not found");
    }

    const transactions = await Transaction.find({ company: companyId })
      .populate("requestedBy.sender", "name")
      .populate("requestedBy.receiver", "name")
      .populate("paidBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    const mappedData = {
      ...company,
      createdAt: moment(company.createdAt).format("MMM DD YYYY"),
      transactions: transactions.map((transaction) => ({
        ...transaction,
        requestedOn: moment(transaction.requestedOn).format("MMM DD YYYY"),
        paidOn: transaction.paidOn
          ? moment(transaction.paidOn).format("MMM DD YYYY")
          : null,
      })),
    };

    return responseHandler(res, 200, "Company details found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getAllPlans = async (req, res) => {
  try {
    const { pageNo = 1, limit = 10, status } = req.query;
    const skipCount = limit * (pageNo - 1);
    const filter = {};

    if (status !== undefined) {
      filter.status = status === "true";
    }

    const totalCount = await Plan.countDocuments(filter);
    const plans = await Plan.find(filter)
      .skip(skipCount)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    if (!plans || plans.length === 0) {
      return responseHandler(res, 404, "No plans found");
    }

    const mappedData = plans.map((plan) => ({
      ...plan,
      createdAt: moment(plan.createdAt).format("MMM DD YYYY"),
    }));

    return responseHandler(res, 200, "Plans found", mappedData, totalCount);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.createPlan = async (req, res) => {
  try {
    const createPlanValidator = createPlanSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createPlanValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createPlanValidator.error}`
      );
    }
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("planManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }
    const newPlan = await Plan.create(req.body);
    if (!newPlan) {
      return responseHandler(res, 400, `Plan creation failed...!`);
    }
    return responseHandler(
      res,
      201,
      `New Plan created successfull..!`,
      newPlan
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ status: true });
    return responseHandler(res, 200, "Plans retrieved successfully", plans);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getPlanById = async (req, res) => {
  try {
    // const check = await checkAccess(req.roleId, "permissions");
    // if (!check || !check.includes("planManagement_view")) {
    //   return responseHandler(
    //     res,
    //     403,
    //     "You don't have permission to perform this action"
    //   );
    // }
    const { id } = req.params;
    const plan = await Plan.findById(id);
    if (!plan) {
      return responseHandler(res, 404, "Plan not found");
    }
    return responseHandler(res, 200, "Plan retrieved successfully", plan);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("planManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }
    const { id } = req.params;
    const updatePlanValidator = updatePlanSchema.validate(req.body, {
      abortEarly: true,
    });
    if (updatePlanValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${updatePlanValidator.error}`
      );
    }
    const updatedPlan = await Plan.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedPlan) {
      return responseHandler(res, 400, "Plan update failed");
    }
    return responseHandler(res, 200, "Plan updated successfully", updatedPlan);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("planManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }
    const { id } = req.params;
    const deletedPlan = await Plan.findByIdAndDelete(id);
    if (!deletedPlan) {
      return responseHandler(res, 400, "Plan deletion failed");
    }
    return responseHandler(res, 200, "Plan deleted successfully", deletedPlan);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const { pageNo = 1, limit = 10, status } = req.query;
    const skipCount = limit * (pageNo - 1);
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const totalCount = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate("company", "name ownerEmail")
      .skip(skipCount)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    if (!payments || payments.length === 0) {
      return responseHandler(res, 404, "No payments found");
    }

    const mappedData = payments.map((payment) => ({
      ...payment,
      createdAt: moment(payment.createdAt).format("MMM DD YYYY"),
    }));

    return responseHandler(res, 200, "Payments found", mappedData, totalCount);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getCompanyPayments = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { pageNo = 1, limit = 10, status } = req.query;
    const skipCount = limit * (pageNo - 1);
    const filter = { company: companyId };

    if (!companyId) {
      return responseHandler(res, 400, "Company ID is required");
    }

    if (status) {
      filter.status = status;
    }

    const totalCount = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate("company", "name ownerEmail")
      .skip(skipCount)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    if (!payments || payments.length === 0) {
      return responseHandler(res, 404, "No payments found for this company");
    }

    const mappedData = payments.map((payment) => ({
      ...payment,
      createdAt: moment(payment.createdAt).format("MMM DD YYYY"),
    }));

    return responseHandler(
      res,
      200,
      "Company payments found",
      mappedData,
      totalCount
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      companyPlanStats,
      totalRevenue,
      companyPlanCounts,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: true }),
      Plan.aggregate([
        {
          $group: {
            _id: "$name",
            count: { $sum: 1 },
          },
        },
      ]),
      Company.aggregate([
        {
          $lookup: {
            from: "plans",
            localField: "plan",
            foreignField: "_id",
            as: "planDetails",
          },
        },
        {
          $unwind: "$planDetails",
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$planDetails.price" },
          },
        },
      ]).then((data) => data[0]?.totalRevenue || 0),
      Company.aggregate([
        {
          $group: {
            _id: "$plan",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "plans",
            localField: "_id",
            foreignField: "_id",
            as: "planDetails",
          },
        },
        {
          $unwind: "$planDetails",
        },
        {
          $project: {
            _id: 0,
            plan: "$planDetails.name",
            count: 1,
          },
        },
      ]).then((data) => data),
    ]);

    const dashboardData = {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        plans: companyPlanStats,
        planSubscriptions: companyPlanCounts,
      },
      revenue: totalRevenue,
      monthleyRevenue: totalRevenue / 12,
    };

    return responseHandler(
      res,
      200,
      "Dashboard statistics retrieved successfully",
      dashboardData
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.createCompanyAdmin = async (req, res) => {
  try {
    const createAdminValidator = createCompanyAdminSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createAdminValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createAdminValidator.error}`
      );
    }

    const findAdmin = await Admin.findOne({
      $or: [{ email: req.body.email }, { mobile: req.body.mobile }],
    });
    if (findAdmin)
      return responseHandler(
        res,
        409,
        `Admin with this email or phone already exists`
      );

    const hashedPassword = await hashPassword(req.body.password);
    req.body.password = hashedPassword;

    const newAdmin = await Admin.create(req.body);

    if (newAdmin) {
      await generateMail({
        to: newAdmin.email,
        subject: "Welcome to Admin Panel",
        text: `Hi ${newAdmin.name},\n
          Welcome to Admin Panel.\n
          Your account has been created successfully.\n
          Username: ${newAdmin.email}\n
          Password: ${req.body.password}\n
          Login to your account and start managing your expenses and reports.`,
      });
      return responseHandler(
        res,
        201,
        `New Admin created successfull..!`,
        newAdmin
      );
    } else {
      return responseHandler(res, 400, `Admin creation failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.sendOtpToEmail = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return responseHandler(res, 400, "Email and name are required");
    }

    // Check for existing verified company
    let existingCompany = await Company.findOne({
      email,
      isVerified: true,
    });

    if (existingCompany) {
      return responseHandler(
        res,
        409,
        "Company with this email already exists"
      );
    }

    const otp = generateOTP();

    // Save or update company with new OTP
    await Company.findOneAndUpdate(
      { email },
      {
        name,
        email,
        otp,
        otpExpiry: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
        isVerified: false,
      },
      { upsert: true, new: true }
    );

    // Send OTP via email
    await generateMail({
      to: email,
      subject: "Email Verification OTP",
      text: `Hi ${name},\n\nYour OTP for email verification is: ${otp}. \nIt is valid for 5 minutes.\n\nThank you!`,
    });

    return responseHandler(
      res,
      200,
      "OTP sent successfully. Please check your email",
      { success: true }
    );
  } catch (error) {
    console.error("Error sending OTP:", error);
    return responseHandler(res, 500, "Failed to send OTP. Please try again.");
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return responseHandler(res, 400, "Email and OTP are required");
    }

    // Explicitly select OTP fields
    const company = await Company.findOne({ email }).select("+otp +otpExpiry");

    if (!company) {
      return responseHandler(
        res,
        404,
        "No verification request found for this email"
      );
    }

    // Check if OTP has expired
    if (company.otpExpiry && company.otpExpiry < Date.now()) {
      return responseHandler(
        res,
        400,
        "OTP has expired. Please request a new one"
      );
    }

    // Check if OTP matches
    if (company.otp !== otp) {
      return responseHandler(res, 400, "Invalid OTP");
    }

    // Clear OTP and mark as verified
    company.isVerified = true;
    company.otp = undefined;
    company.otpExpiry = undefined;
    await company.save();

    return responseHandler(res, 200, "Email verified successfully", {
      success: true,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return responseHandler(res, 500, "Failed to verify OTP. Please try again.");
  }
};

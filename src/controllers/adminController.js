const responseHandler = require("../helpers/responseHandler");
const Admin = require("../models/adminModel");
const Role = require("../models/roleModel");
const Tier = require("../models/tierModel");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const transaction = require("../models/transactionModel");
const Policy = require("../models/policyModel");
const mongoose = require("mongoose");

const { hashPassword, comparePasswords } = require("../utils/bcrypt");
const { generateToken } = require("../utils/generateToken");
const checkAccess = require("../helpers/checkAccess");
const {
  createAdminSchema,
  editAdminSchema,
  createRoleSchema,
  editRoleSchema,
  createTierSchema,
  editTierSchema,
  createUserSchema,
  editUserSchema,
  createEventSchema,
  editEventSchema,
  createPolicySchema,
  createTransactionSchema,
  createDeductionSchema,
  createPlanSchema,
  updatePlanSchema,
} = require("../validations");
const moment = require("moment-timezone");
const Report = require("../models/reportModel");
const Expense = require("../models/expenseModel");
const Notification = require("../models/notificationModel");
const Deduction = require("../models/deductionModel");
const Plan = require("../models/planModel");
const generateMail = require("../utils/generateMail");
const { text } = require("express");

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return responseHandler(res, 400, "Email and password are required");
    }

    const findAdmin = await Admin.findOne({ email });
    if (!findAdmin) {
      return responseHandler(res, 404, "Admin not found");
    }else if(!findAdmin.status){
      return responseHandler(res, 404, "Admin is not active");
    }

    const comparePassword = await comparePasswords(
      password,
      findAdmin.password
    );
    if (!comparePassword) {
      return responseHandler(res, 401, "Invalid password");
    }

    const token = generateToken(
      findAdmin._id,
      findAdmin.role,
      findAdmin.company
    );

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

/* The `exports.createAdmin` function is responsible for creating a new admin in the system. Here is a
breakdown of what the functions is doing: */
exports.createAdmin = async (req, res) => {
  try {
    const createAdminValidator = createAdminSchema.validate(req.body, {
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
    req.body.company = req.companyId;

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

/* The `exports.editAdmin` function is responsible for updating an existing admin in the system. Here
is a breakdown of what the function is doing: */
exports.editAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Admin ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("adminManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findAdmin = await Admin.findById(id);
    if (!findAdmin) {
      return responseHandler(res, 404, "Admin not found");
    }

    const editAdminValidator = editAdminSchema.validate(req.body, {
      abortEarly: true,
    });
    if (editAdminValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${editAdminValidator.error}`
      );
    }

    const updateAdmin = await Admin.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (updateAdmin) {
      return responseHandler(
        res,
        200,
        `Admin updated successfully..!`,
        updateAdmin
      );
    } else {
      return responseHandler(res, 400, `Admin update failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that is used to delete an admin user from a system. Here is
a breakdown of what the code is doing: */
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Admin ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("adminManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findAdmin = await Admin.findById(id);
    if (!findAdmin) {
      return responseHandler(res, 404, "Admin not found");
    }

    const deleteAdmin = await Admin.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (deleteAdmin) {
      return responseHandler(res, 200, `Admin deleted successfully..!`);
    } else {
      return responseHandler(res, 400, `Admin deletion failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.getAdmin` function is responsible for retrieving an admin's information based on the
provided ID. Here is a breakdown of what the function is doing: */
exports.getAdmin = async (req, res) => {
  try {
    const id = req.userId;
    if (!id) {
      return responseHandler(res, 400, "Admin ID is required");
    }
    const findAdmin = await Admin.findById(id)
      .select("-password")
      .populate("role", "permissions locationAccess")
      .lean();
    const mappedData = {
      ...findAdmin,
      createdAt: moment(findAdmin.createdAt).format("MMM DD YYYY"),
    };
    if (!findAdmin) {
      return responseHandler(res, 404, "Admin not found");
    }
    return responseHandler(res, 200, "Admin found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const id = req.userId;
    if (!id) {
      return responseHandler(res, 400, "Admin ID is required");
    }
    const findAdmin = await Admin.findById(id);
    if (!findAdmin) {
      return responseHandler(res, 404, "Admin not found");
    }

    const { oldPassword, newPassword } = req.body;
    const isMatch = await comparePasswords(oldPassword, findAdmin.password);
    if (!isMatch) {
      return responseHandler(res, 400, "Old password is incorrect");
    }
    const hashedPassword = await hashPassword(newPassword);
    const updateAdmin = await Admin.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );
    if (updateAdmin) {
      return responseHandler(res, 200, "Password changed successfully");
    } else {
      return responseHandler(res, 400, "Password change failed");
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.getAdminById` function is responsible for retrieving a admin's information based on the
provided ID. Here is a breakdown of what the function is doing: */
exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Admin ID is required");
    }
    const findAdmin = await Admin.findById(id).lean();
    const mappedData = {
      ...findAdmin,
      createdAt: moment(findAdmin.createdAt).format("MMM DD YYYY"),
    };
    if (!findAdmin) {
      return responseHandler(res, 404, "Admin not found");
    }
    return responseHandler(res, 200, "Admin found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.createRole` function is responsible for creating a new role in the system. Here is a
breakdown of what the function is doing: */
exports.createRole = async (req, res) => {
  try {
    const createRoleValidator = createRoleSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createRoleValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createRoleValidator.error}`
      );
    }
    req.body.company = req.companyId;
    const newRole = await Role.create(req.body);
    if (!newRole) {
      return responseHandler(res, 400, `Role creation failed...!`);
    }
    return responseHandler(
      res,
      201,
      `New Role created successfull..!`,
      newRole
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.editRole` function is responsible for updating an existing role in the system. Here is
a breakdown of what the function is doing: */
exports.editRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Role ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("roleManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findRole = await Role.findById(id);
    if (!findRole) {
      return responseHandler(res, 404, "Role not found");
    }
    const editRoleValidator = editRoleSchema.validate(req.body, {
      abortEarly: true,
    });
    if (editRoleValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${editRoleValidator.error}`
      );
    }
    const updateRole = await Role.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (updateRole) {
      return responseHandler(
        res,
        200,
        `Role updated successfully..!`,
        updateRole
      );
    } else {
      return responseHandler(res, 400, `Role update failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.getRole` function is responsible for retrieving a role's information based on the
provided ID. Here is a breakdown of what the function is doing: */
exports.getRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Role ID is required");
    }
    const findRole = await Role.findById(id).lean();
    const mappedData = {
      ...findRole,
      createdAt: moment(findRole.createdAt).format("MMM DD YYYY"),
    };
    if (!findRole) {
      return responseHandler(res, 404, "Role not found");
    }
    return responseHandler(res, 200, "Role found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that handles the deletion of a role. Here is a breakdown of
what the code is doing: */
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Role ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("roleManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findRole = await Role.findById(id);
    if (!findRole) {
      return responseHandler(res, 404, "Role not found");
    }

    const deleteRole = await Role.findByIdAndDelete(id);
    if (deleteRole) {
      return responseHandler(res, 200, `Role deleted successfully..!`);
    } else {
      return responseHandler(res, 400, `Role deletion failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a controller function in a Node.js application that handles listing data based on
the `type` parameter provided in the request query. Here's a breakdown of what the code is doing: */
exports.listController = async (req, res) => {
  try {
    const { type, pageNo = 1, limit = 10, status, isDeleted } = req.query;
    const skipCount = 10 * (pageNo - 1);
    const filter = {};

    const accessPermissions = {
      admins: "adminManagement_view",
      roles: "roleManagement_view",
      tiers: "tierManagement_view",
      events: "eventManagement_view",
      users: "userManagement_view",
      approvals: "approvalManagement_view",
      finances: "financeManagement_view",
      policy: "policyManagement_view",
    };

    if (
      [
        "admins",
        "users",
        "events",
        "tiers",
        "roles",
        "approvals",
        "finances",
        "transactions",
      ].includes(type)
    ) {
      filter.company = req.companyId;
    }

    if (type === "admins") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      if (isDeleted) {
        filter.isDeleted = isDeleted;
      } else {
        filter.isDeleted = false;
      }

      const totalCount = await Admin.countDocuments(filter);
      const fetchAdmins = await Admin.find(filter)
        .select("-password")
        .populate("role", "roleName")
        .sort({ createdAt: -1 })
        .skip(skipCount)
        .limit(limit)
        .lean();
      const mappedData = fetchAdmins.map((data) => {
        return {
          ...data,
          roleName: data.role.roleName,
          createdAt: moment(data.createdAt).format("MMM DD YYYY"),
        };
      });
      if (!fetchAdmins || fetchAdmins.length === 0) {
        return responseHandler(res, 404, "No Admins found");
      }
      return responseHandler(res, 200, "Admins found", mappedData, totalCount);
    } else if (type === "roles") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      const totalCount = await Role.countDocuments(filter);
      const fetchRoles = await Role.find(filter)
        .skip(skipCount)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      const mappedData = fetchRoles.map((data) => {
        return {
          ...data,
          createdAt: moment(data.createdAt).format("MMM DD YYYY"),
          updatedAt: moment(data.updatedAt).format("MMM DD YYYY"),
        };
      });
      if (!fetchRoles || fetchRoles.length === 0) {
        return responseHandler(res, 404, "No Roles found");
      }
      return responseHandler(res, 200, "Roles found", mappedData, totalCount);
    } else if (type === "tiers") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      if (status == "true") {
        filter.status = true;
      } else if (status == "false") {
        filter.status = false;
      }
      const totalCount = await Tier.countDocuments(filter);
      const fetchTiers = await Tier.aggregate([
        { $match: filter },
        { $skip: skipCount },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "tier",
            as: "users",
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            categories: 1,
            totalAmount: 1,
            activationDate: {
              $dateToString: { format: "%b %d %Y", date: "$activationDate" },
            },
            status: 1,
            updatedAt: {
              $dateToString: { format: "%b %d %Y", date: "$updatedAt" },
            },
            createdAt: {
              $dateToString: { format: "%b %d %Y", date: "$createdAt" },
            },
            noOfEmployees: { $size: "$users" },
            noAllowance: { $size: "$categories" },
          },
        },
      ]);

      if (!fetchTiers || fetchTiers.length === 0) {
        return responseHandler(res, 404, "No Tiers found");
      }

      return responseHandler(res, 200, "Tiers found", fetchTiers, totalCount);
    } else if (type === "users") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      if (status == "true") {
        filter.status = true;
      } else if (status == "false") {
        filter.status = false;
      }

      if (isDeleted == "true") {
        filter.isDeleted = true;
      } else if (isDeleted == "false") {
        filter.isDeleted = false;
      }

      const totalCount = await User.countDocuments(filter);
      const fetchUsers = await User.find(filter)
        .populate("tier", "title")
        .skip(skipCount)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      const mappedData = fetchUsers.map((data) => {
        return {
          ...data,
          tier: data.tier?.title,
          createdAt: moment(data.createdAt).format("MMM DD YYYY"),
        };
      });
      if (!fetchUsers || fetchUsers.length === 0) {
        return responseHandler(res, 404, "No Users found");
      }
      return responseHandler(res, 200, "Users found", mappedData, totalCount);
    } else if (type === "events") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      if (status) {
        filter.status = status;
      }

      if (req.query.creator) {
        filter.type = req.query.creator;
      }

      const totalCount = await Event.countDocuments(filter);
      const fetchEvents = await Event.find(filter)
        .skip(skipCount)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      const mappedData = fetchEvents.map((data) => {
        return {
          ...data,
          startDate: moment(data.startDate).format("MMM DD YYYY"),
          endDate: moment(data.endDate).format("MMM DD YYYY"),
          staffCount: data.staffs.length,
        };
      });
      if (!fetchEvents || fetchEvents.length === 0) {
        return responseHandler(res, 404, "No Events found");
      }
      return responseHandler(res, 200, "Events found", mappedData, totalCount);
    } else if (type === "approvals") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      if (status) {
        filter.status = status;
      } else {
        filter.status = { $ne: "drafted" };
      }

      const totalCount = await Report.countDocuments(filter);
      const fetchReports = await Report.find(filter)
        .populate("user", "name")
        .populate("expenses")
        .populate("event", "type")
        .skip(skipCount)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      const mappedData = fetchReports.map((data) => {
        return {
          _id: data._id,
          title: data.title,
          user: data.user.name,
          expenseCount: data.expenses.length,
          totalAmount: data.expenses.reduce(
            (acc, curr) => acc + curr.amount,
            0
          ),
          location: data.location,
          type: data.type,
          status: data.status,
          eventCreator: data.event ? data.event.type : "report",
          reportDate: moment(data.reportDate).format("MMM DD YYYY"),
          createdAt: moment(data.createdAt).format("MMM DD YYYY"),
          updatedAt: moment(data.updatedAt).format("MMM DD YYYY"),
        };
      });
      if (!fetchReports || fetchReports.length === 0) {
        return responseHandler(res, 404, "No Approvals found");
      }
      return responseHandler(
        res,
        200,
        "Approvals found",
        mappedData,
        totalCount
      );
    } else if (type === "approvers") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions["users"])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      const filter = {
        status: true,
        userType: "approver",
      };

      filter.company = req.companyId;

      const tier = req.query.tier;

      if (!tier) {
        return responseHandler(res, 400, "Tier is required");
      }

      const tierData = await Tier.findById(tier).select("level");
      const tierLevel = tierData.level;

      const targetTierLevel = tierLevel + 1;
      const targetTier = await Tier.findOne({ level: targetTierLevel }).select(
        "_id"
      );

      if (targetTier) {
        filter.tier = targetTier._id;
      }

      const fetchApprovers = await User.find(filter).select("-mpin");

      if (!fetchApprovers || fetchApprovers.length === 0) {
        const fetchAdmins = await Admin.find({ status: true }).select(
          "-password"
        );

        if (!fetchAdmins || fetchAdmins.length === 0) {
          return responseHandler(res, 404, "No Approvers found");
        }

        return responseHandler(res, 200, "Approvers found", fetchAdmins);
      }
      return responseHandler(res, 200, "Approvers found", fetchApprovers);
    } else if (type === "finances") {
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }
      filter.status = { $in: ["approved", "reimbursed"] };

      if (status) {
        filter.status = status;
      }

      const totalCount = await Report.countDocuments(filter);
      const fetchReports = await Report.find(filter)
        .populate("user", "name")
        .populate("expenses")
        .skip(skipCount)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      const mappedData = fetchReports.map((data) => {
        return {
          _id: data._id,
          title: data.title,
          user: data.user.name,
          expenseCount: data.expenses.length,
          totalAmount: data.expenses.reduce(
            (acc, curr) => acc + curr.amount,
            0
          ),
          location: data.location,
          status: data.status,
          reportDate: moment(data.reportDate).format("MMM DD YYYY"),
          createdAt: moment(data.createdAt).format("MMM DD YYYY"),
          updatedAt: moment(data.updatedAt).format("MMM DD YYYY"),
        };
      });
      if (!fetchReports || fetchReports.length === 0) {
        return responseHandler(res, 404, "No Approvals found");
      }
      return responseHandler(
        res,
        200,
        "Approvals found",
        mappedData,
        totalCount
      );
    } else if (type === "transactions") {
      // Check if the user has the required permissions
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions["finances"])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      // Setting up the filter based on status
      // filter.status = { $in: ["pending", "completed", "cancelled"] };

      if (status) {
        filter.status = status;
      }

      // Count total matching advance payment documents
      const totalCount = await transaction.countDocuments(filter);

      // Fetch advance payments based on the filter
      const fetchAdvances = await transaction
        .find(filter)
        .populate("requestedBy.sender requestedBy.receiver paidBy", "name")
        .skip(skipCount)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      if (!fetchAdvances || fetchAdvances.length === 0) {
        return responseHandler(res, 404, "No Transactions found");
      }

      const mappedData = fetchAdvances.map((data) => {
        return {
          _id: data._id,
          performedBy: data.requestedBy?.sender?.name
            ? data.requestedBy?.sender?.name
            : data.requestedBy?.receiver?.name,
          user: data.requestedBy?.receiver?.name,
          paidBy: data.paidBy ? data.paidBy.name : "",
          amount: data.amount,
          status: data.status,
          paymentMethod: data.paymentMethod,
        };
      });

      return responseHandler(
        res,
        200,
        "Transactions found",
        mappedData,
        totalCount
      );
    } else if (type === "policy") {
      // Check if the user has the required permissions
      const check = await checkAccess(req.roleId, "permissions");

      if (!check || !check.includes(accessPermissions[type])) {
        return responseHandler(
          res,
          403,
          "You don't have permission to perform this action"
        );
      }

      // Setting up the filter for the policy query
      const filter = {};
      if (status) {
        filter.status = status; // Example: filter by policy status if required
      }

      // Add additional filters if needed, e.g., by userType, tier, or location
      if (req.query.userType) {
        filter.userType = req.query.userType;
      }

      if (req.query.tier) {
        filter.tier = req.query.tier;
      }

      if (req.query.location) {
        filter.location = req.query.location;
      }

      filter.company = req.companyId;

      // Count total matching policy documents
      const totalCount = await Policy.countDocuments(filter);

      // Fetch policies based on the filter
      const fetchPolicies = await Policy.find(filter)
        .populate("tier", "title") // Populate tier's name (assuming the Tier model has a tierName field)
        .skip(skipCount)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      // Map fetched policies to the desired structure
      const mappedData = fetchPolicies.map((data) => {
        return {
          _id: data._id,
          policyTitle: data.policyTitle,
          tier: data.tier ? data.tier.title : "",
          userType: data.userType,
          activationDate: moment(data.activationDate).format("MMM DD YYYY"),
          location: data.location,
          accuracy: data.accuracy,
          authenticity: data.authenticity,
          compliance: data.compliance,
          relevance: data.relevance,
          completeness: data.completeness,
          createdAt: moment(data.createdAt).format("MMM DD YYYY"),
          updatedAt: moment(data.updatedAt).format("MMM DD YYYY"),
          policyDetails: data.policyDetails,
        };
      });

      if (!fetchPolicies || fetchPolicies.length === 0) {
        return responseHandler(res, 404, "No policies found");
      }

      return responseHandler(
        res,
        200,
        "Policies found",
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

/* The `exports.createTier` function is responsible for creating a new tier in the system. Here is a
breakdown of what the function is doing: */
exports.createTier = async (req, res) => {
  try {
    const createTierValidator = createTierSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createTierValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createTierValidator.error}`
      );
    }
    req.body.company = req.companyId;
    const createTier = await Tier.create(req.body);
    if (createTier) {
      return responseHandler(
        res,
        200,
        `Tier created successfully..!`,
        createTier
      );
    } else {
      return responseHandler(res, 400, `Tier creation failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is an asynchronous function in a Node.js application that is responsible for editing
a tier in a system. Here is a breakdown of what the code is doing: */
exports.editTier = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Tier ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("tierManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findTier = await Tier.findById(id);
    if (!findTier) {
      return responseHandler(res, 404, "Tier not found");
    }
    const editTierValidator = editTierSchema.validate(req.body, {
      abortEarly: true,
    });
    if (editTierValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${editTierValidator.error}`
      );
    }
    const updateTier = await Tier.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (updateTier) {
      return responseHandler(
        res,
        200,
        `Tier updated successfully..!`,
        updateTier
      );
    } else {
      return responseHandler(res, 400, `Tier update failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that handles the deletion of a tier. Here is a breakdown of
what the code is doing: */
exports.deleteTier = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Tier ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("tierManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findTier = await Tier.findById(id);
    if (!findTier) {
      return responseHandler(res, 404, "Tier not found");
    }

    const deleteTier = await Tier.findByIdAndUpdate(
      id,
      { status: false },
      {
        new: true,
      }
    );
    if (deleteTier) {
      return responseHandler(res, 200, `Tier deleted successfully..!`);
    } else {
      return responseHandler(res, 400, `Tier deletion failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that is used to retrieve a specific tier by its ID. It is an
asynchronous function that takes a request and response object as parameters. */
exports.getTier = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Tier ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("tierManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findTier = await Tier.findById(id).lean();
    const mappedData = {
      ...findTier,
      activationDate: moment(findTier.activationDate).format("MMM DD YYYY"),
      createdAt: moment(findTier.createdAt).format("MMM DD YYYY"),
    };
    if (!findTier) {
      return responseHandler(res, 404, "Tier not found");
    }
    return responseHandler(res, 200, "Tier found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that is used to create a new user. Here is a breakdown of
what the code is doing: */
exports.createUser = async (req, res) => {
  try {
    const createUserValidator = createUserSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createUserValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createUserValidator.error}`
      );
    }
    const checkPhone = await User.findOne({ mobile: req.body.mobile });
    if (checkPhone) {
      return responseHandler(
        res,
        400,
        `User with phone number ${req.body.mobile} already exists`
      );
    }
    const checkEmail = await User.findOne({ email: req.body.email });
    if (checkEmail) {
      return responseHandler(
        res,
        400,
        `User with email ${req.body.email} already exists`
      );
    }
    req.body.company = req.companyId;
    const createUser = await User.create(req.body);
    if (createUser) {
      return responseHandler(
        res,
        200,
        `User created successfully..!`,
        createUser
      );
    } else {
      return responseHandler(res, 400, `User creation failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is an asynchronous function in a Node.js application that is responsible for editing
a user's information. Here is a breakdown of what the code is doing: */
exports.editUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "User ID is required");
    }
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("userManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }
    const findUser = await User.findById(id);
    if (!findUser) {
      return responseHandler(res, 404, "User not found");
    }
    const editUserValidator = editUserSchema.validate(req.body, {
      abortEarly: true,
    });
    if (editUserValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${editUserValidator.error}`
      );
    }
    const updateUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (updateUser) {
      return responseHandler(
        res,
        200,
        `User updated successfully..!`,
        updateUser
      );
    } else {
      return responseHandler(res, 400, `User update failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that is used to retrieve a user by their ID. Here is a
breakdown of what the code is doing: */
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "User ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("userManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findUser = await User.findById(id)
      .populate("tier")
      .populate("approver", "name")
      .lean();
    const mappedData = {
      ...findUser,
      tierName: findUser.tier && findUser.tier.title,
      createdAt: moment(findUser.createdAt).format("MMM DD YYYY"),
    };
    if (!findUser) {
      return responseHandler(res, 404, "User not found");
    }
    return responseHandler(res, 200, "User found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that is used to delete a user from a database. Here is a
breakdown of what the code is doing: */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "User ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("userManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findUser = await User.findById(id);
    if (!findUser) {
      return responseHandler(res, 404, "User not found");
    }

    const deleteUser = await User.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), status: false },
      { new: true }
    );
    if (deleteUser) {
      return responseHandler(res, 200, "User deleted successfully..!");
    } else {
      return responseHandler(res, 400, "User deletion failed...!");
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that handles the creation of an event. Here is a breakdown
of what the code does: */
exports.createEvent = async (req, res) => {
  try {
    const createEventValidator = createEventSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createEventValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createEventValidator.error}`
      );
    }
    req.body.type = "Admin";
    req.body.creator = req.userId;
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

/* The `exports.editEvent` function is responsible for updating an existing event in the system. Here is
a breakdown of what the function is doing: */
exports.editEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Event ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("eventManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findEvent = await Event.findById(id);
    if (!findEvent) {
      return responseHandler(res, 404, "Event not found");
    }
    const editEventValidator = editEventSchema.validate(req.body, {
      abortEarly: true,
    });
    if (editEventValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${editEventValidator.error}`
      );
    }
    const updateEvent = await Event.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (updateEvent) {
      return responseHandler(
        res,
        200,
        `Event updated successfully..!`,
        updateEvent
      );
    } else {
      return responseHandler(res, 400, `Event update failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The `exports.getEvent` function is responsible for retrieving a event's information based on the
provided ID. Here is a breakdown of what the function is doing: */
exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Event ID is required");
    }
    const findEvent = await Event.findById(id).lean();
    const mappedData = {
      ...findEvent,
      createdAt: moment(findEvent.createdAt).format("MMM DD YYYY"),
    };
    if (!findEvent) {
      return responseHandler(res, 404, "Event not found");
    }
    return responseHandler(res, 200, "Event found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is a JavaScript function that handles the deletion of a event. Here is a breakdown of
what the code is doing: */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Event ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("eventManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const findEvent = await Event.findById(id);
    if (!findEvent) {
      return responseHandler(res, 404, "Event not found");
    }

    const deleteEvent = await Event.findByIdAndDelete(id);
    if (deleteEvent) {
      return responseHandler(res, 200, `Event deleted successfully..!`);
    } else {
      return responseHandler(res, 400, `Event deletion failed...!`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is an asynchronous function in a Node.js environment that handles fetching approval
data based on the provided ID. Here is a breakdown of the code: */
exports.getApproval = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Approval ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("approvalManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const fetchReport = await Report.findById(id)
      .populate({
        path: "user",
        populate: { path: "tier" },
      })
      .populate("expenses")
      .populate({
        path: "event",
        select: "startDate endDate startTime endTime creator type",
      })
      .populate("approver", "name")
      .lean();

    if (!fetchReport) {
      return responseHandler(res, 404, "Report not found");
    }

    const wallet = await transaction.find({
      "requestedBy.receiver": fetchReport.user._id,
      status: "completed",
    });

    const walletAmount = wallet.reduce(
      (acc, advance) => acc + advance.amount,
      0
    );

    const deductAmount = await Deduction.aggregate([
      { $match: { user: fetchReport.user._id, mode: "wallet", status: true } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
      { $project: { _id: 0, amount: 1 } },
    ]);

    const deductionReport = await Deduction.find({
      user: fetchReport.user._id,
      status: true,
      report: fetchReport._id,
    })
      .populate("user", "name")
      .populate("deductBy", "name");

    const mappedData = {
      _id: fetchReport._id,
      user: fetchReport.user.name,
      employeeId: fetchReport.user.employeeId,
      tier: fetchReport.user.tier.title,
      reportId: fetchReport.reportId,
      title: fetchReport.title,
      description: fetchReport.description,
      location: fetchReport.location,
      type: fetchReport.type,
      status: fetchReport.status,
      approver: fetchReport?.approver?.name,
      expenses: fetchReport.expenses.map((expense) => {
        return {
          _id: expense._id,
          title: expense.title,
          amount: expense.amount,
          createdAt: moment(expense.createdAt).format("MMM DD YYYY"),
          location: expense.address,
          status: expense.status,
          category: expense.category,
          image: expense.image,
        };
      }),
      totalAmount: fetchReport.expenses.reduce(
        (acc, curr) => acc + curr.amount,
        0
      ),
      walletAmount:
        walletAmount - (deductAmount.length > 0 ? deductAmount[0].amount : 0),
      deduction: deductionReport.map((res) => {
        return {
          _id: res._id,
          amount: res.amount,
          user: res.user.name,
          deductBy: res.deductBy.name,
          mode: res.mode,
          deductOn: moment(res.deductOn).format("MMM DD YYYY"),
        };
      }),
      reportDate: moment(fetchReport.reportDate).format("MMM DD YYYY"),
      creator: fetchReport.event
        ? await mongoose
            .model(fetchReport.event.type)
            .findById(fetchReport.event.creator)
            .select("name")
        : null,
      start: fetchReport.event
        ? moment(fetchReport.event.startDate).format("MMM DD YYYY") +
          " " +
          moment(fetchReport.event.startTime).format("hh:mm A")
        : null,
      end: fetchReport.event
        ? moment(fetchReport.event.endDate).format("MMM DD YYYY") +
          " " +
          moment(fetchReport.event.endTime).format("hh:mm A")
        : null,
      createdAt: moment(fetchReport.createdAt).format("MMM DD YYYY"),
      updatedAt: moment(fetchReport.updatedAt).format("MMM DD YYYY"),
    };

    return responseHandler(res, 200, "Report found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
  }
};

/* The above code is an asynchronous function in a Node.js environment that handles updating the
approval status of a report along with associated expenses. Here is a breakdown of what the code is
doing: */
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

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("approvalManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
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
        approverModel: "Admin",
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

exports.getUserReports = async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.query;

    const filter = {
      user: id,
    };

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: "drafted" };
    }

    if (!id) {
      return responseHandler(res, 400, "User ID is required");
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("userManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    const fetchReports = await Report.find(filter)
      .populate("user", "name")
      .populate("expenses")
      .populate("approver", "name")
      .lean();

    if (!fetchReports) {
      return responseHandler(res, 404, "Reports not found");
    }

    const mappedData = fetchReports.map((data) => {
      return {
        _id: data._id,
        title: data.title,
        user: data.user.name,
        expenseCount: data.expenses.length,
        totalAmount: data.expenses.reduce((acc, curr) => acc + curr.amount, 0),
        location: data.location,
        type: data.type,
        status: data.status,
        approver: data.approver ? data.approver.name : null,
        reportDate: moment(data.reportDate).format("MMM DD YYYY"),
        createdAt: moment(data.createdAt).format("MMM DD YYYY"),
        updatedAt: moment(data.updatedAt).format("MMM DD YYYY"),
      };
    });

    return responseHandler(res, 200, "Reports found", mappedData);
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

    let report = await Report.findById(id);

    if (Number(amount) > 0) {
      const reqData = {
        user: report.user,
        deductBy: req.userId,
        amount: Number(amount),
        deductOn: new Date(),
        report: id,
        mode: "bank",
      };
      await Deduction.create(reqData);
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

exports.getFilteredUsers = async (req, res) => {
  try {
    const { tier, role, location } = req.query;
    const filter = {};

    if (tier) {
      filter.tier = { $in: tier };
    }

    if (role) {
      filter.userType = { $in: role };
    }

    if (location) {
      filter.location = { $in: location };
    }

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("userManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    filter.company = req.companyId;

    const fetchUsers = await User.find(filter).populate("tier").lean();

    if (!fetchUsers) {
      return responseHandler(res, 404, "Users not found");
    }

    const mappedData = fetchUsers.map((data) => {
      return {
        _id: data._id,
        name: data.name,
      };
    });

    return responseHandler(res, 200, "Users found", mappedData);
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

    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("financeManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
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

    const wallet = await transaction.find({
      "requestedBy.receiver": fetchReport.user._id,
      status: "completed",
    });

    const walletAmount = wallet.reduce(
      (acc, advance) => acc + advance.amount,
      0
    );

    const deductAmount = await Deduction.aggregate([
      { $match: { user: fetchReport.user._id, mode: "wallet", status: true } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
      { $project: { _id: 0, amount: 1 } },
    ]);

    const deductionReport = await Deduction.find({
      user: fetchReport.user._id,
      status: true,
      report: fetchReport._id,
    })
      .populate("user", "name")
      .populate("deductBy", "name");

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
      walletAmount:
        walletAmount - (deductAmount.length > 0 ? deductAmount[0].amount : 0),
      deduction: deductionReport.map((res) => {
        return {
          _id: res._id,
          amount: res.amount,
          user: res.user.name,
          deductBy: res.deductBy.name,
          mode: res.mode,
          deductOn: moment(res.deductOn).format("MMM DD YYYY"),
        };
      }),
      reportDate: moment(fetchReport.reportDate).format("MMM DD YYYY"),
      createdAt: moment(fetchReport.createdAt).format("MMM DD YYYY"),
      updatedAt: moment(fetchReport.updatedAt).format("MMM DD YYYY"),
    };

    return responseHandler(res, 200, "Report found", mappedData);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error ${error.message}`);
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

exports.viewTransactionsAndDeductions = async (req, res) => {
  try {
    const { type, staffId } = req.query; // Get the 'type' query parameter from the request (e.g., 'credit' or 'debit')

    // Fetch all transactions and deductions
    let transactions = [];
    let deductions = [];

    const filter = {};
    const query = {};
    if (staffId) {
      filter["requestedBy.receiver"] = new mongoose.Types.ObjectId(staffId);
      query.user = new mongoose.Types.ObjectId(staffId);
    }

    // Fetch transactions if type is not 'debit'
    if (!type || type === "credit") {
      filter.company = req.companyId;
      transactions = await transaction
        .find(filter)
        .populate("requestedBy.sender requestedBy.receiver paidBy", "name");
    }

    // Fetch deductions if type is not 'credit'
    if (!type || type === "debit") {
      query.company = req.companyId;
      deductions = await Deduction.find(query).populate(
        "user deductBy report",
        "name"
      );
    }

    // Ensure both lists have the same structure
    const transactionList = transactions.map((transaction) => ({
      _id: transaction._id,
      amount: transaction.amount,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      type: "credit", // Mark transactions as credit
      date: transaction.paidOn || transaction.requestedOn, // Use paidOn if available, else requestedOn
      description: transaction.description,
      user: transaction.requestedBy.receiver?.name, // Assuming receiver is the user for consistency with deductions
      performedBy: transaction.requestedBy.sender?.name
        ? transaction.requestedBy.sender?.name
        : transaction.requestedBy.receiver?.name, // Admin or sender performing the transaction
    }));

    const deductionList = deductions.map((deduction) => ({
      _id: deduction._id,
      amount: deduction.amount,
      paymentMethod: deduction.mode,
      status: deduction.status ? "deducted" : "failed",
      type: "debit", // Mark deductions as debit
      date: deduction.deductOn, // Deducted date
      description: `Deduction: ${
        deduction.report ? "Report ID: " + deduction.report : "No report"
      }`, // Customize description
      user: deduction.user?.name, // The user affected by the deduction
      performedBy: deduction.deductBy?.name, // Admin who performed the deduction
    }));

    // Combine both lists if no type filter is applied, else return the filtered list
    let combinedList = [];
    if (!type) {
      combinedList = [...transactionList, ...deductionList]; // Combine if no type is specified
    } else if (type === "credit") {
      combinedList = transactionList; // Return only transactions (credit)
    } else if (type === "debit") {
      combinedList = deductionList; // Return only deductions (debit)
    }

    // Sort the combined list by date (latest first)
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

    // Find the transaction by ID
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
    const { description } = req.body; // Assuming description field is used instead of descriptionFinance

    if (!id) {
      return responseHandler(res, 400, "Advance Payment ID is required");
    }

    // Update the advance payment with the new status and additional details
    const advance = await transaction.findByIdAndUpdate(
      id,
      {
        status: "completed", // Update status to "Completed",
        paymentMethod: req.body.paymentMethod,
        description, // Update the description provided by finance
        paidBy: req.userId, // Assume req.userId is the ID of the user marking this as completed
        paidOn: new Date(), // Record the current date as the payment date
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

exports.createPolicy = async (req, res) => {
  try {
    const policyData = req.body;

    // Validate input data if you have a validation schema
    const validation = createPolicySchema.validate(policyData, {
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

    // Create the policy record
    req.body.companyId = req.companyId;
    const newPolicy = await Policy.create(policyData);

    if (newPolicy) {
      return responseHandler(
        res,
        201,
        `Policy created successfully!`,
        newPolicy
      );
    } else {
      return responseHandler(res, 400, `Policy creation failed`);
    }
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.viewPolicyById = async (req, res) => {
  try {
    const policyId = req.params.id;

    // Find the policy by ID
    const policy = await Policy.findById(policyId)
      .populate("tier", "tierName") // Assuming 'Tier' has a field 'tierName'
      .populate("userType", "name"); // Assuming 'userType' refers to a model with a 'name' field

    if (!policy) {
      return responseHandler(res, 404, `Policy not found`);
    }

    return responseHandler(res, 200, `Policy found`, policy);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (!id) {
      return responseHandler(res, 400, "Policy ID is required");
    }

    // Update the policy with the provided data
    const updatedPolicy = await Policy.findByIdAndUpdate(
      id,
      updatedData,
      { new: true } // Returns the updated document
    );

    if (!updatedPolicy) {
      return responseHandler(
        res,
        400,
        "Policy update failed or Policy not found"
      );
    }

    return responseHandler(
      res,
      200,
      "Policy updated successfully",
      updatedPolicy
    );
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
    // Find the user and verify their existence
    const user = await User.findById(id);
    if (!user) return responseHandler(res, 404, "User not found");

    // Calculate the total amount of all advances paid to the user
    const advances = await transaction.find({
      "requestedBy.receiver": id,
      status: "completed", // Only include completed payments
    });

    const totalAmount = advances.reduce(
      (acc, advance) => acc + advance.amount,
      0
    );

    // Calculate the start and end of the current month
    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    // Fetch all expenses for the user within the current month
    const expenses = await Expense.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $in: ["mapped", "approved"] },
      user: id,
    });

    // Calculate the total expenses
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    // Calculate the balance amount (total advances paid minus total expenses)
    const balanceAmount = totalAmount - totalExpenses;

    // Map the expense data for response
    const mappedData = expenses.map((exp) => ({
      _id: exp._id,
      category: exp.category,
      amount: exp.amount,
      image: exp.image,
      title: exp.title,
    }));

    // Get the user's tier categories (assuming it's relevant for the resp0onse)
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

    // Respond with the wallet details
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

exports.getApprovers = async (req, res) => {
  try {
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("userManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }
    const filter = {
      userType: "approver",
      company: req.companyId,
    };
    const approvers = await User.find(filter);
    return responseHandler(
      res,
      200,
      "Approvers retrieved successfully",
      approvers
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const start = moment().startOf("month").toDate();
    const end = moment().endOf("month").toDate();
    const expenses = await Expense.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "approved",
          company: req.companyId,
        },
      },
      {
        $group: {
          _id: "$user",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "tiers",
          localField: "user.tier",
          foreignField: "_id",
          as: "user.tier",
        },
      },
      { $unwind: "$user.tier" },
      {
        $project: {
          _id: 0,
          user: "$user.name",
          tier: "$user.tier.title",
          totalAmount: 1,
          count: 1,
        },
      },
      { $limit: 5 },
    ]);

    const pending = await Report.find({ status: "pending", company: req.companyId })
      .populate("expenses")
      .limit(3)
      .sort({ reportDate: -1 });

    const pendingData = pending.map((rep) => ({
      _id: rep._id,
      title: rep.title,
      reportDate: moment(rep.reportDate).format("MMM DD YYYY"),
      totalAmount: rep.expenses.reduce((acc, curr) => acc + curr.amount, 0),
      expensesCount: rep.expenses.length,
      location: rep.location,
    }));

    return responseHandler(res, 200, "Dashboard results", {
      expenses,
      pendingData,
    });
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

exports.deductWallet = async (req, res) => {
  try {
    const createEventValidator = createDeductionSchema.validate(req.body, {
      abortEarly: true,
    });
    if (createEventValidator.error) {
      return responseHandler(
        res,
        400,
        `Invalid input: ${createEventValidator.error}`
      );
    }

    const report = await Report.findById(req.body.report);
    if (!report) return responseHandler(res, 404, "Report not found");

    const totalAmountInWallet = await transaction.find({
      "requestedBy.receiver": report.user,
      status: "completed",
      company: req.companyId,
    });

    const deductAmountFromWallet = await Deduction.find({
      user: report.user,
      mode: "wallet",
      status: true,
      company: req.companyId,
    });

    const currentAmountInWallet =
      Number(totalAmountInWallet) - Number(deductAmountFromWallet);

    if (currentAmountInWallet < 0)
      return responseHandler(res, 400, "Insufficient wallet balance");

    req.body.user = report.user;
    req.body.deductBy = req.userId;
    req.body.deductOn = new Date();
    req.body.mode = "wallet";
    req.body.company = req.companyId;
    const deduction = await Deduction.create(req.body);
    if (!deduction) return responseHandler(res, 400, "Deduction failed");
    return responseHandler(res, 200, "Deduction successful", deduction);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
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
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("planManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }
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

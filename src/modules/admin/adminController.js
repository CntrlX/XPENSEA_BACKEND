const responseHandler = require("../../helpers/responseHandler");
const Admin = require("../admin/adminModel");
const User = require("../user/userModel");
const Event = require("../event/eventModel");
const transaction = require("../transaction/transactionModel");
const mongoose = require("mongoose");

const { hashPassword, comparePasswords } = require("../../utils/bcrypt");
const { generateToken } = require("../../utils/generateToken");
const checkAccess = require("../../helpers/checkAccess");
const {
  createAdminSchema,
  editAdminSchema,
  createRoleSchema,
  editRoleSchema,
  createUserSchema,
  editUserSchema,
  createEventSchema,
  editEventSchema,
  createTransactionSchema,
  createDeductionSchema,
  createPlanSchema,
  updatePlanSchema,
} = require("../../validations");
const moment = require("moment-timezone");
const Report = require("../report/reportModel");
const Expense = require("../expense/expenseModel");
const Notification = require("../notification/notificationModel");
const Deduction = require("../deduction/deductionModel");
const generateMail = require("../../utils/generateMail");
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



exports.listController = async (req, res) => {
  try {
    const { type, pageNo = 1, status } = req.query;
    const skipCount = 10 * (pageNo - 1);
    const filter = {
      Admin: req.userId,
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

exports.listAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("adminManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      company: req.companyId,
      isDeleted: false
    };

    // Get total count for pagination
    const total = await Admin.countDocuments(query);

    // Fetch admins with pagination
    const admins = await Admin.find(query)
      .select("-password")
      .populate("role", "permissions")
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format the response data
    const mappedData = admins.map((admin) => ({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      designation: admin.designation,
      status: admin.status,
      role: admin.role,
      isVerified: admin.isVerified,
      createdAt: moment(admin.createdAt).format("MMM DD YYYY"),
      updatedAt: moment(admin.updatedAt).format("MMM DD YYYY")
    }));

    return responseHandler(res, 200, "Admins retrieved successfully", {
      admins: mappedData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

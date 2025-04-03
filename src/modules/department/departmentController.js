const responseHandler = require("../../helpers/responseHandler");
const Department = require("./departmentModel");
const User = require("../user/userModel");
const checkAccess = require("../../helpers/checkAccess");

// Create a new department
exports.createDepartment = async (req, res) => {
  try {
    // Check if user has permission to modify departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const user = await User.findById(req.userId);
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    // Add company ID from user
    req.body.company = user.company;

    // Create new department
    const newDepartment = await Department.create(req.body);
    if (!newDepartment) {
      return responseHandler(res, 400, "Department creation failed");
    }

    return responseHandler(
      res,
      201,
      "Department created successfully",
      newDepartment
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// Get all departments with pagination and filtering
exports.getAllDepartments = async (req, res) => {
  try {
    // Check if user has permission to view departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const user = await User.findById(req.userId);
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    // Extract query parameters
    const { pageNo = 1, limit = 10, status, departmentName, populateUsers = false } = req.query;
    const skipCount = limit * (pageNo - 1);
    
    // Build filter using user's company
    const filter = { company: user.company };

    // Add status filter if provided
    if (status !== undefined) {
      filter.status = status === "true";
    }

    // Add departmentName filter if provided
    if (departmentName) {
      filter.departmentName = { $regex: departmentName, $options: 'i' };
    }

    // Count total documents matching filter
    const totalCount = await Department.countDocuments(filter);

    // Build query
    let query = Department.find(filter)
      .populate("departmentManager", "name")
      .populate("departmentThresholdManager", "name");
    
    // Optionally populate users
    if (populateUsers === "true") {
      query = query.populate("users", "name email employeeId");
    }

    // Execute query with pagination
    const departments = await query
      .skip(skipCount)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();

    if (!departments || departments.length === 0) {
      return responseHandler(res, 404, "No departments found");
    }

    return responseHandler(res, 200, "Departments found", departments, totalCount);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// Get department by ID
exports.getDepartmentById = async (req, res) => {
  try {
    // Check if user has permission to view departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const user = await User.findById(req.userId);
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    // Extract ID from request parameters
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Department ID is required");
    }

    const { populateUsers = false } = req.query;

    // Build query with company check
    let query = Department.findOne({ _id: id, company: user.company })
      .populate("departmentManager", "name")
      .populate("departmentThresholdManager", "name");
    
    // Optionally populate users
    if (populateUsers === "true") {
      query = query.populate("users", "name email employeeId");
    }
    
    // Find department by ID
    const department = await query.lean();

    if (!department) {
      return responseHandler(res, 404, "Department not found");
    }

    return responseHandler(res, 200, "Department found", department);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    // Check if user has permission to modify departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const user = await User.findById(req.userId);
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    // Extract ID from request parameters
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Department ID is required");
    }

    // Find and update department with company check
    const updatedDepartment = await Department.findOneAndUpdate(
      { _id: id, company: user.company },
      req.body,
      { new: true }
    )
      .populate("departmentManager", "name")
      .populate("departmentThresholdManager", "name");

    if (!updatedDepartment) {
      return responseHandler(res, 404, "Department not found or update failed");
    }

    return responseHandler(
      res,
      200,
      "Department updated successfully",
      updatedDepartment
    );
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// Delete department (soft delete)
exports.deleteDepartment = async (req, res) => {
  try {
    // Check if user has permission to modify departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const user = await User.findById(req.userId);
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    // Extract ID from request parameters
    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, "Department ID is required");
    }

    // Find department by ID with company check
    const findDepartment = await Department.findOne({ _id: id, company: user.company });
    if (!findDepartment) {
      return responseHandler(res, 404, "Department not found");
    }

    // Soft delete the department
    const deleteDepartment = await Department.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), status: false },
      { new: true }
    );

    if (!deleteDepartment) {
      return responseHandler(res, 400, "Department deletion failed");
    }

    return responseHandler(res, 200, "Department deleted successfully");
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// Add a user to a department
exports.addUserToDepartment = async (req, res) => {
  try {
    // Check if user has permission to modify departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser) {
      return responseHandler(res, 404, "User not found");
    }

    const { departmentId, userId } = req.params;

    // Validate input
    if (!departmentId || !userId) {
      return responseHandler(res, 400, "Department ID and User ID are required");
    }

    // Check if department exists and belongs to user's company
    const department = await Department.findOne({ 
      _id: departmentId, 
      company: requestingUser.company 
    });
    if (!department) {
      return responseHandler(res, 404, "Department not found");
    }

    // Check if user exists and belongs to same company
    const user = await User.findOne({ 
      _id: userId, 
      company: requestingUser.company 
    });
    if (!user) {
      return responseHandler(res, 404, "User not found");
    }

    // Add user to department
    await department.addUser(userId);

    return responseHandler(res, 200, "User added to department successfully", department);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// Remove a user from a department
exports.removeUserFromDepartment = async (req, res) => {
  try {
    // Check if user has permission to modify departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_modify")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser) {
      return responseHandler(res, 404, "User not found");
    }

    const { departmentId, userId } = req.params;

    // Validate input
    if (!departmentId || !userId) {
      return responseHandler(res, 400, "Department ID and User ID are required");
    }

    // Check if department exists and belongs to user's company
    const department = await Department.findOne({ 
      _id: departmentId, 
      company: requestingUser.company 
    });
    if (!department) {
      return responseHandler(res, 404, "Department not found");
    }

    // Check if user exists in department
    if (!department.hasUser(userId)) {
      return responseHandler(res, 404, "User not found in this department");
    }

    // Remove user from department
    await department.removeUser(userId);

    return responseHandler(res, 200, "User removed from department successfully", department);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
};

// Get all users in a department
exports.getDepartmentUsers = async (req, res) => {
  try {
    // Check if user has permission to view departments
    const check = await checkAccess(req.roleId, "permissions");
    if (!check || !check.includes("departmentManagement_view")) {
      return responseHandler(
        res,
        403,
        "You don't have permission to perform this action"
      );
    }

    // Get user and their company
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser) {
      return responseHandler(res, 404, "User not found");
    }

    const { departmentId } = req.params;
    const { pageNo = 1, limit = 10 } = req.query;
    const skipCount = limit * (pageNo - 1);

    // Validate input
    if (!departmentId) {
      return responseHandler(res, 400, "Department ID is required");
    }

    // Check if department exists and belongs to user's company
    const department = await Department.findOne({ 
      _id: departmentId, 
      company: requestingUser.company 
    });
    if (!department) {
      return responseHandler(res, 404, "Department not found");
    }

    // Get total user count
    const totalCount = department.users.length;

    // Get paginated users with details
    const users = await User.find({ 
      _id: { $in: department.users },
      company: requestingUser.company
    })
      .select("name email employeeId designation")
      .skip(skipCount)
      .limit(Number(limit))
      .lean();

    if (!users || users.length === 0) {
      return responseHandler(res, 404, "No users found in this department");
    }

    return responseHandler(res, 200, "Department users found", users, totalCount);
  } catch (error) {
    return responseHandler(res, 500, `Internal Server Error: ${error.message}`);
  }
}; 
const responseHandler = require("../helpers/responseHandler");
const Plan = require("../plan/planModel");
const checkAccess = require("../helpers/checkAccess");
const { createPlanSchema, updatePlanSchema } = require("../validations");

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
const responseHandler = require("../../helpers/responseHandler");
const Tier = require("../tier/tierModel");  
const moment = require("moment-timezone");
const { createTierSchema, editTierSchema } = require("../../validations");
const checkAccess = require("../../helpers/checkAccess");

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
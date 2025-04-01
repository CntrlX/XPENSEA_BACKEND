const responseHandler = require("../../helpers/responseHandler");
const Policy = require("./policyModel");
const { createPolicySchema } = require("../../validations");

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

    policyData.company = req.companyId;
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
const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    employeeId: { type: String },
    name: { type: String },
    email: { type: String },
    mobile: { type: String },
    image: { type: String },
    otp: { type: Number },
    mpin: { type: String },
    designation: { type: String },
    userType: {
      type: String,
      enum: ["submitter", "approver"],
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: Boolean,
      default: false,
    },
    tier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tier",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    location: { type: String },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
 
  },
  { timestamps: true }
);

userSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
userSchema.index({ department: 1 }); // Add index for department for better query performance

// Validate that user's company matches department's company
userSchema.pre('save', async function(next) {
  if (this.isModified('department') || this.isModified('company')) {
    try {
      const Department = mongoose.model('Department');
      const department = await Department.findById(this.department);
      
      if (!department) {
        return next(new Error('Department not found'));
      }
      
      if (department.company && this.company && department.company.toString() !== this.company.toString()) {
        return next(new Error('Department must belong to the same company as the user'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;

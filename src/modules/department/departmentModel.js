const mongoose = require("mongoose");

const departmentSchema = mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
    },
    departmentName: { 
      type: String 
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    departmentManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    departmentThresholdManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    status: {
      type: Boolean,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual for user count
departmentSchema.virtual('userCount').get(function() {
  return this.users ? this.users.length : 0;
});

// Method to add a user to the department
departmentSchema.methods.addUser = async function(userId) {
  if (!this.users.includes(userId)) {
    this.users.push(userId);
    return await this.save();
  }
  return this;
};

// Method to remove a user from the department
departmentSchema.methods.removeUser = async function(userId) {
  if (this.users.includes(userId)) {
    this.users = this.users.filter(id => id.toString() !== userId.toString());
    return await this.save();
  }
  return this;
};

// Method to check if a user is in this department
departmentSchema.methods.hasUser = function(userId) {
  return this.users.some(id => id.toString() === userId.toString());
};

const Department = mongoose.model("Department", departmentSchema);

module.exports = Department;

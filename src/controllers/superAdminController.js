const responseHandler = require("../helpers/responseHandler");
const Company = require("../models/companyModel");
const Plan = require("../models/planModel");
const Payment = require("../models/paymentModel");
const checkAccess = require("../helpers/checkAccess");
const moment = require("moment-timezone");

exports.getAllCompanies = async (req, res) => {
    try {
        const { pageNo = 1, limit = 10, status } = req.query;
        const skipCount = limit * (pageNo - 1);
        const filter = {};

        if (status !== undefined) {
            filter.status = status === 'true';
        }

        const totalCount = await Company.countDocuments(filter);
        const companies = await Company.find(filter)
            .populate('plan', 'name price maxUsers features') 
            .skip(skipCount)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        if (!companies || companies.length === 0) {
            return responseHandler(res, 404, "No companies found");
        }

        const mappedData = companies.map((company) => ({
            ...company,
            createdAt: moment(company.createdAt).format("MMM DD YYYY")
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
            .populate('plan', 'name price maxUsers features')
            .lean();

        if (!company) {
            return responseHandler(res, 404, "Company not found");
        }

        const transactions = await Transaction.find({ company: companyId }) 
            .populate('requestedBy.sender', 'name')
            .populate('requestedBy.receiver', 'name')
            .populate('paidBy', 'name') 
            .sort({ createdAt: -1 })
            .lean();

        const mappedData = {
            ...company,
            createdAt: moment(company.createdAt).format("MMM DD YYYY"),
            transactions: transactions.map(transaction => ({
                ...transaction,
                requestedOn: moment(transaction.requestedOn).format("MMM DD YYYY"),
                paidOn: transaction.paidOn ? moment(transaction.paidOn).format("MMM DD YYYY") : null
            }))
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
            filter.status = status === 'true';
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

        const mappedData = plans.map(plan => ({
            ...plan,
            createdAt: moment(plan.createdAt).format("MMM DD YYYY")
        }));

        return responseHandler(res, 200, "Plans found", mappedData, totalCount);
    } catch (error) {
        return responseHandler(res, 500, `Internal Server Error ${error.message}`);
    }
};

exports.getPlanById = async (req, res) => {
    try {
        const { planId } = req.params;
        if (!planId) {
            return responseHandler(res, 400, "Plan ID is required");
        }

        const plan = await Plan.findById(planId).lean();
        
        if (!plan) {
            return responseHandler(res, 404, "Plan not found");
        }

        const companies = await Company.find({ plan: planId })
            .select('name ownerEmail industry status')
            .lean();

        const mappedData = {
            ...plan,
            createdAt: moment(plan.createdAt).format("MMM DD YYYY"),
            subscribedCompanies: companies
        };

        return responseHandler(res, 200, "Plan details found", mappedData);
    } catch (error) {
        return responseHandler(res, 500, `Internal Server Error ${error.message}`);
    }
};

// Transaction related controllers
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
            .populate('company', 'name ownerEmail')
            .skip(skipCount)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        if (!payments || payments.length === 0) {
            return responseHandler(res, 404, "No payments found");
        }

        const mappedData = payments.map(payment => ({
            ...payment,
            createdAt: moment(payment.createdAt).format("MMM DD YYYY")
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
            .populate('company', 'name ownerEmail')
            .skip(skipCount)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        if (!payments || payments.length === 0) {
            return responseHandler(res, 404, "No payments found for this company");
        }

        const mappedData = payments.map(payment => ({
            ...payment,
            createdAt: moment(payment.createdAt).format("MMM DD YYYY")
        }));

        return responseHandler(res, 200, "Company payments found", mappedData, totalCount);
    } catch (error) {
        return responseHandler(res, 500, `Internal Server Error ${error.message}`);
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const [
            totalCompanies,
            activeCompanies,
            totalPlans,
            activePlans,
            recentTransactions,
            transactionStats
        ] = await Promise.all([
            Company.countDocuments(),
            Company.countDocuments({ status: true }),
            Plan.countDocuments(),
            Plan.countDocuments({ status: true }),
            Transaction.find()
                .populate('company', 'name ownerEmail')
                .populate('requestedBy.sender', 'name')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Transaction.aggregate([
                {
                    $group: {
                        _id: '$status',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const dashboardData = {
            companies: {
                total: totalCompanies,
                active: activeCompanies
            },
            plans: {
                total: totalPlans,
                active: activePlans
            },
            transactions: {
                stats: transactionStats.reduce((acc, curr) => {
                    acc[curr._id] = {
                        amount: curr.total,
                        count: curr.count
                    };
                    return acc;
                }, {}),
                recent: recentTransactions.map(transaction => ({
                    ...transaction,
                    requestedOn: moment(transaction.requestedOn).format("MMM DD YYYY"),
                    paidOn: transaction.paidOn ? moment(transaction.paidOn).format("MMM DD YYYY") : null
                }))
            }
        };

        return responseHandler(res, 200, "Dashboard statistics retrieved successfully", dashboardData);
    } catch (error) {
        return responseHandler(res, 500, `Internal Server Error ${error.message}`);
    }
};

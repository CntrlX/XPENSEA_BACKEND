/**
 * @swagger
 * tags:
 *   - name: Super Admin
 *     description: Super admin related endpoints for managing companies, plans, and transactions
 */

/**
 * @swagger
 * /superadmin/companies:
 *   get:
 *     summary: Get all companies
 *     description: Retrieve a list of all registered companies with their plan details
 *     tags:
 *       - Super Admin
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "64c0ed92b7e8773e9cd3c401"
 *                       name:
 *                         type: string
 *                         example: "Tech Corp"
 *                       email:
 *                         type: string
 *                         example: "contact@techcorp.com"
 *                       currentPlan:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "64c0ed92b7e8773e9cd3c402"
 *                           name:
 *                             type: string
 *                             example: "Enterprise"
 *                           price:
 *                             type: number
 *                             example: 999
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /superadmin/companies/{companyId}:
 *   get:
 *     summary: Get company details
 *     description: Retrieve detailed information about a specific company including plan and transactions
 *     tags:
 *       - Super Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the company
 *     responses:
 *       200:
 *         description: Company details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     currentPlan:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           date:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /superadmin/plans:
 *   get:
 *     summary: Get all plans
 *     description: Retrieve a list of all subscription plans
 *     tags:
 *       - Super Admin
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Enterprise"
 *                       price:
 *                         type: number
 *                         example: 999
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /superadmin/plans/{planId}:
 *   get:
 *     summary: Get plan details
 *     description: Retrieve detailed information about a specific plan
 *     tags:
 *       - Super Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the plan
 *     responses:
 *       200:
 *         description: Plan details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /superadmin/payments:
 *   get:
 *     summary: Get all transactions
 *     description: Retrieve a list of all transactions across all companies
 *     tags:
 *       - Super Admin
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       company:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                       plan:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /superadmin/payments/{companyId}:
 *   get:
 *     summary: Get company transactions
 *     description: Retrieve all transactions for a specific company
 *     tags:
 *       - Super Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the company
 *     responses:
 *       200:
 *         description: Company transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       company:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                       plan:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /superadmin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve overview statistics including total companies, plans, transactions, and revenue
 *     tags:
 *       - Super Admin
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCompanies:
 *                       type: number
 *                       example: 50
 *                     totalPlans:
 *                       type: number
 *                       example: 3
 *                     totalTransactions:
 *                       type: number
 *                       example: 150
 *                     totalRevenue:
 *                       type: number
 *                       example: 45000
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           company:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                           plan:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: number
 *       500:
 *         description: Server error
 */


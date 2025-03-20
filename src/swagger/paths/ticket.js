/**
 * @swagger
 * tags:
 *   - name: Tickets
 *     description: Ticket management related endpoints
 */

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Get all tickets
 *     description: Retrieve all tickets with optional filters for status, priority, and search
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, Open, "In Progress", Resolved, Closed]
 *         description: Filter tickets by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [all, Low, Medium, High, Critical]
 *         description: Filter tickets by priority
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in ticket subject and description
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tickets retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "64c0ed92b7e8773e9cd3c401"
 *                       subject:
 *                         type: string
 *                         example: "Unable to access dashboard"
 *                       description:
 *                         type: string
 *                         example: "Getting 404 error when accessing dashboard"
 *                       status:
 *                         type: string
 *                         enum: [Open, "In Progress", Resolved, Closed]
 *                         example: "Open"
 *                       priority:
 *                         type: string
 *                         enum: [Low, Medium, High, Critical]
 *                         example: "High"
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new ticket
 *     description: Create a new support ticket
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company
 *               - subject
 *               - description
 *             properties:
 *               company:
 *                 type: string
 *                 example: "64c0ed92b7e8773e9cd3c401"
 *               subject:
 *                 type: string
 *                 example: "Unable to access dashboard"
 *               description:
 *                 type: string
 *                 example: "Getting 404 error when accessing dashboard"
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Critical]
 *                 default: Medium
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /tickets/metrics:
 *   get:
 *     summary: Get ticket metrics
 *     description: Retrieve metrics about tickets including counts and resolution rate
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Metrics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     openTickets:
 *                       type: number
 *                       example: 5
 *                     inProgressTickets:
 *                       type: number
 *                       example: 3
 *                     resolvedTickets:
 *                       type: number
 *                       example: 12
 *                     resolutionRate:
 *                       type: string
 *                       example: "60.0"
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     description: Retrieve detailed information about a specific ticket
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Ticket retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     priority:
 *                       type: string
 *                     responses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           admin:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           message:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *       404:
 *         description: Ticket not found
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status
 *     description: Update the status of a specific ticket
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Open, "In Progress", Resolved, Closed]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /tickets/{id}/response:
 *   post:
 *     summary: Add response to ticket
 *     description: Add a new response/comment to a specific ticket
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Issue has been investigated and fixed"
 *     responses:
 *       200:
 *         description: Response added successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */ 
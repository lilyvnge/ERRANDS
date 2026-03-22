const { Parser } = require('json2csv');
const User = require('../models/User');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Dispute = require('../models/Dispute');
const AdminActivity = require('../models/AdminActivity');

// @desc    Export users to CSV
// @route   GET /api/admin/export/users
// @access  Private (Admin only)
const exportUsers = async (req, res) => {
  try {
    const { format = 'csv', role, isActive, dateFrom, dateTo } = req.query;

    let filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const users = await User.find(filter)
      .select('name email phone role isActive createdAt')
      .lean();

    const data = users.map(user => ({
      Name: user.name,
      Email: user.email,
      Phone: user.phone,
      Role: user.role,
      'Active Status': user.isActive ? 'Active' : 'Inactive',
      'Created Date': user.createdAt.toISOString().split('T')[0],
      'Created Time': user.createdAt.toISOString().split('T')[1].split('.')[0]
    }));

    if (format === 'csv') {
      const fields = ['Name', 'Email', 'Phone', 'Role', 'Active Status', 'Created Date', 'Created Time'];
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(data);

      res.header('Content-Type', 'text/csv');
      res.attachment(`users_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({
        data: data,
        total: data.length,
        exportedAt: new Date().toISOString()
      });
    }

    await logAdminActivity(req, 'export_generated', 'user', null, {
      format,
      recordCount: data.length,
      filters: { role, isActive, dateFrom, dateTo }
    });
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      message: 'Error exporting users',
      error: error.message
    });
  }
};

// @desc    Export tasks to CSV
// @route   GET /api/admin/export/tasks
// @access  Private (Admin only)
const exportTasks = async (req, res) => {
  try {
    const { format = 'csv', status, category, dateFrom, dateTo } = req.query;

    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const tasks = await Task.find(filter)
      .populate('employer', 'name email')
      .populate('assignedVendor', 'name email')
      .select('title description category budget status urgency estimatedHours createdAt completedAt')
      .lean();

    const data = tasks.map(task => ({
      Title: task.title,
      Description: task.description,
      Category: task.category,
      Budget: task.budget,
      Status: task.status,
      Urgency: task.urgency,
      'Estimated Hours': task.estimatedHours,
      Employer: task.employer ? task.employer.name : 'N/A',
      'Employer Email': task.employer ? task.employer.email : 'N/A',
      Vendor: task.assignedVendor ? task.assignedVendor.name : 'N/A',
      'Vendor Email': task.assignedVendor ? task.assignedVendor.email : 'N/A',
      'Created Date': task.createdAt.toISOString().split('T')[0],
      'Completed Date': task.completedAt ? task.completedAt.toISOString().split('T')[0] : 'N/A'
    }));

    if (format === 'csv') {
      const fields = [
        'Title', 'Description', 'Category', 'Budget', 'Status', 'Urgency', 
        'Estimated Hours', 'Employer', 'Employer Email', 'Vendor', 'Vendor Email',
        'Created Date', 'Completed Date'
      ];
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(data);

      res.header('Content-Type', 'text/csv');
      res.attachment(`tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({
        data: data,
        total: data.length,
        exportedAt: new Date().toISOString()
      });
    }

    await logAdminActivity(req, 'export_generated', 'task', null, {
      format,
      recordCount: data.length,
      filters: { status, category, dateFrom, dateTo }
    });
  } catch (error) {
    console.error('Export tasks error:', error);
    res.status(500).json({
      message: 'Error exporting tasks',
      error: error.message
    });
  }
};

// @desc    Export payments to CSV
// @route   GET /api/admin/export/payments
// @access  Private (Admin only)
const exportPayments = async (req, res) => {
  try {
    const { format = 'csv', status, paymentMethod, dateFrom, dateTo } = req.query;

    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const payments = await Payment.find(filter)
      .populate('task', 'title')
      .populate('employer', 'name email')
      .populate('vendor', 'name email')
      .select('amount platformFee vendorAmount status paymentMethod paidAt createdAt')
      .lean();

    const data = payments.map(payment => ({
      'Task Title': payment.task ? payment.task.title : 'N/A',
      Amount: payment.amount,
      'Platform Fee': payment.platformFee,
      'Vendor Amount': payment.vendorAmount,
      Status: payment.status,
      'Payment Method': payment.paymentMethod,
      Employer: payment.employer ? payment.employer.name : 'N/A',
      'Employer Email': payment.employer ? payment.employer.email : 'N/A',
      Vendor: payment.vendor ? payment.vendor.name : 'N/A',
      'Vendor Email': payment.vendor ? payment.vendor.email : 'N/A',
      'Paid Date': payment.paidAt ? payment.paidAt.toISOString().split('T')[0] : 'N/A',
      'Created Date': payment.createdAt.toISOString().split('T')[0]
    }));

    if (format === 'csv') {
      const fields = [
        'Task Title', 'Amount', 'Platform Fee', 'Vendor Amount', 'Status',
        'Payment Method', 'Employer', 'Employer Email', 'Vendor', 'Vendor Email',
        'Paid Date', 'Created Date'
      ];
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(data);

      res.header('Content-Type', 'text/csv');
      res.attachment(`payments_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({
        data: data,
        total: data.length,
        exportedAt: new Date().toISOString()
      });
    }

    await logAdminActivity(req, 'export_generated', 'payment', null, {
      format,
      recordCount: data.length,
      filters: { status, paymentMethod, dateFrom, dateTo }
    });
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({
      message: 'Error exporting payments',
      error: error.message
    });
  }
};

// @desc    Export admin activities to CSV
// @route   GET /api/admin/export/activities
// @access  Private (Admin only)
const exportActivities = async (req, res) => {
  try {
    const { format = 'csv', action, resourceType, dateFrom, dateTo } = req.query;

    let filter = {};

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (resourceType && resourceType !== 'all') {
      filter.resourceType = resourceType;
    }

    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) filter.timestamp.$lte = new Date(dateTo);
    }

    const activities = await AdminActivity.find(filter)
      .populate('admin', 'name email')
      .sort({ timestamp: -1 })
      .lean();

    const data = activities.map(activity => ({
      Admin: activity.admin ? activity.admin.name : 'N/A',
      'Admin Email': activity.admin ? activity.admin.email : 'N/A',
      Action: activity.action,
      'Resource Type': activity.resourceType,
      'Resource ID': activity.resourceId || 'N/A',
      Description: activity.description,
      'IP Address': activity.ipAddress,
      Timestamp: activity.timestamp.toISOString()
    }));

    if (format === 'csv') {
      const fields = [
        'Admin', 'Admin Email', 'Action', 'Resource Type', 'Resource ID',
        'Description', 'IP Address', 'Timestamp'
      ];
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(data);

      res.header('Content-Type', 'text/csv');
      res.attachment(`admin_activities_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({
        data: data,
        total: data.length,
        exportedAt: new Date().toISOString()
      });
    }

    await logAdminActivity(req, 'export_generated', 'system', null, {
      format,
      recordCount: data.length,
      filters: { action, resourceType, dateFrom, dateTo }
    });
  } catch (error) {
    console.error('Export activities error:', error);
    res.status(500).json({
      message: 'Error exporting activities',
      error: error.message
    });
  }
};

module.exports = {
  exportUsers,
  exportTasks,
  exportPayments,
  exportActivities
};
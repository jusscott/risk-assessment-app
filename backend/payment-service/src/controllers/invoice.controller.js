const invoiceService = require('../services/invoice.service');
const planService = require('../services/plan.service');

/**
 * Controller for invoice operations
 */
class InvoiceController {
  /**
   * Get all invoices for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserInvoices(req, res) {
    try {
      const { userId } = req.params;
      
      // Check if the requesting user is authorized to view these invoices
      if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view these invoices'
          }
        });
      }
      
      const invoices = await invoiceService.getUserInvoices(userId);
      
      res.status(200).json({
        success: true,
        data: invoices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Get invoice by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getInvoiceById(req, res) {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);
      
      // Check if the requesting user is authorized to view this invoice
      if (req.user.role !== 'ADMIN' && req.user.id !== invoice.userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view this invoice'
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Create a new invoice (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createInvoice(req, res) {
    try {
      const { userId, planId, amount, currency, paymentIntentId } = req.body;
      
      // Verify plan exists
      await planService.getPlanById(planId);
      
      // Create invoice
      const invoice = await invoiceService.createInvoice(
        userId,
        planId,
        amount,
        currency,
        paymentIntentId
      );
      
      res.status(201).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Update invoice status (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateInvoiceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      let paymentDate = null;
      if (status === 'paid') {
        paymentDate = new Date();
      }
      
      const invoice = await invoiceService.updateInvoiceStatus(id, status, paymentDate);
      
      res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message
        }
      });
    }
  }
}

module.exports = new InvoiceController();

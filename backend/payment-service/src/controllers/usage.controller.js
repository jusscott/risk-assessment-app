const usageService = require('../services/usage.service');
const invoiceService = require('../services/invoice.service');
const config = require('../config/config');

/**
 * Controller for usage operations
 */
class UsageController {
  /**
   * Record usage for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordUsage(req, res) {
    try {
      const { userId, usageType, quantity, description } = req.body;
      
      if (!userId || !usageType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'User ID and usage type are required'
          }
        });
      }
      
      const usageRecord = await usageService.recordUsage(
        userId,
        usageType,
        quantity || 1,
        description || null
      );
      
      res.status(201).json({
        success: true,
        data: usageRecord
      });
    } catch (error) {
      if (error.message.includes('No active subscription found')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_ACTIVE_SUBSCRIPTION',
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
   * Get usage records for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserUsage(req, res) {
    try {
      const { userId } = req.params;
      const { startDate, endDate, usageType } = req.query;
      
      const usageRecords = await usageService.getUserUsage(
        userId,
        startDate || null,
        endDate || null,
        usageType || null
      );
      
      res.status(200).json({
        success: true,
        data: usageRecords
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
   * Get current billing period usage for a subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentUsage(req, res) {
    try {
      const { subscriptionId } = req.params;
      const { usageType } = req.query;
      
      const usageSummary = await usageService.getCurrentBillingPeriodUsage(
        parseInt(subscriptionId),
        usageType || null
      );
      
      res.status(200).json({
        success: true,
        data: usageSummary
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
   * Process billing for unprocessed usage records
   * This would typically be called by a scheduled job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processUsageBilling(req, res) {
    try {
      // Get API key from request for security
      const apiKey = req.headers['x-api-key'];
      
      // Validate API key
      if (!apiKey || apiKey !== config.internalApiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key'
          }
        });
      }
      
      // Get unprocessed usage records
      const cutoffDate = new Date();
      const unprocessedRecords = await usageService.getUnprocessedUsageRecords(cutoffDate);
      
      // Group records by user and subscription
      const groupedRecords = {};
      
      unprocessedRecords.forEach(record => {
        const key = `${record.userId}_${record.subscriptionId}`;
        if (!groupedRecords[key]) {
          groupedRecords[key] = {
            userId: record.userId,
            subscriptionId: record.subscriptionId,
            plan: record.subscription.plan,
            records: []
          };
        }
        groupedRecords[key].records.push(record);
      });
      
      // Process each group and create invoices
      const results = [];
      
      for (const key in groupedRecords) {
        const group = groupedRecords[key];
        
        // Calculate total usage beyond included amount
        const plan = group.plan;
        const includedUsage = plan.includedUsage || 0;
        let totalQuantity = 0;
        
        group.records.forEach(record => {
          totalQuantity += record.quantity;
        });
        
        // Only bill for overage
        const overageQuantity = Math.max(0, totalQuantity - includedUsage);
        
        if (overageQuantity > 0 && plan.usagePricePerUnit) {
          // Calculate amount
          const amount = overageQuantity * plan.usagePricePerUnit;
          
          // Create invoice items
          const items = [{
            type: 'usage',
            description: `Usage billing for ${plan.usageType} (${overageQuantity} units beyond included ${includedUsage})`,
            amount: amount,
            quantity: overageQuantity
          }];
          
          // Create invoice
          const invoice = await invoiceService.createInvoice(
            group.userId,
            plan.id,
            amount,
            plan.currency,
            null // paymentIntentId will be created later
          );
          
          // Update invoice items
          await invoiceService.updateInvoicePaymentIntent(
            invoice.id,
            null, // We'll create the payment intent separately
            items
          );
          
          // Mark usage records as processed
          const recordIds = group.records.map(record => record.id);
          await usageService.markUsageRecordsAsProcessed(recordIds, invoice.id);
          
          results.push({
            userId: group.userId,
            subscriptionId: group.subscriptionId,
            invoiceId: invoice.id,
            amount: amount,
            processedRecords: recordIds.length
          });
        } else {
          // No overage or no price defined, just mark as processed
          const recordIds = group.records.map(record => record.id);
          await usageService.markUsageRecordsAsProcessed(recordIds, null);
          
          results.push({
            userId: group.userId,
            subscriptionId: group.subscriptionId,
            invoiceId: null,
            amount: 0,
            processedRecords: recordIds.length
          });
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          totalProcessed: unprocessedRecords.length,
          results: results
        }
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
}

module.exports = new UsageController();

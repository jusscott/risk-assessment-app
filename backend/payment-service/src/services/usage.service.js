const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service for handling usage records and metering
 */
class UsageService {
  /**
   * Record usage for a user with active subscription
   * @param {string} userId - User ID
   * @param {string} usageType - Type of usage (e.g., 'report_generation', 'analysis')
   * @param {number} quantity - Quantity of usage units
   * @param {string} description - Optional description of the usage
   * @returns {Promise<object>} Created usage record
   */
  async recordUsage(userId, usageType, quantity = 1, description = null) {
    try {
      // Find active subscription for the user
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
          currentPeriodEnd: {
            gte: new Date() // Not expired
          }
        },
        include: {
          plan: true
        }
      });

      if (!subscription) {
        throw new Error(`No active subscription found for user ${userId}`);
      }

      // If the plan has usage-based billing enabled and matches the usage type
      if (
        subscription.plan.usageBasedBilling &&
        subscription.plan.usageType === usageType
      ) {
        // Create usage record
        const usageRecord = await prisma.usageRecord.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            planId: subscription.planId,
            quantity,
            usageType,
            description,
            billingPeriodStart: subscription.currentPeriodStart,
            billingPeriodEnd: subscription.currentPeriodEnd,
            processed: false
          }
        });
        return usageRecord;
      } else {
        // Still record usage for tracking, but mark as already processed since no billing needed
        const usageRecord = await prisma.usageRecord.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            planId: subscription.planId,
            quantity,
            usageType,
            description,
            billingPeriodStart: subscription.currentPeriodStart,
            billingPeriodEnd: subscription.currentPeriodEnd,
            processed: true // No billing needed for this usage
          }
        });
        return usageRecord;
      }
    } catch (error) {
      throw new Error(`Error recording usage: ${error.message}`);
    }
  }

  /**
   * Get usage records for a user
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @param {string} usageType - Filter by usage type
   * @returns {Promise<Array>} List of usage records
   */
  async getUserUsage(userId, startDate = null, endDate = null, usageType = null) {
    try {
      const where = { userId };
      
      if (startDate) {
        where.timestamp = where.timestamp || {};
        where.timestamp.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.timestamp = where.timestamp || {};
        where.timestamp.lte = new Date(endDate);
      }
      
      if (usageType) {
        where.usageType = usageType;
      }
      
      const usageRecords = await prisma.usageRecord.findMany({
        where,
        include: {
          plan: true,
          subscription: true
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
      
      return usageRecords;
    } catch (error) {
      throw new Error(`Error fetching usage records: ${error.message}`);
    }
  }

  /**
   * Get current billing period usage for a subscription
   * @param {number} subscriptionId - Subscription ID
   * @param {string} usageType - Usage type
   * @returns {Promise<object>} Usage summary including total and remaining units
   */
  async getCurrentBillingPeriodUsage(subscriptionId, usageType = null) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true }
      });
      
      if (!subscription) {
        throw new Error(`Subscription with ID ${subscriptionId} not found`);
      }
      
      const where = {
        subscriptionId,
        billingPeriodStart: subscription.currentPeriodStart,
        billingPeriodEnd: subscription.currentPeriodEnd
      };
      
      if (usageType) {
        where.usageType = usageType;
      }
      
      // Get all usage records for current billing period
      const usageRecords = await prisma.usageRecord.findMany({
        where
      });
      
      // Calculate total usage
      const totalUsage = usageRecords.reduce((sum, record) => sum + record.quantity, 0);
      
      // Calculate remaining included usage (if applicable)
      let includedUsage = 0;
      let remainingUsage = 0;
      let overageUsage = 0;
      
      if (
        subscription.plan.usageBasedBilling && 
        subscription.plan.includedUsage && 
        subscription.plan.usageType === usageType
      ) {
        includedUsage = subscription.plan.includedUsage;
        remainingUsage = Math.max(0, includedUsage - totalUsage);
        overageUsage = Math.max(0, totalUsage - includedUsage);
      }
      
      return {
        totalUsage,
        includedUsage,
        remainingUsage,
        overageUsage,
        billingPeriodStart: subscription.currentPeriodStart,
        billingPeriodEnd: subscription.currentPeriodEnd,
        usageRecords
      };
    } catch (error) {
      throw new Error(`Error fetching current usage: ${error.message}`);
    }
  }

  /**
   * Get unprocessed usage records for billing
   * @param {Date} cutoffDate - Only get records before this date
   * @returns {Promise<Array>} List of unprocessed usage records
   */
  async getUnprocessedUsageRecords(cutoffDate = new Date()) {
    try {
      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          processed: false,
          timestamp: {
            lt: cutoffDate
          },
          subscription: {
            plan: {
              usageBasedBilling: true
            }
          }
        },
        include: {
          subscription: {
            include: { plan: true }
          }
        }
      });
      
      return usageRecords;
    } catch (error) {
      throw new Error(`Error fetching unprocessed usage records: ${error.message}`);
    }
  }

  /**
   * Mark usage records as processed
   * @param {Array} recordIds - Array of usage record IDs
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<number>} Number of updated records
   */
  async markUsageRecordsAsProcessed(recordIds, invoiceId) {
    try {
      const result = await prisma.usageRecord.updateMany({
        where: {
          id: { in: recordIds }
        },
        data: {
          processed: true,
          invoiceId
        }
      });
      
      return result.count;
    } catch (error) {
      throw new Error(`Error marking usage records as processed: ${error.message}`);
    }
  }
}

module.exports = new UsageService();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stripeService = require('./stripe.service');

/**
 * Service for handling subscription operations
 */
class SubscriptionService {
  /**
   * Get subscription by user ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Subscription object or null if not found
   */
  async getSubscriptionByUserId(userId) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active'
        }
      });
      return subscription;
    } catch (error) {
      throw new Error(`Error fetching subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription by ID
   * @param {number} id - Subscription ID
   * @returns {Promise<object>} Subscription object
   */
  async getSubscriptionById(id) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: parseInt(id) }
      });

      if (!subscription) {
        throw new Error(`Subscription with ID ${id} not found`);
      }

      return subscription;
    } catch (error) {
      throw new Error(`Error fetching subscription: ${error.message}`);
    }
  }

  /**
   * Create a new subscription
   * @param {string} userId - User ID
   * @param {number} planId - Plan ID
   * @param {string} stripeCustomerId - Stripe customer ID
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @returns {Promise<object>} Created subscription
   */
  async createSubscription(userId, planId, stripeCustomerId, stripeSubscriptionId) {
    try {
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
          stripeCustomerId,
          stripeSubscriptionId
        }
      });
      return subscription;
    } catch (error) {
      throw new Error(`Error creating subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription status
   * @param {number} id - Subscription ID
   * @param {string} status - New status ('active', 'canceled', 'expired')
   * @returns {Promise<object>} Updated subscription
   */
  async updateSubscriptionStatus(id, status) {
    try {
      const subscription = await prisma.subscription.update({
        where: { id: parseInt(id) },
        data: { status }
      });
      return subscription;
    } catch (error) {
      throw new Error(`Error updating subscription status: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   * @param {number} id - Subscription ID
   * @returns {Promise<object>} Canceled subscription
   */
  async cancelSubscription(id) {
    try {
      const subscription = await this.getSubscriptionById(id);
      
      if (!subscription) {
        throw new Error(`Subscription with ID ${id} not found`);
      }

      // Cancel in Stripe
      if (subscription.stripeSubscriptionId) {
        await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      }

      // Update status in our database
      const updatedSubscription = await this.updateSubscriptionStatus(id, 'canceled');
      return updatedSubscription;
    } catch (error) {
      throw new Error(`Error canceling subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription period
   * @param {number} id - Subscription ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Promise<object>} Updated subscription
   */
  async updateSubscriptionPeriod(id, startDate, endDate) {
    try {
      const subscription = await prisma.subscription.update({
        where: { id: parseInt(id) },
        data: {
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate
        }
      });
      return subscription;
    } catch (error) {
      throw new Error(`Error updating subscription period: ${error.message}`);
    }
  }

  /**
   * Check if user has active subscription
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user has active subscription
   */
  async hasActiveSubscription(userId) {
    try {
      const count = await prisma.subscription.count({
        where: {
          userId,
          status: 'active',
          currentPeriodEnd: {
            gte: new Date() // Greater than or equal to now
          }
        }
      });
      return count > 0;
    } catch (error) {
      throw new Error(`Error checking subscription status: ${error.message}`);
    }
  }
}

module.exports = new SubscriptionService();

/**
 * Payment Factory
 * Creates test payment entities
 */

const BaseFactory = require('./base.factory');
const { request, reporting } = require('../scripts/test-utils');

class PaymentFactory extends BaseFactory {
  /**
   * Create a payment plan with default values
   * @param {object} overrides - Optional property overrides
   * @returns {Promise<object>} - Created payment plan data
   */
  async createPlan(overrides = {}) {
    const planData = {
      name: overrides.name || this.randomString('Test Plan'),
      description: overrides.description || 'Auto-generated test payment plan',
      price: overrides.price || 99.99,
      currency: overrides.currency || 'USD',
      interval: overrides.interval || 'month',
      features: overrides.features || [
        'Up to 10 users',
        'Unlimited questionnaires',
        'Basic analytics',
        'Email support'
      ],
      active: overrides.active !== undefined ? overrides.active : true,
      ...overrides
    };

    reporting.log(`Creating test payment plan: ${planData.name}`, 'info');

    const result = await this.createEntityWithCleanup(
      `${this.apiGateway}/api/payments/plans`,
      planData,
      'plan'
    );

    return result.data;
  }

  /**
   * Create a subscription to a payment plan
   * @param {string} planId - Plan ID to subscribe to
   * @param {object} overrides - Optional property overrides
   * @returns {Promise<object>} - Created subscription data
   */
  async createSubscription(planId, overrides = {}) {
    if (!planId) {
      throw new Error('Plan ID is required to create a subscription');
    }

    const paymentMethodData = overrides.paymentMethod || this.config.tests?.payment?.testCard || {
      number: '4242424242424242',
      expMonth: 12,
      expYear: 2030,
      cvc: '123'
    };

    // Payment information and subscription data
    const subscriptionData = {
      planId,
      paymentMethod: paymentMethodData,
      ...overrides
    };

    reporting.log(`Creating test subscription for plan: ${planId}`, 'info');

    const result = await this.createEntityWithCleanup(
      `${this.apiGateway}/api/payments/subscriptions`,
      subscriptionData,
      'subscription'
    );

    return result.data;
  }

  /**
   * Get invoices for a subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Array<object>>} - Array of invoices
   */
  async getInvoices(subscriptionId) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required to get invoices');
    }

    reporting.log(`Getting invoices for subscription: ${subscriptionId}`, 'info');
    
    try {
      const response = await request.get(
        `${this.apiGateway}/api/payments/subscriptions/${subscriptionId}/invoices`,
        this.getAuthHeader()
      );
      
      if (response.status === 200) {
        // Register invoices for cleanup if needed
        const invoices = response.data.data;
        if (Array.isArray(invoices)) {
          invoices.forEach(invoice => {
            if (invoice.id) {
              this.registerForCleanup('invoice', invoice.id);
            }
          });
        }
        
        return invoices;
      } else {
        throw new Error(`Failed to get invoices: ${response.status}`);
      }
    } catch (error) {
      reporting.log(`Error getting invoices: ${error.message}`, 'error');
      
      if (process.env.NODE_ENV === 'test') {
        // In test mode, return simulated invoices
        return [
          {
            id: `simulated-invoice-${Date.now()}-1`,
            amount: 99.99,
            currency: 'USD',
            status: 'paid',
            date: new Date().toISOString()
          },
          {
            id: `simulated-invoice-${Date.now()}-2`,
            amount: 99.99,
            currency: 'USD',
            status: 'upcoming',
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      }
      
      throw error;
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Subscription ID to cancel
   * @param {object} options - Cancellation options
   * @returns {Promise<object>} - Updated subscription data
   */
  async cancelSubscription(subscriptionId, options = {}) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required to cancel a subscription');
    }

    const cancellationData = {
      cancelAtPeriodEnd: options.cancelAtPeriodEnd !== undefined ? options.cancelAtPeriodEnd : true,
      reason: options.reason || 'Testing cancellation',
      ...options
    };

    reporting.log(`Cancelling subscription: ${subscriptionId}`, 'info');
    
    try {
      const response = await request.post(
        `${this.apiGateway}/api/payments/subscriptions/${subscriptionId}/cancel`,
        cancellationData,
        this.getAuthHeader()
      );
      
      if (response.status === 200) {
        return response.data.data;
      } else {
        throw new Error(`Failed to cancel subscription: ${response.status}`);
      }
    } catch (error) {
      reporting.log(`Error cancelling subscription: ${error.message}`, 'error');
      
      if (process.env.NODE_ENV === 'test') {
        // In test mode, return simulated cancellation data
        return {
          id: subscriptionId,
          status: 'canceled',
          canceledAt: new Date().toISOString(),
          cancelAtPeriodEnd: cancellationData.cancelAtPeriodEnd
        };
      }
      
      throw error;
    }
  }

  /**
   * Create a specific payment scenario
   * @param {string} scenarioType - Type of scenario to create ("success", "failed", "dispute")
   * @param {object} overrides - Optional property overrides
   * @returns {Promise<object>} - Created payment scenario data
   */
  async createPaymentScenario(scenarioType = 'success', overrides = {}) {
    let planData = {};
    let cardData = {};
    
    // Configure scenario-specific data
    switch (scenarioType) {
      case 'failed':
        cardData = this.config.tests?.payment?.failCard || {
          number: '4000000000000002', // This will fail
          expMonth: 12,
          expYear: 2030,
          cvc: '123'
        };
        break;
      
      case 'dispute':
        cardData = {
          number: '4000000000000259', // This will trigger a dispute later
          expMonth: 12,
          expYear: 2030,
          cvc: '123'
        };
        break;
      
      case 'success':
      default:
        cardData = this.config.tests?.payment?.testCard || {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2030,
          cvc: '123'
        };
        break;
    }
    
    // Create the plan
    const plan = await this.createPlan({
      name: `${scenarioType.toUpperCase()} Test Plan`,
      price: scenarioType === 'dispute' ? 100 : 99.99,
      ...overrides.plan
    });
    
    // Create the subscription
    const subscription = await this.createSubscription(plan.id, {
      paymentMethod: cardData,
      ...overrides.subscription
    });
    
    return {
      scenarioType,
      plan,
      subscription,
      paymentMethod: cardData
    };
  }
}

module.exports = PaymentFactory;

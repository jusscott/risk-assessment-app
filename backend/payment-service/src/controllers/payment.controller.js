const stripeService = require('../services/stripe.service');
const planService = require('../services/plan.service');
const invoiceService = require('../services/invoice.service');
const subscriptionService = require('../services/subscription.service');
const config = require('../config/config');

/**
 * Controller for payment operations
 */
class PaymentController {
  /**
   * Create a payment intent for one-time payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createPaymentIntent(req, res) {
    try {
      const { planId, email, name, userId } = req.body;
      
      // Get plan details
      const plan = await planService.getPlanById(planId);
      
      // Create or get customer
      const customer = await stripeService.createCustomer(email, name, {
        userId: userId
      });
      
      // Convert price to cents for Stripe
      const amountCents = Math.round(plan.price * 100);
      
      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent(
        amountCents,
        plan.currency.toLowerCase(),
        customer.id,
        {
          userId: userId,
          planId: plan.id
        }
      );
      
      // Create invoice record
      const invoice = await invoiceService.createInvoice(
        userId,
        plan.id,
        plan.price,
        plan.currency,
        paymentIntent.id
      );
      
      res.status(200).json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          invoiceId: invoice.id
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

  /**
   * Create a subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createSubscription(req, res) {
    try {
      const { planId, email, name, userId } = req.body;
      
      // Get plan details
      const plan = await planService.getPlanById(planId);
      
      // Create or get customer
      const customer = await stripeService.createCustomer(email, name, {
        userId: userId
      });
      
      // In a real implementation, you would store the Stripe price ID in your database
      // For now, we'll create a new price for this product (normally done in admin panel)
      const amountCents = Math.round(plan.price * 100);
      const product = await stripeService.createProduct(plan.name, plan.description || '');
      const price = await stripeService.createPrice(
        product.id,
        amountCents,
        plan.currency.toLowerCase(),
        'month',
        { planName: plan.name }
      );
      
      // Create subscription
      const stripeSubscription = await stripeService.createSubscription(
        customer.id,
        price.id,
        {
          userId: userId,
          planId: plan.id
        }
      );
      
      // Create subscription record in our database
      const subscription = await subscriptionService.createSubscription(
        userId,
        plan.id,
        customer.id,
        stripeSubscription.id
      );
      
      // Create initial invoice record
      const invoice = await invoiceService.createInvoice(
        userId,
        plan.id,
        plan.price,
        plan.currency
      );
      
      res.status(200).json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          invoiceId: invoice.id,
          status: subscription.status
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

  /**
   * Cancel a subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelSubscription(req, res) {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.cancelSubscription(id);
      
      res.status(200).json({
        success: true,
        data: subscription
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
   * Check subscription status for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkSubscriptionStatus(req, res) {
    try {
      const { userId } = req.params;
      const hasActiveSubscription = await subscriptionService.hasActiveSubscription(userId);
      
      res.status(200).json({
        success: true,
        data: {
          hasActiveSubscription
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

  /**
   * Get user's subscription details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserSubscription(req, res) {
    try {
      const { userId } = req.params;
      const subscription = await subscriptionService.getSubscriptionByUserId(userId);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No active subscription found for this user'
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: subscription
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
   * Handle Stripe webhook events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleWebhook(req, res) {
    const signature = req.headers['stripe-signature'];
    let event;
    
    try {
      event = await stripeService.constructWebhookEvent(req.body, signature);
      
      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        // Add more event types as needed
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Handle payment intent succeeded event
   * @param {Object} paymentIntent - Stripe payment intent object
   */
  async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      // Find invoice by payment intent ID
      const invoice = await invoiceService.findInvoiceByPaymentIntent(paymentIntent.id);
      
      if (invoice) {
        // Update invoice status
        await invoiceService.updateInvoiceStatus(invoice.id, 'paid', new Date());
      }
    } catch (error) {
      console.error('Error handling payment intent succeeded:', error);
    }
  }

  /**
   * Handle payment intent failed event
   * @param {Object} paymentIntent - Stripe payment intent object
   */
  async handlePaymentIntentFailed(paymentIntent) {
    try {
      // Find invoice by payment intent ID
      const invoice = await invoiceService.findInvoiceByPaymentIntent(paymentIntent.id);
      
      if (invoice) {
        // Update invoice status
        await invoiceService.updateInvoiceStatus(invoice.id, 'failed');
      }
    } catch (error) {
      console.error('Error handling payment intent failed:', error);
    }
  }

  /**
   * Handle invoice payment succeeded event
   * @param {Object} invoice - Stripe invoice object
   */
  async handleInvoicePaymentSucceeded(invoice) {
    try {
      // Handle subscription invoice payment
      console.log('Subscription payment succeeded for subscription:', invoice.subscription);
      
      // In a real implementation, you would update your database
      // based on the subscription ID in the invoice
    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
    }
  }

  /**
   * Handle invoice payment failed event
   * @param {Object} invoice - Stripe invoice object
   */
  async handleInvoicePaymentFailed(invoice) {
    try {
      // Handle subscription invoice payment failure
      console.log('Subscription payment failed for subscription:', invoice.subscription);
      
      // In a real implementation, you would update your database
      // based on the subscription ID in the invoice
    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
    }
  }
}

module.exports = new PaymentController();

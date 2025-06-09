const stripe = require('stripe');
const config = require('../config/config');

// Initialize Stripe with the API key
const stripeClient = stripe(config.stripe.secretKey);

/**
 * Service for handling Stripe payment operations
 */
class StripeService {
  /**
   * Simple health check for Stripe API connectivity
   * @returns {Promise<boolean>} True if connection is successful
   */
  async ping() {
    try {
      // A lightweight call to Stripe API to check connectivity
      const balance = await stripeClient.balance.retrieve();
      return true;
    } catch (error) {
      throw new Error(`Stripe API connection failed: ${error.message}`);
    }
  }

  /**
   * Create a Stripe customer
   * @param {string} email - Customer email
   * @param {string} name - Customer name
   * @param {object} metadata - Additional customer metadata
   * @returns {Promise<object>} Stripe customer object
   */
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripeClient.customers.create({
        email,
        name,
        metadata
      });
      return customer;
    } catch (error) {
      throw new Error(`Error creating Stripe customer: ${error.message}`);
    }
  }

  /**
   * Create a payment intent for one-time payment
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (e.g., 'usd')
   * @param {string} customerId - Stripe customer ID
   * @param {object} metadata - Additional payment metadata
   * @returns {Promise<object>} Stripe payment intent object
   */
  async createPaymentIntent(amount, currency, customerId, metadata = {}) {
    try {
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        metadata,
        payment_method_types: ['card']
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Error creating payment intent: ${error.message}`);
    }
  }

  /**
   * Create a subscription for a customer
   * @param {string} customerId - Stripe customer ID
   * @param {string} priceId - Stripe price ID
   * @param {object} metadata - Additional subscription metadata
   * @returns {Promise<object>} Stripe subscription object
   */
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      const subscription = await stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata
      });
      return subscription;
    } catch (error) {
      throw new Error(`Error creating subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Promise<object>} Stripe subscription object
   */
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await stripeClient.subscriptions.del(subscriptionId);
      return subscription;
    } catch (error) {
      throw new Error(`Error canceling subscription: ${error.message}`);
    }
  }

  /**
   * Create a product in Stripe
   * @param {string} name - Product name
   * @param {string} description - Product description
   * @param {object} metadata - Additional product metadata
   * @returns {Promise<object>} Stripe product object
   */
  async createProduct(name, description, metadata = {}) {
    try {
      const product = await stripeClient.products.create({
        name,
        description,
        metadata
      });
      return product;
    } catch (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  /**
   * Create a price for a product
   * @param {string} productId - Stripe product ID
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (e.g., 'usd')
   * @param {string} interval - Billing interval (e.g., 'month', 'year')
   * @param {object} metadata - Additional price metadata
   * @returns {Promise<object>} Stripe price object
   */
  async createPrice(productId, amount, currency, interval = null, metadata = {}) {
    try {
      const priceData = {
        product: productId,
        unit_amount: amount,
        currency,
        metadata
      };

      // If interval is provided, this is a recurring price
      if (interval) {
        priceData.recurring = { interval };
      }

      const price = await stripeClient.prices.create(priceData);
      return price;
    } catch (error) {
      throw new Error(`Error creating price: ${error.message}`);
    }
  }

  /**
   * Verify and process a webhook event from Stripe
   * @param {string} payload - Raw request body string
   * @param {string} signature - Stripe signature from headers
   * @returns {Promise<object>} Stripe event object
   */
  async constructWebhookEvent(payload, signature) {
    try {
      const event = stripeClient.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
      return event;
    } catch (error) {
      throw new Error(`Webhook error: ${error.message}`);
    }
  }
}

module.exports = new StripeService();

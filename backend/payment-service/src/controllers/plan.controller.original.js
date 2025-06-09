const planService = require('../services/plan.service');
const stripeService = require('../services/stripe.service');
const config = require('../config/config');

/**
 * Controller for plan operations with improved frontend compatibility
 */
class PlanController {
  /**
   * Get all plans with proper field transformations for frontend
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllPlans(req, res) {
    try {
      const plans = await planService.getAllPlans();
      
      // Transform plans to match frontend expectations
      const transformedPlans = plans
        .filter(plan => plan.isActive) // Only return active plans
        .map(plan => {
          // Map database fields to frontend expected fields
          return {
            id: plan.id.toString(),
            name: plan.name,
            description: plan.description || '',
            price: plan.price,
            currency: plan.currency,
            interval: plan.interval === 'monthly' ? 'month' : plan.interval === 'yearly' ? 'year' : plan.interval,
            features: Array.isArray(plan.features) ? plan.features : [],
            isActive: plan.isActive,
            stripeProductId: plan.stripeId || '',
            stripePriceId: plan.stripePriceId || '',
            createdAt: plan.createdAt.toISOString(),
            updatedAt: plan.updatedAt.toISOString()
          };
        });
      
      res.status(200).json({
        success: true,
        data: transformedPlans
      });
    } catch (error) {
      console.error(`Error in getAllPlans: ${error.message}`, error);
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
   * Get plan by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const plan = await planService.getPlanById(id);
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Plan with ID ${id} not found`
          }
        });
      }
      
      // Transform plan to match frontend expectations
      const transformedPlan = {
        id: plan.id.toString(),
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval === 'monthly' ? 'month' : plan.interval === 'yearly' ? 'year' : plan.interval,
        features: Array.isArray(plan.features) ? plan.features : [],
        isActive: plan.isActive,
        stripeProductId: plan.stripeId || '',
        stripePriceId: plan.stripePriceId || '',
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString()
      };
      
      res.status(200).json({
        success: true,
        data: transformedPlan
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
      
      console.error(`Error in getPlanById: ${error.message}`, error);
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
   * Create a new plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createPlan(req, res) {
    try {
      const { name, description, price, currency, features } = req.body;
      
      // Create Stripe product
      const product = await stripeService.createProduct(name, description);
      
      // Convert price to cents for Stripe
      const priceCents = Math.round(parseFloat(price) * 100);
      
      // Create Stripe price for subscription (monthly)
      const stripePrice = await stripeService.createPrice(
        product.id, 
        priceCents, 
        currency.toLowerCase(),
        'month',
        { planName: name }
      );
      
      // Create plan in our database
      const plan = await planService.createPlan({
        name,
        description,
        price: parseFloat(price),
        currency: currency.toUpperCase(),
        features: Array.isArray(features) ? features : []
      });
      
      res.status(201).json({
        success: true,
        data: plan,
        stripe: {
          productId: product.id,
          priceId: stripePrice.id
        }
      });
    } catch (error) {
      console.error(`Error in createPlan: ${error.message}`, error);
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
   * Update a plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price, currency, features, isActive } = req.body;
      
      // Prepare update data
      const updateData = {};
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (currency !== undefined) updateData.currency = currency.toUpperCase();
      if (features !== undefined) updateData.features = Array.isArray(features) ? features : [];
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const updatedPlan = await planService.updatePlan(id, updateData);
      
      // Transform plan to match frontend expectations
      const transformedPlan = {
        id: updatedPlan.id.toString(),
        name: updatedPlan.name,
        description: updatedPlan.description || '',
        price: updatedPlan.price,
        currency: updatedPlan.currency,
        interval: updatedPlan.interval === 'monthly' ? 'month' : updatedPlan.interval === 'yearly' ? 'year' : updatedPlan.interval,
        features: Array.isArray(updatedPlan.features) ? updatedPlan.features : [],
        isActive: updatedPlan.isActive,
        stripeProductId: updatedPlan.stripeId || '',
        stripePriceId: updatedPlan.stripePriceId || '',
        createdAt: updatedPlan.createdAt.toISOString(),
        updatedAt: updatedPlan.updatedAt.toISOString()
      };
      
      res.status(200).json({
        success: true,
        data: transformedPlan
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
      
      console.error(`Error in updatePlan: ${error.message}`, error);
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
   * Delete a plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;
      await planService.deletePlan(id);
      
      res.status(200).json({
        success: true,
        message: `Plan with ID ${id} successfully deleted`
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
      
      console.error(`Error in deletePlan: ${error.message}`, error);
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

module.exports = new PlanController();

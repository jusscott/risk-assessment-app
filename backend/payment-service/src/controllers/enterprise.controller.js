const enterpriseService = require('../services/enterprise.service');
const config = require('../config/config');

/**
 * Controller for enterprise operations
 */
class EnterpriseController {
  /**
   * Create a new organization
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createOrganization(req, res) {
    try {
      const { name, billingEmail, billingAddress, taxId } = req.body;
      
      if (!name || !billingEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Organization name and billing email are required'
          }
        });
      }
      
      const organization = await enterpriseService.createOrganization(
        name,
        billingEmail,
        billingAddress || null,
        taxId || null
      );
      
      res.status(201).json({
        success: true,
        data: organization
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
   * Get organization details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOrganization(req, res) {
    try {
      const { id } = req.params;
      
      const organization = await enterpriseService.getOrganization(parseInt(id));
      
      res.status(200).json({
        success: true,
        data: organization
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
   * Update an organization
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateOrganization(req, res) {
    try {
      const { id } = req.params;
      const { name, billingEmail, billingAddress, taxId, status } = req.body;
      
      const updateData = {};
      if (name) updateData.name = name;
      if (billingEmail) updateData.billingEmail = billingEmail;
      if (billingAddress !== undefined) updateData.billingAddress = billingAddress;
      if (taxId !== undefined) updateData.taxId = taxId;
      if (status) updateData.status = status;
      
      const organization = await enterpriseService.updateOrganization(parseInt(id), updateData);
      
      res.status(200).json({
        success: true,
        data: organization
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
   * Create a department
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createDepartment(req, res) {
    try {
      const { organizationId, name, costCenter } = req.body;
      
      if (!organizationId || !name) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Organization ID and department name are required'
          }
        });
      }
      
      const department = await enterpriseService.createDepartment(
        parseInt(organizationId),
        name,
        costCenter || null
      );
      
      res.status(201).json({
        success: true,
        data: department
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
   * Get department details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDepartment(req, res) {
    try {
      const { id } = req.params;
      
      const department = await enterpriseService.getDepartment(parseInt(id));
      
      res.status(200).json({
        success: true,
        data: department
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
   * Create an enterprise plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createEnterprisePlan(req, res) {
    try {
      const { 
        organizationId, 
        planId, 
        seats, 
        customPrice, 
        volumeDiscount,
        billingCycle,
        nextBillingDate
      } = req.body;
      
      if (!organizationId || !planId || !seats) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Organization ID, plan ID, and seats are required'
          }
        });
      }
      
      // Parse date if provided
      let parsedNextBillingDate = null;
      if (nextBillingDate) {
        parsedNextBillingDate = new Date(nextBillingDate);
        if (isNaN(parsedNextBillingDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid next billing date format'
            }
          });
        }
      }
      
      const enterprisePlan = await enterpriseService.createEnterprisePlan(
        parseInt(organizationId),
        parseInt(planId),
        parseInt(seats),
        customPrice ? parseFloat(customPrice) : null,
        volumeDiscount ? parseFloat(volumeDiscount) : null,
        billingCycle || 'monthly',
        parsedNextBillingDate
      );
      
      res.status(201).json({
        success: true,
        data: enterprisePlan
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
   * Get enterprise plan details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEnterprisePlan(req, res) {
    try {
      const { id } = req.params;
      
      const enterprisePlan = await enterpriseService.getEnterprisePlan(parseInt(id));
      
      res.status(200).json({
        success: true,
        data: enterprisePlan
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
   * Create an enterprise usage quota
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createUsageQuota(req, res) {
    try {
      const { 
        enterprisePlanId, 
        usageType, 
        pooled, 
        totalQuota,
        perSeatQuota,
        unitPrice
      } = req.body;
      
      if (!enterprisePlanId || !usageType || totalQuota === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Enterprise plan ID, usage type, and total quota are required'
          }
        });
      }
      
      const usageQuota = await enterpriseService.createEnterpriseUsageQuota(
        parseInt(enterprisePlanId),
        usageType,
        pooled !== undefined ? Boolean(pooled) : true,
        parseInt(totalQuota),
        perSeatQuota ? parseInt(perSeatQuota) : null,
        unitPrice ? parseFloat(unitPrice) : null
      );
      
      res.status(201).json({
        success: true,
        data: usageQuota
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
   * Create an enterprise subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createSubscription(req, res) {
    try {
      const { enterprisePlanId, userId, departmentId } = req.body;
      
      if (!enterprisePlanId || !userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Enterprise plan ID and user ID are required'
          }
        });
      }
      
      const subscription = await enterpriseService.createEnterpriseSubscription(
        parseInt(enterprisePlanId),
        userId,
        departmentId ? parseInt(departmentId) : null
      );
      
      res.status(201).json({
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
   * Record enterprise usage
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
      
      const usageRecord = await enterpriseService.recordEnterpriseUsage(
        userId,
        usageType,
        quantity ? parseInt(quantity) : 1,
        description || null
      );
      
      res.status(201).json({
        success: true,
        data: usageRecord
      });
    } catch (error) {
      if (error.message.includes('No enterprise subscription found')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_ENTERPRISE_SUBSCRIPTION',
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
   * Generate an invoice for an organization
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateInvoice(req, res) {
    try {
      // Verify API key for security
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== config.internalApiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key'
          }
        });
      }
      
      const { 
        organizationId, 
        billingPeriodStart, 
        billingPeriodEnd,
        dueDate
      } = req.body;
      
      if (!organizationId || !billingPeriodStart || !billingPeriodEnd) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Organization ID and billing period dates are required'
          }
        });
      }
      
      // Parse dates
      const parsedBillingStart = new Date(billingPeriodStart);
      const parsedBillingEnd = new Date(billingPeriodEnd);
      let parsedDueDate = null;
      
      if (dueDate) {
        parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid due date format'
            }
          });
        }
      }
      
      if (isNaN(parsedBillingStart.getTime()) || isNaN(parsedBillingEnd.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: 'Invalid billing period date format'
          }
        });
      }
      
      const invoice = await enterpriseService.generateEnterpriseInvoice(
        parseInt(organizationId),
        parsedBillingStart,
        parsedBillingEnd,
        parsedDueDate
      );
      
      res.status(201).json({
        success: true,
        data: invoice
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

module.exports = new EnterpriseController();

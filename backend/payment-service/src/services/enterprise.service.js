const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service for handling enterprise billing operations
 */
class EnterpriseService {
  /**
   * Create a new organization
   * @param {string} name - Organization name
   * @param {string} billingEmail - Billing email address
   * @param {string} billingAddress - Billing address
   * @param {string} taxId - Tax ID or VAT number
   * @returns {Promise<object>} Created organization
   */
  async createOrganization(name, billingEmail, billingAddress = null, taxId = null) {
    try {
      const organization = await prisma.organization.create({
        data: {
          name,
          billingEmail,
          billingAddress,
          taxId,
          status: 'active'
        }
      });
      
      return organization;
    } catch (error) {
      throw new Error(`Error creating organization: ${error.message}`);
    }
  }

  /**
   * Get an organization by ID
   * @param {number} id - Organization ID
   * @returns {Promise<object>} Organization
   */
  async getOrganization(id) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          departments: true,
          enterprisePlans: {
            include: {
              plan: true
            }
          }
        }
      });
      
      if (!organization) {
        throw new Error(`Organization with ID ${id} not found`);
      }
      
      return organization;
    } catch (error) {
      throw new Error(`Error fetching organization: ${error.message}`);
    }
  }

  /**
   * Update an organization
   * @param {number} id - Organization ID
   * @param {object} data - Fields to update
   * @returns {Promise<object>} Updated organization
   */
  async updateOrganization(id, data) {
    try {
      const organization = await prisma.organization.update({
        where: { id },
        data
      });
      
      return organization;
    } catch (error) {
      throw new Error(`Error updating organization: ${error.message}`);
    }
  }

  /**
   * Create a department within an organization
   * @param {number} organizationId - Organization ID
   * @param {string} name - Department name
   * @param {string} costCenter - Cost center code
   * @returns {Promise<object>} Created department
   */
  async createDepartment(organizationId, name, costCenter = null) {
    try {
      const department = await prisma.department.create({
        data: {
          organizationId,
          name,
          costCenter
        }
      });
      
      return department;
    } catch (error) {
      throw new Error(`Error creating department: ${error.message}`);
    }
  }

  /**
   * Get a department by ID
   * @param {number} id - Department ID
   * @returns {Promise<object>} Department
   */
  async getDepartment(id) {
    try {
      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          organization: true,
          enterpriseSubscriptions: true
        }
      });
      
      if (!department) {
        throw new Error(`Department with ID ${id} not found`);
      }
      
      return department;
    } catch (error) {
      throw new Error(`Error fetching department: ${error.message}`);
    }
  }

  /**
   * Create an enterprise plan
   * @param {number} organizationId - Organization ID
   * @param {number} planId - Base plan ID
   * @param {number} seats - Number of seats
   * @param {number} customPrice - Custom price (if applicable)
   * @param {number} volumeDiscount - Volume discount percentage
   * @param {string} billingCycle - Billing cycle (monthly, quarterly, yearly)
   * @param {Date} nextBillingDate - Next billing date
   * @returns {Promise<object>} Created enterprise plan
   */
  async createEnterprisePlan(
    organizationId, 
    planId, 
    seats, 
    customPrice = null,
    volumeDiscount = null,
    billingCycle = 'monthly',
    nextBillingDate = null
  ) {
    try {
      // Verify the organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });
      
      if (!organization) {
        throw new Error(`Organization with ID ${organizationId} not found`);
      }
      
      // Verify the plan exists and is active
      const plan = await prisma.plan.findUnique({
        where: { 
          id: planId,
          isActive: true
        }
      });
      
      if (!plan) {
        throw new Error(`Plan with ID ${planId} not found or is not active`);
      }
      
      // Set next billing date if not provided
      if (!nextBillingDate) {
        nextBillingDate = new Date();
        
        switch (billingCycle) {
          case 'monthly':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
            break;
          case 'yearly':
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            break;
          default:
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
      }
      
      const enterprisePlan = await prisma.enterprisePlan.create({
        data: {
          organizationId,
          planId,
          seats,
          customPrice,
          volumeDiscount,
          billingCycle,
          nextBillingDate,
          status: 'active'
        },
        include: {
          plan: true,
          organization: true
        }
      });
      
      return enterprisePlan;
    } catch (error) {
      throw new Error(`Error creating enterprise plan: ${error.message}`);
    }
  }

  /**
   * Get an enterprise plan by ID
   * @param {number} id - Enterprise plan ID
   * @returns {Promise<object>} Enterprise plan
   */
  async getEnterprisePlan(id) {
    try {
      const enterprisePlan = await prisma.enterprisePlan.findUnique({
        where: { id },
        include: {
          organization: true,
          plan: true,
          subscriptions: {
            include: {
              department: true
            }
          },
          usageQuotas: true
        }
      });
      
      if (!enterprisePlan) {
        throw new Error(`Enterprise plan with ID ${id} not found`);
      }
      
      return enterprisePlan;
    } catch (error) {
      throw new Error(`Error fetching enterprise plan: ${error.message}`);
    }
  }

  /**
   * Create an enterprise usage quota
   * @param {number} enterprisePlanId - Enterprise plan ID
   * @param {string} usageType - Type of usage
   * @param {boolean} pooled - Whether the quota is pooled across all users
   * @param {number} totalQuota - Total quota for the organization
   * @param {number} perSeatQuota - Quota per seat
   * @param {number} unitPrice - Price per unit for overage
   * @returns {Promise<object>} Created usage quota
   */
  async createEnterpriseUsageQuota(
    enterprisePlanId,
    usageType,
    pooled = true,
    totalQuota,
    perSeatQuota = null,
    unitPrice = null
  ) {
    try {
      const enterprisePlan = await prisma.enterprisePlan.findUnique({
        where: { id: enterprisePlanId }
      });
      
      if (!enterprisePlan) {
        throw new Error(`Enterprise plan with ID ${enterprisePlanId} not found`);
      }
      
      const usageQuota = await prisma.enterpriseUsageQuota.create({
        data: {
          enterprisePlanId,
          usageType,
          pooled,
          totalQuota,
          perSeatQuota,
          unitPrice
        }
      });
      
      return usageQuota;
    } catch (error) {
      throw new Error(`Error creating enterprise usage quota: ${error.message}`);
    }
  }

  /**
   * Create an enterprise subscription for a user
   * @param {number} enterprisePlanId - Enterprise plan ID
   * @param {string} userId - User ID
   * @param {number} departmentId - Department ID (optional)
   * @returns {Promise<object>} Created enterprise subscription
   */
  async createEnterpriseSubscription(enterprisePlanId, userId, departmentId = null) {
    try {
      // Verify the enterprise plan exists and is active
      const enterprisePlan = await prisma.enterprisePlan.findUnique({
        where: {
          id: enterprisePlanId,
          status: 'active'
        },
        include: {
          subscriptions: true
        }
      });
      
      if (!enterprisePlan) {
        throw new Error(`Enterprise plan with ID ${enterprisePlanId} not found or is not active`);
      }
      
      // Check if seats are available
      if (enterprisePlan.subscriptions.length >= enterprisePlan.seats) {
        throw new Error(`No seats available in enterprise plan ${enterprisePlanId}`);
      }
      
      // Check if user already has an enterprise subscription for this plan
      const existingSubscription = await prisma.enterpriseSubscription.findFirst({
        where: {
          enterprisePlanId,
          userId
        }
      });
      
      if (existingSubscription) {
        throw new Error(`User ${userId} already has a subscription to enterprise plan ${enterprisePlanId}`);
      }
      
      // Create the enterprise subscription
      const subscription = await prisma.enterpriseSubscription.create({
        data: {
          enterprisePlanId,
          userId,
          departmentId
        },
        include: {
          enterprisePlan: true,
          department: true
        }
      });
      
      // Update the regular subscription status to indicate it's an enterprise user
      await prisma.subscription.updateMany({
        where: {
          userId,
          status: 'active'
        },
        data: {
          isEnterprise: true
        }
      });
      
      return subscription;
    } catch (error) {
      throw new Error(`Error creating enterprise subscription: ${error.message}`);
    }
  }

  /**
   * Record enterprise usage
   * @param {string} userId - User ID
   * @param {string} usageType - Type of usage
   * @param {number} quantity - Quantity of usage
   * @param {string} description - Description of usage
   * @returns {Promise<object>} Created usage record
   */
  async recordEnterpriseUsage(userId, usageType, quantity = 1, description = null) {
    try {
      // Find the user's enterprise subscription
      const enterpriseSubscription = await prisma.enterpriseSubscription.findFirst({
        where: { userId },
        include: {
          enterprisePlan: {
            include: {
              usageQuotas: true
            }
          }
        }
      });
      
      if (!enterpriseSubscription) {
        throw new Error(`No enterprise subscription found for user ${userId}`);
      }
      
      // Check if this usage type has a quota defined
      const usageQuota = enterpriseSubscription.enterprisePlan.usageQuotas.find(
        quota => quota.usageType === usageType
      );
      
      if (!usageQuota) {
        throw new Error(`Usage type ${usageType} not defined for this enterprise plan`);
      }
      
      // Create the usage record
      const usageRecord = await prisma.usageRecord.create({
        data: {
          userId,
          subscriptionId: 0, // This will be ignored for enterprise users
          planId: enterpriseSubscription.enterprisePlan.planId,
          quantity,
          usageType,
          description,
          billingPeriodStart: new Date(), // This should be determined based on billing cycle
          billingPeriodEnd: enterpriseSubscription.enterprisePlan.nextBillingDate,
          processed: false,
          departmentId: enterpriseSubscription.departmentId,
          enterpriseSubscriptionId: enterpriseSubscription.id
        }
      });
      
      return usageRecord;
    } catch (error) {
      throw new Error(`Error recording enterprise usage: ${error.message}`);
    }
  }

  /**
   * Generate an enterprise invoice
   * @param {number} organizationId - Organization ID
   * @param {Date} billingPeriodStart - Start of billing period
   * @param {Date} billingPeriodEnd - End of billing period
   * @param {Date} dueDate - Due date for the invoice
   * @returns {Promise<object>} Created invoice
   */
  async generateEnterpriseInvoice(
    organizationId,
    billingPeriodStart,
    billingPeriodEnd,
    dueDate = null
  ) {
    try {
      // Get the organization
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          enterprisePlans: {
            include: {
              plan: true,
              usageQuotas: true,
              subscriptions: true
            }
          },
          departments: true
        }
      });
      
      if (!organization) {
        throw new Error(`Organization with ID ${organizationId} not found`);
      }
      
      // Calculate total amount
      let totalAmount = 0;
      const invoiceItems = [];
      
      // Add base subscription costs
      for (const enterprisePlan of organization.enterprisePlans) {
        const basePlanPrice = enterprisePlan.customPrice || 
          (enterprisePlan.plan.price * enterprisePlan.seats);
        
        const discountedPrice = enterprisePlan.volumeDiscount ? 
          basePlanPrice * (1 - enterprisePlan.volumeDiscount / 100) :
          basePlanPrice;
        
        totalAmount += discountedPrice;
        
        invoiceItems.push({
          type: 'subscription',
          description: `${enterprisePlan.plan.name} (${enterprisePlan.seats} seats)`,
          planId: enterprisePlan.planId,
          enterprisePlanId: enterprisePlan.id,
          baseAmount: basePlanPrice,
          discountAmount: basePlanPrice - discountedPrice,
          finalAmount: discountedPrice
        });
      }
      
      // Get all unprocessed usage records for the organization within the billing period
      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          processed: false,
          billingPeriodStart: {
            gte: billingPeriodStart
          },
          billingPeriodEnd: {
            lte: billingPeriodEnd
          },
          enterpriseSubscription: {
            enterprisePlan: {
              organizationId
            }
          }
        },
        include: {
          department: true,
          enterpriseSubscription: {
            include: {
              enterprisePlan: {
                include: {
                  usageQuotas: true
                }
              }
            }
          }
        }
      });
      
      // Group by usage type and department
      const usageByTypeAndDept = {};
      
      for (const record of usageRecords) {
        const key = `${record.usageType}_${record.departmentId || 'none'}`;
        
        if (!usageByTypeAndDept[key]) {
          usageByTypeAndDept[key] = {
            usageType: record.usageType,
            departmentId: record.departmentId,
            departmentName: record.department?.name || 'No Department',
            enterprisePlanId: record.enterpriseSubscription.enterprisePlanId,
            totalQuantity: 0,
            records: []
          };
        }
        
        usageByTypeAndDept[key].totalQuantity += record.quantity;
        usageByTypeAndDept[key].records.push(record);
      }
      
      // Calculate usage-based charges by checking against quotas
      for (const key in usageByTypeAndDept) {
        const usageGroup = usageByTypeAndDept[key];
        const enterprisePlan = organization.enterprisePlans.find(
          ep => ep.id === usageGroup.enterprisePlanId
        );
        
        if (!enterprisePlan) continue;
        
        const usageQuota = enterprisePlan.usageQuotas.find(
          q => q.usageType === usageGroup.usageType
        );
        
        if (!usageQuota || !usageQuota.unitPrice) continue;
        
        let overageQuantity = 0;
        
        if (usageQuota.pooled) {
          // Pooled quota for entire organization
          overageQuantity = Math.max(0, usageGroup.totalQuantity - usageQuota.totalQuota);
        } else {
          // Per-seat quota
          const seatsInDept = enterprisePlan.subscriptions.filter(
            s => s.departmentId === usageGroup.departmentId
          ).length;
          
          const deptQuota = (usageQuota.perSeatQuota || 0) * seatsInDept;
          overageQuantity = Math.max(0, usageGroup.totalQuantity - deptQuota);
        }
        
        if (overageQuantity > 0) {
          const overageAmount = overageQuantity * Number(usageQuota.unitPrice);
          totalAmount += overageAmount;
          
          invoiceItems.push({
            type: 'usage',
            description: `${usageGroup.usageType} usage overage (${usageGroup.departmentName})`,
            usageType: usageGroup.usageType,
            departmentId: usageGroup.departmentId,
            quantity: overageQuantity,
            unitPrice: Number(usageQuota.unitPrice),
            amount: overageAmount
          });
        }
        
        // Mark usage records as processed
        for (const record of usageGroup.records) {
          await prisma.usageRecord.update({
            where: { id: record.id },
            data: { processed: true }
          });
        }
      }
      
      // Create the invoice
      const invoice = await prisma.enterpriseInvoice.create({
        data: {
          organizationId,
          amount: totalAmount,
          status: 'draft',
          dueDate,
          billingPeriodStart,
          billingPeriodEnd,
          items: invoiceItems
        }
      });
      
      return invoice;
    } catch (error) {
      throw new Error(`Error generating enterprise invoice: ${error.message}`);
    }
  }
}

module.exports = new EnterpriseService();

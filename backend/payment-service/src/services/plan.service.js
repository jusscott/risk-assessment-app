const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service for handling payment plan operations
 */
class PlanService {
  /**
   * Get all available plans
   * @returns {Promise<Array>} List of plans
   */
  async getAllPlans() {
    try {
      const plans = await prisma.plan.findMany();
      return plans;
    } catch (error) {
      throw new Error(`Error fetching plans: ${error.message}`);
    }
  }

  /**
   * Get plan by ID
   * @param {number} id - Plan ID
   * @returns {Promise<object>} Plan object
   */
  async getPlanById(id) {
    try {
      const plan = await prisma.plan.findUnique({
        where: { id: parseInt(id) }
      });

      if (!plan) {
        throw new Error(`Plan with ID ${id} not found`);
      }

      return plan;
    } catch (error) {
      throw new Error(`Error fetching plan: ${error.message}`);
    }
  }

  /**
   * Create a new plan
   * @param {object} planData - Plan data object
   * @returns {Promise<object>} Created plan
   */
  async createPlan(planData) {
    try {
      const plan = await prisma.plan.create({
        data: planData
      });
      return plan;
    } catch (error) {
      throw new Error(`Error creating plan: ${error.message}`);
    }
  }

  /**
   * Update a plan
   * @param {number} id - Plan ID
   * @param {object} planData - Updated plan data
   * @returns {Promise<object>} Updated plan
   */
  async updatePlan(id, planData) {
    try {
      const updatedPlan = await prisma.plan.update({
        where: { id: parseInt(id) },
        data: planData
      });
      return updatedPlan;
    } catch (error) {
      throw new Error(`Error updating plan: ${error.message}`);
    }
  }

  /**
   * Delete a plan
   * @param {number} id - Plan ID
   * @returns {Promise<object>} Deleted plan
   */
  async deletePlan(id) {
    try {
      const deletedPlan = await prisma.plan.delete({
        where: { id: parseInt(id) }
      });
      return deletedPlan;
    } catch (error) {
      throw new Error(`Error deleting plan: ${error.message}`);
    }
  }
}

module.exports = new PlanService();

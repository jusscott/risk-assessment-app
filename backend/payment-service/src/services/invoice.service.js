const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service for handling invoice operations
 */
class InvoiceService {
  /**
   * Get all invoices for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of invoices
   */
  async getUserInvoices(userId) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      });
      return invoices;
    } catch (error) {
      throw new Error(`Error fetching invoices: ${error.message}`);
    }
  }

  /**
   * Get invoice by ID
   * @param {number} id - Invoice ID
   * @returns {Promise<object>} Invoice object
   */
  async getInvoiceById(id) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: parseInt(id) },
        include: { plan: true }
      });

      if (!invoice) {
        throw new Error(`Invoice with ID ${id} not found`);
      }

      return invoice;
    } catch (error) {
      throw new Error(`Error fetching invoice: ${error.message}`);
    }
  }

  /**
   * Create a new invoice
   * @param {string} userId - User ID
   * @param {number} planId - Plan ID
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<object>} Created invoice
   */
  async createInvoice(userId, planId, amount, currency, paymentIntentId = null) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId,
          planId,
          amount,
          currency,
          status: paymentIntentId ? 'pending' : 'pending',
          paymentIntentId
        }
      });
      return invoice;
    } catch (error) {
      throw new Error(`Error creating invoice: ${error.message}`);
    }
  }

  /**
   * Update invoice status
   * @param {number} id - Invoice ID
   * @param {string} status - New status ('pending', 'paid', 'failed')
   * @param {Date} paymentDate - Payment date (for 'paid' status)
   * @returns {Promise<object>} Updated invoice
   */
  async updateInvoiceStatus(id, status, paymentDate = null) {
    try {
      const data = { status };
      
      if (status === 'paid' && paymentDate) {
        data.paymentDate = paymentDate;
      }

      const invoice = await prisma.invoice.update({
        where: { id: parseInt(id) },
        data
      });
      return invoice;
    } catch (error) {
      throw new Error(`Error updating invoice status: ${error.message}`);
    }
  }

  /**
   * Update invoice payment intent
   * @param {number} id - Invoice ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {Array} items - Invoice line items
   * @param {Object} metadata - Additional invoice metadata
   * @returns {Promise<object>} Updated invoice
   */
  async updateInvoicePaymentIntent(id, paymentIntentId, items = null, metadata = null) {
    try {
      const data = {};
      
      if (paymentIntentId !== undefined) {
        data.paymentIntentId = paymentIntentId;
      }
      
      if (items !== null) {
        data.items = items;
      }
      
      if (metadata !== null) {
        data.metadata = metadata;
      }
      
      const invoice = await prisma.invoice.update({
        where: { id: parseInt(id) },
        data
      });
      return invoice;
    } catch (error) {
      throw new Error(`Error updating invoice payment intent: ${error.message}`);
    }
  }

  /**
   * Find invoice by payment intent ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<object|null>} Invoice object or null if not found
   */
  async findInvoiceByPaymentIntent(paymentIntentId) {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { paymentIntentId },
        include: { plan: true }
      });
      return invoice;
    } catch (error) {
      throw new Error(`Error finding invoice: ${error.message}`);
    }
  }
}

module.exports = new InvoiceService();

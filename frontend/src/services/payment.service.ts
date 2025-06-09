import api, { ApiResponse } from './api';

// Types
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isActive: boolean;
  stripeProductId: string;
  stripePriceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: Plan;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  planId: string;
  plan?: Plan;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  paymentIntentId: string | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CheckoutSession {
  sessionUrl: string;
  sessionId: string;
}

// Payment service for handling payment-related operations
const PaymentService = {
  // Plans
  getPlans: async (): Promise<Plan[]> => {
    const response = await api.get<Plan[]>('/plans');
    return response.data;
  },

  getPlanById: async (planId: string): Promise<Plan> => {
    const response = await api.get<Plan>(`/plans/${planId}`);
    return response.data;
  },

  // Subscriptions
  getCurrentSubscription: async (): Promise<Subscription | null> => {
    try {
      const response = await api.get<Subscription>('/payments/subscription/current');
      return response.data;
    } catch (error) {
      // If no subscription exists, return null
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  },

  createSubscriptionCheckout: async (planId: string): Promise<CheckoutSession> => {
    const response = await api.post<CheckoutSession>('/payments/subscription/create-checkout', { planId });
    return response.data;
  },

  cancelSubscription: async (subscriptionId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return api.post<{ success: boolean }>(`/payments/subscription/${subscriptionId}/cancel`);
  },

  // One-time payments
  createPaymentIntent: async (planId: string, amount: number): Promise<PaymentIntent> => {
    const response = await api.post<PaymentIntent>('/payments/create-payment-intent', { planId, amount });
    return response.data;
  },

  confirmPayment: async (paymentIntentId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return api.post<{ success: boolean }>('/payments/confirm-payment', { paymentIntentId });
  },

  // Invoices
  getUserInvoices: async (): Promise<Invoice[]> => {
    const response = await api.get<Invoice[]>('/invoices/user/me');
    return response.data;
  },

  getInvoiceById: async (invoiceId: string): Promise<Invoice> => {
    const response = await api.get<Invoice>(`/invoices/${invoiceId}`);
    return response.data;
  },
};

export default PaymentService;

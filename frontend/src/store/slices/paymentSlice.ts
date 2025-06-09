import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import PaymentService, { 
  Plan, 
  Subscription, 
  Invoice, 
  PaymentIntent, 
  CheckoutSession 
} from '../../services/payment.service';
import { RootState } from '../index';

// Types
interface PaymentState {
  plans: Plan[];
  currentSubscription: Subscription | null;
  invoices: Invoice[];
  currentPaymentIntent: PaymentIntent | null;
  checkoutSession: CheckoutSession | null;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: PaymentState = {
  plans: [],
  currentSubscription: null,
  invoices: [],
  currentPaymentIntent: null,
  checkoutSession: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchPlans = createAsyncThunk(
  'payment/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      return await PaymentService.getPlans();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch plans');
    }
  }
);

export const fetchCurrentSubscription = createAsyncThunk(
  'payment/fetchCurrentSubscription',
  async (_, { rejectWithValue }) => {
    try {
      return await PaymentService.getCurrentSubscription();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch current subscription');
    }
  }
);

export const fetchInvoices = createAsyncThunk(
  'payment/fetchInvoices',
  async (_, { rejectWithValue }) => {
    try {
      return await PaymentService.getUserInvoices();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invoices');
    }
  }
);

export const createSubscription = createAsyncThunk(
  'payment/createSubscription',
  async (planId: string, { rejectWithValue }) => {
    try {
      return await PaymentService.createSubscriptionCheckout(planId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create subscription');
    }
  }
);

export const cancelCurrentSubscription = createAsyncThunk(
  'payment/cancelSubscription',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const subscription = state.payment.currentSubscription;
      
      if (!subscription) {
        return rejectWithValue('No active subscription found');
      }
      
      await PaymentService.cancelSubscription(subscription.id);
      return subscription.id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cancel subscription');
    }
  }
);

export const createPaymentIntent = createAsyncThunk(
  'payment/createPaymentIntent',
  async ({ planId, amount }: { planId: string; amount: number }, { rejectWithValue }) => {
    try {
      return await PaymentService.createPaymentIntent(planId, amount);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create payment intent');
    }
  }
);

export const confirmPayment = createAsyncThunk(
  'payment/confirmPayment',
  async (paymentIntentId: string, { rejectWithValue }) => {
    try {
      const response = await PaymentService.confirmPayment(paymentIntentId);
      return { success: response.success };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to confirm payment');
    }
  }
);

// Slice
const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPaymentIntent: (state) => {
      state.currentPaymentIntent = null;
    },
    clearCheckoutSession: (state) => {
      state.checkoutSession = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch plans
      .addCase(fetchPlans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPlans.fulfilled, (state, action: PayloadAction<Plan[]>) => {
        state.isLoading = false;
        state.plans = action.payload;
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch plans';
      })
      
      // Fetch current subscription
      .addCase(fetchCurrentSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentSubscription.fulfilled, (state, action: PayloadAction<Subscription | null>) => {
        state.isLoading = false;
        state.currentSubscription = action.payload;
      })
      .addCase(fetchCurrentSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch current subscription';
      })
      
      // Fetch invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action: PayloadAction<Invoice[]>) => {
        state.isLoading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch invoices';
      })
      
      // Create subscription
      .addCase(createSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action: PayloadAction<CheckoutSession>) => {
        state.isLoading = false;
        state.checkoutSession = action.payload;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to create subscription';
      })
      
      // Cancel subscription
      .addCase(cancelCurrentSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelCurrentSubscription.fulfilled, (state) => {
        state.isLoading = false;
        if (state.currentSubscription) {
          state.currentSubscription.cancelAtPeriodEnd = true;
        }
      })
      .addCase(cancelCurrentSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to cancel subscription';
      })
      
      // Create payment intent
      .addCase(createPaymentIntent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPaymentIntent.fulfilled, (state, action: PayloadAction<PaymentIntent>) => {
        state.isLoading = false;
        state.currentPaymentIntent = action.payload;
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to create payment intent';
      })
      
      // Confirm payment
      .addCase(confirmPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmPayment.fulfilled, (state) => {
        state.isLoading = false;
        state.currentPaymentIntent = null;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to confirm payment';
      });
  },
});

export const { clearError, clearPaymentIntent, clearCheckoutSession } = paymentSlice.actions;

export default paymentSlice.reducer;

// Selectors
export const selectPlans = (state: RootState) => state.payment.plans;
export const selectCurrentSubscription = (state: RootState) => state.payment.currentSubscription;
export const selectInvoices = (state: RootState) => state.payment.invoices;
export const selectCurrentPaymentIntent = (state: RootState) => state.payment.currentPaymentIntent;
export const selectCheckoutSession = (state: RootState) => state.payment.checkoutSession;
export const selectPaymentLoading = (state: RootState) => state.payment.isLoading;
export const selectPaymentError = (state: RootState) => state.payment.error;

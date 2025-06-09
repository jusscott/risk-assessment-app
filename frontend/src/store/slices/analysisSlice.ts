import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisResult, AnalysisRequest, analysisService } from '../../services/analysis.service';
import { RootState } from '../index';

// Types
interface AnalysisState {
  analyses: AnalysisResult[];
  currentAnalysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  generatedReportId: number | null;
}

// Initial state
const initialState: AnalysisState = {
  analyses: [],
  currentAnalysis: null,
  loading: false,
  error: null,
  generatedReportId: null
};

// Async thunks
export const fetchAnalyses = createAsyncThunk(
  'analyses/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await analysisService.getAnalyses();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analyses');
    }
  }
);

export const fetchAnalysisById = createAsyncThunk(
  'analyses/fetchById',
  async (analysisId: number, { rejectWithValue }) => {
    try {
      return await analysisService.getAnalysisById(analysisId);
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to fetch analysis ${analysisId}`);
    }
  }
);

export const fetchAnalysesBySubmission = createAsyncThunk(
  'analyses/fetchBySubmission',
  async (submissionId: number, { rejectWithValue }) => {
    try {
      return await analysisService.getAnalysesBySubmission(submissionId);
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to fetch analyses for submission ${submissionId}`);
    }
  }
);

export const requestAnalysis = createAsyncThunk(
  'analyses/request',
  async (data: AnalysisRequest, { rejectWithValue }) => {
    try {
      return await analysisService.requestAnalysis(data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to request analysis');
    }
  }
);

export const generateReport = createAsyncThunk(
  'analyses/generateReport',
  async (analysisId: number, { rejectWithValue }) => {
    try {
      const response = await analysisService.generateReport(analysisId);
      return response.data.reportId;
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to generate report for analysis ${analysisId}`);
    }
  }
);

// Slice
const analysisSlice = createSlice({
  name: 'analyses',
  initialState,
  reducers: {
    clearCurrentAnalysis: (state) => {
      state.currentAnalysis = null;
    },
    clearGeneratedReportId: (state) => {
      state.generatedReportId = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all analyses
      .addCase(fetchAnalyses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalyses.fulfilled, (state, action: PayloadAction<AnalysisResult[]>) => {
        state.loading = false;
        state.analyses = action.payload;
      })
      .addCase(fetchAnalyses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch analysis by ID
      .addCase(fetchAnalysisById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalysisById.fulfilled, (state, action: PayloadAction<AnalysisResult>) => {
        state.loading = false;
        state.currentAnalysis = action.payload;
      })
      .addCase(fetchAnalysisById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch analyses by submission
      .addCase(fetchAnalysesBySubmission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalysesBySubmission.fulfilled, (state, action: PayloadAction<AnalysisResult[]>) => {
        state.loading = false;
        state.analyses = action.payload;
      })
      .addCase(fetchAnalysesBySubmission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Request analysis
      .addCase(requestAnalysis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestAnalysis.fulfilled, (state, action: PayloadAction<AnalysisResult>) => {
        state.loading = false;
        state.currentAnalysis = action.payload;
        state.analyses = [...state.analyses, action.payload];
      })
      .addCase(requestAnalysis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Generate report
      .addCase(generateReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.generatedReportId = action.payload;
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Actions
export const { clearCurrentAnalysis, clearGeneratedReportId, clearError } = analysisSlice.actions;

// Selectors
export const selectAnalyses = (state: RootState) => state.analyses.analyses;
export const selectCurrentAnalysis = (state: RootState) => state.analyses.currentAnalysis;
export const selectAnalysisLoading = (state: RootState) => state.analyses.loading;
export const selectAnalysisError = (state: RootState) => state.analyses.error;
export const selectGeneratedReportId = (state: RootState) => state.analyses.generatedReportId;

export default analysisSlice.reducer;

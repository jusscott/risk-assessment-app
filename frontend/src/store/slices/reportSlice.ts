import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Report, ReportIssue, ReportSharingLink } from '../../services/report.service';
import reportsWrapper from '../../services/reports-wrapper';
import { RootState } from '../index';

// Types
interface ReportState {
  reports: Report[];
  currentReport: Report | null;
  reportIssues: ReportIssue[];
  sharingLinks: ReportSharingLink[];
  loading: boolean;
  error: string | null;
  downloadUrl: string | null;
}

// Initial state
const initialState: ReportState = {
  reports: [],
  currentReport: null,
  reportIssues: [],
  sharingLinks: [],
  loading: false,
  error: null,
  downloadUrl: null
};

// Async thunks
export const fetchReports = createAsyncThunk(
  'reports/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await reportsWrapper.getReports();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch reports');
    }
  }
);

export const fetchReportById = createAsyncThunk(
  'reports/fetchById',
  async (reportId: number, { rejectWithValue }) => {
    try {
      return await reportsWrapper.getReportById(reportId);
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to fetch report ${reportId}`);
    }
  }
);

export const fetchReportIssues = createAsyncThunk(
  'reports/fetchIssues',
  async (reportId: number, { rejectWithValue }) => {
    try {
      return await reportsWrapper.getReportIssues(reportId);
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to fetch issues for report ${reportId}`);
    }
  }
);

export const generateReportDownloadUrl = createAsyncThunk(
  'reports/generateDownloadUrl',
  async (reportId: number, { rejectWithValue }) => {
    try {
      const url = await reportsWrapper.getReportDownloadUrl(reportId);
      return url;
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to generate download URL for report ${reportId}`);
    }
  }
);

export const createSharingLink = createAsyncThunk(
  'reports/createSharingLink',
  async ({ reportId, expiresInDays }: { reportId: number, expiresInDays?: number }, { rejectWithValue }) => {
    try {
      return await reportsWrapper.createSharingLink(reportId, expiresInDays);
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to create sharing link for report ${reportId}`);
    }
  }
);

export const deleteSharingLink = createAsyncThunk(
  'reports/deleteSharingLink',
  async (linkId: string, { rejectWithValue }) => {
    try {
      await reportsWrapper.deleteSharingLink(linkId);
      return linkId;
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to delete sharing link ${linkId}`);
    }
  }
);

export const fetchSharingLinks = createAsyncThunk(
  'reports/fetchSharingLinks',
  async (reportId: number, { rejectWithValue }) => {
    try {
      return await reportsWrapper.getSharingLinks(reportId);
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to fetch sharing links for report ${reportId}`);
    }
  }
);

export const emailReport = createAsyncThunk(
  'reports/emailReport',
  async ({ reportId, emails }: { reportId: number, emails: string[] }, { rejectWithValue }) => {
    try {
      await reportsWrapper.emailReport(reportId, emails);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || `Failed to email report ${reportId}`);
    }
  }
);

// Slice
const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearCurrentReport: (state) => {
      state.currentReport = null;
      state.reportIssues = [];
    },
    clearDownloadUrl: (state) => {
      state.downloadUrl = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch reports
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action: PayloadAction<Report[]>) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch report by ID
      .addCase(fetchReportById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action: PayloadAction<Report>) => {
        state.loading = false;
        state.currentReport = action.payload;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch report issues
      .addCase(fetchReportIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportIssues.fulfilled, (state, action: PayloadAction<ReportIssue[]>) => {
        state.loading = false;
        state.reportIssues = action.payload;
      })
      .addCase(fetchReportIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Generate download URL
      .addCase(generateReportDownloadUrl.fulfilled, (state, action: PayloadAction<string>) => {
        state.downloadUrl = action.payload;
      })

      // Sharing links
      .addCase(createSharingLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSharingLink.fulfilled, (state, action: PayloadAction<ReportSharingLink>) => {
        state.loading = false;
        state.sharingLinks = [...state.sharingLinks, action.payload];
      })
      .addCase(createSharingLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteSharingLink.fulfilled, (state, action: PayloadAction<string>) => {
        state.sharingLinks = state.sharingLinks.filter(link => link.id !== action.payload);
      })
      .addCase(fetchSharingLinks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSharingLinks.fulfilled, (state, action: PayloadAction<ReportSharingLink[]>) => {
        state.loading = false;
        state.sharingLinks = action.payload;
      })
      .addCase(fetchSharingLinks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Email report
      .addCase(emailReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(emailReport.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(emailReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Actions
export const { clearCurrentReport, clearDownloadUrl, clearError } = reportSlice.actions;

// Selectors
export const selectReports = (state: RootState) => state.reports.reports;
export const selectCurrentReport = (state: RootState) => state.reports.currentReport;
export const selectReportIssues = (state: RootState) => state.reports.reportIssues;
export const selectReportLoading = (state: RootState) => state.reports.loading;
export const selectReportError = (state: RootState) => state.reports.error;
export const selectDownloadUrl = (state: RootState) => state.reports.downloadUrl;
export const selectSharingLinks = (state: RootState) => state.reports.sharingLinks;

export default reportSlice.reducer;

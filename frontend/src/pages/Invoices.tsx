import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchInvoices,
  selectInvoices,
  selectPaymentLoading,
  selectPaymentError
} from '../store/slices/paymentSlice';
import { Invoice } from '../services/payment.service';

const Invoices: React.FC = () => {
  const dispatch = useAppDispatch();
  const invoices = useAppSelector(selectInvoices);
  const isLoading = useAppSelector(selectPaymentLoading);
  const error = useAppSelector(selectPaymentError);

  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100); // Convert cents to dollars
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // In a production app, this would download the invoice PDF
    // For now, we'll just show an alert
    alert(`Downloading invoice #${invoice.id} (This is a placeholder. In a real app, this would download a PDF.)`);
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Billing History
      </Typography>
      
      <Typography variant="body1" gutterBottom sx={{ mb: 4 }}>
        View and download your billing history
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      ) : invoices.length > 0 ? (
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Invoice Date</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {formatDate(invoice.createdAt)}
                  </TableCell>
                  <TableCell>{invoice.plan?.name || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={invoice.status} 
                      color={getStatusChipColor(invoice.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{formatDate(invoice.paymentDate || '')}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadInvoice(invoice)}
                      disabled={invoice.status !== 'paid'}
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            You don't have any invoices yet. They will appear here once you subscribe to a plan.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Invoices;

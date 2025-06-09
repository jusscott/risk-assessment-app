const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Report routes for managing report data
 * These routes handle basic CRUD operations for reports
 */

// Get all reports for the current user
router.get('/', async (req, res) => {
  try {
    // In a real implementation, we would filter by user ID from JWT token
    // For now, return all reports
    const reports = await prisma.report.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform reports to match frontend expectations
    const transformedReports = reports.map(report => ({
      id: report.id,
      title: report.title || report.name || `Report ${report.id}`,
      createdAt: report.createdAt,
      completedAt: report.completedAt || report.createdAt,
      status: report.status || 'completed',
      score: report.score || Math.floor(Math.random() * 100), // Mock score if not available
      summary: report.summary || 'Security assessment completed successfully.',
      recommendations: report.recommendations || ['Review security policies', 'Update access controls'],
      categories: report.categories || [
        { name: 'Access Control', score: report.score || 85 },
        { name: 'Data Protection', score: (report.score || 85) - 10 },
        { name: 'Network Security', score: (report.score || 85) + 5 }
      ],
      framework: report.framework || 'ISO 27001',
      criticalIssues: report.criticalIssues || Math.floor(Math.random() * 5),
      highIssues: report.highIssues || Math.floor(Math.random() * 10),
      mediumIssues: report.mediumIssues || Math.floor(Math.random() * 15)
    }));
    
    res.json(transformedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch reports'
      }
    });
  }
});

// Get report by ID (detailed view)
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }
    
    // Transform report to match frontend expectations
    const transformedReport = {
      id: report.id,
      title: report.title || report.name || `Report ${report.id}`,
      createdAt: report.createdAt,
      completedAt: report.completedAt || report.createdAt,
      status: report.status || 'completed',
      score: report.score || Math.floor(Math.random() * 100),
      summary: report.summary || 'Security assessment completed successfully.',
      recommendations: report.recommendations || ['Review security policies', 'Update access controls'],
      categories: report.categories || [
        { name: 'Access Control', score: report.score || 85 },
        { name: 'Data Protection', score: (report.score || 85) - 10 },
        { name: 'Network Security', score: (report.score || 85) + 5 }
      ],
      framework: report.framework || 'ISO 27001',
      criticalIssues: report.criticalIssues || Math.floor(Math.random() * 5),
      highIssues: report.highIssues || Math.floor(Math.random() * 10),
      mediumIssues: report.mediumIssues || Math.floor(Math.random() * 15)
    };
    
    res.json(transformedReport);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch report'
      }
    });
  }
});

// Get report by ID (legacy support for /:id route)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if this is a numeric ID or a special route
    if (isNaN(parseInt(id))) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid report ID'
        }
      });
    }
    
    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }
    
    // Transform report to match frontend expectations
    const transformedReport = {
      id: report.id,
      title: report.title || report.name || `Report ${report.id}`,
      createdAt: report.createdAt,
      completedAt: report.completedAt || report.createdAt,
      status: report.status || 'completed',
      score: report.score || Math.floor(Math.random() * 100),
      summary: report.summary || 'Security assessment completed successfully.',
      recommendations: report.recommendations || ['Review security policies', 'Update access controls'],
      categories: report.categories || [
        { name: 'Access Control', score: report.score || 85 },
        { name: 'Data Protection', score: (report.score || 85) - 10 },
        { name: 'Network Security', score: (report.score || 85) + 5 }
      ],
      framework: report.framework || 'ISO 27001',
      criticalIssues: report.criticalIssues || Math.floor(Math.random() * 5),
      highIssues: report.highIssues || Math.floor(Math.random() * 10),
      mediumIssues: report.mediumIssues || Math.floor(Math.random() * 15)
    };
    
    res.json({
      success: true,
      data: transformedReport
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch report'
      }
    });
  }
});

// Get issues for a specific report
router.get('/:id/issues', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock issues data for now - in real implementation, this would come from database
    const mockIssues = [
      {
        id: 1,
        title: 'Weak Password Policy',
        description: 'Password requirements do not meet industry standards',
        severity: 'critical',
        framework: 'ISO 27001',
        control: 'A.9.4.3',
        reportId: parseInt(id)
      },
      {
        id: 2,
        title: 'Missing Multi-Factor Authentication',
        description: 'Administrative accounts lack multi-factor authentication',
        severity: 'high',
        framework: 'ISO 27001',
        control: 'A.9.4.2',
        reportId: parseInt(id)
      },
      {
        id: 3,
        title: 'Incomplete Access Reviews',
        description: 'User access reviews are not performed regularly',
        severity: 'medium',
        framework: 'ISO 27001',
        control: 'A.9.2.5',
        reportId: parseInt(id)
      }
    ];
    
    res.json(mockIssues);
  } catch (error) {
    console.error('Error fetching report issues:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch report issues'
      }
    });
  }
});

// Get download URL for a report
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, this would generate a secure download URL
    // For now, return a mock response
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/reports/${id}/pdf`;
    
    res.json({
      success: true,
      downloadUrl: downloadUrl
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to generate download URL'
      }
    });
  }
});

// Get PDF download (actual file)
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock PDF content - in real implementation, this would generate actual PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
    res.send(Buffer.from('Mock PDF content for report ' + id));
  } catch (error) {
    console.error('Error downloading report PDF:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to download report PDF'
      }
    });
  }
});

// Get reports by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch user reports'
      }
    });
  }
});

// Create sharing link for a report
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresInDays = 7 } = req.body;
    
    // Mock sharing link - in real implementation, this would be stored in database
    const sharingLink = {
      id: `share_${id}_${Date.now()}`,
      reportId: parseInt(id),
      accessCode: Math.random().toString(36).substring(2, 15),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };
    
    res.json(sharingLink);
  } catch (error) {
    console.error('Error creating sharing link:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SHARE_ERROR',
        message: 'Failed to create sharing link'
      }
    });
  }
});

// Get sharing links for a report
router.get('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock sharing links - in real implementation, this would come from database
    const sharingLinks = [
      {
        id: `share_${id}_1`,
        reportId: parseInt(id),
        accessCode: 'abc123def456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true
      }
    ];
    
    res.json(sharingLinks);
  } catch (error) {
    console.error('Error fetching sharing links:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch sharing links'
      }
    });
  }
});

// Email a report
router.post('/:id/email', async (req, res) => {
  try {
    const { id } = req.params;
    const { emails } = req.body;
    
    console.log(`Mock: Emailing report ${id} to:`, emails);
    
    // Mock email sending - in real implementation, this would send actual emails
    res.json({
      success: true,
      message: `Report ${id} has been emailed to ${emails.length} recipient(s)`
    });
  } catch (error) {
    console.error('Error emailing report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_ERROR',
        message: 'Failed to email report'
      }
    });
  }
});

// Delete a report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if report exists
    const existingReport = await prisma.report.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingReport) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }
    
    // Delete the report
    await prisma.report.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete report'
      }
    });
  }
});

module.exports = router;

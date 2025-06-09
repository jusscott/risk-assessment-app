/**
 * Prisma seed script for report-service
 * Creates initial data for the report service database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Ensure report storage directory exists
const ensureReportDir = () => {
  const reportDir = path.join(__dirname, '../storage/reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  return reportDir;
};

async function seed() {
  console.log('Seeding report service database...');
  
  try {
    const reportDir = ensureReportDir();
    
    // Create report template
    const template = await prisma.reportTemplate.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Standard Risk Assessment Report',
        description: 'Default template for security risk assessment reports'
      }
    });
    
    console.log(`Created report template: ${template.name}`);
    
    // Create sample reports if in development mode
    if (process.env.NODE_ENV === 'development') {
      // Create a sample PDF file for testing
      const samplePdfPath = path.join(reportDir, 'sample-report.pdf');
      if (!fs.existsSync(samplePdfPath)) {
        // Create a minimal valid PDF file for testing
        fs.writeFileSync(samplePdfPath, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>\nendobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n');
      }

      // Sample user IDs
      const userIds = ['user123', 'user456'];
      
      // Create sample reports with realistic data
      const frameworks = ['ISO 27001', 'SOC 2', 'HIPAA'];
      const sampleScores = [92, 78, 85];
      
      for (let i = 0; i < 3; i++) {
        const userId = userIds[i % userIds.length];
        const score = sampleScores[i];
        const framework = frameworks[i];
        
        const report = await prisma.report.upsert({
          where: { id: i + 1 },
          update: {},
          create: {
            userId: userId,
            analysisId: i + 100,  // Just sample IDs
            title: `${framework} Security Assessment Report`,
            name: `${framework} Assessment ${i + 1}`,
            description: `Comprehensive security risk assessment based on ${framework} compliance framework`,
            summary: `This security assessment evaluated your organization's compliance with ${framework} standards. The assessment identified key areas for improvement and provides actionable recommendations to enhance your security posture.`,
            framework: framework,
            score: score,
            criticalIssues: Math.max(0, Math.floor((100 - score) / 20)),
            highIssues: Math.max(0, Math.floor((100 - score) / 15)),
            mediumIssues: Math.max(0, Math.floor((100 - score) / 10)),
            recommendations: [
              'Implement multi-factor authentication for all administrative accounts',
              'Establish regular security awareness training programs', 
              'Conduct quarterly vulnerability assessments',
              'Update incident response procedures',
              'Review and update access control policies'
            ],
            categories: [
              { name: 'Access Control', score: Math.round(score + Math.random() * 10 - 5) },
              { name: 'Data Protection', score: Math.round(score + Math.random() * 10 - 5) },
              { name: 'Network Security', score: Math.round(score + Math.random() * 10 - 5) },
              { name: 'Physical Security', score: Math.round(score + Math.random() * 10 - 5) },
              { name: 'Incident Response', score: Math.round(score + Math.random() * 10 - 5) }
            ],
            filePath: samplePdfPath,
            fileName: `${framework.toLowerCase().replace(/\s+/g, '-')}-report-${i + 1}.pdf`,
            accessCode: `${framework.substring(0, 3).toUpperCase()}${i + 1}${Date.now().toString().slice(-3)}`,
            isPublic: i % 2 === 0,
            status: 'completed',
            completedAt: moment().subtract(i, 'days').toDate(),
            expiresAt: moment().add(30, 'days').toDate(),
            sections: {
              create: [
                {
                  title: 'Executive Summary',
                  content: `This ${framework} assessment achieved an overall score of ${score}%. The evaluation covered key security controls and identified areas for improvement.`,
                  order: 1
                },
                {
                  title: 'Key Findings',
                  content: `The assessment identified ${Math.max(0, Math.floor((100 - score) / 20))} critical issues, ${Math.max(0, Math.floor((100 - score) / 15))} high-priority issues, and ${Math.max(0, Math.floor((100 - score) / 10))} medium-priority issues that require attention.`,
                  order: 2
                },
                {
                  title: 'Recommendations',
                  content: 'Based on our assessment, we recommend prioritizing the implementation of multi-factor authentication and establishing regular security training programs.',
                  order: 3
                },
                {
                  title: 'Compliance Status',
                  content: `Your organization demonstrates ${score >= 80 ? 'strong' : score >= 60 ? 'moderate' : 'limited'} compliance with ${framework} requirements.`,
                  order: 4
                }
              ]
            }
          }
        });
        
        console.log(`Created sample report: ${report.title} (Score: ${score}%)`);
      }
    }
    
    console.log('Report service database seeding completed.');
  } catch (error) {
    console.error('Error seeding report service database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

/**
 * Seed script for industry benchmark data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding industry benchmark data...');

  // Create industries
  const industries = [
    {
      name: 'Technology',
      description: 'Software development, IT services, and tech companies'
    },
    {
      name: 'Healthcare',
      description: 'Healthcare providers, medical services, and healthcare technology'
    },
    {
      name: 'Finance',
      description: 'Banking, insurance, investment, and financial services'
    },
    {
      name: 'Manufacturing',
      description: 'Production, assembly, and manufacturing industries'
    },
    {
      name: 'Retail',
      description: 'Retail stores, e-commerce, and consumer goods'
    }
  ];

  // Insert industries
  for (const industry of industries) {
    await prisma.industry.upsert({
      where: { name: industry.name },
      update: {},
      create: industry
    });
  }

  console.log('Industries created successfully');

  // Get inserted industries for reference
  const technologyIndustry = await prisma.industry.findUnique({ where: { name: 'Technology' } });
  const healthcareIndustry = await prisma.industry.findUnique({ where: { name: 'Healthcare' } });
  const financeIndustry = await prisma.industry.findUnique({ where: { name: 'Finance' } });
  const manufacturingIndustry = await prisma.industry.findUnique({ where: { name: 'Manufacturing' } });
  const retailIndustry = await prisma.industry.findUnique({ where: { name: 'Retail' } });

  // Create benchmark data for each industry and framework
  const benchmarkData = [
    // ISO27001 benchmarks for Technology
    {
      industryId: technologyIndustry.id,
      frameworkId: 'iso27001',
      area: 'Access Control',
      averageScore: 7.2,
      medianScore: 7.5,
      sampleSize: 156
    },
    {
      industryId: technologyIndustry.id,
      frameworkId: 'iso27001',
      area: 'Data Protection',
      averageScore: 7.8,
      medianScore: 8.0,
      sampleSize: 156
    },
    {
      industryId: technologyIndustry.id,
      frameworkId: 'iso27001',
      area: 'Network Security',
      averageScore: 8.1,
      medianScore: 8.3,
      sampleSize: 156
    },
    {
      industryId: technologyIndustry.id,
      frameworkId: 'iso27001',
      area: 'Application Security',
      averageScore: 7.5,
      medianScore: 7.8,
      sampleSize: 156
    },
    {
      industryId: technologyIndustry.id,
      frameworkId: 'iso27001',
      area: 'Security Awareness',
      averageScore: 6.9,
      medianScore: 7.2,
      sampleSize: 156
    },
    
    // SOC2 benchmarks for Technology
    {
      industryId: technologyIndustry.id,
      frameworkId: 'soc2',
      area: 'Access Control',
      averageScore: 7.4,
      medianScore: 7.6,
      sampleSize: 132
    },
    {
      industryId: technologyIndustry.id,
      frameworkId: 'soc2',
      area: 'Data Protection',
      averageScore: 7.9,
      medianScore: 8.2,
      sampleSize: 132
    },
    {
      industryId: technologyIndustry.id,
      frameworkId: 'soc2',
      area: 'Network Security',
      averageScore: 8.0,
      medianScore: 8.2,
      sampleSize: 132
    },
    
    // ISO27001 benchmarks for Healthcare
    {
      industryId: healthcareIndustry.id,
      frameworkId: 'iso27001',
      area: 'Access Control',
      averageScore: 6.8,
      medianScore: 7.0,
      sampleSize: 104
    },
    {
      industryId: healthcareIndustry.id,
      frameworkId: 'iso27001',
      area: 'Data Protection',
      averageScore: 7.5,
      medianScore: 7.7,
      sampleSize: 104
    },
    {
      industryId: healthcareIndustry.id,
      frameworkId: 'iso27001',
      area: 'Network Security',
      averageScore: 6.9,
      medianScore: 7.1,
      sampleSize: 104
    },
    
    // HIPAA benchmarks for Healthcare
    {
      industryId: healthcareIndustry.id,
      frameworkId: 'hipaa',
      area: 'Access Control',
      averageScore: 7.1,
      medianScore: 7.3,
      sampleSize: 98
    },
    {
      industryId: healthcareIndustry.id,
      frameworkId: 'hipaa',
      area: 'Data Protection',
      averageScore: 7.8,
      medianScore: 8.0,
      sampleSize: 98
    },
    {
      industryId: healthcareIndustry.id,
      frameworkId: 'hipaa',
      area: 'Network Security',
      averageScore: 7.0,
      medianScore: 7.2,
      sampleSize: 98
    },
    
    // PCI-DSS benchmarks for Finance
    {
      industryId: financeIndustry.id,
      frameworkId: 'pci-dss',
      area: 'Access Control',
      averageScore: 8.1,
      medianScore: 8.4,
      sampleSize: 87
    },
    {
      industryId: financeIndustry.id,
      frameworkId: 'pci-dss',
      area: 'Data Protection',
      averageScore: 8.5,
      medianScore: 8.7,
      sampleSize: 87
    },
    {
      industryId: financeIndustry.id,
      frameworkId: 'pci-dss',
      area: 'Network Security',
      averageScore: 8.3,
      medianScore: 8.5,
      sampleSize: 87
    },
    
    // ISO27001 benchmarks for Manufacturing
    {
      industryId: manufacturingIndustry.id,
      frameworkId: 'iso27001',
      area: 'Access Control',
      averageScore: 6.2,
      medianScore: 6.5,
      sampleSize: 78
    },
    {
      industryId: manufacturingIndustry.id,
      frameworkId: 'iso27001',
      area: 'Data Protection',
      averageScore: 6.7,
      medianScore: 6.9,
      sampleSize: 78
    },
    {
      industryId: manufacturingIndustry.id,
      frameworkId: 'iso27001',
      area: 'Network Security',
      averageScore: 6.5,
      medianScore: 6.7,
      sampleSize: 78
    },
    
    // NIST benchmarks for Manufacturing
    {
      industryId: manufacturingIndustry.id,
      frameworkId: 'nist',
      area: 'Access Control',
      averageScore: 6.4,
      medianScore: 6.6,
      sampleSize: 65
    },
    {
      industryId: manufacturingIndustry.id,
      frameworkId: 'nist',
      area: 'Data Protection',
      averageScore: 6.8,
      medianScore: 7.0,
      sampleSize: 65
    },
    {
      industryId: manufacturingIndustry.id,
      frameworkId: 'nist',
      area: 'Network Security',
      averageScore: 6.6,
      medianScore: 6.8,
      sampleSize: 65
    },
    
    // PCI-DSS benchmarks for Retail
    {
      industryId: retailIndustry.id,
      frameworkId: 'pci-dss',
      area: 'Access Control',
      averageScore: 7.0,
      medianScore: 7.2,
      sampleSize: 92
    },
    {
      industryId: retailIndustry.id,
      frameworkId: 'pci-dss',
      area: 'Data Protection',
      averageScore: 7.4,
      medianScore: 7.6,
      sampleSize: 92
    },
    {
      industryId: retailIndustry.id,
      frameworkId: 'pci-dss',
      area: 'Network Security',
      averageScore: 7.2,
      medianScore: 7.4,
      sampleSize: 92
    }
  ];

  // Insert benchmark data with upsert to avoid duplicates
  for (const benchmark of benchmarkData) {
    await prisma.industryBenchmark.upsert({
      where: { 
        industryId_frameworkId_area: {
          industryId: benchmark.industryId,
          frameworkId: benchmark.frameworkId,
          area: benchmark.area
        }
      },
      update: benchmark,
      create: benchmark
    });
  }

  console.log('Benchmark data seeded successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding benchmark data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

// Database configuration from docker-compose.yml
const DATABASE_URL = "postgresql://risk_assessment_user:secure_password_2024@localhost:5432/risk_assessment_db";

async function checkUserQuestionnaireStatus() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: DATABASE_URL
            }
        }
    });

    const targetEmail = 'jusscott@gmail.com';
    
    try {
        console.log(`\n=== Checking Questionnaire Status for User: ${targetEmail} ===\n`);

        // First, check if the user exists
        const user = await prisma.user.findUnique({
            where: { email: targetEmail },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        });

        if (!user) {
            console.log(`❌ User ${targetEmail} not found in database`);
            return;
        }

        console.log(`✅ User Found:`);
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Name: ${user.firstName} ${user.lastName}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Created: ${user.createdAt}`);

        // Check for questionnaire submissions
        const submissions = await prisma.submission.findMany({
            where: { userId: user.id },
            include: {
                template: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                answers: {
                    include: {
                        question: {
                            select: {
                                id: true,
                                text: true,
                                questionNumber: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`\n📊 Questionnaire Submissions Found: ${submissions.length}`);

        if (submissions.length === 0) {
            console.log(`\n📝 No questionnaires found for ${targetEmail}`);
            console.log(`   - Status: No pending or completed questionnaires`);
            return;
        }

        // Analyze each submission
        let completedCount = 0;
        let pendingCount = 0;

        submissions.forEach((submission, index) => {
            console.log(`\n--- Submission ${index + 1} ---`);
            console.log(`📋 Template: ${submission.template.name}`);
            console.log(`🆔 Submission ID: ${submission.id}`);
            console.log(`📅 Started: ${submission.createdAt}`);
            console.log(`📝 Last Updated: ${submission.updatedAt}`);
            console.log(`📊 Status: ${submission.status}`);
            console.log(`🔢 Answers Provided: ${submission.answers.length}`);

            // Calculate progress
            const totalQuestions = submission.template.description ? 
                parseInt(submission.template.description.match(/(\d+)/)?.[1] || '0') : 0;
            
            if (totalQuestions > 0) {
                const progressPercentage = Math.round((submission.answers.length / totalQuestions) * 100);
                console.log(`📈 Progress: ${progressPercentage}% (${submission.answers.length}/${totalQuestions} questions)`);
            }

            // Categorize submission
            if (submission.status === 'COMPLETED' || submission.status === 'SUBMITTED') {
                completedCount++;
                console.log(`✅ Status: COMPLETED`);
            } else if (submission.status === 'IN_PROGRESS' || submission.answers.length > 0) {
                pendingCount++;
                console.log(`⏳ Status: PENDING (In Progress)`);
            } else {
                pendingCount++;
                console.log(`📝 Status: PENDING (Not Started)`);
            }

            // Show recent answers if any
            if (submission.answers.length > 0) {
                console.log(`\n   Recent Answers:`);
                submission.answers
                    .sort((a, b) => (a.question.questionNumber || 0) - (b.question.questionNumber || 0))
                    .slice(-3) // Show last 3 answers
                    .forEach(answer => {
                        console.log(`   - Q${answer.question.questionNumber}: ${answer.question.text.substring(0, 50)}...`);
                        console.log(`     Answer: ${answer.value.substring(0, 50)}${answer.value.length > 50 ? '...' : ''}`);
                    });
            }
        });

        // Summary
        console.log(`\n=== SUMMARY FOR ${targetEmail} ===`);
        console.log(`📊 Total Questionnaires: ${submissions.length}`);
        console.log(`✅ Completed: ${completedCount}`);
        console.log(`⏳ Pending: ${pendingCount}`);
        
        if (completedCount > 0 && pendingCount > 0) {
            console.log(`🎯 Status: User has BOTH completed and pending questionnaires`);
        } else if (completedCount > 0) {
            console.log(`🎯 Status: User has COMPLETED questionnaires only`);
        } else if (pendingCount > 0) {
            console.log(`🎯 Status: User has PENDING questionnaires only`);
        }

    } catch (error) {
        console.error(`❌ Error checking questionnaire status:`, error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log(`\n💡 Database Connection Issue:`);
            console.log(`   - Make sure PostgreSQL is running: docker-compose up -d db`);
            console.log(`   - Or start all services: docker-compose up -d`);
        } else if (error.code === 'P2021') {
            console.log(`\n💡 Database Schema Issue:`);
            console.log(`   - Tables may not exist. Run: docker-compose exec questionnaire-service npx prisma migrate deploy`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the check
checkUserQuestionnaireStatus()
    .then(() => {
        console.log(`\n✅ Questionnaire status check completed\n`);
    })
    .catch((error) => {
        console.error(`❌ Fatal error:`, error);
        process.exit(1);
    });

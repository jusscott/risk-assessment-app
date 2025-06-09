
      // Migration Fix Script
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function fixP3005Error() {
        try {
          console.log('📋 Checking migration status...');
          
          // Check if _prisma_migrations table exists
          const tableExists = await prisma.$queryRaw`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name = '_prisma_migrations'
            );
          `;
          
          const migrationsTableExists = tableExists[0].exists;
          
          if (!migrationsTableExists) {
            console.log('⚠️ _prisma_migrations table does not exist. Creating it...');
            
            await prisma.$executeRaw`
              CREATE TABLE "_prisma_migrations" (
                "id" VARCHAR(36) NOT NULL,
                "checksum" VARCHAR(64) NOT NULL,
                "finished_at" TIMESTAMPTZ,
                "migration_name" VARCHAR(255) NOT NULL,
                "logs" TEXT,
                "rolled_back_at" TIMESTAMPTZ,
                "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY ("id")
              );
            `;
            console.log('✅ Created _prisma_migrations table');
          }
          
          // Check for existing migrations
          const migrationCount = await prisma.$queryRaw`
            SELECT COUNT(*) FROM "_prisma_migrations";
          `;
          
          const migrationCountValue = parseInt(migrationCount[0].count);
          
          // Check for existing tables (P3005 happens when schema exists but migrations aren't recorded)
          const existingTables = await prisma.$queryRaw`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public' 
            AND tablename != '_prisma_migrations';
          `;
          
          if (existingTables.length > 0 && migrationCountValue === 0) {
            console.log('🔍 Found existing tables but no migration records.');
            console.log('➡️ Adding migration records to fix P3005 error...');
            
            // Add base migration as applied
            await prisma.$executeRaw`
              INSERT INTO "_prisma_migrations" (
                id, 
                checksum, 
                migration_name, 
                logs, 
                finished_at, 
                applied_steps_count
              )
              VALUES (
                '00000000-0000-0000-0000-000000000001',
                'manual-migration-fix',
                '20250521_initial',
                'Applied manually to fix P3005 error',
                NOW(),
                1
              );
            `;
            
            console.log('✅ Added migration record to fix P3005 error');
          } else if (existingTables.length > 0) {
            console.log('✅ Found existing tables and migration records. No fix needed.');
          } else {
            console.log('⚠️ No tables found in the database. Schema may need to be created.');
            console.log('▶️ Attempting to run Prisma migrations...');
            
            try {
              // We can run the migrations using exec if needed
              console.log('Migrations must be run separately. The database is empty.');
            } catch (error) {
              console.error('❌ Error applying migrations:', error);
            }
          }
          
          console.log('✅ Migration fix script completed!');
        } catch (error) {
          console.error('❌ Error in migration fix script:', error);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      fixP3005Error().catch(console.error);
    
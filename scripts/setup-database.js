const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Reading migration file...');
    console.log(`   File: ${migrationPath}\n`);

    // Split into individual statements (rough split - Supabase will handle it)
    console.log('⚠️  NOTE: This script cannot execute the SQL directly.');
    console.log('   Please run the migration manually in your Supabase dashboard.\n');

    console.log('📋 Steps to complete setup:');
    console.log('   1. Go to https://supabase.com/dashboard/project/gwrxxmtxbvfzesfxsuhh');
    console.log('   2. Click on "SQL Editor" in the left sidebar');
    console.log('   3. Click "New Query"');
    console.log('   4. Copy and paste the contents of:');
    console.log('      supabase/migrations/001_initial_schema.sql');
    console.log('   5. Click "Run" to execute the migration\n');

    console.log('📄 Migration file preview:');
    console.log('─'.repeat(60));
    console.log(migrationSQL.substring(0, 500) + '...\n');

    // Test connection
    console.log('🔌 Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      if (error.message.includes('relation "public.users" does not exist')) {
        console.log('⚠️  Tables not yet created. Please run the migration in Supabase dashboard.\n');
      } else {
        console.log('❌ Connection test failed:', error.message);
      }
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log('✅ Tables exist and are accessible.\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();

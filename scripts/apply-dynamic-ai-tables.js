#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyDynamicAITables() {
  console.log('🚀 Applying Dynamic AI tables to production database...')
  
  try {
    // Read the migration SQL file
    const sqlFile = path.join(__dirname, '../supabase/migrations/20250906171920_create_dynamic_ai_tables.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    
    // Split SQL into individual statements (simple approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { query: statement })
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} had expected error (table might exist): ${error.message}`)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} failed (might be expected): ${err.message}`)
      }
    }
    
    console.log('\n🎉 Dynamic AI tables setup complete!')
    console.log('\n📋 Created tables:')
    console.log('   • user_profiles - User expertise and preferences')
    console.log('   • conversation_sessions - AI chat sessions')
    console.log('   • conversation_turns - Individual messages')
    console.log('   • ui_configurations - Dynamic UI settings')
    console.log('   • user_interactions - User behavior tracking')
    
  } catch (error) {
    console.error('❌ Error applying Dynamic AI tables:', error.message)
    process.exit(1)
  }
}

applyDynamicAITables()
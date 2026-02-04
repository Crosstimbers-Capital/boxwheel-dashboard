/**
 * Standalone script to test Analytics database connectivity
 * 
 * Run with: node scripts/test-analytics-db.js
 * 
 * Make sure to set environment variables or they'll be loaded from .env.local
 */

const sql = require('mssql')
const fs = require('fs')
const path = require('path')

// Load .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  })
  console.log('Loaded environment from .env.local\n')
}

const config = {
  server: process.env.ANALYTICS_DB_HOST,
  port: 1433,
  database: process.env.ANALYTICS_DB_NAME,
  user: process.env.ANALYTICS_DB_USER,
  password: process.env.ANALYTICS_DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
}

console.log('=== Analytics Database Connection Test ===\n')
console.log('Config:')
console.log('  Server:', config.server)
console.log('  Database:', config.database)
console.log('  User:', config.user)
console.log('  Password:', config.password ? '***' : '(not set)')
console.log()

async function runTests() {
  let pool

  try {
    console.log('1. Connecting to database...')
    pool = await sql.connect(config)
    console.log('   ✓ Connected successfully\n')

    // Test 2: Database context
    console.log('2. Checking database context...')
    const ctx = await pool.request().query(`
      SELECT 
        DB_NAME() AS current_database, 
        SCHEMA_NAME() AS default_schema, 
        SUSER_NAME() AS login_name, 
        USER_NAME() AS user_name
    `)
    console.log('   Current Database:', ctx.recordset[0].current_database)
    console.log('   Default Schema:', ctx.recordset[0].default_schema)
    console.log('   Login Name:', ctx.recordset[0].login_name)
    console.log('   User Name:', ctx.recordset[0].user_name)
    console.log()

    // Test 3: List tables
    console.log('3. Listing tables...')
    const tables = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `)
    console.log('   Found', tables.recordset.length, 'tables:')
    tables.recordset.forEach(t => {
      console.log('     -', t.TABLE_SCHEMA + '.' + t.TABLE_NAME)
    })
    console.log()

    // Test 4: List views
    console.log('4. Listing views...')
    const views = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `)
    console.log('   Found', views.recordset.length, 'views:')
    views.recordset.forEach(v => {
      console.log('     -', v.TABLE_SCHEMA + '.' + v.TABLE_NAME)
    })
    console.log()

    // Test 5: Query a table
    console.log('5. Querying t_bucketStatistics table...')
    try {
      const tableData = await pool.request().query('SELECT TOP 1 * FROM dbo.t_bucketStatistics')
      console.log('   ✓ Success - found', tableData.recordset.length, 'rows')
      if (tableData.recordset.length > 0) {
        console.log('   Columns:', Object.keys(tableData.recordset[0]).join(', '))
      }
    } catch (e) {
      console.log('   ✗ Failed:', e.message)
    }
    console.log()

    // Test 6: Query views
    const viewsToTest = [
      'vw_IdleAssetsOverTime',
      'vw_LQA_bucketStatistics', 
      'vw_RevenueDetails',
      'vw_TSpecs_Enriched'
    ]

    console.log('6. Querying views...')
    for (const viewName of viewsToTest) {
      console.log(`   Testing ${viewName}...`)
      try {
        const result = await pool.request().query(`SELECT TOP 1 * FROM dbo.${viewName}`)
        console.log(`   ✓ ${viewName} - Success (${result.recordset.length} rows)`)
      } catch (e) {
        console.log(`   ✗ ${viewName} - Failed: ${e.message}`)
      }
    }
    console.log()

    // Test 7: Check sys.views
    console.log('7. Checking sys.views...')
    const sysViews = await pool.request().query(`
      SELECT name, SCHEMA_NAME(schema_id) as schema_name 
      FROM sys.views 
      ORDER BY name
    `)
    console.log('   Found', sysViews.recordset.length, 'views in sys.views:')
    sysViews.recordset.forEach(v => {
      console.log('     -', v.schema_name + '.' + v.name)
    })
    console.log()

    console.log('=== Tests Complete ===')

  } catch (e) {
    console.error('Connection failed:', e.message)
    if (e.code) console.error('Error code:', e.code)
  } finally {
    if (pool) {
      await pool.close()
    }
  }
}

runTests()

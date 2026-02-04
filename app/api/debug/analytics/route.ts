import { NextResponse } from 'next/server'
import sql from 'mssql'

/**
 * Debug endpoint to test Analytics database connectivity
 * GET /api/debug/analytics
 */
export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    config: {
      host: process.env.ANALYTICS_DB_HOST,
      database: process.env.ANALYTICS_DB_NAME,
      user: process.env.ANALYTICS_DB_USER,
      // Don't log password
    },
    tests: {},
  }

  // Build connection config
  const config: sql.config = {
    server: process.env.ANALYTICS_DB_HOST!,
    port: 1433,
    database: process.env.ANALYTICS_DB_NAME!,
    user: process.env.ANALYTICS_DB_USER!,
    password: process.env.ANALYTICS_DB_PASSWORD!,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  }

  let pool: sql.ConnectionPool | null = null

  try {
    // Test 1: Basic connection
    results.tests['1_connection'] = { status: 'testing...' }
    pool = await sql.connect(config)
    results.tests['1_connection'] = { status: 'SUCCESS', message: 'Connected to database' }

    // Test 2: Check current database context
    try {
      const dbResult = await pool.request().query('SELECT DB_NAME() AS current_database, SCHEMA_NAME() AS default_schema, SUSER_NAME() AS login_name, USER_NAME() AS user_name')
      results.tests['2_context'] = { 
        status: 'SUCCESS', 
        data: dbResult.recordset[0] 
      }
    } catch (e: any) {
      results.tests['2_context'] = { status: 'FAILED', error: e.message }
    }

    // Test 3: List all tables
    try {
      const tablesResult = await pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `)
      results.tests['3_tables'] = { 
        status: 'SUCCESS', 
        count: tablesResult.recordset.length,
        data: tablesResult.recordset 
      }
    } catch (e: any) {
      results.tests['3_tables'] = { status: 'FAILED', error: e.message }
    }

    // Test 4: List all views
    try {
      const viewsResult = await pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `)
      results.tests['4_views'] = { 
        status: 'SUCCESS', 
        count: viewsResult.recordset.length,
        data: viewsResult.recordset 
      }
    } catch (e: any) {
      results.tests['4_views'] = { status: 'FAILED', error: e.message }
    }

    // Test 5: Try to query a table (t_bucketStatistics)
    try {
      const tableQuery = await pool.request().query('SELECT TOP 1 * FROM dbo.t_bucketStatistics')
      results.tests['5_query_table'] = { 
        status: 'SUCCESS', 
        rowCount: tableQuery.recordset.length,
        columns: tableQuery.recordset.length > 0 ? Object.keys(tableQuery.recordset[0]) : []
      }
    } catch (e: any) {
      results.tests['5_query_table'] = { status: 'FAILED', error: e.message }
    }

    // Test 6: Try to query the view directly
    try {
      const viewQuery = await pool.request().query('SELECT TOP 1 * FROM dbo.vw_IdleAssetsOverTime')
      results.tests['6_query_view_idle'] = { 
        status: 'SUCCESS', 
        rowCount: viewQuery.recordset.length,
        columns: viewQuery.recordset.length > 0 ? Object.keys(viewQuery.recordset[0]) : []
      }
    } catch (e: any) {
      results.tests['6_query_view_idle'] = { status: 'FAILED', error: e.message }
    }

    // Test 7: Try vw_LQA_bucketStatistics
    try {
      const viewQuery = await pool.request().query('SELECT TOP 1 * FROM dbo.vw_LQA_bucketStatistics')
      results.tests['7_query_view_lqa'] = { 
        status: 'SUCCESS', 
        rowCount: viewQuery.recordset.length,
        columns: viewQuery.recordset.length > 0 ? Object.keys(viewQuery.recordset[0]) : []
      }
    } catch (e: any) {
      results.tests['7_query_view_lqa'] = { status: 'FAILED', error: e.message }
    }

    // Test 8: Try vw_RevenueDetails
    try {
      const viewQuery = await pool.request().query('SELECT TOP 1 * FROM dbo.vw_RevenueDetails')
      results.tests['8_query_view_revenue'] = { 
        status: 'SUCCESS', 
        rowCount: viewQuery.recordset.length,
        columns: viewQuery.recordset.length > 0 ? Object.keys(viewQuery.recordset[0]) : []
      }
    } catch (e: any) {
      results.tests['8_query_view_revenue'] = { status: 'FAILED', error: e.message }
    }

    // Test 9: Check sys.views directly
    try {
      const sysViewsResult = await pool.request().query(`
        SELECT name, SCHEMA_NAME(schema_id) as schema_name 
        FROM sys.views 
        ORDER BY name
      `)
      results.tests['9_sys_views'] = { 
        status: 'SUCCESS', 
        count: sysViewsResult.recordset.length,
        data: sysViewsResult.recordset 
      }
    } catch (e: any) {
      results.tests['9_sys_views'] = { status: 'FAILED', error: e.message }
    }

    // Test 10: Check user permissions on views
    try {
      const permsResult = await pool.request().query(`
        SELECT 
          OBJECT_NAME(major_id) AS object_name,
          permission_name,
          state_desc
        FROM sys.database_permissions
        WHERE grantee_principal_id = DATABASE_PRINCIPAL_ID()
          AND OBJECT_NAME(major_id) LIKE 'vw_%'
      `)
      results.tests['10_permissions'] = { 
        status: 'SUCCESS', 
        count: permsResult.recordset.length,
        data: permsResult.recordset 
      }
    } catch (e: any) {
      results.tests['10_permissions'] = { status: 'FAILED', error: e.message }
    }

  } catch (e: any) {
    results.tests['1_connection'] = { 
      status: 'FAILED', 
      error: e.message,
      code: e.code 
    }
  } finally {
    if (pool) {
      await pool.close()
    }
  }

  return NextResponse.json(results, { status: 200 })
}

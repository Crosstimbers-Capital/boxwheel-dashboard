import sql from 'mssql'

/**
 * Database Connection Module
 * 
 * Two servers:
 * 1. Analytics (boxwheel-analytics): Main database with all analytics views
 * 2. Trident (boxwheel-db): For Trident_SpireonAPI GPS data
 */

// Get config at runtime (not module load time) to ensure env vars are loaded
function getAnalyticsConfig(): sql.config {
  return {
    server: process.env.ANALYTICS_DB_HOST!,
    port: 1433,
    database: process.env.ANALYTICS_DB_NAME || 'Analytics',
    user: process.env.ANALYTICS_DB_USER!,
    password: process.env.ANALYTICS_DB_PASSWORD!,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 1200000, // 60 seconds for complex queries
  }
}

// GPS database config (Trident server -> Trident_SpireonAPI)
function getGpsConfig(): sql.config {
  return {
    server: process.env.TRIDENT_DB_HOST!,
    port: 1433,
    database: 'Trident_SpireonAPI',
    user: process.env.TRIDENT_DB_USER!,
    password: process.env.TRIDENT_DB_PASSWORD!,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
}

// Connection pools
let analyticsPool: sql.ConnectionPool | null = null
let gpsPool: sql.ConnectionPool | null = null

/**
 * Get connection to Analytics database (main database with views)
 */
async function getAnalyticsConnection(): Promise<sql.ConnectionPool> {
  if (!analyticsPool) {
    const config = getAnalyticsConfig()
    console.log('Connecting to Analytics:', { server: config.server, database: config.database })
    analyticsPool = await sql.connect(config)
    
    // Verify connection
    const result = await analyticsPool.request().query('SELECT DB_NAME() as db')
    console.log('Analytics connected to:', result.recordset[0].db)
  }
  return analyticsPool
}

/**
 * Get connection to GPS database (Trident_SpireonAPI)
 */
async function getGpsConnection(): Promise<sql.ConnectionPool> {
  if (!gpsPool) {
    const config = getGpsConfig()
    console.log('Connecting to GPS:', { server: config.server, database: config.database })
    gpsPool = await sql.connect(config)
    console.log('GPS pool connected')
  }
  return gpsPool
}

/**
 * Execute a query against the Analytics database
 * Use this for all analytics views, fleet data, invoices, etc.
 */
export async function query<T = any>(sqlQuery: string): Promise<T[]> {
  try {
    const pool = await getAnalyticsConnection()
    const result = await pool.request().query(sqlQuery)
    return result.recordset as T[]
  } catch (error) {
    console.error('Analytics query failed:', {
      error: error instanceof Error ? error.message : error,
      query: sqlQuery.substring(0, 200) + '...',
    })
    throw error
  }
}

/**
 * Execute a query against the GPS database (Trident_SpireonAPI)
 * Use this for location tracking data
 */
export async function queryGps<T = any>(sqlQuery: string): Promise<T[]> {
  try {
    const pool = await getGpsConnection()
    const result = await pool.request().query(sqlQuery)
    return result.recordset as T[]
  } catch (error) {
    console.error('GPS query failed:', {
      error: error instanceof Error ? error.message : error,
      query: sqlQuery.substring(0, 200) + '...',
    })
    throw error
  }
}

/**
 * Execute a parameterized query (prevents SQL injection)
 */
export async function queryWithParams<T = any>(
  sqlQuery: string,
  params: Record<string, any>,
  database: 'analytics' | 'gps' = 'analytics'
): Promise<T[]> {
  const pool = database === 'gps' 
    ? await getGpsConnection() 
    : await getAnalyticsConnection()

  const request = pool.request()
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value)
  }

  const result = await request.query(sqlQuery)
  return result.recordset as T[]
}

// Legacy exports for backward compatibility
export const queryTrident = query
export const queryAnalytics = query

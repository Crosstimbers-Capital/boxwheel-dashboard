import sql from 'mssql'

/**
 * Database connection configuration
 *
 * Two databases are available:
 * - Trident: Source operational data (trailers, leases, invoices)
 * - Analytics: Computed views and aggregations (when available)
 */

// Trident connection config (source data)
const tridentConfig: sql.config = {
  server: process.env.TRIDENT_DB_HOST!,
  port: 1433,
  database: process.env.TRIDENT_DB_NAME!,
  user: process.env.TRIDENT_DB_USER!,
  password: process.env.TRIDENT_DB_PASSWORD!,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

// Analytics connection config (computed views)
const analyticsConfig: sql.config = {
  server: process.env.ANALYTICS_DB_HOST!,
  port: 1433,
  database: process.env.ANALYTICS_DB_NAME!,
  user: process.env.ANALYTICS_DB_USER || process.env.TRIDENT_DB_USER!,
  password: process.env.ANALYTICS_DB_PASSWORD || process.env.TRIDENT_DB_PASSWORD!,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

// Connection pools
let tridentPool: sql.ConnectionPool | null = null
let analyticsPool: sql.ConnectionPool | null = null

/**
 * Get connection to Trident database (source data)
 */
export async function getTridentConnection(): Promise<sql.ConnectionPool> {
  if (!tridentPool) {
    tridentPool = await sql.connect(tridentConfig)
  }
  return tridentPool
}

/**
 * Get connection to Analytics database (computed views)
 * Falls back to Trident if Analytics is not configured
 */
export async function getAnalyticsConnection(): Promise<sql.ConnectionPool> {
  if (!process.env.ANALYTICS_DB_HOST) {
    console.warn('Analytics DB not configured, using Trident')
    return getTridentConnection()
  }

  if (!analyticsPool) {
    analyticsPool = await sql.connect(analyticsConfig)
  }
  return analyticsPool
}

/**
 * Execute a query against Trident database
 */
export async function queryTrident<T = any>(sqlQuery: string): Promise<T[]> {
  const pool = await getTridentConnection()
  const result = await pool.request().query(sqlQuery)
  return result.recordset as T[]
}

/**
 * Execute a query against Analytics database
 */
export async function queryAnalytics<T = any>(sqlQuery: string): Promise<T[]> {
  const pool = await getAnalyticsConnection()
  const result = await pool.request().query(sqlQuery)
  return result.recordset as T[]
}

/**
 * Execute a parameterized query (prevents SQL injection)
 *
 * @example
 * const results = await queryWithParams<Trailer>(
 *   'SELECT * FROM TSpecs WHERE Branch = @branch',
 *   { branch: 'Denver' }
 * )
 */
export async function queryWithParams<T = any>(
  sqlQuery: string,
  params: Record<string, any>,
  useAnalytics: boolean = false
): Promise<T[]> {
  const pool = useAnalytics
    ? await getAnalyticsConnection()
    : await getTridentConnection()

  const request = pool.request()

  // Add parameters to request
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value)
  }

  const result = await request.query(sqlQuery)
  return result.recordset as T[]
}

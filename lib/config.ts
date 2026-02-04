/**
 * Dashboard Configuration
 * 
 * Centralized configuration for thresholds, colors, and display settings.
 * Adjust these values to change how metrics are visualized across the dashboard.
 */

// =============================================================================
// PERFORMANCE THRESHOLDS
// =============================================================================

export const thresholds = {
  /**
   * Utilization Thresholds
   * - good: >= this value shows green (healthy)
   * - warning: >= this value shows yellow (needs attention)
   * - below warning: shows red (critical)
   */
  utilization: {
    good: 0.80,      // 80% and above = green
    warning: 0.60,   // 60-79% = yellow
    // Below 60% = red
  },

  /**
   * Rate Variance Thresholds (Actual vs Card Rate)
   * Negative values mean billing below card rate.
   * - good: >= this value (at or above card rate)
   * - warning: >= this value (slight discount acceptable)
   * - below warning: significant revenue leakage
   */
  rateVariance: {
    good: 0,         // At or above card rate = green
    warning: -0.10,  // Up to 10% below = yellow
    // More than 10% below = red
  },

  /**
   * Idle Duration Thresholds (months)
   * - healthy: <= this value
   * - warning: <= this value
   * - above warning: critical (should consider selling/transferring)
   */
  idleDuration: {
    healthy: 6,      // 0-6 months = acceptable
    warning: 12,     // 6-12 months = needs attention
    critical: 24,    // 12-24 months = concerning
    // 24+ months = critical alarm
  },

  /**
   * Revenue Growth Thresholds (YoY or MoM change)
   */
  revenueGrowth: {
    good: 0.05,      // 5%+ growth = green
    warning: 0,      // 0-5% = yellow (flat)
    // Negative = red (declining)
  },
} as const

// =============================================================================
// COLOR PALETTE - Industrial Operations Center Theme
// =============================================================================

export const colors = {
  // Surface Colors (yard to office)
  surfaces: {
    asphalt: 'hsl(220, 13%, 10%)',       // Sidebar, dark frames
    asphaltLight: 'hsl(220, 10%, 16%)',  // Elevated dark surfaces
    steel: 'hsl(220, 10%, 98%)',         // Content area background
    steelDim: 'hsl(220, 10%, 95%)',      // Card backgrounds, insets
  },

  // Brand - Boxwheel lime green (use sparingly!)
  brand: {
    lime: 'hsl(72, 61%, 52%)',           // Primary brand accent
    limeDark: 'hsl(72, 55%, 38%)',       // Text on light backgrounds
    limeMuted: 'hsl(72, 40%, 48%)',      // Softer accent
    limeBg: 'hsl(72, 40%, 90%)',         // Light lime background
  },

  // Text hierarchy
  text: {
    ink: 'hsl(220, 13%, 8%)',            // Primary text
    inkMuted: 'hsl(220, 10%, 40%)',      // Secondary text
    inkFaint: 'hsl(220, 8%, 56%)',       // Tertiary/disabled
    inkInverse: 'hsl(220, 10%, 96%)',    // Text on dark surfaces
  },

  // Utilization gradient (slate → lime)
  util: {
    empty: 'hsl(220, 10%, 85%)',         // 0-20%
    low: 'hsl(220, 8%, 75%)',            // 20-40%
    mid: 'hsl(80, 30%, 70%)',            // 40-60%
    high: 'hsl(72, 45%, 65%)',           // 60-80%
    full: 'hsl(72, 55%, 55%)',           // 80-100%
  },

  // Status colors - industrial themed
  status: {
    good: 'hsl(72, 55%, 45%)',           // Lime-green for good
    goodBg: 'hsl(72, 40%, 92%)',
    warning: 'hsl(45, 90%, 50%)',        // Yellow/amber for warning
    warningBg: 'hsl(45, 80%, 92%)',
    critical: 'hsl(0, 70%, 55%)',        // Red for critical
    criticalBg: 'hsl(0, 70%, 94%)',
    neutral: 'hsl(220, 10%, 50%)',       // Slate grey for neutral
    neutralBg: 'hsl(220, 10%, 95%)',
  },

  // Chart colors - professional, muted palette
  chart: {
    primary: 'hsl(220, 60%, 50%)',       // Deep slate blue
    secondary: 'hsl(180, 40%, 45%)',     // Teal
    tertiary: 'hsl(280, 30%, 55%)',      // Muted purple
    quaternary: 'hsl(30, 60%, 55%)',     // Warm clay
    lime: 'hsl(72, 55%, 50%)',           // Brand lime (sparingly)
  },

  // Chart palette for dynamic assignment
  chartPalette: [
    'hsl(220, 50%, 50%)',   // Slate blue
    'hsl(180, 40%, 45%)',   // Teal
    'hsl(30, 50%, 55%)',    // Clay/tan
    'hsl(280, 30%, 55%)',   // Muted purple
    'hsl(150, 35%, 45%)',   // Forest green
    'hsl(0, 50%, 55%)',     // Muted red
    'hsl(72, 50%, 50%)',    // Lime (sparingly)
    'hsl(200, 45%, 50%)',   // Sky blue
  ],

  // Idle duration specific colors (slate → red gradient)
  idleDuration: {
    fresh: 'hsl(180, 40%, 50%)',         // 0-6 months - teal (healthy)
    aging: 'hsl(45, 70%, 50%)',          // 6-12 months - amber (attention)
    stale: 'hsl(25, 70%, 50%)',          // 12-24 months - orange (concern)
    critical: 'hsl(0, 65%, 50%)',        // 24+ months - red (action needed)
  },
} as const

// =============================================================================
// TIME PERIODS
// =============================================================================

export const timePeriods = {
  default: 'LTM',  // Last Twelve Months
  options: [
    { value: 'LTM', label: 'Last 12 Months' },
    { value: 'YTD', label: 'Year to Date' },
    { value: 'LQA', label: 'Last Quarter (Annualized)' },
    { value: 'L3M', label: 'Last 3 Months' },
    { value: 'L6M', label: 'Last 6 Months' },
  ],
} as const

// =============================================================================
// BUCKET DEFINITIONS
// =============================================================================

export const buckets = {
  usage: [
    { value: 'OTR_0', label: 'OTR 0-3yr' },
    { value: 'OTR_1', label: 'OTR 4-6yr' },
    { value: 'OTR_2', label: 'OTR 7-8yr' },
    { value: 'CART_1', label: 'Cartage 9-12yr' },
    { value: 'CART_2', label: 'Cartage 13-16yr' },
    { value: 'STORAGE', label: 'Storage 16+yr' },
    { value: 'SPECIALTY', label: 'Specialty' },
  ],
  
  type: [
    { value: 'DRY_VAN', label: 'Dry Van' },
    { value: 'DRY_VAN_LIFTGATE', label: 'Dry Van Liftgate' },
    { value: 'REEFER', label: 'Reefer' },
    { value: 'REEFER_LIFTGATE', label: 'Reefer Liftgate' },
    { value: 'FLATBED', label: 'Flatbed' },
    { value: 'SPECIALTY', label: 'Specialty' },
  ],

  length: [
    { value: '20', label: '20\'' },
    { value: '28-32', label: '28-32\'' },
    { value: '40', label: '40\'' },
    { value: '48', label: '48\'' },
    { value: '53', label: '53\'' },
  ],

  idleDuration: [
    { value: '0-6', label: '0-6 Months' },
    { value: '6-12', label: '6-12 Months' },
    { value: '12-24', label: '12-24 Months' },
    { value: '24+', label: '24+ Months' },
  ],
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get status color based on utilization percentage
 */
export function getUtilizationStatus(utilization: number): 'good' | 'warning' | 'critical' {
  if (utilization >= thresholds.utilization.good) return 'good'
  if (utilization >= thresholds.utilization.warning) return 'warning'
  return 'critical'
}

/**
 * Get status color based on rate variance percentage
 */
export function getRateVarianceStatus(variance: number): 'good' | 'warning' | 'critical' {
  if (variance >= thresholds.rateVariance.good) return 'good'
  if (variance >= thresholds.rateVariance.warning) return 'warning'
  return 'critical'
}

/**
 * Get status color based on idle duration in months
 */
export function getIdleStatus(months: number): 'good' | 'warning' | 'critical' {
  if (months <= thresholds.idleDuration.healthy) return 'good'
  if (months <= thresholds.idleDuration.warning) return 'warning'
  return 'critical'
}

/**
 * Get status color based on growth percentage
 */
export function getGrowthStatus(growth: number): 'good' | 'warning' | 'critical' {
  if (growth >= thresholds.revenueGrowth.good) return 'good'
  if (growth >= thresholds.revenueGrowth.warning) return 'warning'
  return 'critical'
}

/**
 * Get CSS color for a status
 */
export function getStatusColor(status: 'good' | 'warning' | 'critical' | 'neutral'): string {
  return colors.status[status]
}

/**
 * Get CSS background color for a status
 */
export function getStatusBgColor(status: 'good' | 'warning' | 'critical' | 'neutral'): string {
  return colors.status[`${status}Bg` as keyof typeof colors.status] || colors.status.neutralBg
}

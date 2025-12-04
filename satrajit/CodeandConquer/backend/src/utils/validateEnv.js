import logger from './logger.js';

/**
 * Environment variable validation for production readiness
 * Only SUPABASE credentials are truly required - other integrations are optional
 */
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalEnvVars = [
  { name: 'PORT', default: '5000' },
  { name: 'HOST', default: '0.0.0.0' },
  { name: 'NODE_ENV', default: 'development' },
  { name: 'CLIENT_URL', default: 'http://localhost:3000' },
  { name: 'SERVER_URL', default: 'http://localhost:5000' },
  { name: 'DATABASE_TYPE', default: 'supabase' },
  { name: 'EXECUTION_TIMEOUT', default: '10000' },
  { name: 'LOG_LEVEL', default: 'info' },
  { name: 'RATE_LIMIT_WINDOW_MS', default: '60000' },
  { name: 'RATE_LIMIT_MAX_REQUESTS', default: '100' }
];

// These are optional integrations - just log info if not configured
const optionalIntegrations = [
  { name: 'STRIPE_SECRET_KEY', feature: 'Stripe payments' },
  { name: 'TODOIST_CLIENT_ID', feature: 'Todoist integration' },
  { name: 'TODOIST_CLIENT_SECRET', feature: 'Todoist integration' },
  { name: 'GOOGLE_CLIENT_ID', feature: 'Google Calendar integration' },
  { name: 'GOOGLE_CLIENT_SECRET', feature: 'Google Calendar integration' }
];

const validateEnvironment = () => {
  const errors = [];
  const warnings = [];
  const info = [];
  
  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // Set defaults for optional variables
  for (const { name, default: defaultValue } of optionalEnvVars) {
    if (!process.env[name]) {
      process.env[name] = defaultValue;
      warnings.push(`Using default value for ${name}: ${defaultValue}`);
    }
  }
  
  // Check optional integrations and log info
  const missingIntegrations = new Set();
  for (const { name, feature } of optionalIntegrations) {
    if (!process.env[name]) {
      missingIntegrations.add(feature);
    }
  }
  
  // Log unique missing features
  for (const feature of missingIntegrations) {
    info.push(`${feature} not configured (optional)`);
  }
  
  // Validate specific formats
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
    warnings.push('SUPABASE_URL should use HTTPS in production');
  }
  
  if (process.env.NODE_ENV === 'production') {
    // Additional production checks
    if (!process.env.CLIENT_URL || process.env.CLIENT_URL.includes('localhost')) {
      warnings.push('CLIENT_URL appears to be using localhost in production');
    }
    if (!process.env.SERVER_URL || process.env.SERVER_URL.includes('localhost')) {
      warnings.push('SERVER_URL appears to be using localhost in production');
    }
  }
  
  // Log results
  if (info.length > 0) {
    info.forEach(i => logger.info(i));
  }
  
  if (warnings.length > 0) {
    warnings.forEach(w => logger.warn(w));
  }
  
  if (errors.length > 0) {
    errors.forEach(e => logger.error(e));
    
    // In production, exit if required vars are missing
    if (process.env.NODE_ENV === 'production') {
      logger.error('Environment validation failed. Exiting...');
      process.exit(1);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info
  };
};

export default validateEnvironment;

export const getConfig = () => ({
  port: parseInt(process.env.PORT, 10),
  host: process.env.HOST,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  clientUrl: process.env.CLIENT_URL,
  serverUrl: process.env.SERVER_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  databaseType: process.env.DATABASE_TYPE,
  executionTimeout: parseInt(process.env.EXECUTION_TIMEOUT, 10),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
  },
  // OAuth configurations
  todoist: {
    clientId: process.env.TODOIST_CLIENT_ID,
    clientSecret: process.env.TODOIST_CLIENT_SECRET,
    isConfigured: !!(process.env.TODOIST_CLIENT_ID && process.env.TODOIST_CLIENT_SECRET)
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    isConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    isConfigured: !!process.env.STRIPE_SECRET_KEY
  }
});

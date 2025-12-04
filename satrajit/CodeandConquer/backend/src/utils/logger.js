import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for production (JSON) and development (readable)
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (stack) log += `\n${stack}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

const prodFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    stack,
    ...meta
  });
});

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  defaultMeta: { service: 'code-and-conquer-api' },
  transports: [
    new winston.transports.Console({
      format: combine(
        isDevelopment ? colorize() : winston.format.uncolorize(),
        isDevelopment ? devFormat : prodFormat
      )
    })
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false
});

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => logger.http(message.trim())
};

// Helper methods for request logging
logger.logRequest = (req, statusCode, duration) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('user-agent'),
    ip: req.ip
  });
};

logger.logError = (error, req = null) => {
  const logData = {
    error: error.message,
    stack: error.stack
  };
  
  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl;
    logData.body = req.body;
  }
  
  logger.error('Application Error', logData);
};

export default logger;


/**
 * Circuit Breaker Monitoring System
 * 
 * This script implements automated monitoring for the circuit breaker system
 * across all microservices in the Risk Assessment Application.
 * 
 * Features:
 * - Periodic polling of circuit status
 * - Logging and aggregation of circuit status data
 * - Alerting when circuits are open
 * - Historical data tracking
 * - Optional automatic recovery attempts
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const winston = require('winston');
const schedule = require('node-schedule');

// Configuration with reasonable defaults
const config = {
  // API Gateway URL
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:5000',
  
  // Monitoring interval in minutes
  checkIntervalMinutes: parseInt(process.env.CIRCUIT_CHECK_INTERVAL_MINUTES || '1', 10),
  
  // Threshold for alerts (how many consecutive checks a circuit can be open before alerting)
  alertThreshold: parseInt(process.env.CIRCUIT_ALERT_THRESHOLD || '2', 10),
  
  // Auto-recovery settings
  autoRecovery: {
    enabled: process.env.CIRCUIT_AUTO_RECOVERY === 'true',
    attemptAfterChecks: parseInt(process.env.CIRCUIT_RECOVERY_ATTEMPT_AFTER || '5', 10),
    maxAttempts: parseInt(process.env.CIRCUIT_RECOVERY_MAX_ATTEMPTS || '3', 10),
    cooldownMinutes: parseInt(process.env.CIRCUIT_RECOVERY_COOLDOWN_MINUTES || '30', 10)
  },
  
  // History retention period in days
  historyRetentionDays: parseInt(process.env.CIRCUIT_HISTORY_RETENTION_DAYS || '30', 10),
  
  // Notification settings
  notifications: {
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
      recipients: (process.env.EMAIL_RECIPIENTS || '').split(','),
      fromAddress: process.env.EMAIL_FROM || 'circuit-monitor@risk-assessment-app.com'
    },
    slack: {
      enabled: process.env.SLACK_NOTIFICATIONS === 'true',
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#circuit-alerts'
    }
  },
  
  // Data storage
  dataStoragePath: process.env.CIRCUIT_DATA_PATH || path.join(__dirname, '../../data/circuit-monitor'),
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(__dirname, '../../logs/circuit-monitor.log')
  }
};

// Ensure data directories exist
if (!fs.existsSync(config.dataStoragePath)) {
  fs.mkdirSync(config.dataStoragePath, { recursive: true });
}

// Ensure log directory exists
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...rest }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(rest).length ? JSON.stringify(rest) : ''}`;
        })
      )
    }),
    new winston.transports.File({ 
      filename: config.logging.file,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// State tracking
const state = {
  services: {},
  alerts: {},
  recoveryAttempts: {},
  lastCheck: null
};

/**
 * Check circuit status for all services
 */
async function checkCircuitStatus() {
  logger.info('Checking circuit status...');
  
  try {
    const response = await axios.get(`${config.apiGatewayUrl}/circuit-status`, {
      timeout: 5000
    });
    
    const circuitStatus = response.data;
    state.lastCheck = new Date();
    
    // Process each service's circuit status
    processCircuitStatus(circuitStatus);
    
    // Store history
    storeCircuitHistory(circuitStatus);
    
    // Check for alerts
    checkForAlerts();
    
    // Attempt recovery if enabled
    if (config.autoRecovery.enabled) {
      attemptRecovery();
    }
    
    logger.info('Circuit status check complete');
  } catch (error) {
    logger.error('Failed to check circuit status:', { error: error.message });
  }
}

/**
 * Process the circuit status data
 * @param {Object} circuitStatus - The circuit status data from the API
 */
function processCircuitStatus(circuitStatus) {
  // Extract the circuits data
  const circuits = circuitStatus.circuits || {};
  
  // Update state for each service
  for (const [serviceName, status] of Object.entries(circuits)) {
    if (!state.services[serviceName]) {
      state.services[serviceName] = {
        openCount: 0,
        lastOpenTime: null,
        history: []
      };
    }
    
    const isOpen = status.stats && status.stats.isOpen;
    const serviceState = state.services[serviceName];
    
    // Update state based on circuit status
    if (isOpen) {
      serviceState.openCount++;
      if (!serviceState.lastOpenTime) {
        serviceState.lastOpenTime = new Date();
      }
      
      logger.warn(`Circuit for ${serviceName} is open`, { 
        serviceName, 
        openCount: serviceState.openCount,
        failures: status.stats.failures,
        metrics: status.stats.metrics
      });
    } else {
      // Reset counter if circuit is closed
      if (serviceState.openCount > 0) {
        logger.info(`Circuit for ${serviceName} is now closed`, { 
          serviceName, 
          previousOpenCount: serviceState.openCount
        });
      }
      
      serviceState.openCount = 0;
      serviceState.lastOpenTime = null;
    }
    
    // Add to history (keep last 100 entries in memory)
    serviceState.history.unshift({
      timestamp: new Date(),
      isOpen,
      stats: status.stats
    });
    
    if (serviceState.history.length > 100) {
      serviceState.history.pop();
    }
  }
}

/**
 * Store circuit history data
 * @param {Object} circuitStatus - The circuit status data from the API
 */
function storeCircuitHistory(circuitStatus) {
  const timestamp = new Date();
  const dateString = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
  const historyFile = path.join(config.dataStoragePath, `circuit-history-${dateString}.json`);
  
  // Create entry
  const historyEntry = {
    timestamp: timestamp.toISOString(),
    circuits: circuitStatus.circuits || {},
    totalCircuits: circuitStatus.totalCircuits || 0,
    openCircuits: circuitStatus.openCircuits || 0
  };
  
  // Append to file
  try {
    let history = [];
    
    // Read existing file if it exists
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
    
    // Add new entry
    history.push(historyEntry);
    
    // Write back to file
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
    
    // Clean up old history files
    cleanupHistoryFiles();
  } catch (error) {
    logger.error('Failed to store circuit history:', { error: error.message });
  }
}

/**
 * Clean up old history files based on retention policy
 */
function cleanupHistoryFiles() {
  try {
    const files = fs.readdirSync(config.dataStoragePath);
    const historyFiles = files.filter(file => file.startsWith('circuit-history-'));
    
    if (historyFiles.length <= config.historyRetentionDays) {
      return;
    }
    
    // Sort files by date (oldest first)
    historyFiles.sort();
    
    // Delete files beyond retention period
    const filesToDelete = historyFiles.slice(0, historyFiles.length - config.historyRetentionDays);
    for (const file of filesToDelete) {
      fs.unlinkSync(path.join(config.dataStoragePath, file));
      logger.info(`Deleted old history file: ${file}`);
    }
  } catch (error) {
    logger.error('Failed to clean up history files:', { error: error.message });
  }
}

/**
 * Check for services that need alerts
 */
function checkForAlerts() {
  for (const [serviceName, serviceState] of Object.entries(state.services)) {
    // Alert if circuit has been open for longer than the threshold
    if (serviceState.openCount >= config.alertThreshold) {
      // Check if we've already alerted for this incident
      if (!state.alerts[serviceName] || !state.alerts[serviceName].active) {
        // Create new alert
        state.alerts[serviceName] = {
          active: true,
          firstDetected: new Date(),
          lastNotified: new Date(),
          notificationCount: 1
        };
        
        // Send notification
        sendAlert(serviceName, serviceState);
      } else {
        // Update existing alert
        const alert = state.alerts[serviceName];
        const timeSinceLastNotification = Date.now() - alert.lastNotified.getTime();
        
        // Re-notify if it's been at least 1 hour since the last notification
        if (timeSinceLastNotification > 60 * 60 * 1000) {
          alert.lastNotified = new Date();
          alert.notificationCount++;
          
          // Send follow-up notification
          sendAlert(serviceName, serviceState, alert);
        }
      }
    } else if (state.alerts[serviceName] && state.alerts[serviceName].active) {
      // Circuit is now closed, resolve the alert
      const alert = state.alerts[serviceName];
      alert.active = false;
      alert.resolvedAt = new Date();
      
      // Send resolution notification
      sendResolutionAlert(serviceName, alert);
    }
  }
}

/**
 * Send an alert for an open circuit
 * @param {string} serviceName - The name of the service
 * @param {Object} serviceState - The state of the service
 * @param {Object} alert - The alert object (optional, for follow-ups)
 */
function sendAlert(serviceName, serviceState, alert = null) {
  const isFollowUp = !!alert;
  const alertType = isFollowUp ? 'follow-up' : 'new';
  const duration = isFollowUp 
    ? formatDuration(Date.now() - alert.firstDetected.getTime())
    : 'just detected';
  
  const message = `[${alertType.toUpperCase()}] Circuit breaker for ${serviceName} is OPEN (${duration})`;
  
  logger.error(message, { 
    serviceName, 
    openCount: serviceState.openCount,
    alertType,
    duration: duration
  });
  
  // Email notification
  if (config.notifications.email.enabled) {
    sendEmailAlert(serviceName, message, serviceState, alert);
  }
  
  // Slack notification
  if (config.notifications.slack.enabled) {
    sendSlackAlert(serviceName, message, serviceState, alert);
  }
}

/**
 * Send a resolution alert when a circuit closes
 * @param {string} serviceName - The name of the service
 * @param {Object} alert - The alert object
 */
function sendResolutionAlert(serviceName, alert) {
  const duration = formatDuration(alert.resolvedAt.getTime() - alert.firstDetected.getTime());
  
  const message = `[RESOLVED] Circuit breaker for ${serviceName} is now CLOSED (was open for ${duration})`;
  
  logger.info(message, { 
    serviceName, 
    duration,
    notificationCount: alert.notificationCount
  });
  
  // Email notification
  if (config.notifications.email.enabled) {
    sendEmailResolution(serviceName, message, alert);
  }
  
  // Slack notification
  if (config.notifications.slack.enabled) {
    sendSlackResolution(serviceName, message, alert);
  }
}

/**
 * Send an email alert
 * @param {string} serviceName - The name of the service
 * @param {string} message - The alert message
 * @param {Object} serviceState - The state of the service
 * @param {Object} alert - The alert object (null for new alerts)
 */
function sendEmailAlert(serviceName, message, serviceState, alert) {
  // This is a placeholder - in a real implementation, you would use
  // a library like nodemailer to send actual emails
  logger.info(`Would send email alert: ${message}`, { 
    recipients: config.notifications.email.recipients,
    serviceName
  });
  
  // In a real implementation:
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    // Configure for your email provider
  });
  
  transporter.sendMail({
    from: config.notifications.email.fromAddress,
    to: config.notifications.email.recipients.join(','),
    subject: message,
    html: `
      <h1>Circuit Breaker Alert</h1>
      <p>${message}</p>
      <h2>Details:</h2>
      <ul>
        <li>Service: ${serviceName}</li>
        <li>Open Count: ${serviceState.openCount}</li>
        <li>First Detected: ${alert ? alert.firstDetected.toISOString() : 'Now'}</li>
        ${alert ? `<li>Notification Count: ${alert.notificationCount}</li>` : ''}
      </ul>
    `
  });
  */
}

/**
 * Send an email resolution notice
 * @param {string} serviceName - The name of the service
 * @param {string} message - The resolution message
 * @param {Object} alert - The alert object
 */
function sendEmailResolution(serviceName, message, alert) {
  // This is a placeholder - in a real implementation, you would use
  // a library like nodemailer to send actual emails
  logger.info(`Would send email resolution: ${message}`, { 
    recipients: config.notifications.email.recipients,
    serviceName
  });
  
  // In a real implementation, similar to sendEmailAlert
}

/**
 * Send a Slack alert
 * @param {string} serviceName - The name of the service
 * @param {string} message - The alert message
 * @param {Object} serviceState - The state of the service
 * @param {Object} alert - The alert object (null for new alerts)
 */
function sendSlackAlert(serviceName, message, serviceState, alert) {
  // This is a placeholder - in a real implementation, you would use
  // axios to post to the Slack webhook URL
  logger.info(`Would send Slack alert: ${message}`, { 
    channel: config.notifications.slack.channel,
    serviceName
  });
  
  // In a real implementation:
  /*
  axios.post(config.notifications.slack.webhookUrl, {
    channel: config.notifications.slack.channel,
    text: message,
    attachments: [
      {
        color: '#ff0000',
        fields: [
          {
            title: 'Service',
            value: serviceName,
            short: true
          },
          {
            title: 'Open Count',
            value: serviceState.openCount,
            short: true
          },
          {
            title: 'First Detected',
            value: alert ? new Date(alert.firstDetected).toLocaleString() : 'Now',
            short: true
          },
          {
            title: 'Notification Count',
            value: alert ? alert.notificationCount : 1,
            short: true
          }
        ]
      }
    ]
  });
  */
}

/**
 * Send a Slack resolution notice
 * @param {string} serviceName - The name of the service
 * @param {string} message - The resolution message
 * @param {Object} alert - The alert object
 */
function sendSlackResolution(serviceName, message, alert) {
  // This is a placeholder - in a real implementation, you would use
  // axios to post to the Slack webhook URL
  logger.info(`Would send Slack resolution: ${message}`, { 
    channel: config.notifications.slack.channel,
    serviceName
  });
  
  // In a real implementation, similar to sendSlackAlert
}

/**
 * Attempt recovery for open circuits
 */
function attemptRecovery() {
  for (const [serviceName, serviceState] of Object.entries(state.services)) {
    // Only attempt recovery if circuit has been open for longer than the threshold
    if (serviceState.openCount >= config.autoRecovery.attemptAfterChecks) {
      // Initialize recovery tracking if needed
      if (!state.recoveryAttempts[serviceName]) {
        state.recoveryAttempts[serviceName] = {
          count: 0,
          lastAttempt: null,
          success: false
        };
      }
      
      const recovery = state.recoveryAttempts[serviceName];
      
      // Check if we've hit the maximum attempts
      if (recovery.count >= config.autoRecovery.maxAttempts) {
        // Check if we've waited long enough to try again
        const timeSinceLastAttempt = Date.now() - (recovery.lastAttempt?.getTime() || 0);
        if (timeSinceLastAttempt < config.autoRecovery.cooldownMinutes * 60 * 1000) {
          continue;
        }
        
        // Reset counter after cooldown
        recovery.count = 0;
      }
      
      // Attempt recovery
      logger.info(`Attempting recovery for ${serviceName}`, { 
        serviceName, 
        attemptNumber: recovery.count + 1,
        maxAttempts: config.autoRecovery.maxAttempts
      });
      
      resetCircuit(serviceName)
        .then(success => {
          recovery.lastAttempt = new Date();
          recovery.count++;
          recovery.success = success;
          
          if (success) {
            logger.info(`Successfully reset circuit for ${serviceName}`, { serviceName });
          } else {
            logger.warn(`Failed to reset circuit for ${serviceName}`, { serviceName });
          }
        })
        .catch(error => {
          logger.error(`Error during recovery attempt for ${serviceName}:`, { 
            serviceName, 
            error: error.message 
          });
          
          recovery.lastAttempt = new Date();
          recovery.count++;
          recovery.success = false;
        });
    }
  }
}

/**
 * Reset a circuit
 * @param {string} serviceName - The name of the service
 * @returns {Promise<boolean>} True if successful
 */
async function resetCircuit(serviceName) {
  try {
    const response = await axios.post(`${config.apiGatewayUrl}/circuit-reset`, {
      service: serviceName
    }, {
      timeout: 5000
    });
    
    return response.status === 200 && response.data.result && response.data.result.success;
  } catch (error) {
    logger.error(`Failed to reset circuit for ${serviceName}:`, { 
      serviceName, 
      error: error.message 
    });
    return false;
  }
}

/**
 * Format a duration in milliseconds to a human-readable string
 * @param {number} ms - The duration in milliseconds
 * @returns {string} The formatted duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Start the monitoring system
 */
function startMonitoring() {
  logger.info('Starting circuit breaker monitoring system...');
  logger.info('Configuration:', config);
  
  // Perform initial check
  checkCircuitStatus();
  
  // Schedule regular checks
  const rule = new schedule.RecurrenceRule();
  rule.minute = new schedule.Range(0, 59, config.checkIntervalMinutes);
  
  const job = schedule.scheduleJob(rule, checkCircuitStatus);
  
  logger.info(`Monitoring scheduled every ${config.checkIntervalMinutes} minute(s)`);
  
  // Setup graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal, shutting down gracefully');
    job.cancel();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal, shutting down gracefully');
    job.cancel();
    process.exit(0);
  });
}

// Export for use as a module
module.exports = {
  startMonitoring,
  checkCircuitStatus,
  resetCircuit,
  config
};

// If run directly, start monitoring
if (require.main === module) {
  startMonitoring();
}

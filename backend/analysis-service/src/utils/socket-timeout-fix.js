/**
 * WebSocket Timeout Fix
 * 
 * A robust WebSocket connection management system that addresses timeout issues
 * during heavy processing operations by implementing:
 * 
 * 1. Configurable Keep-Alive Heartbeats
 * 2. Message Buffering During High Load
 * 3. Exponential Backoff Reconnection
 * 4. Load-Adaptive Behavior
 */

const WebSocket = require('ws');
// Avoid circular dependency by directly reading config values
const config = {
  sockets: {
    debugSocket: process.env.DEBUG_SOCKET === 'true',
    keepAliveInterval: parseInt(process.env.SOCKET_KEEP_ALIVE_INTERVAL || '30000', 10),
    reconnectInterval: parseInt(process.env.SOCKET_RECONNECT_INTERVAL || '5000', 10),
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '10000', 10),
    maxReconnectDelay: parseInt(process.env.SOCKET_MAX_RECONNECT_DELAY || '60000', 10),
    bufferThreshold: parseInt(process.env.SOCKET_BUFFER_THRESHOLD || '100', 10),
    highPriorityBufferSize: parseInt(process.env.SOCKET_HIGH_PRIORITY_BUFFER_SIZE || '50', 10)
  }
};
const debug = config.sockets.debugSocket;

// Singleton instance
let socketManager = null;

/**
 * Initialize the socket timeout fix
 * @returns {SocketManager} The initialized socket manager instance
 */
function initSocketTimeoutFix() {
  if (!socketManager) {
    socketManager = new SocketManager();
    
    if (debug) {
      console.log('Socket timeout fix initialized with config:', config.sockets);
    }
  }
  return socketManager;
}

/**
 * Shut down the socket timeout fix
 */
function shutdownSocketTimeoutFix() {
  if (socketManager) {
    socketManager.shutdown();
    socketManager = null;
    
    if (debug) {
      console.log('Socket timeout fix shut down');
    }
  }
}

/**
 * Get the socket manager instance
 * @returns {SocketManager} The socket manager instance
 */
function getSocketManager() {
  if (!socketManager) {
    socketManager = initSocketTimeoutFix();
  }
  return socketManager;
}

/**
 * Create a new WebSocket connection
 * @param {string} id Unique identifier for this connection
 * @param {string} url WebSocket URL
 * @param {object} options Connection options
 * @param {function} options.onOpen Callback when connection opens
 * @param {function} options.onMessage Callback when message is received
 * @param {function} options.onClose Callback when connection closes
 * @param {function} options.onError Callback when error occurs
 * @returns {WebSocket} The WebSocket instance
 */
function createConnection(id, url, options = {}) {
  return getSocketManager().createConnection(id, url, options);
}

/**
 * Send a message on a WebSocket connection
 * @param {string} id Connection identifier
 * @param {object|string} message Message to send
 * @param {object} options Message options
 * @param {string} options.priority Message priority ('high' or 'normal')
 * @returns {boolean} True if the message was sent or queued, false if the connection doesn't exist
 */
function sendMessage(id, message, options = {}) {
  return getSocketManager().sendMessage(id, message, options);
}

/**
 * Close a WebSocket connection
 * @param {string} id Connection identifier
 * @param {number} code Close code
 * @param {string} reason Close reason
 */
function closeConnection(id, code = 1000, reason = 'Normal closure') {
  return getSocketManager().closeConnection(id, code, reason);
}

/**
 * Get status information about WebSocket connections
 * @param {string} id Optional connection identifier. If not provided, returns status for all connections.
 * @returns {object} Status information
 */
function getStatus(id) {
  return getSocketManager().getStatus(id);
}

/**
 * Socket Manager Class
 * Manages WebSocket connections with robust timeout handling
 */
class SocketManager {
  constructor() {
    // Store active connections
    this.connections = new Map();
    
    // Store message queues
    this.messageQueues = new Map();
    
    // Store connection stats
    this.stats = new Map();
    
    // Track system load
    this.systemLoad = {
      isHighLoad: false,
      highLoadStartTime: null,
      queueSize: 0
    };
    
    // Initialize from config
    this.keepAliveInterval = config.sockets.keepAliveInterval;
    this.reconnectInterval = config.sockets.reconnectInterval;
    this.pingTimeout = config.sockets.pingTimeout;
    this.maxReconnectDelay = config.sockets.maxReconnectDelay;
    this.bufferThreshold = config.sockets.bufferThreshold;
    this.highPriorityBufferSize = config.sockets.highPriorityBufferSize;
    
    // Start the keep-alive interval
    this.startKeepAliveInterval();
    
    // Start the message processing interval
    this.startMessageProcessingInterval();
    
    if (debug) {
      console.log('Socket manager initialized');
    }
  }
  
  /**
   * Start the keep-alive interval
   */
  startKeepAliveInterval() {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
    }
    
    this.keepAliveIntervalId = setInterval(() => {
      this.sendKeepAliveToAll();
    }, this.keepAliveInterval);
    
    if (debug) {
      console.log(`Keep-alive interval started: ${this.keepAliveInterval}ms`);
    }
  }
  
  /**
   * Start the message processing interval
   */
  startMessageProcessingInterval() {
    if (this.messageProcessingIntervalId) {
      clearInterval(this.messageProcessingIntervalId);
    }
    
    // Process messages more frequently than keep-alive
    const processingInterval = Math.min(this.keepAliveInterval / 10, 1000);
    
    this.messageProcessingIntervalId = setInterval(() => {
      this.processMessageQueues();
    }, processingInterval);
    
    if (debug) {
      console.log(`Message processing interval started: ${processingInterval}ms`);
    }
  }
  
  /**
   * Send keep-alive messages to all connections
   */
  sendKeepAliveToAll() {
    for (const [id, conn] of this.connections.entries()) {
      if (conn.readyState === WebSocket.OPEN) {
        try {
          // Send ping (the WebSocket implementation will handle this automatically)
          conn.ping('heartbeat');
          
          // Update stats
          this.updateConnectionStats(id, 'ping');
          
          if (debug) {
            console.log(`Sent ping to connection: ${id}`);
          }
        } catch (error) {
          console.error(`Error sending ping to ${id}:`, error.message);
          this.updateConnectionStats(id, 'pingError');
          
          // Try to reconnect if connection seems broken
          this.handleConnectionError(id, error);
        }
      } else if (conn.readyState !== WebSocket.CONNECTING) {
        // Connection is closed or closing, try to reconnect
        this.attemptReconnect(id);
      }
    }
  }
  
  /**
   * Process message queues for all connections
   */
  processMessageQueues() {
    // Calculate overall system load based on queue sizes
    let totalQueueSize = 0;
    
    for (const [id, queue] of this.messageQueues.entries()) {
      totalQueueSize += queue.length;
    }
    
    // Update system load state
    const wasHighLoad = this.systemLoad.isHighLoad;
    this.systemLoad.isHighLoad = totalQueueSize > this.bufferThreshold;
    this.systemLoad.queueSize = totalQueueSize;
    
    // If we just entered high load state, record the time
    if (!wasHighLoad && this.systemLoad.isHighLoad) {
      this.systemLoad.highLoadStartTime = Date.now();
      
      if (debug) {
        console.log(`System entered high load state. Queue size: ${totalQueueSize}`);
      }
    } 
    // If we just exited high load state, log duration
    else if (wasHighLoad && !this.systemLoad.isHighLoad) {
      const loadDuration = Date.now() - (this.systemLoad.highLoadStartTime || Date.now());
      
      if (debug) {
        console.log(`System exited high load state. Duration: ${loadDuration}ms`);
      }
    }
    
    // Process messages for each connection
    for (const [id, queue] of this.messageQueues.entries()) {
      const conn = this.connections.get(id);
      
      // Skip if connection doesn't exist or isn't open
      if (!conn || conn.readyState !== WebSocket.OPEN) {
        continue;
      }
      
      // Define how many messages to process this batch
      let processCount;
      
      if (this.systemLoad.isHighLoad) {
        // During high load, process fewer messages and prioritize high priority ones
        processCount = Math.min(5, queue.length);
        
        // Sort queue by priority before processing
        queue.sort((a, b) => {
          // High priority items come first
          if (a.priority === 'high' && b.priority !== 'high') return -1;
          if (a.priority !== 'high' && b.priority === 'high') return 1;
          // Otherwise maintain order
          return a.timestamp - b.timestamp;
        });
      } else {
        // During normal load, process more messages
        processCount = Math.min(20, queue.length);
      }
      
      // Process the messages
      for (let i = 0; i < processCount; i++) {
        if (queue.length === 0) break;
        
        const msg = queue.shift();
        
        try {
          // Serialize message if needed
          const data = typeof msg.message === 'string' 
            ? msg.message 
            : JSON.stringify(msg.message);
          
          // Send the message
          conn.send(data);
          
          // Update stats
          this.updateConnectionStats(id, 'messageSent');
          
          if (debug && msg.priority === 'high') {
            console.log(`Sent high priority message to ${id}`);
          }
        } catch (error) {
          console.error(`Error sending message to ${id}:`, error.message);
          
          // Put message back in queue if it's high priority
          if (msg.priority === 'high') {
            queue.unshift(msg);
          }
          
          // Try to reconnect
          this.handleConnectionError(id, error);
          
          // Stop processing more messages for this connection
          break;
        }
      }
    }
  }
  
  /**
   * Create a new WebSocket connection
   * @param {string} id Unique identifier for this connection
   * @param {string} url WebSocket URL
   * @param {object} options Connection options
   * @returns {WebSocket} The WebSocket instance
   */
  createConnection(id, url, options = {}) {
    // Close existing connection if it exists
    if (this.connections.has(id)) {
      this.closeConnection(id, 1000, 'Replacing connection');
    }
    
    // Create a new WebSocket connection
    const ws = new WebSocket(url);
    
    // Set up callbacks
    ws.on('open', () => {
      if (debug) {
        console.log(`Connection ${id} opened`);
      }
      
      // Reset reconnect count on successful connection
      if (this.stats.has(id)) {
        this.stats.get(id).reconnectCount = 0;
        this.stats.get(id).reconnectDelay = this.reconnectInterval;
      }
      
      // Call user callback if provided
      if (typeof options.onOpen === 'function') {
        options.onOpen();
      }
    });
    
    ws.on('message', (data) => {
      try {
        // Try to parse as JSON
        let parsedData;
        try {
          parsedData = JSON.parse(data.toString());
        } catch (e) {
          parsedData = data.toString();
        }
        
        // Update stats
        this.updateConnectionStats(id, 'messageReceived');
        
        // Call user callback if provided
        if (typeof options.onMessage === 'function') {
          options.onMessage(parsedData);
        }
      } catch (error) {
        console.error(`Error processing message from ${id}:`, error.message);
      }
    });
    
    ws.on('close', (code, reason) => {
      if (debug) {
        console.log(`Connection ${id} closed: ${code} - ${reason}`);
      }
      
      // Call user callback if provided
      if (typeof options.onClose === 'function') {
        options.onClose(code, reason);
      }
      
      // Remove from active connections if it's the current one
      if (this.connections.get(id) === ws) {
        this.connections.delete(id);
        
        // Attempt to reconnect based on close code
        if (code !== 1000) { // Not a normal closure
          this.attemptReconnect(id, url, options);
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error(`Connection ${id} error:`, error.message);
      
      // Call user callback if provided
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
      
      // Handle connection error
      this.handleConnectionError(id, error, url, options);
    });
    
    ws.on('ping', (data) => {
      // Update stats
      this.updateConnectionStats(id, 'pingReceived');
      
      if (debug) {
        console.log(`Received ping from ${id}`);
      }
    });
    
    ws.on('pong', (data) => {
      // Update stats
      this.updateConnectionStats(id, 'pongReceived');
      
      if (debug) {
        console.log(`Received pong from ${id}`);
      }
    });
    
    // Store the connection
    this.connections.set(id, ws);
    
    // Initialize message queue
    if (!this.messageQueues.has(id)) {
      this.messageQueues.set(id, []);
    }
    
    // Initialize stats
    this.stats.set(id, {
      created: Date.now(),
      lastActive: Date.now(),
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      reconnects: 0,
      reconnectCount: 0,
      reconnectDelay: this.reconnectInterval,
      lastReconnectAttempt: null,
      state: 'connecting'
    });
    
    // Store connection info
    this.stats.get(id).url = url;
    this.stats.get(id).options = options;
    
    return ws;
  }
  
  /**
   * Send a message on a WebSocket connection
   * @param {string} id Connection identifier
   * @param {object|string} message Message to send
   * @param {object} options Message options
   * @returns {boolean} True if the message was sent or queued, false if the connection doesn't exist
   */
  sendMessage(id, message, options = {}) {
    const conn = this.connections.get(id);
    const queue = this.messageQueues.get(id) || [];
    
    // Create queue if it doesn't exist
    if (!this.messageQueues.has(id)) {
      this.messageQueues.set(id, queue);
    }
    
    // Set default priority
    const priority = options.priority === 'high' ? 'high' : 'normal';
    
    // Add message to queue with metadata
    queue.push({
      message,
      priority,
      timestamp: Date.now(),
      attempts: 0
    });
    
    if (debug && priority === 'high') {
      console.log(`Queued high priority message for ${id}`);
    }
    
    // Return success if connection exists
    return !!conn;
  }
  
  /**
   * Close a WebSocket connection
   * @param {string} id Connection identifier
   * @param {number} code Close code
   * @param {string} reason Close reason
   */
  closeConnection(id, code = 1000, reason = 'Normal closure') {
    const conn = this.connections.get(id);
    
    if (conn) {
      try {
        // Only try to close if it's not already closed
        if (conn.readyState !== WebSocket.CLOSED && conn.readyState !== WebSocket.CLOSING) {
          conn.close(code, reason);
          
          if (debug) {
            console.log(`Closed connection ${id}: ${code} - ${reason}`);
          }
        }
      } catch (error) {
        console.error(`Error closing connection ${id}:`, error.message);
      }
      
      // Remove from active connections
      this.connections.delete(id);
    }
    
    // Clear message queue
    this.messageQueues.delete(id);
  }
  
  /**
   * Get status information about WebSocket connections
   * @param {string} id Optional connection identifier. If not provided, returns status for all connections.
   * @returns {object} Status information
   */
  getStatus(id) {
    if (id) {
      // Return status for specific connection
      const conn = this.connections.get(id);
      const stats = this.stats.get(id) || {};
      const queue = this.messageQueues.get(id) || [];
      
      return {
        exists: !!conn,
        readyState: conn ? conn.readyState : null,
        queueSize: queue.length,
        highPriorityMessages: queue.filter(m => m.priority === 'high').length,
        stats: { ...stats }
      };
    } else {
      // Return status for all connections
      const result = {
        connections: {},
        totalConnections: this.connections.size,
        totalQueueSize: 0,
        systemLoad: { ...this.systemLoad }
      };
      
      // Add individual connection info
      for (const [connId, conn] of this.connections.entries()) {
        const queue = this.messageQueues.get(connId) || [];
        const stats = this.stats.get(connId) || {};
        
        result.connections[connId] = {
          readyState: conn.readyState,
          queueSize: queue.length,
          highPriorityMessages: queue.filter(m => m.priority === 'high').length,
          stats: { ...stats }
        };
        
        result.totalQueueSize += queue.length;
      }
      
      return result;
    }
  }
  
  /**
   * Update connection stats
   * @param {string} id Connection identifier
   * @param {string} action Action that occurred
   */
  updateConnectionStats(id, action) {
    if (!this.stats.has(id)) {
      return;
    }
    
    const stats = this.stats.get(id);
    stats.lastActive = Date.now();
    
    switch (action) {
      case 'messageSent':
        stats.messagesSent++;
        stats.state = 'active';
        break;
      case 'messageReceived':
        stats.messagesReceived++;
        stats.state = 'active';
        break;
      case 'error':
        stats.errors++;
        stats.state = 'error';
        break;
      case 'reconnect':
        stats.reconnects++;
        stats.state = 'reconnecting';
        break;
      case 'ping':
        stats.state = 'active';
        break;
      case 'pingReceived':
        stats.state = 'active';
        break;
      case 'pongReceived':
        stats.state = 'active';
        break;
      case 'pingError':
        stats.errors++;
        stats.state = 'error';
        break;
    }
  }
  
  /**
   * Handle a connection error
   * @param {string} id Connection identifier
   * @param {Error} error Error that occurred
   * @param {string} url Optional URL to reconnect to
   * @param {object} options Optional connection options
   */
  handleConnectionError(id, error, url, options) {
    // Update stats
    this.updateConnectionStats(id, 'error');
    
    // Get connection info
    const stats = this.stats.get(id);
    if (!stats) {
      return;
    }
    
    // Use stored URL and options if not provided
    url = url || stats.url;
    options = options || stats.options || {};
    
    // Try to reconnect
    this.attemptReconnect(id, url, options);
  }
  
  /**
   * Attempt to reconnect a connection
   * @param {string} id Connection identifier
   * @param {string} url URL to reconnect to
   * @param {object} options Connection options
   */
  attemptReconnect(id, url, options) {
    // Skip if no URL
    if (!url) {
      return;
    }
    
    // Get stats
    const stats = this.stats.get(id);
    if (!stats) {
      return;
    }
    
    // Update reconnect count
    stats.reconnectCount = (stats.reconnectCount || 0) + 1;
    
    // Calculate delay with exponential backoff and jitter
    let delay = Math.min(
      stats.reconnectDelay * Math.pow(1.5, stats.reconnectCount - 1),
      this.maxReconnectDelay
    );
    
    // Add jitter (±20%)
    const jitter = 0.2;
    delay = delay * (1 + jitter * (Math.random() * 2 - 1));
    
    // Store for next time
    stats.reconnectDelay = delay;
    stats.lastReconnectAttempt = Date.now();
    
    if (debug) {
      console.log(`Scheduling reconnect for ${id} in ${Math.round(delay)}ms (attempt ${stats.reconnectCount})`);
    }
    
    // Schedule reconnect
    setTimeout(() => {
      // Skip if connection was already replaced
      if (!this.stats.has(id) || this.stats.get(id) !== stats) {
        return;
      }
      
      if (debug) {
        console.log(`Attempting to reconnect ${id} (attempt ${stats.reconnectCount})`);
      }
      
      // Update stats
      this.updateConnectionStats(id, 'reconnect');
      
      // Create new connection
      this.createConnection(id, url, options);
    }, delay);
  }
  
  /**
   * Shut down the socket manager
   */
  shutdown() {
    // Clear intervals
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
    
    if (this.messageProcessingIntervalId) {
      clearInterval(this.messageProcessingIntervalId);
      this.messageProcessingIntervalId = null;
    }
    
    // Close all connections
    for (const [id, conn] of this.connections.entries()) {
      this.closeConnection(id, 1000, 'Service shutdown');
    }
    
    // Clear data
    this.connections.clear();
    this.messageQueues.clear();
    this.stats.clear();
    
    if (debug) {
      console.log('Socket manager shut down');
    }
  }
}

// Export functions
module.exports = {
  initSocketTimeoutFix,
  shutdownSocketTimeoutFix,
  createConnection,
  sendMessage,
  closeConnection,
  getStatus
};

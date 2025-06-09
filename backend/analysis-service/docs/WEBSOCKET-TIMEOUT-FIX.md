# WebSocket Timeout Fix for Analysis Service

## Problem Description

The Analysis Service was experiencing WebSocket timeouts during heavy processing tasks. This issue specifically occurred when:

1. The Analysis Service receives a webhook request to process a questionnaire submission
2. During heavy analysis processing (which can take 5-20 seconds), the WebSocket connection to the Report Service would time out
3. This caused failures in the report generation process, as the Report Service wouldn't be notified when analysis was complete

The root cause was that the main JavaScript event loop was blocked by CPU-intensive processing tasks, preventing WebSocket heartbeats and other connection maintenance operations from being processed in a timely manner.

## Solution Overview

The solution implements a multi-faceted approach:

1. **Task Queuing System**: Analysis tasks are now queued and processed one at a time, preventing parallel heavy processing that could overwhelm the system.

2. **Resilient WebSocket Management**: A new WebSocket management system with automatic reconnection, buffering, and prioritization capabilities.

3. **Service Integration Layer**: A dedicated integration layer that connects the webhook controller with the WebSocket management system.

## Implementation Details

### 1. Socket Timeout Fix Utility (`socket-timeout-fix.js`)

This core utility provides:

- Automatic reconnection with exponential backoff
- Message buffering and prioritization
- Connection status monitoring
- Heartbeat mechanism to keep connections alive

### 2. Webhook Socket Integration (`webhook-socket-integration.js`)

This integration layer connects the webhook controller with the socket timeout fix:

- Provides a task queue for processing analysis jobs sequentially
- Implements retry logic with exponential backoff
- Handles WebSocket connections to the Report Service
- Ensures messages are delivered reliably even during heavy processing

### 3. Updated Webhook Controller

The webhook controller now:

- Uses the queuing system to prevent parallel heavy processing
- Leverages the socket timeout fix for reliable report service notification
- Provides better error handling and recovery

## Configuration Options

The WebSocket timeout fix can be configured through environment variables or the `config.js` file:

```javascript
sockets: {
  debugSocket: process.env.DEBUG_SOCKET === 'true' || false,
  keepAliveInterval: parseInt(process.env.WS_KEEP_ALIVE_INTERVAL || '30000', 10),
  reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '5000', 10),
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),
  maxReconnectDelay: parseInt(process.env.WS_MAX_RECONNECT_DELAY || '60000', 10),
  bufferThreshold: parseInt(process.env.WS_BUFFER_THRESHOLD || '100', 10),
  highPriorityBufferSize: parseInt(process.env.WS_HIGH_PRIORITY_BUFFER_SIZE || '50', 10)
}
```

## Testing

A comprehensive test suite has been implemented to verify the fix:

- `websocket-timeout-test.js`: Integration tests that simulate heavy processing and verify WebSocket reliability
- `run-websocket-test.sh`: Script to run the tests with proper environment configuration

## Performance Impact

The solution has the following performance characteristics:

- **Analysis Processing**: Analysis tasks are now processed sequentially rather than in parallel, which may increase total processing time for multiple submissions but improves system stability.

- **Message Delivery**: Message delivery to the Report Service is now more reliable, with automatic retries and priority queuing.

- **Resource Usage**: The solution uses a minimal amount of additional memory for the task queue and message buffers, with negligible CPU overhead.

## Future Improvements

Potential future improvements include:

1. **Dynamic Concurrency**: Allow a configurable number of concurrent analysis tasks based on server capacity
2. **Advanced Prioritization**: Implement user or job priority levels in the analysis queue
3. **Distributed Queue**: Move to a distributed queue system (like Redis) for better scalability
4. **Circuit Breaker Pattern**: Implement circuit breakers to handle service outages more gracefully
5. **Metrics Collection**: Add more detailed metrics on queue length, processing time, and WebSocket reliability

## References

- [Node.js Event Loop Documentation](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [WebSocket Protocol RFC6455](https://tools.ietf.org/html/rfc6455)
- [Task Queuing Best Practices](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)

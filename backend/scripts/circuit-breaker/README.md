# Circuit Breaker Monitoring System

This component implements automated monitoring for the circuit breaker system across all microservices in the Risk Assessment Application.

## Features

- **Periodic Polling**: Automatically checks the status of all circuit breakers at configurable intervals.
- **Status Aggregation**: Collects and stores circuit breaker status data for all services.
- **Alerting**: Sends notifications when circuits are open for a configurable period.
- **Historical Data**: Maintains historical data about circuit trips for analysis.
- **Automatic Recovery**: Optionally attempts to reset open circuits after configurable conditions.
- **Notifications**: Supports email and Slack notifications (configurable).

## Architecture

The monitoring service works by:

1. Periodically polling the API Gateway's `/circuit-status` endpoint to check the state of all circuit breakers
2. Processing and storing this data for historical analysis
3. Tracking how long circuits stay open and generating alerts when they exceed thresholds
4. Optionally attempting automatic recovery by calling the `/circuit-reset` endpoint
5. Providing notifications through configurable channels

## Configuration

The monitoring system is highly configurable through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `API_GATEWAY_URL` | URL of the API Gateway | `http://localhost:5000` |
| `CIRCUIT_CHECK_INTERVAL_MINUTES` | How often to check circuit status (minutes) | `1` |
| `CIRCUIT_ALERT_THRESHOLD` | How many consecutive checks a circuit can be open before alerting | `2` |
| `CIRCUIT_AUTO_RECOVERY` | Whether to enable automatic circuit recovery | `false` |
| `CIRCUIT_RECOVERY_ATTEMPT_AFTER` | Checks to wait before attempting recovery | `5` |
| `CIRCUIT_RECOVERY_MAX_ATTEMPTS` | Maximum recovery attempts before cooling down | `3` |
| `CIRCUIT_RECOVERY_COOLDOWN_MINUTES` | Cooldown period after max attempts (minutes) | `30` |
| `CIRCUIT_HISTORY_RETENTION_DAYS` | How many days to keep history files | `30` |
| `EMAIL_NOTIFICATIONS` | Enable email notifications | `false` |
| `EMAIL_RECIPIENTS` | Comma-separated list of email recipients | `""` |
| `EMAIL_FROM` | From address for email notifications | `circuit-monitor@risk-assessment-app.com` |
| `SLACK_NOTIFICATIONS` | Enable Slack notifications | `false` |
| `SLACK_WEBHOOK_URL` | Webhook URL for Slack notifications | `""` |
| `SLACK_CHANNEL` | Slack channel for notifications | `#circuit-alerts` |
| `CIRCUIT_DATA_PATH` | Path to store circuit data | `../../data/circuit-monitor` |
| `LOG_LEVEL` | Logging level | `info` |

## Setup

The monitoring service is already set up in the Docker Compose configuration. By default, it polls the API Gateway every minute and is configured to alert if a circuit is open for 2 consecutive checks.

To run the service independently:

```bash
cd risk-assessment-app/backend/scripts/circuit-breaker
npm install
npm start
```

## Deployment

The service is containerized and can be deployed alongside the other microservices. In the Docker Compose setup, it depends on the API Gateway service and is configured to restart automatically.

## Monitoring and Logs

The service logs all activity to both the console and a log file (`logs/circuit-monitor.log`). The log includes:

- Circuit status checks
- Circuit state changes (open/closed)
- Alert generation
- Recovery attempts
- Historical data management

## Data Storage

The service stores historical circuit breaker data in JSON files organized by date (`data/circuit-monitor/circuit-history-YYYY-MM-DD.json`). This data can be used for analysis, such as:

- Identifying services that trip frequently
- Finding patterns of failures
- Measuring recovery effectiveness
- Calculating service reliability metrics

## Extending the System

The monitoring system is designed to be extensible:

- **Additional Notification Channels**: The architecture supports adding more notification channels beyond email and Slack.
- **Dashboard Integration**: The historical data can be used to build dashboards showing circuit breaker status over time.
- **Service Health Correlation**: The system could be extended to correlate circuit trips with other service metrics.

## Troubleshooting

If the monitoring service is not working as expected:

1. Check the logs in `logs/circuit-monitor.log`
2. Verify that the API Gateway's `/circuit-status` endpoint is accessible
3. Ensure the service has the correct permissions to write to the data and logs directories
4. Check that the environment variables are set correctly

## Future Enhancements

Potential future enhancements include:

1. A web UI for visualizing circuit breaker status
2. More sophisticated recovery strategies
3. Machine learning for predictive failure detection
4. Integration with external monitoring tools

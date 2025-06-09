# Risk Assessment Application

A comprehensive platform for conducting security risk assessments, analyzing results, and generating detailed compliance reports.

## Architecture

This application follows a microservices architecture with the following components:

- **Frontend**: React-based SPA with TypeScript and Material-UI
- **API Gateway**: Central entry point for all API requests
- **Auth Service**: Handles user authentication and authorization
- **Questionnaire Service**: Manages assessment templates and submissions
- **Analysis Service**: Processes assessment data and generates risk scores
- **Report Service**: Creates PDF reports from analysis results
- **Payment Service**: Handles subscription plans and payments

## Running the Application

### Prerequisites

- Docker and Docker Compose
- Node.js (v14 or later)
- NPM (v7 or later)

### Starting the Services

```bash
# Start all services in detached mode
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:5000

### Testing the Services

Two testing scripts are provided to verify the functionality of the application:

1. **Basic Service Test**

```bash
# Make the script executable if needed
chmod +x test-services.sh

# Run the basic service test
./test-services.sh
```

This script will:
- Stop any running containers
- Start all services
- Check if each service is responding correctly
- Test basic API functionality including authentication

2. **End-to-End Flow Test**

```bash
# Make the script executable if needed
chmod +x e2e-test.sh

# Run the end-to-end test
./e2e-test.sh
```

This script will test the complete user flow from:
- Registration and login
- Creating and submitting questionnaires
- Generating analysis results
- Creating and sharing reports
- Managing subscription plans and payments

## Development

### Service Configuration

Each service has its own configuration file located at `src/config/config.js` (or config.ts for TypeScript services). 

Key configuration settings include:
- Environment-specific parameters (dev/prod)
- Database connections
- JWT secrets 
- Service-specific settings

### Database Schema

The application uses PostgreSQL with Prisma ORM. Schema definitions are located in `prisma/schema.prisma` for each service.

### API Documentation

Each service exposes its own API endpoints:

- Auth Service: `/api/auth/*`
- Questionnaire Service: `/api/questionnaires/*`
- Analysis Service: `/api/analysis/*`
- Report Service: `/api/reports/*`
- Payment Service: `/api/payments/*`

## Troubleshooting

If you encounter issues:

1. Check the container logs:
```
docker-compose logs [service-name]
```

2. Verify all services are running:
```
docker-compose ps
```

3. Restart a specific service:
```
docker-compose restart [service-name]
```

4. Reset all containers and volumes:
```
docker-compose down -v
docker-compose up -d
```

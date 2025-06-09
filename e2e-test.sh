#!/bin/bash

# End-to-End Testing Script for Risk Assessment Application
# This script tests the main user flows from registration to report generation

echo "=== Risk Assessment App E2E Testing Script ==="
echo ""

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:5000/api"
FRONTEND_URL="http://localhost:3000"

# Test user credentials
TEST_EMAIL="e2etest@example.com"
TEST_PASSWORD="E2ETestPassword123!"
TEST_NAME="E2E Test User"

# Test data
TEST_QUESTIONNAIRE_ID=""
TEST_ANALYSIS_ID=""
TEST_REPORT_ID=""

# Ensure services are running
ensure_services_running() {
  echo -e "${YELLOW}Verifying API Gateway is accessible...${NC}"
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/health")
  
  if [ "$response" != "200" ]; then
    echo -e "${RED}API Gateway is not accessible. Please start services using ./test-services.sh${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}API Gateway is accessible${NC}"
}

# Test registration and login
test_authentication() {
  echo -e "\n${BLUE}=== Testing Authentication Flow ===${NC}"
  
  # Register test user (will fail if user exists, which is fine)
  echo -e "${YELLOW}Registering test user: $TEST_EMAIL${NC}"
  register_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}" \
    $API_URL/auth/register)
  
  echo "Registration response: $register_response"
  
  # Login with test user
  echo -e "${YELLOW}Logging in as test user: $TEST_EMAIL${NC}"
  login_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    $API_URL/auth/login)
  
  # Extract token from login response
  token=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$token" ]; then
    echo -e "${RED}Failed to get authentication token${NC}"
    exit 1
  else
    echo -e "${GREEN}Successfully obtained authentication token${NC}"
    # Save token for later use
    echo $token > /tmp/risk_assessment_test_token
  fi
}

# Test questionnaire flow
test_questionnaire_flow() {
  echo -e "\n${BLUE}=== Testing Questionnaire Flow ===${NC}"
  
  token=$(cat /tmp/risk_assessment_test_token)
  
  # Get available questionnaire templates
  echo -e "${YELLOW}Fetching questionnaire templates${NC}"
  templates_response=$(curl -s -H "Authorization: Bearer $token" $API_URL/questionnaires/templates)
  echo "Templates: $templates_response"
  
  # Extract first template ID
  template_id=$(echo $templates_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$template_id" ]; then
    # If no templates found, try getting one through API
    echo -e "${YELLOW}No templates found. Creating a sample template...${NC}"
    
    # Create a simple template for testing
    template_data='{
      "title": "E2E Test Template",
      "description": "Template created for E2E testing",
      "framework": "ISO27001",
      "sections": [
        {
          "title": "Access Control",
          "questions": [
            {
              "text": "Do you have an access control policy?",
              "type": "boolean",
              "required": true
            },
            {
              "text": "How often do you review access rights?",
              "type": "select",
              "options": ["Monthly", "Quarterly", "Annually", "Never"],
              "required": true
            }
          ]
        }
      ]
    }'
    
    create_template_response=$(curl -s -X POST -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$template_data" \
      $API_URL/questionnaires/templates)
    
    echo "Create template response: $create_template_response"
    template_id=$(echo $create_template_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  fi
  
  if [ -z "$template_id" ]; then
    echo -e "${RED}Failed to get or create a template ID${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Using template ID: $template_id${NC}"
  
  # Start a questionnaire submission
  echo -e "${YELLOW}Starting questionnaire submission${NC}"
  start_submission_data="{\"templateId\":\"$template_id\"}"
  
  start_submission_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$start_submission_data" \
    $API_URL/questionnaires/submissions)
  
  echo "Start submission response: $start_submission_response"
  
  # Extract submission ID
  submission_id=$(echo $start_submission_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$submission_id" ]; then
    echo -e "${RED}Failed to get submission ID${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Created submission with ID: $submission_id${NC}"
  
  # Submit questionnaire responses
  echo -e "${YELLOW}Submitting questionnaire responses${NC}"
  
  # Create simple response data - this would be more complex in real usage
  response_data='{
    "responses": [
      {
        "questionId": "q1",
        "value": true
      },
      {
        "questionId": "q2",
        "value": "Quarterly"
      }
    ]
  }'
  
  submit_response=$(curl -s -X PUT -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$response_data" \
    $API_URL/questionnaires/submissions/$submission_id)
  
  echo "Submit response: $submit_response"
  
  # Finalize submission
  echo -e "${YELLOW}Finalizing questionnaire submission${NC}"
  finalize_response=$(curl -s -X POST -H "Authorization: Bearer $token" \
    $API_URL/questionnaires/submissions/$submission_id/finalize)
  
  echo "Finalize response: $finalize_response"
  
  # Save submission ID for analysis test
  TEST_QUESTIONNAIRE_ID=$submission_id
  echo $submission_id > /tmp/risk_assessment_test_submission_id
}

# Test analysis flow
test_analysis_flow() {
  echo -e "\n${BLUE}=== Testing Analysis Flow ===${NC}"
  
  token=$(cat /tmp/risk_assessment_test_token)
  submission_id=$(cat /tmp/risk_assessment_test_submission_id)
  
  # Request analysis
  echo -e "${YELLOW}Requesting analysis for submission: $submission_id${NC}"
  request_analysis_data="{\"submissionId\":\"$submission_id\"}"
  
  request_analysis_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$request_analysis_data" \
    $API_URL/analysis)
  
  echo "Request analysis response: $request_analysis_response"
  
  # Extract analysis ID
  analysis_id=$(echo $request_analysis_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$analysis_id" ]; then
    echo -e "${RED}Failed to get analysis ID${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Created analysis with ID: $analysis_id${NC}"
  
  # Wait for analysis to complete (in real scenario, we'd poll)
  echo -e "${YELLOW}Waiting for analysis to complete (10 seconds)...${NC}"
  sleep 10
  
  # Get analysis results
  echo -e "${YELLOW}Fetching analysis results${NC}"
  analysis_response=$(curl -s -H "Authorization: Bearer $token" \
    $API_URL/analysis/$analysis_id)
  
  echo "Analysis response: $analysis_response"
  
  # Save analysis ID for report test
  TEST_ANALYSIS_ID=$analysis_id
  echo $analysis_id > /tmp/risk_assessment_test_analysis_id
}

# Test report flow
test_report_flow() {
  echo -e "\n${BLUE}=== Testing Report Flow ===${NC}"
  
  token=$(cat /tmp/risk_assessment_test_token)
  analysis_id=$(cat /tmp/risk_assessment_test_analysis_id)
  
  # Generate report
  echo -e "${YELLOW}Generating report for analysis: $analysis_id${NC}"
  generate_report_data="{\"analysisId\":\"$analysis_id\"}"
  
  generate_report_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$generate_report_data" \
    $API_URL/reports)
  
  echo "Generate report response: $generate_report_response"
  
  # Extract report ID
  report_id=$(echo $generate_report_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$report_id" ]; then
    echo -e "${RED}Failed to get report ID${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Created report with ID: $report_id${NC}"
  
  # Wait for report generation to complete
  echo -e "${YELLOW}Waiting for report generation to complete (10 seconds)...${NC}"
  sleep 10
  
  # Get report
  echo -e "${YELLOW}Fetching report details${NC}"
  report_response=$(curl -s -H "Authorization: Bearer $token" \
    $API_URL/reports/$report_id)
  
  echo "Report response: $report_response"
  
  # Test share report feature
  echo -e "${YELLOW}Testing report sharing functionality${NC}"
  share_data='{
    "expiresIn": 7,
    "accessCode": true
  }'
  
  share_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$share_data" \
    $API_URL/reports/$report_id/share)
  
  echo "Share report response: $share_response"
}

# Test payment flow
test_payment_flow() {
  echo -e "\n${BLUE}=== Testing Payment Flow ===${NC}"
  
  token=$(cat /tmp/risk_assessment_test_token)
  
  # Get available plans
  echo -e "${YELLOW}Fetching subscription plans${NC}"
  plans_response=$(curl -s -H "Authorization: Bearer $token" $API_URL/payments/plans)
  
  echo "Plans response: $plans_response"
  
  # Extract first plan ID
  plan_id=$(echo $plans_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$plan_id" ]; then
    echo -e "${RED}No plans available${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Using plan ID: $plan_id${NC}"
  
  # Create checkout session
  echo -e "${YELLOW}Creating checkout session for plan: $plan_id${NC}"
  checkout_data="{\"planId\":\"$plan_id\"}"
  
  checkout_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$checkout_data" \
    $API_URL/payments/checkout-session)
  
  echo "Checkout response: $checkout_response"
  
  # In a real test, we would complete payment through Stripe,
  # but we can't do that in this script
  
  # Check subscriptions
  echo -e "${YELLOW}Fetching user subscriptions${NC}"
  subscriptions_response=$(curl -s -H "Authorization: Bearer $token" \
    $API_URL/payments/subscriptions)
  
  echo "Subscriptions response: $subscriptions_response"
  
  # Check invoices
  echo -e "${YELLOW}Fetching user invoices${NC}"
  invoices_response=$(curl -s -H "Authorization: Bearer $token" \
    $API_URL/payments/invoices)
  
  echo "Invoices response: $invoices_response"
}

# Clean up test data
cleanup() {
  echo -e "\n${BLUE}=== Cleaning Up Test Data ===${NC}"
  
  # Remove temporary files
  rm -f /tmp/risk_assessment_test_token
  rm -f /tmp/risk_assessment_test_submission_id
  rm -f /tmp/risk_assessment_test_analysis_id
  
  # Note: In a real test environment, we might delete the test user and their data
  # from the database, but we're not implementing that here as it would require
  # additional admin privileges
}

# Main test execution
main() {
  echo -e "${BLUE}Starting end-to-end tests for Risk Assessment Application${NC}"
  echo -e "${YELLOW}This script will test the main user flows from registration to report generation${NC}"
  echo ""
  
  # Ensure services are running
  ensure_services_running
  
  # Run test flows
  test_authentication
  test_questionnaire_flow
  test_analysis_flow
  test_report_flow
  test_payment_flow
  
  # Clean up
  cleanup
  
  echo -e "\n${GREEN}E2E tests completed${NC}"
  echo -e "${YELLOW}Note: Some tests may have failed if the application is not fully configured${NC}"
  echo -e "${YELLOW}Check individual test results above for details${NC}"
}

# Run the main function
main

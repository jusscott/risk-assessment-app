#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testFrontendSaveProgress() {
  console.log('🔍 Testing frontend save progress flow...\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      // Only log relevant messages
      if (text.includes('save') || 
          text.includes('progress') || 
          text.includes('questionnaire') || 
          text.includes('PUT') ||
          text.includes('error') ||
          text.includes('200') ||
          text.includes('submissions')) {
        console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      }
    });

    // Enable network request/response logging
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('/submissions/') && response.request().method() === 'PUT') {
        console.log(`\n📡 NETWORK RESPONSE:`);
        console.log(`   URL: ${url}`);
        console.log(`   Method: ${response.request().method()}`);
        console.log(`   Status: ${status}`);
        console.log(`   Status Text: ${response.statusText()}`);
        
        // Log response headers
        const headers = response.headers();
        console.log(`   Headers:`, headers);
        
        // Try to get response body
        response.text().then(body => {
          console.log(`   Response Body:`, body.substring(0, 500));
        }).catch(err => {
          console.log(`   Response Body: [Could not read - ${err.message}]`);
        });
      }
    });

    page.on('requestfailed', request => {
      const url = request.url();
      if (url.includes('/submissions/')) {
        console.log(`\n❌ NETWORK REQUEST FAILED:`);
        console.log(`   URL: ${url}`);
        console.log(`   Method: ${request.method()}`);
        console.log(`   Failure: ${request.failure()?.errorText || 'Unknown'}`);
      }
    });

    console.log('🌐 Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    console.log('🔐 Attempting to login...');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill login form
    await page.type('input[type="email"]', 'good@test.com');
    await page.type('input[type="password"]', 'Password123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('h4', { timeout: 15000 });
    console.log('✅ Login successful');

    console.log('📋 Navigating to questionnaires...');
    
    // Navigate to questionnaires page
    await page.goto('http://localhost:3000/questionnaires', { waitUntil: 'networkidle2' });
    
    // Wait for questionnaires to load
    await page.waitForSelector('.MuiTab-root', { timeout: 10000 });
    
    console.log('🔍 Looking for in-progress questionnaires...');
    
    // Click on "IN PROGRESS" tab
    const tabs = await page.$$('.MuiTab-root');
    if (tabs.length > 1) {
      await tabs[1].click(); // Click second tab (IN PROGRESS)
      await page.waitForTimeout(2000);
    }
    
    // Look for existing in-progress questionnaires
    const inProgressCards = await page.$$('.MuiCard-root');
    
    if (inProgressCards.length > 0) {
      console.log('📝 Found in-progress questionnaire, clicking to resume...');
      
      // Click the first in-progress questionnaire
      const continueButton = await page.$('button:has-text("Continue"), .MuiButton-root:has-text("Continue")');
      if (continueButton) {
        await continueButton.click();
      } else {
        // Try clicking the card itself
        await inProgressCards[0].click();
      }
      
      // Wait for questionnaire detail page to load
      await page.waitForSelector('textarea, input[type="text"], .MuiRadio-root', { timeout: 15000 });
      console.log('📋 Questionnaire detail page loaded');
      
    } else {
      console.log('🆕 No in-progress questionnaires found, starting new one...');
      
      // Click "START NEW" tab
      if (tabs.length > 2) {
        await tabs[2].click();
        await page.waitForTimeout(2000);
      }
      
      // Click on first available template
      const templateCards = await page.$$('.MuiCard-root');
      if (templateCards.length > 0) {
        const startButton = await templateCards[0].$('button');
        if (startButton) {
          await startButton.click();
          
          // Wait for questionnaire detail page to load
          await page.waitForSelector('textarea, input[type="text"], .MuiRadio-root', { timeout: 15000 });
          console.log('📋 New questionnaire started');
        }
      }
    }

    console.log('\n💾 Testing save progress functionality...');
    
    // Fill in an answer
    console.log('✏️ Filling in an answer...');
    
    // Try different input types
    const textArea = await page.$('textarea');
    if (textArea) {
      await textArea.clear();
      await textArea.type('This is a test answer for save progress functionality.');
      console.log('✅ Filled textarea');
    }
    
    const radioButton = await page.$('.MuiRadio-root input');
    if (radioButton) {
      await radioButton.click();
      console.log('✅ Selected radio button');
    }
    
    const textInput = await page.$('input[type="text"]');
    if (textInput) {
      await textInput.clear();
      await textInput.type('Test answer');
      console.log('✅ Filled text input');
    }

    console.log('\n🔄 Clicking Save Progress button...');
    
    // Click Save Progress button
    const saveButton = await page.$('button:has-text("Save Progress"), .MuiButton-root:has-text("Save Progress")');
    if (saveButton) {
      await saveButton.click();
      console.log('✅ Save Progress button clicked');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Check for success/error messages
      const successAlert = await page.$('.MuiAlert-standardSuccess');
      const errorAlert = await page.$('.MuiAlert-standardError');
      
      if (successAlert) {
        const successText = await successAlert.textContent();
        console.log('✅ SUCCESS MESSAGE:', successText);
      }
      
      if (errorAlert) {
        const errorText = await errorAlert.textContent();
        console.log('❌ ERROR MESSAGE:', errorText);
      }
      
      if (!successAlert && !errorAlert) {
        console.log('⚠️ No success or error message found');
      }
      
    } else {
      console.log('❌ Save Progress button not found');
    }

    console.log('\n🔍 Checking browser network tab and console for additional information...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser left open for manual inspection. Close manually when done.');
    console.log('Press Ctrl+C to exit this script.');
    
    // Keep the script running
    await new Promise(() => {});
  }
}

testFrontendSaveProgress().catch(console.error);

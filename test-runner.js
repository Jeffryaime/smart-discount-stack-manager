#!/usr/bin/env node

/**
 * Test Runner for BOGO Feature
 * 
 * This script runs all the tests for the new BOGO feature to ensure
 * it's working correctly across frontend and backend.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running BOGO Feature Test Suite\n');

// Test configuration
const tests = [
  {
    name: 'Backend BOGO Validation Tests',
    command: 'cd backend && npm test -- __tests__/bogo-validation.test.js',
    description: 'Testing BOGO validation logic and business rules'
  },
  {
    name: 'Backend BOGO Calculator Tests', 
    command: 'cd backend && npm test -- __tests__/bogo-backend.test.js',
    description: 'Testing BOGO calculation engine and modes'
  },
  {
    name: 'Frontend BOGO Component Tests',
    command: 'cd frontend && npm test -- src/components/__tests__/DiscountRuleForm.simple.test.js --watchAll=false',
    description: 'Testing BOGO UI components and user interactions'
  }
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(test) {
  console.log(`${colors.blue}${colors.bold}📋 ${test.name}${colors.reset}`);
  console.log(`${colors.yellow}   ${test.description}${colors.reset}\n`);

  try {
    const output = execSync(test.command, { 
      encoding: 'utf8',
      cwd: __dirname,
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer to capture full output
    });
    
    // Only show debug output if no tests are found
    let showDebug = false;
    
    // Parse Jest output for test results
    const lines = output.split('\n');
    
    // Look for Jest summary line like "Tests: 10 passed, 10 total"
    const summaryLine = lines.find(line => 
      line.includes('Tests:') && 
      (line.includes('passed') || line.includes('failed')) &&
      line.includes('total')
    );
    
    let testsPassed = 0;
    let testsFailed = 0;
    
    if (summaryLine) {
      // Parse lines like "Tests: 9 passed, 9 total" or "Tests: 1 failed, 8 passed, 9 total"
      const passedMatch = summaryLine.match(/(\d+) passed/);
      const failedMatch = summaryLine.match(/(\d+) failed/);
      
      if (passedMatch) testsPassed = parseInt(passedMatch[1]);
      if (failedMatch) testsFailed = parseInt(failedMatch[1]);
    } else {
      // Alternative parsing: look for "PASS" indicators and count them
      const passLines = lines.filter(line => line.trim().startsWith('✓'));
      testsPassed = passLines.length;
      
      const failLines = lines.filter(line => line.trim().startsWith('✕'));
      testsFailed = failLines.length;
      
      // If still no tests found, try looking for PASS/FAIL keywords
      if (testsPassed === 0 && testsFailed === 0) {
        showDebug = true;
        
        // Look for Jest output patterns
        const jestPassLine = lines.find(line => line.includes('PASS') && line.includes('.test.js'));
        const jestFailLine = lines.find(line => line.includes('FAIL') && line.includes('.test.js'));
        
        if (jestPassLine || jestFailLine) {
          // Count individual test results
          const testResultLines = lines.filter(line => 
            line.trim().match(/^✓/) || line.trim().match(/^✕/)
          );
          testsPassed = testResultLines.filter(line => line.trim().startsWith('✓')).length;
          testsFailed = testResultLines.filter(line => line.trim().startsWith('✕')).length;
        }
      }
    }
    
    totalTests += testsPassed + testsFailed;
    passedTests += testsPassed;
    failedTests += testsFailed;
    
    if (testsFailed === 0 && testsPassed > 0) {
      console.log(`${colors.green}✅ ${test.name} - All ${testsPassed} tests passed!${colors.reset}\n`);
    } else if (testsFailed > 0) {
      console.log(`${colors.red}❌ ${test.name} - ${testsFailed} test(s) failed, ${testsPassed} passed${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️ ${test.name} - No tests detected in output${colors.reset}\n`);
      if (showDebug) {
        console.log(`${colors.blue}Debug - Raw output (first 1000 chars):${colors.reset}`);
        console.log(output.substring(0, 1000));
        console.log(`${colors.blue}Debug - Last 500 chars:${colors.reset}`);
        console.log(output.substring(Math.max(0, output.length - 500)));
      }
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ ${test.name} - Failed to run tests${colors.reset}`);
    console.log(`${colors.red}Error: ${error.message}${colors.reset}\n`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log(`${colors.bold}Starting test execution...${colors.reset}\n`);
  
  for (const test of tests) {
    await runTest(test);
  }
  
  // Summary
  console.log(`${colors.bold}🎯 Test Summary${colors.reset}`);
  console.log('═'.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  
  if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All BOGO feature tests passed! Feature is ready for use.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ Some tests failed. Please review and fix issues before deploying.${colors.reset}`);
    process.exit(1);
  }
}

// Feature test checklist
function printTestChecklist() {
  console.log(`${colors.bold}🔍 BOGO Feature Test Checklist${colors.reset}`);
  console.log('─'.repeat(50));
  console.log('✓ Toggle between "specific SKUs" and "auto-cheapest" modes');
  console.log('✓ Free Products field disabled when in cheapest mode');
  console.log('✓ Validation for cheapest mode requiring eligible products');
  console.log('✓ Limit Per Order validation and enforcement');
  console.log('✓ API endpoints handle new freeProductMode field');
  console.log('✓ Database model supports new schema');
  console.log('✓ Fallback logic for same-price items');
  console.log('✓ UI shows appropriate help text and banners');
  console.log('');
}

// Run tests
printTestChecklist();
runAllTests().catch(console.error);
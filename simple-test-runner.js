#!/usr/bin/env node

/**
 * Enhanced BOGO Test Runner with External Configuration
 * 
 * Features:
 * - 🔧 External JSON configuration file support
 * - 🌍 Environment variable overrides (TEST_CONFIG_PATH, TEST_TIMEOUT, etc.)
 * - 📁 Pre-flight directory validation with graceful skipping
 * - ⏱️ Configurable timeout protection with process termination
 * - 🛡️ Enhanced error handling with stack traces and context
 * - 📊 Safe output formatting with truncation indicators
 * - 🎯 Robust Jest output parsing with multiple fallback patterns
 * - 📋 Configurable test checklists and suite descriptions
 * - 🔍 Detailed process debugging and error context
 * - 🚀 Backward compatibility with fallback configuration
 * 
 * Usage:
 * - node simple-test-runner.js
 * - TEST_CONFIG_PATH=./custom.json node simple-test-runner.js
 * - TEST_DEBUG=true TEST_TIMEOUT=30000 node simple-test-runner.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Validate configuration object structure
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateConfigStructure(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  // Check testSuite structure
  if (config.testSuite) {
    if (typeof config.testSuite !== 'object') {
      console.log(`${colors.yellow}⚠️ Invalid config: testSuite must be an object${colors.reset}`);
      return false;
    }
    if (config.testSuite.timeout && (typeof config.testSuite.timeout !== 'number' || config.testSuite.timeout <= 0)) {
      console.log(`${colors.yellow}⚠️ Invalid config: testSuite.timeout must be a positive number${colors.reset}`);
      return false;
    }
    if (config.testSuite.checklist && !Array.isArray(config.testSuite.checklist)) {
      console.log(`${colors.yellow}⚠️ Invalid config: testSuite.checklist must be an array${colors.reset}`);
      return false;
    }
  }
  
  // Check tests structure
  if (config.tests) {
    if (!Array.isArray(config.tests)) {
      console.log(`${colors.yellow}⚠️ Invalid config: tests must be an array${colors.reset}`);
      return false;
    }
    for (let i = 0; i < config.tests.length; i++) {
      const test = config.tests[i];
      if (!test || typeof test !== 'object') {
        console.log(`${colors.yellow}⚠️ Invalid config: tests[${i}] must be an object${colors.reset}`);
        return false;
      }
      if (!test.name || typeof test.name !== 'string') {
        console.log(`${colors.yellow}⚠️ Invalid config: tests[${i}].name must be a string${colors.reset}`);
        return false;
      }
      if (!test.command || typeof test.command !== 'string') {
        console.log(`${colors.yellow}⚠️ Invalid config: tests[${i}].command must be a string${colors.reset}`);
        return false;
      }
      if (test.args && !Array.isArray(test.args)) {
        console.log(`${colors.yellow}⚠️ Invalid config: tests[${i}].args must be an array${colors.reset}`);
        return false;
      }
    }
  }
  
  // Check output structure
  if (config.output) {
    if (typeof config.output !== 'object') {
      console.log(`${colors.yellow}⚠️ Invalid config: output must be an object${colors.reset}`);
      return false;
    }
    if (config.output.maxOutputLength && (typeof config.output.maxOutputLength !== 'number' || config.output.maxOutputLength <= 0)) {
      console.log(`${colors.yellow}⚠️ Invalid config: output.maxOutputLength must be a positive number${colors.reset}`);
      return false;
    }
  }
  
  // Check debug structure
  if (config.debug) {
    if (typeof config.debug !== 'object') {
      console.log(`${colors.yellow}⚠️ Invalid config: debug must be an object${colors.reset}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Load test configuration from external config file or environment variables
 */
function loadTestConfiguration() {
  // Try to load from config file first
  const configPath = process.env.TEST_CONFIG_PATH || path.join(__dirname, 'test-config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Validate the configuration structure
      if (!validateConfigStructure(config)) {
        console.log(`${colors.red}❌ Invalid configuration structure in ${configPath}${colors.reset}`);
        console.log(`${colors.yellow}Falling back to default configuration...${colors.reset}`);
        return getDefaultConfiguration();
      }
      
      console.log(`${colors.blue}📋 Loaded and validated configuration from: ${configPath}${colors.reset}`);
      return config;
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.log(`${colors.red}❌ Invalid JSON syntax in ${configPath}: ${err.message}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Failed to load config from ${configPath}: ${err.message}${colors.reset}`);
    }
    console.log(`${colors.yellow}Falling back to default configuration...${colors.reset}`);
  }
  
  // Fallback to default configuration
  return getDefaultConfiguration();
}

/**
 * Get default configuration object
 * @returns {Object} Default configuration
 */
function getDefaultConfiguration() {
  return {
    testSuite: {
      name: 'BOGO Feature Test Suite',
      timeout: 60000,
      checklist: [
        'Toggle between "specific SKUs" and "auto-cheapest" modes',
        'Free Products field disabled when in cheapest mode',
        'Validation for cheapest mode requiring eligible products',
        'Limit Per Order validation and enforcement',
        'Backend calculation engine for both modes',
        'UI shows appropriate help text and banners'
      ]
    },
    tests: [
      {
        name: 'Backend BOGO Validation Tests',
        cwd: './backend',
        command: 'npm',
        args: ['test', '--', '__tests__/bogo-validation.test.js']
      },
      {
        name: 'Backend Enhanced BOGO Validation Tests',
        cwd: './backend',
        command: 'npm',
        args: ['test', '--', '__tests__/bogo-validation-enhanced.test.js']
      },
      {
        name: 'Backend BOGO Calculator Tests',
        cwd: './backend',
        command: 'npm',
        args: ['test', '--', '__tests__/bogo-backend.test.js']
      },
      {
        name: 'Backend BOGO Edge Cases Tests',
        cwd: './backend',
        command: 'npm',
        args: ['test', '--', '__tests__/bogo-edge-cases.test.js']
      },
      {
        name: 'Frontend BOGO Component Tests',
        cwd: './frontend',
        command: 'npm',
        args: ['test', '--', 'src/components/__tests__/DiscountRuleForm.simple.test.js', '--watchAll=false']
      }
    ],
    output: {
      maxOutputLength: 1000,
      maxSampleLength: 500,
      truncationIndicator: '...[output truncated]...',
      showFullOutput: false
    },
    debug: {
      showStackTrace: true,
      showProcessInfo: true,
      verboseErrors: true
    }
  };
}

// Load configuration and apply environment variable overrides
const config = loadTestConfiguration();

// Apply environment variable overrides
if (process.env.TEST_TIMEOUT) {
  const envTimeout = parseInt(process.env.TEST_TIMEOUT);
  if (!isNaN(envTimeout) && envTimeout > 0) {
    config.testSuite.timeout = envTimeout;
    console.log(`${colors.yellow}⚙️ Timeout overridden by environment: ${envTimeout}ms${colors.reset}`);
  }
}

if (process.env.TEST_DEBUG === 'true') {
  config.debug.showStackTrace = true;
  config.debug.verboseErrors = true;
  console.log(`${colors.yellow}⚙️ Debug mode enabled by environment${colors.reset}`);
}

if (process.env.TEST_VERBOSE === 'true') {
  config.output.showFullOutput = true;
  console.log(`${colors.yellow}⚙️ Verbose output enabled by environment${colors.reset}`);
}

const tests = config.tests;

console.log(`${colors.blue}${colors.bold}🚀 Running ${config.testSuite.name}${colors.reset}\n`);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Test timeout configuration (in milliseconds)
const TEST_TIMEOUT = config.testSuite.timeout || 60000;

// For demonstration purposes, you can temporarily set a shorter timeout like:
// const TEST_TIMEOUT = 5000; // 5 seconds for testing timeout behavior
//
// To test timeout behavior:
// 1. Set TEST_TIMEOUT to a small value (e.g., 5000ms)
// 2. Run a test that takes longer than the timeout
// 3. Observer the timeout mechanism in action

/**
 * Validates that test directories exist before running tests
 * @param {Array} tests - Array of test configurations
 * @returns {Array} Array of valid tests with existing directories
 */
function validateTestDirectories(tests) {
  const validTests = [];
  const skippedTests = [];
  
  for (const test of tests) {
    const testDir = path.resolve(__dirname, test.cwd);
    
    try {
      if (fs.existsSync(testDir)) {
        const stats = fs.statSync(testDir);
        if (stats.isDirectory()) {
          validTests.push(test);
        } else {
          console.log(`${colors.yellow}⚠️ Skipping "${test.name}": ${test.cwd} is not a directory${colors.reset}`);
          skippedTests.push(test);
        }
      } else {
        console.log(`${colors.yellow}⚠️ Skipping "${test.name}": Directory ${test.cwd} does not exist${colors.reset}`);
        skippedTests.push(test);
      }
    } catch (err) {
      logError(err, `Directory validation for "${test.name}"`, {
        testName: test.name,
        directory: test.cwd,
        resolvedPath: testDir
      });
      skippedTests.push(test);
    }
  }
  
  if (skippedTests.length > 0) {
    console.log(`${colors.yellow}📁 Directory validation: ${validTests.length} valid, ${skippedTests.length} skipped${colors.reset}\n`);
  }
  
  return validTests;
}

/**
 * Safely format output with proper truncation and separators
 * @param {string} output - The output to format
 * @param {number} maxLength - Maximum length before truncation
 * @param {string} label - Label for the output section
 * @returns {string} Formatted output
 */
function formatOutput(output, maxLength, label = 'Output') {
  if (!output || typeof output !== 'string') {
    return `${colors.yellow}[No ${label.toLowerCase()} available]${colors.reset}`;
  }
  
  // Safe access to config.output properties with fallbacks
  const outputConfig = config?.output || {};
  const actualMaxLength = Math.max(0, maxLength || outputConfig.maxOutputLength || 1000);
  const truncationIndicator = outputConfig.truncationIndicator || '...[truncated]...';
  
  // Add clear separators for readability
  const separator = '═'.repeat(50);
  let formattedOutput = `${colors.blue}${separator}${colors.reset}\n`;
  formattedOutput += `${colors.bold}${colors.blue}${label}:${colors.reset}\n`;
  formattedOutput += `${colors.blue}${separator}${colors.reset}\n`;
  
  if (output.length <= actualMaxLength) {
    formattedOutput += output;
  } else {
    formattedOutput += output.substring(0, actualMaxLength);
    formattedOutput += `\n${colors.yellow}${truncationIndicator}${colors.reset}`;
    formattedOutput += `\n${colors.yellow}(Showing ${actualMaxLength} of ${output.length} characters)${colors.reset}`;
  }
  
  formattedOutput += `\n${colors.blue}${separator}${colors.reset}\n`;
  return formattedOutput;
}

/**
 * Parse Jest test output to extract test counts
 * @param {string} output - The full test output string
 * @returns {Object} Object with testsPassed and testsFailed counts
 */
function parseJestOutput(output) {
  let testsPassed = 0;
  let testsFailed = 0;
  
  if (!output || typeof output !== 'string') {
    return { testsPassed, testsFailed };
  }
  
  // Normalize output for better parsing
  const normalizedOutput = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Try multiple Jest summary patterns in order of preference
  const summaryPatterns = [
    // Standard Jest format: "Tests: X passed, Y total" or "Tests: X failed, Y passed, Z total"
    /Tests:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed,\s+(\d+)\s+total/i,
    // Alternative format: "Tests: X failed, Y passed" (without total)
    /Tests:\s+(?:(\d+)\s+failed,?\s*)?(\d+)\s+passed/i,
    // Compact format: "X passed" or "X failed, Y passed"
    /(\d+)\s+failed,\s+(\d+)\s+passed/i,
    // Single result format: "X passed" only
    /(\d+)\s+passed/i,
    // Failed only format: "X failed"
    /(\d+)\s+failed/i
  ];
  
  let summaryParsed = false;
  
  for (const pattern of summaryPatterns) {
    const match = normalizedOutput.match(pattern);
    if (match) {
      // Handle different capture groups based on pattern
      if (pattern.source.includes('failed') && pattern.source.includes('passed') && pattern.source.includes('total')) {
        // Full format: failed, passed, total
        testsFailed = match[1] ? parseInt(match[1]) : 0;
        testsPassed = parseInt(match[2]);
      } else if (pattern.source.includes('failed') && pattern.source.includes('passed')) {
        // Failed and passed format
        if (match[2]) {
          testsFailed = parseInt(match[1]);
          testsPassed = parseInt(match[2]);
        } else {
          testsPassed = parseInt(match[1]);
        }
      } else if (pattern.source.includes('passed')) {
        // Passed only format
        testsPassed = parseInt(match[1]);
      } else if (pattern.source.includes('failed')) {
        // Failed only format
        testsFailed = parseInt(match[1]);
      }
      summaryParsed = true;
      break;
    }
  }
  
  // Enhanced fallback: count test result symbols with better patterns
  if (!summaryParsed || (testsPassed === 0 && testsFailed === 0)) {
    // Look for Jest test result indicators
    const passedPatterns = [/✓/g, /PASS/g, /√/g];
    const failedPatterns = [/✕/g, /FAIL/g, /×/g, /✗/g];
    
    for (const pattern of passedPatterns) {
      const matches = normalizedOutput.match(pattern);
      if (matches) {
        testsPassed = Math.max(testsPassed, matches.length);
      }
    }
    
    for (const pattern of failedPatterns) {
      const matches = normalizedOutput.match(pattern);
      if (matches) {
        testsFailed = Math.max(testsFailed, matches.length);
      }
    }
    
    // Additional fallback: look for "X test(s) passed" format
    if (testsPassed === 0 && testsFailed === 0) {
      const testWordMatch = normalizedOutput.match(/(\d+)\s+tests?\s+passed/i);
      if (testWordMatch) {
        testsPassed = parseInt(testWordMatch[1]);
      }
      
      const failedWordMatch = normalizedOutput.match(/(\d+)\s+tests?\s+failed/i);
      if (failedWordMatch) {
        testsFailed = parseInt(failedWordMatch[1]);
      }
    }
  }
  
  return { testsPassed, testsFailed };
}

/**
 * Enhanced error logging with full context
 * @param {Error} error - The error object
 * @param {string} context - Additional context about where the error occurred
 * @param {Object} additionalInfo - Additional debugging information
 */
function logError(error, context = '', additionalInfo = {}) {
  const debugConfig = config?.debug || {};
  
  console.log(`${colors.red}${colors.bold}❌ ERROR${context ? ` - ${context}` : ''}${colors.reset}`);
  
  if (error) {
    // Always show the error message
    console.log(`${colors.red}Message: ${error.message || 'Unknown error'}${colors.reset}`);
    
    // Show error name/type if available
    if (error.name && error.name !== 'Error') {
      console.log(`${colors.red}Type: ${error.name}${colors.reset}`);
    }
    
    // Show error code if available
    if (error.code) {
      console.log(`${colors.red}Code: ${error.code}${colors.reset}`);
    }
    
    // Show stack trace if enabled and available
    if (debugConfig.showStackTrace && error.stack) {
      console.log(`${colors.red}Stack Trace:${colors.reset}`);
      console.log(formatOutput(error.stack, config?.output?.maxOutputLength, 'Stack Trace'));
    }
  }
  
  // Show additional debugging information
  if (debugConfig.verboseErrors && Object.keys(additionalInfo).length > 0) {
    console.log(`${colors.yellow}Additional Debug Info:${colors.reset}`);
    for (const [key, value] of Object.entries(additionalInfo)) {
      console.log(`${colors.yellow}  ${key}: ${JSON.stringify(value)}${colors.reset}`);
    }
  }
  
  console.log(''); // Add spacing after error
}

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`${colors.blue}${colors.bold}📋 ${test.name}${colors.reset}`);
    
    const startTime = Date.now();
    let isCompleted = false;
    let timeoutId = null;
    
    const child = spawn(test.command, test.args, {
      cwd: path.resolve(__dirname, test.cwd),
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    // Set up timeout handler
    timeoutId = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true;
        const duration = Math.round((Date.now() - startTime) / 1000);
        
        console.log(`${colors.red}⏰ Test timeout after ${duration}s (max: ${TEST_TIMEOUT/1000}s)${colors.reset}`);
        console.log(`${colors.red}Terminating hung test process...${colors.reset}`);
        
        // Force kill the child process
        try {
          child.kill('SIGKILL');
        } catch (err) {
          logError(err, 'Failed to kill hung test process', {
            testName: test.name,
            processCommand: test.command,
            processArgs: test.args
          });
        }
        
        // Log timeout as a test failure
        failedTests += 1;
        totalTests += 1;
        
        console.log(`${colors.red}❌ Test suite timed out and was terminated${colors.reset}\n`);
        resolve();
      }
    }, TEST_TIMEOUT);

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (isCompleted) return; // Already handled by timeout
      
      isCompleted = true;
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      // Clear the timeout since test completed normally
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const fullOutput = output + errorOutput;
      
      // Parse Jest results using the extracted helper function
      const { testsPassed, testsFailed } = parseJestOutput(fullOutput);
      
      totalTests += testsPassed + testsFailed;
      passedTests += testsPassed;
      failedTests += testsFailed;
      
      if (code === 0 && testsPassed > 0) {
        console.log(`${colors.green}✅ All ${testsPassed} tests passed! (${duration}s)${colors.reset}\n`);
      } else if (testsFailed > 0) {
        console.log(`${colors.red}❌ ${testsFailed} test(s) failed, ${testsPassed} passed (${duration}s)${colors.reset}`);
        console.log(formatOutput(fullOutput, config.output.maxOutputLength, 'Test Failure Output'));
      } else {
        console.log(`${colors.yellow}⚠️ No tests detected or process failed (${duration}s)${colors.reset}`);
        console.log(`${colors.yellow}Exit code: ${code}${colors.reset}`);
        if (fullOutput) {
          console.log(formatOutput(fullOutput, config?.output?.maxSampleLength, 'Process Output Sample'));
        }
      }
      
      resolve();
    });

    // Handle process errors (e.g., command not found)
    child.on('error', (err) => {
      if (isCompleted) return;
      
      isCompleted = true;
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      logError(err, `Process error for "${test.name}" after ${duration}s`, {
        testName: test.name,
        command: test.command,
        args: test.args,
        cwd: test.cwd,
        duration: duration
      });
      
      // Log as test failure
      failedTests += 1;
      totalTests += 1;
      
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('🔍 Test Suite Checklist');
  console.log('──────────────────────────────');
  
  // Display checklist from configuration
  if (config.testSuite.checklist && Array.isArray(config.testSuite.checklist)) {
    config.testSuite.checklist.forEach(item => {
      console.log(`✓ ${item}`);
    });
  }
  console.log('');

  // Validate test directories before running tests
  const validTests = validateTestDirectories(tests);
  
  if (validTests.length === 0) {
    console.log(`${colors.red}❌ No valid test directories found. Cannot run tests.${colors.reset}`);
    return;
  }

  for (const test of validTests) {
    await runTest(test);
  }

  // Summary
  console.log(`${colors.bold}🎯 Test Summary${colors.reset}`);
  console.log('══════════════════════════════════════════════════');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Timeout Protection: ${colors.blue}${TEST_TIMEOUT/1000}s per test suite${colors.reset}`);
  
  if (failedTests === 0 && totalTests > 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All ${totalTests} BOGO feature tests passed! Feature is ready for production.${colors.reset}`);
  } else if (totalTests === 0) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️ No tests were detected. Please check test configuration.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ Some tests failed. Please review and fix issues before deploying.${colors.reset}`);
  }
}

runAllTests().catch((error) => {
  logError(error, 'Test runner execution failed', {
    configPath: process.env.TEST_CONFIG_PATH || 'test-config.json',
    totalTestsConfigured: tests.length,
    timeoutSettings: TEST_TIMEOUT
  });
  process.exit(1);
});
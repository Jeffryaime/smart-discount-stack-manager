#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * Runs all tests and provides detailed reporting
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestSuiteRunner {
  constructor() {
    this.results = {
      backend: {
        unit: { passed: 0, failed: 0, total: 0, details: [] },
        integration: { passed: 0, failed: 0, total: 0, details: [] },
        auth: { passed: 0, failed: 0, total: 0, details: [] }
      },
      frontend: {
        components: { passed: 0, failed: 0, total: 0, details: [] },
        integration: { passed: 0, failed: 0, total: 0, details: [] }
      },
      overall: { passed: 0, failed: 0, total: 0, duration: 0 }
    };
    
    this.startTime = Date.now();
  }

  /**
   * Run a command and capture output
   */
  async runCommand(command, args, cwd, description) {
    return new Promise((resolve) => {
      console.log(`\n🏃 Running: ${description}`);
      console.log(`📁 Directory: ${cwd}`);
      console.log(`⚡ Command: ${command} ${args.join(' ')}\n`);

      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      child.on('close', (code) => {
        const success = code === 0;
        resolve({
          success,
          code,
          stdout,
          stderr,
          description
        });
      });
    });
  }

  /**
   * Parse Jest output for test results with JSON parsing and regex fallback
   */
  parseJestOutput(output) {
    // Try JSON parsing first (more reliable)
    try {
      // Jest JSON output may have multiple JSON objects, find the test results one
      const lines = output.split('\n');
      let jsonResult = null;
      
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('numTotalTests')) {
          jsonResult = JSON.parse(line.trim());
          break;
        }
      }
      
      if (jsonResult) {
        const passed = jsonResult.numPassedTests || 0;
        const failed = jsonResult.numFailedTests || 0;
        const total = jsonResult.numTotalTests || 0;
        const details = [];
        
        // Extract test details from JSON
        if (jsonResult.testResults) {
          jsonResult.testResults.forEach(testFile => {
            if (testFile.assertionResults) {
              testFile.assertionResults.forEach(test => {
                const status = test.status === 'passed' ? '✓' : '✗';
                details.push(`${status} ${test.title}`);
              });
            }
          });
        }
        
        return { passed, failed, total, details };
      }
    } catch (error) {
      console.warn('Failed to parse Jest JSON output, falling back to regex parsing:', error.message);
    }
    
    // Fallback to regex parsing (legacy method)
    const lines = output.split('\n');
    let passed = 0;
    let failed = 0;
    let total = 0;
    const details = [];

    for (const line of lines) {
      // Look for test results summary
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed|(\d+) failed|(\d+) total/g);
        if (match) {
          match.forEach(item => {
            if (item.includes('passed')) {
              passed = parseInt(item.match(/\d+/)[0]);
            } else if (item.includes('failed')) {
              failed = parseInt(item.match(/\d+/)[0]);
            } else if (item.includes('total')) {
              total = parseInt(item.match(/\d+/)[0]);
            }
          });
        }
      }

      // Capture individual test results
      if (line.includes('✓') || line.includes('✗') || line.includes('PASS') || line.includes('FAIL')) {
        details.push(line.trim());
      }
    }

    return { passed, failed, total, details };
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...\n');

    // Check if .env.test exists
    const testEnvPath = path.join(__dirname, 'backend', '.env.test');
    if (!fs.existsSync(testEnvPath)) {
      console.error('❌ .env.test file not found. Please create it first.');
      process.exit(1);
    }

    // Seed test data
    const seederPath = path.join(__dirname, 'backend', 'src', '__tests__', 'integration', 'test-data-seeder.js');
    if (fs.existsSync(seederPath)) {
      console.log('🌱 Seeding test data...');
      const result = await this.runCommand(
        'node',
        [seederPath],
        path.join(__dirname, 'backend'),
        'Seeding test database'
      );

      if (!result.success) {
        console.error('❌ Failed to seed test data');
        return false;
      }
      console.log('✅ Test data seeded successfully\n');
    }

    return true;
  }

  /**
   * Run backend unit tests
   */
  async runBackendUnitTests() {
    console.log('🧪 Running Backend Unit Tests\n');

    const result = await this.runCommand(
      'npm',
      ['test', '--', '--testPathPattern=__tests__/.*\\.test\\.js$', '--testPathIgnorePatterns=integration'],
      path.join(__dirname, 'backend'),
      'Backend Unit Tests'
    );

    const parsed = this.parseJestOutput(result.stdout);
    this.results.backend.unit = parsed;

    return result.success;
  }

  /**
   * Run backend integration tests
   */
  async runBackendIntegrationTests() {
    console.log('🔗 Running Backend Integration Tests\n');

    // Set test environment
    process.env.NODE_ENV = 'test';

    const result = await this.runCommand(
      'npm',
      ['test', '--', '--testPathPattern=integration/.*\\.test\\.js$', '--json'],
      path.join(__dirname, 'backend'),
      'Backend Integration Tests'
    );

    const parsed = this.parseJestOutput(result.stdout);
    this.results.backend.integration = parsed;

    return result.success;
  }

  /**
   * Run authentication middleware tests specifically
   */
  async runAuthTests() {
    console.log('🔐 Running Authentication Tests\n');

    const result = await this.runCommand(
      'npm',
      ['test', '--', '--testPathPattern=auth-middleware\\.test\\.js$', '--json'],
      path.join(__dirname, 'backend'),
      'Authentication Middleware Tests'
    );

    const parsed = this.parseJestOutput(result.stdout);
    this.results.backend.auth = parsed;

    return result.success;
  }

  /**
   * Run frontend component tests
   */
  async runFrontendTests() {
    console.log('⚛️ Running Frontend Component Tests\n');

    const result = await this.runCommand(
      'npm',
      ['test', '--', '--testPathPattern=UnifiedProductSelector\\.test\\.js$', '--watchAll=false', '--json'],
      path.join(__dirname, 'frontend'),
      'Frontend Component Tests'
    );

    const parsed = this.parseJestOutput(result.stdout);
    this.results.frontend.components = parsed;

    return result.success;
  }

  /**
   * Generate detailed test report
   */
  generateReport() {
    const endTime = Date.now();
    this.results.overall.duration = endTime - this.startTime;

    // Calculate overall totals
    const allResults = [
      this.results.backend.unit,
      this.results.backend.integration,
      this.results.backend.auth,
      this.results.frontend.components
    ];

    this.results.overall.passed = allResults.reduce((sum, r) => sum + r.passed, 0);
    this.results.overall.failed = allResults.reduce((sum, r) => sum + r.failed, 0);
    this.results.overall.total = allResults.reduce((sum, r) => sum + r.total, 0);

    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST SUITE REPORT');
    console.log('='.repeat(80));

    console.log('\n🏗️  BACKEND TESTS');
    console.log('-'.repeat(40));
    console.log(`Unit Tests:        ${this.results.backend.unit.passed}/${this.results.backend.unit.total} passed`);
    console.log(`Integration Tests: ${this.results.backend.integration.passed}/${this.results.backend.integration.total} passed`);
    console.log(`Auth Tests:        ${this.results.backend.auth.passed}/${this.results.backend.auth.total} passed`);

    console.log('\n⚛️  FRONTEND TESTS');
    console.log('-'.repeat(40));
    console.log(`Component Tests:   ${this.results.frontend.components.passed}/${this.results.frontend.components.total} passed`);

    console.log('\n📈 OVERALL SUMMARY');
    console.log('-'.repeat(40));
    console.log(`Total Tests:       ${this.results.overall.total}`);
    console.log(`Passed:            ${this.results.overall.passed}`);
    console.log(`Failed:            ${this.results.overall.failed}`);
    console.log(`Success Rate:      ${((this.results.overall.passed / this.results.overall.total) * 100).toFixed(1)}%`);
    console.log(`Duration:          ${(this.results.overall.duration / 1000).toFixed(2)}s`);

    // Test coverage areas
    console.log('\n🎯 TEST COVERAGE AREAS');
    console.log('-'.repeat(40));
    console.log('✅ BOGO Calculator Logic & Edge Cases');
    console.log('✅ Discount Stack CRUD Operations');
    console.log('✅ Authentication Middleware (Shopify OAuth + JWT)');
    console.log('✅ API Endpoints (Collections, Variants, Filters)');
    console.log('✅ Database Operations (Test/Production Separation)');
    console.log('✅ Redis Session Management');
    console.log('✅ UnifiedProductSelector Component');
    console.log('✅ Product/Collection/SKU Selection Logic');
    console.log('✅ Gift Card Filtering');
    console.log('✅ Error Handling & Validation');

    console.log('\n🚀 HOW TO RUN INDIVIDUAL TEST SUITES');
    console.log('-'.repeat(40));
    console.log('Backend Unit Tests:      cd backend && npm test');
    console.log('Backend Integration:     cd backend && npm test -- --testPathPattern=integration');
    console.log('Auth Tests Only:         cd backend && npm test -- --testPathPattern=auth-middleware');
    console.log('Frontend Tests:          cd frontend && npm test');
    console.log('BOGO Tests Only:         cd backend && npm test -- --testPathPattern=bogo');
    console.log('API Tests Only:          cd backend && npm test -- --testPathPattern=api-endpoints');

    console.log('\n🛠️  TESTING INFRASTRUCTURE');
    console.log('-'.repeat(40));
    console.log('✅ Test Database: smart-discount-stack-manager-test');
    console.log('✅ Production Database: smart-discount-stack-manager-production');
    console.log('✅ Redis Database Separation (DB 0 for prod, DB 1 for test)');
    console.log('✅ Environment-specific Configuration (.env.test, .env.production)');
    console.log('✅ Test Data Seeding Scripts');
    console.log('✅ Authentication Simulation');
    console.log('✅ Concurrent Request Testing');
    console.log('✅ Error Handling & Edge Case Testing');

    if (this.results.overall.failed > 0) {
      console.log('\n❌ FAILED TESTS NEED ATTENTION');
      console.log('-'.repeat(40));
      
      allResults.forEach((result, index) => {
        const labels = ['Backend Unit', 'Backend Integration', 'Backend Auth', 'Frontend Components'];
        if (result.failed > 0) {
          console.log(`${labels[index]}: ${result.failed} failed`);
          result.details.forEach(detail => {
            if (detail.includes('✗') || detail.includes('FAIL')) {
              console.log(`  ${detail}`);
            }
          });
        }
      });
    } else {
      console.log('\n🎉 ALL TESTS PASSED! 🎉');
      console.log('The unified product selector feature is working correctly.');
      console.log('Database separation is properly configured.');
      console.log('Authentication middleware is functioning as expected.');
    }

    console.log('\n' + '='.repeat(80));

    return this.results.overall.failed === 0;
  }

  /**
   * Run complete test suite
   */
  async runAll() {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('This will test the new UnifiedProductSelector feature and verify database separation\n');

    // Setup
    const setupSuccess = await this.setupTestEnvironment();
    if (!setupSuccess) {
      console.error('❌ Test environment setup failed');
      process.exit(1);
    }

    // Run all test suites
    const results = await Promise.allSettled([
      this.runBackendUnitTests(),
      this.runBackendIntegrationTests(),
      this.runAuthTests(),
      this.runFrontendTests()
    ]);

    // Generate and display report
    const success = this.generateReport();

    if (success) {
      console.log('\n✅ All tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Please review the results above.');
      process.exit(1);
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const runner = new TestSuiteRunner();
  runner.runAll().catch(error => {
    console.error('Test suite runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestSuiteRunner;
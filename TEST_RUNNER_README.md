# Enhanced Test Runner

The enhanced test runner provides flexible configuration and robust error handling for running the BOGO feature test suite.

## Features

- 🔧 **External Configuration**: Test configurations stored in JSON file
- 🌍 **Environment Variable Support**: Override settings via environment variables
- 🛡️ **Enhanced Error Handling**: Comprehensive error logging with stack traces
- 📊 **Safe Output Formatting**: Proper truncation with clear indicators
- ⏱️ **Timeout Protection**: Configurable timeouts with process termination
- 📁 **Directory Validation**: Pre-flight checks for test directories

## Configuration

### Config File: `test-config.json`

```json
{
  "testSuite": {
    "name": "BOGO Feature Test Suite",
    "timeout": 60000,
    "checklist": [
      "Toggle between \"specific SKUs\" and \"auto-cheapest\" modes",
      "Free Products field disabled when in cheapest mode",
      "..."
    ]
  },
  "tests": [
    {
      "name": "Backend BOGO Validation Tests",
      "cwd": "./backend",
      "command": "npm",
      "args": ["test", "--", "__tests__/bogo-validation.test.js"],
      "category": "validation"
    }
  ],
  "output": {
    "maxOutputLength": 1000,
    "maxSampleLength": 500,
    "truncationIndicator": "...[output truncated]...",
    "showFullOutput": false
  },
  "debug": {
    "showStackTrace": true,
    "showProcessInfo": true,
    "verboseErrors": true
  }
}
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TEST_CONFIG_PATH` | Path to config file | `./custom-config.json` |
| `TEST_TIMEOUT` | Timeout in milliseconds | `30000` |
| `TEST_DEBUG` | Enable debug mode | `true` |
| `TEST_VERBOSE` | Enable verbose output | `true` |

## Usage

### Basic Usage
```bash
node simple-test-runner.js
```

### With Custom Config
```bash
TEST_CONFIG_PATH=./my-config.json node simple-test-runner.js
```

### With Environment Overrides
```bash
TEST_DEBUG=true TEST_TIMEOUT=30000 node simple-test-runner.js
```

### Debug Mode
```bash
TEST_DEBUG=true node simple-test-runner.js
```

## Output Features

### Safe Output Formatting
- Automatically truncates long outputs
- Shows truncation indicators
- Displays character counts
- Clear section separators

### Enhanced Error Logging
- Full error messages
- Stack traces (when enabled)
- Error codes and types
- Additional context information

### Example Error Output
```
❌ ERROR - Process error for "Backend Tests" after 5s
Message: Command failed
Type: Error
Code: ENOENT
Stack Trace:
═══════════════════════════════════════════════════
...full stack trace...
═══════════════════════════════════════════════════
Additional Debug Info:
  testName: "Backend Tests"
  command: "npm"
  args: ["test"]
  duration: 5
```

## Configuration Examples

### Different Test Suites
```json
{
  "testSuite": {
    "name": "API Integration Tests",
    "timeout": 120000
  },
  "tests": [
    {
      "name": "API Endpoint Tests",
      "cwd": "./api",
      "command": "npm",
      "args": ["run", "test:integration"]
    }
  ]
}
```

### Custom Output Settings
```json
{
  "output": {
    "maxOutputLength": 2000,
    "maxSampleLength": 1000,
    "truncationIndicator": "...[MORE OUTPUT AVAILABLE]...",
    "showFullOutput": true
  }
}
```

### Development vs Production Settings
```json
{
  "debug": {
    "showStackTrace": true,
    "showProcessInfo": true,
    "verboseErrors": true
  }
}
```

## Error Handling

The enhanced error handling provides:

1. **Comprehensive Error Details**: Error message, type, code, and stack trace
2. **Context Information**: Test name, command, arguments, duration
3. **Safe Fallbacks**: Graceful handling of missing config files
4. **Process Management**: Proper cleanup of hung processes

## Migration from Hardcoded Configuration

If you're migrating from the old hardcoded configuration:

1. **Move test definitions** to `test-config.json`
2. **Update paths and commands** as needed
3. **Configure output and debug settings**
4. **Test with environment variable overrides**

The runner automatically falls back to default configuration if the config file is missing, ensuring backward compatibility.
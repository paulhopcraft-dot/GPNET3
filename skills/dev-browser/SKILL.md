# Dev Browser Skill

## Purpose

Enable AI agents to verify frontend behavior using a real browser.
This skill provides browser automation capabilities for Ralph autonomous execution
and other AI agents that need to test web applications.

## Metadata

```yaml
name: dev-browser
version: 1.0.0
description: Browser automation skill for AI agent verification
category: testing
requires_dependencies: ["puppeteer", "commander"]
cross_platform: true
```

## Installation

```bash
cd skills/dev-browser
npm install
```

## Usage

The skill provides a CLI tool `browser-test.js` with multiple commands for browser automation:

### Basic Commands

```bash
# Check if element exists
node browser-test.js exists http://localhost:3000 "#login-form"

# Get text content
node browser-test.js text http://localhost:3000 ".error-message"

# Take screenshot
node browser-test.js screenshot http://localhost:3000 screenshot.png

# Check server health
node browser-test.js health http://localhost:3000
```

### Interactive Commands

```bash
# Click element
node browser-test.js click http://localhost:3000 "#submit-button"

# Fill form field
node browser-test.js fill http://localhost:3000 "#email" "test@example.com"

# Wait for text to appear
node browser-test.js wait-text http://localhost:3000 ".status" "Success"

# Check URL contains text
node browser-test.js url-contains http://localhost:3000 "/dashboard"
```

### Advanced Commands

```bash
# Get select options
node browser-test.js options http://localhost:3000 "#country-select"

# Execute custom JavaScript
node browser-test.js script http://localhost:3000 "document.title"
```

## Ralph Integration

This skill is designed specifically for Ralph autonomous execution.
Ralph uses browser verification to confirm user stories are implemented correctly.

### Acceptance Criteria Format

In features.json, use browser verification criteria:

```json
"acceptanceCriteria": [
  "browser_verify: exists #login-form",
  "browser_verify: text .error-msg contains 'Invalid email'",
  "browser_verify: url-contains '/dashboard'"
]
```

### Ralph Execution Process

1. Ralph implements a user story
2. Ralph runs browser verification commands
3. All acceptance criteria must pass for story completion
4. If verification fails, Ralph attempts rollback

## Command Reference

### Core Verification Commands

| Command | Purpose | Exit Code | Usage |
|---------|---------|-----------|--------|
| `exists` | Check element exists | 0=found, 1=not found | `exists <url> <selector>` |
| `text` | Get element text | Always 0 | `text <url> <selector>` |
| `wait-text` | Wait for text | 0=found, 1=timeout | `wait-text <url> <selector> <text>` |
| `url-contains` | Check URL contains text | 0=match, 1=no match | `url-contains <url> <text>` |
| `health` | Server health check | 0=healthy, 1=error | `health <url>` |

### Interactive Commands

| Command | Purpose | Usage |
|---------|---------|--------|
| `click` | Click element | `click <url> <selector>` |
| `fill` | Fill form field | `fill <url> <selector> <value>` |
| `screenshot` | Take screenshot | `screenshot <url> [filename]` |
| `options` | Get select options | `options <url> <selector>` |
| `script` | Execute JavaScript | `script <url> <javascript>` |

## Options

### Global Options
- `--no-sandbox` - Disable sandbox (required for Linux/Docker)
- `--verbose` - Show detailed error messages

### Command-Specific Options
- `--full-page` (screenshot) - Capture entire page
- `--wait-after <ms>` (click) - Wait after clicking
- `--timeout <ms>` (wait-text, health) - Custom timeout

## Platform Support

### Linux Notes
If Puppeteer fails on Linux, install dependencies:
```bash
# Ubuntu/Debian
sudo apt-get install -y libnss3 libxss1 libasound2 libxtst6 libxrandr2 libasound2 libpangocairo-1.0-0 libgtk-3-0

# CentOS/RHEL
sudo yum install -y alsa-lib atk at-spi2-atk cairo cups-libs gtk3 libdrm libX11 libXcomposite libXdamage libXext libXfixes libXrandr libXss pango
```

Use `--no-sandbox` flag in CI/Docker environments:
```bash
node browser-test.js exists http://localhost:3000 "#test" --no-sandbox
```

### Windows/macOS
Works out of the box after `npm install`.

## Error Handling

### Common Errors and Solutions

**Element not found:**
- Verify element selector is correct
- Check if page is fully loaded
- Use `wait-text` instead of `exists` for dynamic content

**Server not reachable:**
- Verify development server is running
- Check URL and port are correct
- Use `health` command to test connectivity

**Timeout errors:**
- Increase timeout with `--timeout` option
- Check for slow-loading content
- Verify JavaScript execution isn't blocking

**Sandbox errors (Linux):**
- Use `--no-sandbox` flag
- Install required system dependencies
- Run in Docker with proper privileges

## Ralph Usage Examples

### User Authentication Story
```json
{
  "story": "As a user, I can log in with email and password",
  "acceptanceCriteria": [
    "browser_verify: exists #login-form",
    "browser_verify: exists #email-input",
    "browser_verify: exists #password-input",
    "browser_verify: exists #login-button"
  ]
}
```

Ralph would run:
```bash
node ../skills/dev-browser/browser-test.js exists http://localhost:3000 "#login-form"
node ../skills/dev-browser/browser-test.js exists http://localhost:3000 "#email-input"
# etc...
```

### Form Validation Story
```json
{
  "story": "As a user, I see error message for invalid email",
  "acceptanceCriteria": [
    "browser_verify: fill #email-input 'invalid-email'",
    "browser_verify: click #submit-button",
    "browser_verify: wait-text .error-message 'Invalid email format'"
  ]
}
```

### Navigation Story
```json
{
  "story": "As a logged-in user, I am redirected to dashboard",
  "acceptanceCriteria": [
    "browser_verify: url-contains '/dashboard'",
    "browser_verify: text .welcome-message contains 'Welcome'"
  ]
}
```

## Troubleshooting

### Debug Mode
Add console logging for debugging:
```bash
DEBUG=puppeteer:* node browser-test.js exists http://localhost:3000 "#test"
```

### Screenshot on Error
Take screenshot when tests fail:
```bash
node browser-test.js screenshot http://localhost:3000 debug-screenshot.png
```

### Manual Verification
Use interactive mode to debug selectors:
```bash
# Start browser in non-headless mode
node browser-test.js exists http://localhost:3000 "#test" --headless=false
```

This skill enables reliable, browser-based verification for Ralph autonomous execution,
ensuring that user stories are implemented and working in real browsers.
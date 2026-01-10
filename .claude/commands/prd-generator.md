# PRD Generator Command

## Metadata
```yaml
name: prd-generator
description: Interactive PRD creation for Ralph autonomous execution
version: 1.0.0
category: ralph
requires_project: true
interactive: true
```

## Purpose

Interactive PRD creation that generates features.json with user stories
optimized for Ralph autonomous execution. Guides users through structured
feature planning with browser-verifiable acceptance criteria.

## Usage

```bash
/prd-generator [feature_description]
```

**Arguments:**
- `feature_description` (optional): Brief description to start with

## How It Works

### Interactive Process:
1. **Feature Discovery** - What do you want to build?
2. **User Perspective** - Who will use this feature?
3. **Technical Context** - What's your technology stack?
4. **Story Breakdown** - Break feature into atomic stories
5. **Acceptance Criteria** - Create browser-verifiable tests
6. **Prerequisites** - Identify dependencies
7. **Rollback Planning** - Plan for failure recovery

### Output:
Creates `features.json` with proper schema for Ralph execution:
- Atomic user stories (≤30 min each)
- Browser-verifiable acceptance criteria
- Clear prerequisites and rollback procedures
- Realistic implementation estimates

## Examples

### E-commerce Feature:
```bash
/prd-generator "Shopping cart with add/remove items"
```

**Generated Stories:**
```json
{
  "features": [{
    "name": "Shopping Cart",
    "userStories": [
      {
        "story": "As a shopper, I can add item to cart",
        "acceptanceCriteria": [
          "browser_verify: click .add-to-cart-button",
          "browser_verify: text .cart-count contains '1'"
        ]
      }
    ]
  }]
}
```

### Authentication Feature:
```bash
/prd-generator "User login with email and password"
```

**Generated Stories:**
```json
{
  "features": [{
    "name": "User Authentication",
    "userStories": [
      {
        "story": "As a visitor, I can see login form",
        "acceptanceCriteria": [
          "browser_verify: exists #login-form",
          "browser_verify: exists #email-input",
          "browser_verify: exists #password-input"
        ]
      }
    ]
  }]
}
```

## Quality Guidelines

### Good User Stories:
✅ **Atomic**: "As a user, I can see a login form"
✅ **Specific**: "As a user, I get error for invalid email format"
✅ **Testable**: "As a user, I am redirected to /dashboard after login"

### Poor User Stories (Avoided):
❌ **Too vague**: "As a user, I want authentication to work"
❌ **Not atomic**: "As a user, I want login, signup, and password reset"
❌ **Not testable**: "As a user, I want beautiful UI"

### Browser Verification Patterns:

**Element Existence:**
```
browser_verify: exists #login-form
browser_verify: exists .error-message
browser_verify: exists button[type='submit']
```

**Text Content:**
```
browser_verify: text .welcome contains 'Welcome'
browser_verify: text .error contains 'Invalid email'
```

**Navigation:**
```
browser_verify: url-contains '/dashboard'
browser_verify: url-contains '?error=invalid'
```

**Form Interactions:**
```
browser_verify: fill #email 'test@example.com'
browser_verify: click #submit-button
browser_verify: wait-text .status 'Success'
```

## Integration Flow

```bash
# 1. Generate PRD
/prd-generator "Contact form with validation"

# 2. Validate PRD (mandatory)
/prd-harden

# 3. Launch autonomous development
/ralph-loop
```

## Features Generated

### Contact Form Example:
- **Story 1**: Display contact form with required fields
- **Story 2**: Validate email format on submit
- **Story 3**: Show success message after submission
- **Story 4**: Handle form submission errors

### Dashboard Example:
- **Story 1**: Display user welcome message
- **Story 2**: Show user profile information
- **Story 3**: Display navigation menu
- **Story 4**: Handle logout functionality

## Best Practices

### For Successful PRDs:
1. **Start simple** - Begin with core functionality
2. **Be specific** - Avoid vague requirements
3. **Think user-first** - Focus on user experience
4. **Plan for errors** - Include error handling stories
5. **Consider mobile** - Include responsive behavior

### Technical Considerations:
- Ensure your dev server setup is mentioned
- Include any required environment variables
- Note database schema requirements
- Specify required packages or dependencies

This command creates the foundation for successful Ralph autonomous execution
by generating well-structured, testable PRDs.
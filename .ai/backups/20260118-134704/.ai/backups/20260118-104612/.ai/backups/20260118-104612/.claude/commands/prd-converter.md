# PRD Converter Command

## Metadata
```yaml
name: prd-converter
description: Convert existing PRDs to Ralph-compatible format
version: 1.0.0
category: ralph
requires_project: true
interactive: true
```

## Purpose

Converts existing PRDs, feature lists, or requirements documents into Ralph-compatible
features.json format with browser-verifiable acceptance criteria and atomic user stories.

## Usage

```bash
/prd-converter [source]
```

**Arguments:**
- `source` (optional): Path to existing PRD file or paste requirements directly

## How It Works

### Conversion Process:
1. **Source Analysis** - Read existing requirements document
2. **Feature Extraction** - Identify distinct features
3. **Story Breakdown** - Convert to atomic user stories
4. **Criteria Conversion** - Transform to browser-verifiable tests
5. **User Validation** - Confirm converted requirements
6. **Generate features.json** - Output Ralph-compatible format

### Input Formats Supported:
- Markdown documents
- Text files with requirements
- Existing features.json (different schema)
- Copy-pasted requirements
- Business requirement documents
- User story collections

## Conversion Examples

### From High-Level Requirements:

**Input:**
> "Users should be able to register for an account with email validation and see a confirmation message"

**Converted Output:**
```json
{
  "features": [{
    "name": "User Registration",
    "userStories": [
      {
        "story": "As a visitor, I can see a registration form",
        "acceptanceCriteria": [
          "browser_verify: exists #registration-form",
          "browser_verify: exists #email-input",
          "browser_verify: exists #password-input"
        ]
      },
      {
        "story": "As a visitor, I get error for invalid email",
        "acceptanceCriteria": [
          "browser_verify: fill #email-input 'invalid-email'",
          "browser_verify: click #register-button",
          "browser_verify: wait-text .error 'Invalid email'"
        ]
      },
      {
        "story": "As a visitor, I get confirmation after registration",
        "acceptanceCriteria": [
          "browser_verify: fill #email-input 'test@example.com'",
          "browser_verify: fill #password-input 'password123'",
          "browser_verify: click #register-button",
          "browser_verify: wait-text .success 'Registration successful'"
        ]
      }
    ]
  }]
}
```

### From Business Requirements:

**Input:**
> "The shopping cart should allow users to add/remove items, update quantities, see totals, apply coupons, and proceed to checkout with order summary"

**Converted to Atomic Stories:**
1. Add item to cart
2. Remove item from cart
3. Update item quantity
4. Display cart total
5. Apply discount coupon
6. Show checkout button
7. Display order summary

## Conversion Patterns

### Abstract → Concrete

**Before:** "Good user experience"
**After:**
- `browser_verify: exists .loading-spinner` (feedback during actions)
- `browser_verify: text .error contains helpful message` (clear errors)

**Before:** "Responsive design"
**After:**
- `browser_verify: exists .mobile-menu` (mobile navigation)
- `browser_verify: text @media queries in CSS` (responsive breakpoints)

### Compound → Atomic

**Before:** "User authentication with profile management"
**After:**
1. Display login form
2. Validate login credentials
3. Redirect to dashboard after login
4. Show user profile information
5. Allow profile editing
6. Save profile updates
7. Handle logout

### Vague → Testable

**Before:** "Error handling"
**After:**
- `browser_verify: wait-text .error 'Invalid input'` (specific error messages)
- `browser_verify: exists .retry-button` (recovery actions)

## Common Conversion Challenges

### Backend Requirements:
**Original:** "Store user data in database"
**Conversion Focus:** Frontend behavior Ralph can verify
**Solution:** `browser_verify: text .welcome contains username` (proves data saved)

### Performance Requirements:
**Original:** "Page should load quickly"
**Conversion Focus:** User-visible loading states
**Solution:** `browser_verify: exists .loading-spinner` then `browser_verify: exists .content`

### Integration Requirements:
**Original:** "Connect to payment API"
**Conversion Focus:** User-visible results
**Solution:** `browser_verify: text .payment-status contains 'Success'`

## Validation Questions

During conversion, the system asks:

### Feature Completeness:
> "I've converted your feature into 5 user stories. Does this capture all functionality?"

**Options:**
- ✅ Yes, looks complete
- ⚠️ Missing some functionality
- 📝 Too detailed, could combine stories
- 🔍 Not detailed enough, needs more breakdown

### Technical Feasibility:
> "Are these acceptance criteria realistic for browser testing in your project?"

### Story Atomicity:
> "Can each story be completed in 30 minutes? Should any be split further?"

## Integration Workflow

```bash
# Option 1: Start with existing requirements
/prd-converter path/to/requirements.md

# Option 2: Paste requirements directly
/prd-converter
# Then paste/type requirements when prompted

# After conversion:
/prd-harden     # Validate converted PRD
/ralph-loop     # Execute autonomously
```

## Output Quality Assurance

### Every Converted Story Has:
- ✅ Clear user persona ("As a [user type]...")
- ✅ Specific goal ("I can [action]...")
- ✅ Business value ("so that [benefit]...")
- ✅ Browser-verifiable acceptance criteria
- ✅ 30-minute completion estimate
- ✅ Clear rollback procedure

### Every Acceptance Criterion:
- ✅ Starts with "browser_verify:"
- ✅ References specific HTML elements
- ✅ Objectively testable (pass/fail)
- ✅ Covers complete story functionality

## Examples by Industry

### E-commerce:
**Input:** "Product catalog with search and filtering"
**Stories:** Display products → Search products → Filter by category → Filter by price → Show search results

### SaaS Dashboard:
**Input:** "Analytics dashboard with charts and data export"
**Stories:** Display chart → Show data table → Export to CSV → Filter date range → Refresh data

### Blog/CMS:
**Input:** "Content management with editing and publishing"
**Stories:** List posts → Create new post → Edit existing post → Publish post → Delete post

## Best Practices

### For Successful Conversion:
1. **Break down compound requirements** early in the process
2. **Focus on user-visible behavior** rather than backend implementation
3. **Create end-to-end flows** that Ralph can verify in browser
4. **Validate with stakeholders** before finalizing conversion
5. **Start with happy path** scenarios, add edge cases as separate stories

### Technical Guidelines:
- Use specific element selectors (#id, .class)
- Include form interactions for dynamic features
- Plan for loading states and async operations
- Consider mobile responsive behavior
- Include error handling scenarios

This command bridges the gap between existing requirements and Ralph-executable PRDs,
preserving original intent while optimizing for autonomous implementation success.
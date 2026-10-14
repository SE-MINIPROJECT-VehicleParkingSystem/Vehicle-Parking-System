# Security and Quality Assurance Plan

## Scope

This document reviews the Vehicle Parking System described in the repository and defines the quality assurance and security assurance responsibilities for the project. The review is based on the system requirements, roles, architecture, and functional scope described in the project documentation.

## 1. Project Security Review Summary

The project manages sensitive operational data including:

- user identity and login credentials
- vehicle registration and parking history
- slot occupancy and allocation
- fee and payment records
- admin reports and operational privileges

Because the system stores vehicle and user data and supports authenticated access, the most important security goals are:

1. protect user authentication and session management
2. enforce role-based permissions for users, gate staff, and admins
3. validate all inputs and prevent malicious data injection
4. secure payment flows and financial records
5. prevent unauthorized access to slot and report data
6. ensure logs and audit trails are reliable and reviewable

## 2. Security Requirements by Feature

### 2.1 User Registration and Authentication

Security expectations:

- Passwords must be stored using a strong hash function such as bcrypt or Argon2.
- Use JWT access tokens with expiry and refresh handling.
- Prevent username enumeration by returning generic authentication errors.
- Enforce minimum password policy quality and lockout controls for repeated failed logins.
- Restrict self-registration to vehicle owners only.
- Require server-side validation for name, email, contact number, and plate number formatting.

Quality assurance checks:

- registration with valid and invalid email formats
- duplicate vehicle-owner accounts
- password hashing verification in database record
- invalid login returns generic error response
- staff/admin registration attempts are rejected

### 2.2 Role-Based Access Control (RBAC)

Security expectations:

- Owner, Gate Staff, and Administrator roles must be enforced server-side.
- Route-level authorization checks should be applied for all protected APIs.
- Admin-only actions must never be callable by owners or gate staff.
- Gate staff should be limited to entry/exit operations and not be able to modify pricing or user access.

Quality assurance checks:

- unauthorized role tries to access protected endpoints
- token tampering and fake role payload rejection
- cross-role access attempt to reports and pricing APIs

### 2.3 Vehicle Entry, Exit, and Slot Allocation

Security expectations:

- plate numbers should be standardized and validated.
- duplicate active vehicle entries must be blocked.
- slot assignment should be deterministic and based on valid available slots only.
- exit confirmation must verify ownership or gate validation before slot release.
- session and request state must not be manipulated to allocate a slot fraudulently.

Quality assurance checks:

- duplicate entry attempt on same vehicle
- allocation of occupied slot
- exit with invalid ticket or tampered reference number
- allocation under full-capacity conditions

### 2.4 Payment and Fee Calculation

Security expectations:

- parking duration and fees must be calculated server-side, not from untrusted client input.
- payment amounts must be rounded and compared against business rules.
- cash and online payment methods must be logged with transaction metadata.
- online payment simulation must not expose secret keys in client-side code.

Quality assurance checks:

- inconsistent fee values from forged requests
- negative duration or zero-cost fee handling
- payment confirmation mismatch between frontend and backend
- sandbox credentials excluded from client source

### 2.5 Admin Dashboard and Reporting

Security expectations:

- only authorized admin users should export CSV/PDF reports.
- reports should include only permitted data and should not leak restricted records.
- exported files should be generated from backend-validated data, not client-supplied content.

Quality assurance checks:

- unauthorized report download prevention
- role restriction for slot configuration and pricing updates
- log capture for every report export or admin change

## 3. Security Risk Register

| Risk | Impact | Likelihood | Control |
|------|--------|------------|---------|
| Weak password storage | High | Medium | bcrypt/Argon2 hashing |
| Broken JWT handling | High | Medium | short expiry, secure secret, verification on every request |
| IDOR / unauthorized route access | High | Medium | server-side RBAC and object ownership validation |
| Input validation bypass | High | High | schema validation and sanitization |
| Duplicate vehicle entry | Medium | High | unique active vehicle checks |
| Fraudulent fee modification | High | Medium | server-side fee calculation and audit logs |
| Insecure admin reports | High | Medium | RBAC + export authorization |
| Payment data exposure | High | Medium | secure env config, no secrets in frontend output |
| Session hijacking | High | Medium | secure cookies, HTTPS, token rotation |
| Lack of audit trails | Medium | High | log all critical actions |

## 4. Quality Assurance Strategy

The QA strategy should validate the system in three layers:

1. Functional quality
2. Security quality
3. Operational quality

### Functional Quality

- validate slot availability updates
- verify vehicle check-in and check-out flows
- verify automatic slot assignment logic
- verify receipt generation and parking duration calculations
- validate admin dashboard and report generation

### Security Quality

- verify authentication, authorization, and session controls
- test for injection, tampering, and privilege escalation
- validate logging and alerting for suspicious actions
- confirm handling of expired tokens and invalid API requests

### Operational Quality

- confirm application behavior under concurrent vehicle entry attempts
- test system recovery after failed payment or interrupted transaction
- ensure file export and report generation remain stable under large data volumes
- validate data consistency after repeated slot updates

## 5. QA Test Cases

### Authentication Tests

1. Register a valid owner account.
2. Attempt duplicate registration with the same email.
3. Use weak password and verify rejection.
4. Login with correct credentials and verify successful token issuance.
5. Login with wrong password and verify generic error message.
6. Attempt login with invalid token or expired JWT.
7. Attempt guest access to protected routes.

### Authorization Tests

1. Owner accesses staff-only endpoints and is rejected.
2. Gate staff accesses admin pricing configuration and is rejected.
3. Admin changes pricing and confirms success.
4. User attempts to view another user’s parking history and is rejected.

### Parking Workflow Tests

1. Vehicle enters and is assigned nearest available slot.
2. Duplicate entry for same active vehicle is rejected.
3. Vehicle exits and slot status is updated to available.
4. Fee is computed based on actual duration and configured pricing.
5. Full-capacity condition returns parking-full response.

### Report and Admin Tests

1. Admin exports occupancy report successfully.
2. Non-admin cannot export report.
3. Report contains the correct occupancy and revenue details.
4. Slot reservation or reconfiguration updates are logged.

### Security Regression Tests

1. SQL injection attempt on plate number or search fields.
2. XSS payload in vehicle metadata or profile field.
3. CSRF-style attempt on state-changing API endpoints without auth token.
4. JWT tampering detection.
5. Invalid user input causing application crash or exception leak.

## 6. Recommended Security Controls for the Implementation

- Use HTTPS in production.
- Keep secrets in environment variables and never in source control.
- Validate all request bodies through schemas such as Joi, Zod, or Express validator.
- Use HTTP-only, secure cookies for session management where applicable.
- Enforce strict CORS rules for web clients.
- Limit request size and types to avoid payload abuse.
- Log security-sensitive operations: login attempts, role changes, exits, pricing changes, and report exports.
- Store audit history for vehicle movement and admin actions.
- Implement rate limiting for login and API endpoints.
- Sanitize and encode any data displayed in the UI to guard against XSS.

## 7. Acceptance Criteria

The project should be considered secure and quality-ready when:

- authentication and authorization are enforced on all protected APIs
- role boundaries are verified in test cases
- all sensitive data is hashed, protected, and stored securely
- invalid inputs are rejected before processing
- reports and fees are generated from trusted backend logic
- audit logs capture key activities
- no critical vulnerabilities remain in the core user flows

## 8. Final Recommendation

The project has a sound functional design for a parking management system, but its security and QA quality depend heavily on careful backend enforcement. The highest-priority areas are authentication, authorization, input validation, and secure financial logic. If these controls are implemented and verified with the test cases above, the system will be suitable for academic demonstration and practical deployment in a controlled environment.

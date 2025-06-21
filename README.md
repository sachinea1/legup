# CleanFlow CRM - Cleaning Services Automation Platform

A comprehensive CRM platform built for cleaning companies with multi-tenant organization support, automated lead management, and secure authentication.

## Features

- **Multi-tenant Organization System**: Complete data isolation between organizations
- **Role-based Access Control**: Admin, Manager, and User roles with proper permissions
- **Automated Lead Management**: Lead qualification, follow-ups, and SMS automation
- **Secure Authentication**: JWT tokens with httpOnly cookies, bcrypt password hashing
- **Team Management**: Invite team members, manage roles, organization settings
- **Calendar Integration**: Schedule appointments and manage availability
- **SMS/Voice Automation**: Twilio integration for missed call handling and SMS responses

## Security Features

### Authentication & Authorization
- **Password Security**: All passwords hashed with bcrypt (12 rounds)
- **HTTP-only Cookies**: Secure token storage preventing XSS attacks
- **JWT Tokens**: 1-hour expiration with proper validation
- **Rate Limiting**: Auth endpoints protected against brute force attacks

### Data Isolation
- **Organization-level Isolation**: Users can only access data from their organization
- **User-level Filtering**: Leads, appointments, and SMS tied to specific users
- **Role-based Permissions**: Admins can manage organization, managers can invite users, regular users have read-only access to team features

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Twilio account (optional, for SMS features)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database and API credentials
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

## Authentication Testing

### Login Credentials
Test user: `h@gmail.com` / `testpass123`

### Security Verification with cURL

1. **Test Password Hashing** - Verify passwords are hashed in database:
```bash
# Check that passwords are bcrypt hashed, not plain text
psql $DATABASE_URL -c "SELECT email, password_hash FROM users LIMIT 1;"
```

2. **Test Login with httpOnly Cookie**:
```bash
# Login and save cookie
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"h@gmail.com","password":"testpass123"}' \
  -c cookies.txt \
  -v

# Should return 200 with Set-Cookie header containing httpOnly flag
```

3. **Test Protected Route with Cookie** (should work):
```bash
curl -X GET http://localhost:5000/api/leads \
  -b cookies.txt \
  -v

# Should return 200 with user's leads
```

4. **Test Protected Route without Auth** (should fail):
```bash
curl -X GET http://localhost:5000/api/leads \
  -v

# Should return 401 "Access token required"
```

5. **Test Invalid Token** (should fail):
```bash
curl -X GET http://localhost:5000/api/leads \
  -H "Authorization: Bearer invalid_token" \
  -v

# Should return 403 "Invalid or expired token"
```

### Data Isolation Testing

1. **User-level Data Isolation**:
```bash
# Login as user 1
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"h@gmail.com","password":"testpass123"}' \
  -c user1_cookies.txt

# Get leads for user 1
curl -X GET http://localhost:5000/api/leads \
  -b user1_cookies.txt

# Each user only sees their own leads
```

2. **Organization-level Isolation**:
```bash
# Users from different organizations cannot access each other's data
# Team management endpoints check organization membership
curl -X GET http://localhost:5000/api/organizations/999/members \
  -b user1_cookies.txt

# Should return 403 "Access denied" for different organization
```

## Database Schema

### Security-related Tables
- `users`: Stores hashed passwords, organization membership, roles
- `organizations`: Multi-tenant isolation with unique slugs
- `invitations`: Secure team invitation system with tokens
- `leads`: Tied to both ownerId and organizationId for proper isolation

### Key Security Fields
- `users.password_hash`: bcrypt hashed passwords (never plain text)
- `users.organization_id`: Organization membership for data isolation
- `users.role`: Role-based access control (admin/manager/user)
- All resources have `owner_id` and/or `organization_id` for filtering

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login (sets httpOnly cookie)
- `POST /api/auth/logout` - Logout (clears cookie)
- `GET /api/auth/me` - Get current user info

### Protected Resources (require authentication)
- `GET /api/leads` - Get user's leads only
- `GET /api/appointments` - Get user's appointments only  
- `GET /api/messages` - Get user's SMS messages only
- `GET /api/organizations/:id` - Organization info (members only)
- `GET /api/organizations/:id/members` - Team members (admin/manager only)

## Role Permissions Matrix

| Action | Admin | Manager | User |
|--------|-------|---------|------|
| View/Edit Personal Profile | ✅ | ✅ | ✅ |
| Change Password | ✅ | ✅ | ✅ |
| View Leads & Appointments | ✅ | ✅ | ✅ |
| View Organization Info | ✅ | ✅ | ❌ |
| Edit Organization Settings | ✅ | ✅ | ❌ |
| Invite Team Members | ✅ | ✅ | ❌ |
| Manage User Roles | ✅ | ❌ | ❌ |
| Remove Team Members | ✅ | ❌ | ❌ |

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cleanflow
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=sk-... (optional)
TWILIO_ACCOUNT_SID=AC... (optional)
TWILIO_AUTH_TOKEN=... (optional)
TWILIO_PHONE_NUMBER=+1... (optional)
```

## Security Best Practices Implemented

1. **Password Security**: bcrypt with 12 rounds, no plain text storage
2. **Session Management**: httpOnly cookies prevent XSS, secure flags in production
3. **Token Validation**: JWT with proper expiration and signature verification
4. **Rate Limiting**: Brute force protection on auth endpoints
5. **Data Isolation**: Multi-tenant architecture with organization and user-level filtering
6. **Role-based Access**: Granular permissions based on user roles
7. **Input Validation**: Zod schema validation on all endpoints
8. **SQL Injection Prevention**: Drizzle ORM with parameterized queries

## Development

```bash
# Start development server
npm run dev

# Push database schema changes
npm run db:push

# Generate database types
npm run db:generate
```

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use strong `JWT_SECRET` (32+ characters)
3. Enable HTTPS for secure cookies
4. Configure proper CORS policies
5. Set up database backups
6. Monitor rate limiting logs

## Testing Security

Run the cURL commands above to verify:
- ✅ Passwords are hashed in database
- ✅ Login returns httpOnly cookies
- ✅ Protected routes work with cookies (200)
- ✅ Protected routes fail without auth (401)
- ✅ Invalid tokens are rejected (403)
- ✅ Users only see their own data
- ✅ Organization isolation is enforced
# CleanFlow CRM - Cleaning Services Automation Platform

## Overview

CleanFlow is a comprehensive CRM platform built specifically for cleaning companies with multi-tenant organization support, automated lead management, and secure authentication. The platform provides a complete solution for managing leads, scheduling appointments, team collaboration, and automated SMS communications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite for fast development and building
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe forms
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT tokens stored in httpOnly cookies with bcrypt password hashing
- **External Integrations**: Twilio for SMS, OpenAI for AI-powered features, Google Calendar for scheduling

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (serverless PostgreSQL)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Connection Pooling**: Neon serverless connection pooling

## Key Components

### Authentication & Authorization
- **Multi-tenant System**: Organization-based data isolation
- **Role-based Access Control**: Owner, Manager, and Staff roles with hierarchical permissions
- **Secure Token Management**: JWT tokens with 1-hour expiration stored in httpOnly cookies
- **Password Security**: Bcrypt hashing with 12 rounds for strong password protection
- **Rate Limiting**: Protection against brute force attacks on authentication endpoints

### Lead Management System
- **Automated Lead Capture**: Customer widget for lead intake with validation
- **AI-powered Qualification**: OpenAI integration for lead scoring and prioritization
- **Status Tracking**: Comprehensive lead lifecycle management (new, contacted, booked, completed, cancelled)
- **Follow-up Automation**: Scheduled SMS follow-ups using cron jobs

### Organization Management
- **Multi-tenant Architecture**: Complete data isolation between organizations
- **Team Collaboration**: Invite system for adding team members with role-based permissions
- **Organization Settings**: Configurable business hours, services, and company information
- **Onboarding Flow**: Guided setup for new organizations

### Communication System
- **SMS Integration**: Twilio-powered SMS sending and receiving
- **AI Response Generation**: OpenAI-powered automatic SMS response suggestions
- **Message Threading**: Conversation tracking by phone number
- **Webhook Handling**: Real-time SMS and voice call processing

## Data Flow

### Lead Processing Flow
1. **Lead Capture**: Customer submits information via widget
2. **AI Qualification**: OpenAI analyzes lead data and assigns priority score
3. **Organization Assignment**: Lead is assigned to the organization and user
4. **Automated Follow-up**: System schedules follow-up actions based on lead priority
5. **Status Updates**: Team members can update lead status and add notes

### Authentication Flow
1. **Registration**: User creates account and sets up organization
2. **JWT Generation**: Server creates signed JWT with user and organization context
3. **Cookie Storage**: Token stored in httpOnly cookie for security
4. **Request Authentication**: Middleware validates token on protected routes
5. **Organization Context**: All data operations filtered by organization ID

### SMS Communication Flow
1. **Inbound SMS**: Twilio webhook receives incoming messages
2. **AI Processing**: OpenAI analyzes message intent and generates response
3. **Database Storage**: Messages stored with conversation threading
4. **Response Generation**: System sends automated or manual replies
5. **Lead Integration**: SMS conversations linked to existing leads when possible

## External Dependencies

### Required Services
- **Database**: Neon PostgreSQL for data persistence
- **SMS/Voice**: Twilio for communication features (optional but recommended)
- **AI Processing**: OpenAI API for intelligent lead qualification and response generation
- **Email**: SMTP service for transactional emails (password resets, invitations)

### Optional Integrations
- **Calendar**: Google Calendar API for appointment scheduling
- **Analytics**: Built-in stats and reporting dashboard

### Development Dependencies
- **Build Tool**: Vite for frontend bundling and development server
- **Type Checking**: TypeScript compiler for static analysis
- **Database Tools**: Drizzle Kit for schema management and migrations
- **Code Quality**: ESLint and Prettier for code formatting

## Deployment Strategy

### Environment Configuration
- **Environment Variables**: Centralized configuration for all external service credentials
- **Security**: Sensitive data stored in environment variables, never in code
- **Database URL**: Single connection string for database access
- **Service Keys**: Separate API keys for Twilio, OpenAI, and other services

### Production Setup
- **Build Process**: Vite builds frontend assets, esbuild bundles backend
- **Static Assets**: Frontend served from `/dist/public` directory
- **API Routes**: Express server handles `/api/*` endpoints
- **Database**: Automatic connection pooling with Neon serverless

### Development Workflow
- **Hot Reloading**: Vite provides instant frontend updates
- **API Development**: tsx for TypeScript execution in development
- **Database Migrations**: Drizzle push for schema synchronization
- **Type Safety**: Shared schema types between frontend and backend

The application is designed to scale horizontally with proper organization isolation and can handle multiple cleaning companies on a single deployment while maintaining complete data separation and security.
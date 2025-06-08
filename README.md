# CleanFlow - Cleaning Services Automation Platform

A full-stack automation platform for cleaning service businesses featuring lead capture, SMS automation, and intelligent scheduling.

## Features

### 🎯 Lead Management
- Smart widget for customer lead capture
- Multi-step form with validation
- Automatic lead status tracking
- Real-time dashboard updates

### 📱 SMS Automation
- Twilio integration for SMS communication
- OpenAI-powered intelligent responses
- Automatic follow-up sequences
- Missed call recovery system

### 📅 Smart Scheduling
- Google Calendar integration
- Availability checking
- Automated appointment reminders
- Real-time calendar sync

### 📊 Admin Dashboard
- Lead management with status tracking
- SMS conversation threads
- Calendar view with today's appointments
- Performance analytics

## Tech Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/ui** component library
- **React Hook Form** with Zod validation
- **TanStack Query** for data fetching
- **Wouter** for routing

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **Twilio SDK** for SMS
- **OpenAI API** for intelligent responses
- **Google Calendar API** for scheduling

### Infrastructure
- **PostgreSQL** database
- **Node-cron** for scheduled tasks
- **Environment-based configuration**

## Setup Instructions

### 1. Clone and Install
```bash
git clone <repository-url>
cd cleanflow
npm install

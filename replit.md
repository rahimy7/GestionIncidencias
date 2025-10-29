# Overview

IncidentTracker is a web-based incident management system designed for tracking and managing workplace incidents, non-conformities, and safety issues. The system provides a comprehensive solution for reporting incidents with photographic evidence, managing action plans, tracking progress, and generating reports. It features role-based access control, real-time dashboards, and workflow management for incident resolution.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side application is built with React 18 using TypeScript, implementing a modern component-based architecture. The UI framework is based on shadcn/ui components with Radix UI primitives, providing accessible and customizable interface elements. The application uses Wouter for lightweight client-side routing and TanStack Query for server state management with built-in caching and background updates.

The frontend follows a feature-based organization with shared components, hooks, and utilities. The styling system uses Tailwind CSS with CSS custom properties for theming support, including dark mode capabilities. Form handling is managed through React Hook Form with Zod schema validation for type-safe data validation.

## Backend Architecture
The server is built using Express.js with TypeScript, following a RESTful API design pattern. The application implements a layered architecture with clear separation between routes, business logic, and data access layers. The server uses session-based authentication with PostgreSQL session storage.

Database operations are handled through Drizzle ORM, providing type-safe database queries and migrations. The schema defines a comprehensive data model for users, incidents, centers, action plans, participants, and audit trails with proper relationships and constraints.

## Authentication System
Authentication is implemented using Replit's OIDC (OpenID Connect) integration with Passport.js. The system supports role-based access control with user roles including user, manager, department, supervisor, and admin. Sessions are stored in PostgreSQL for scalability and persistence across server restarts.

## File Management
The system includes a sophisticated object storage service integrated with Google Cloud Storage through Replit's sidecar architecture. File uploads are handled through Uppy with support for direct-to-cloud uploads via presigned URLs. The storage system implements Access Control Lists (ACL) for fine-grained permission management on uploaded files.

## Data Model
The database schema includes incident status tracking (reported, assigned, en_proceso, pending_approval, completed, closed), priority levels (low, medium, high, critical), and comprehensive audit logging. The system supports incident types, organizational centers, participant management, and action plan tracking with due dates and completion status.

## Development Environment
The application uses Vite for fast development builds and hot module replacement. The build process creates optimized production bundles with separate client and server builds. The development setup includes TypeScript checking, ESBuild for server bundling, and Replit-specific development tools.

# External Dependencies

## Database
- **PostgreSQL**: Primary database using Neon Database serverless PostgreSQL
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL adapter
- **Connection Pooling**: Neon serverless connection pooling for scalability

## Authentication Services
- **Replit OIDC**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware with OIDC strategy
- **express-session**: Session management with PostgreSQL store

## Cloud Storage
- **Google Cloud Storage**: Object storage through Replit sidecar integration
- **Uppy**: File upload client with dashboard modal interface
- **AWS S3 Plugin**: For presigned URL uploads and direct-to-cloud transfers

## Frontend Libraries
- **React Query**: Server state management and caching
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation library

## Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: JavaScript bundler for server builds
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer
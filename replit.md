# Overview

VIT SwapHands is a student marketplace application designed for VIT (Vellore Institute of Technology) students to buy, sell, and exchange items within the campus community. The platform facilitates safe and convenient transactions between students by providing features like item listings, wishlists, user profiles, and messaging capabilities. The application focuses on campus-specific needs with hostel block-based location filtering and student verification systems.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with **React 18** and **TypeScript**, utilizing modern React patterns with functional components and hooks. The application uses **Wouter** for client-side routing instead of React Router, providing a lightweight routing solution. State management is handled through **TanStack Query** (React Query) for server state and React's built-in useState/useContext for local state.

The UI is built with **shadcn/ui** components based on **Radix UI** primitives, providing accessible and customizable components. **Tailwind CSS** handles styling with a custom design system using CSS variables for theming support. The build system uses **Vite** for fast development and optimized production builds.

## Backend Architecture
The backend is an **Express.js** server written in TypeScript, following a RESTful API pattern. Authentication is implemented using **Passport.js** with local strategy and session-based authentication. Sessions are stored in PostgreSQL using **connect-pg-simple**.

The server uses a modular structure with separate files for routes, authentication, database operations, and storage abstractions. File uploads are handled with **Multer** middleware for item photos.

## Database Architecture
The application uses **PostgreSQL** as the primary database with **Drizzle ORM** for database operations and schema management. The database schema includes:

- **Users table**: Stores student information including email, encrypted passwords, registration details, hostel block, and role (student/admin)
- **Items table**: Contains product listings with title, description, category, condition, price, location, photos, and status
- **Wishlist table**: Many-to-many relationship between users and items for saved items
- **Messages table**: Facilitates communication between buyers and sellers

The schema uses PostgreSQL enums for controlled vocabularies (user roles, item categories, conditions, statuses, hostel blocks) ensuring data consistency.

## Authentication & Authorization
User authentication uses **scrypt** for password hashing with salts for security. Session management is handled through Express sessions with PostgreSQL storage. The system implements role-based access control with student and admin roles, where admins have additional privileges for user management and platform oversight.

## File Storage
Item photos are handled through Multer middleware with file size limits and type validation. The system stores uploaded files locally in an uploads directory with plans for potential cloud storage integration.

## Development Environment
The application is configured for **Replit** development with specific plugins and error handling. The development setup includes hot module replacement through Vite, TypeScript checking, and automatic server restarts.

## Current Replit Setup (October 2025)
- **Node.js**: Version 20 installed
- **Database**: PostgreSQL (Neon/Serverless) connected and configured
- **Environment Variables**: DATABASE_URL and related database credentials configured
- **Workflow**: "Start application" runs `npm run dev` on port 5000 with webview output
- **Server**: Express server listening on 0.0.0.0:5000
- **Vite Configuration**: Configured with `allowedHosts: true` for Replit proxy compatibility
- **Database Schema**: All tables created and synchronized using `npm run db:push`

# External Dependencies

## Database
- **@neondatabase/serverless**: Serverless PostgreSQL connection for Neon database
- **Drizzle ORM**: Type-safe database operations and schema management
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Authentication
- **Passport.js**: Authentication middleware with local strategy
- **express-session**: Session management for user authentication

## UI Framework
- **React 18**: Core frontend framework with TypeScript support
- **shadcn/ui + Radix UI**: Accessible component library with primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

## State Management
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form handling with validation support
- **Zod**: Schema validation for forms and API data

## File Handling
- **Multer**: Multipart form data parsing for file uploads
- **File type validation**: Image-only uploads with size restrictions

## Development Tools
- **Vite**: Build tool and development server with HMR
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundling for production builds

## Routing & Navigation
- **Wouter**: Lightweight client-side routing library
- **Protected routes**: Route-level authentication guards
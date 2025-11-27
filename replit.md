# Transformer Token Generation Exhibition Display

## Overview

An interactive exhibition-style web application that visualizes how AI transformer models generate text token-by-token. The application provides an immersive, full-screen experience demonstrating the token generation process with probability distributions, creating an educational display that makes technical AI concepts accessible through striking visual design.

The application allows users to input prompts and watch as AI models (Gemini or OpenAI) generate responses word-by-word, revealing the probability distributions that influenced each token choice. It's designed as a museum-quality interactive exhibit with carefully crafted typography, animations, and educational annotations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server. The application follows a component-based architecture with:

- **Routing**: Wouter for lightweight client-side routing (single main Exhibition page)
- **State Management**: React hooks (useState, useCallback, useEffect) with TanStack Query for server state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives, providing accessible, customizable components
- **Styling**: Tailwind CSS with custom design tokens for theming (light/dark mode support)
- **Animations**: Framer Motion for smooth, exhibition-quality transitions and micro-interactions

**Design System**: The application uses a hybrid Material Design + exhibition-grade interactive design approach:
- Typography hierarchy with Inter (display text) and JetBrains Mono (technical elements)
- Custom spacing primitives (2, 4, 6, 8, 12, 16, 24)
- Full-screen immersive layout with centered content areas
- Tailwind custom theme with HSL color tokens for comprehensive theming

**Key Components**:
- `Exhibition.tsx`: Main page orchestrating the token generation flow and user interactions
- `PromptInput.tsx`: Text input with preset prompt suggestions
- `TokenDisplay.tsx`: Animated display of generated tokens with focus on current token
- `ProbabilityBars.tsx`: Visualization of token probability distributions
- `Controls.tsx`: Generation controls (next, fast-forward, reset)
- `EducationalAnnotation.tsx`: Contextual educational information about the generation process
- `ModelSelector.tsx`: Toggle between Gemini and OpenAI models
- `ThemeProvider.tsx` + `ThemeToggle.tsx`: Light/dark theme management

### Backend Architecture

**Framework**: Express.js server with TypeScript, serving both API endpoints and static frontend files.

**API Design**: 
- RESTful API with a primary `/api/generate` POST endpoint
- Request validation using Zod schemas (defined in `shared/schema.ts`)
- Shared type definitions between frontend and backend via shared schema

**Server Structure**:
- `server/index.ts`: Express app setup with logging middleware
- `server/routes.ts`: API route handlers for token generation
- `server/static.ts`: Static file serving with SPA fallback
- `server/vite.ts`: Development-mode Vite middleware integration for HMR
- `server/storage.ts`: Minimal storage interface (currently in-memory)

**Development vs Production**:
- Development: Vite dev server middleware for hot module replacement
- Production: Pre-built static assets served from `dist/public`
- Build process bundles server code with esbuild, whitelisting common dependencies

### Data Storage

**Database**: The application is configured to use PostgreSQL via Drizzle ORM:
- Configuration: `drizzle.config.ts` points to `DATABASE_URL` environment variable
- Schema: Defined in `shared/schema.ts` (currently focused on generation request/response types)
- Connection: Uses `@neondatabase/serverless` for serverless-compatible PostgreSQL access
- Migrations: Generated in `./migrations` directory via `drizzle-kit`

**Current State**: The schema file currently defines TypeScript types and Zod validators for API contracts rather than database tables. The storage layer (`server/storage.ts`) uses in-memory storage, suggesting database integration is prepared but not actively used for persistence yet.

### External Dependencies

**AI Services**:
- **Google Gemini AI** (`@google/genai`): Primary text generation via `gemini-2.5-flash` model
- **OpenAI** (`openai`): Alternative text generation via `gpt-4o` model
- API keys required: `GEMINI_API_KEY` and `OPENAI_API_KEY` environment variables
- Token generation: Both services return text that's split into word-level tokens with mock probability distributions

**Database**:
- **Neon Database** (`@neondatabase/serverless`): Serverless PostgreSQL provider
- **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`): Type-safe database toolkit and migration manager
- Database URL required: `DATABASE_URL` environment variable

**UI Libraries**:
- **Radix UI**: Complete suite of headless, accessible React components (`@radix-ui/react-*`)
- **Framer Motion**: Animation library for smooth transitions and interactions
- **Shadcn/ui**: Pre-built component patterns combining Radix UI with Tailwind styling
- **Lucide React**: Icon library for consistent iconography

**Supporting Services**:
- **Session Management**: `express-session` with `connect-pg-simple` for PostgreSQL session store (configured but storage layer suggests sessions may be in-memory)
- **Authentication**: `passport` and `passport-local` packages included (not actively used in current codebase)
- **Form Handling**: `react-hook-form` with `@hookform/resolvers` for Zod schema validation

**Development Tools**:
- Replit-specific plugins for runtime error overlay, cartographer, and dev banner
- TypeScript for type safety across the entire stack
- Tailwind CSS with PostCSS for styling
- ESBuild for production server bundling
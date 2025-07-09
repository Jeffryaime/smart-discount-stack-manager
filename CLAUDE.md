# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Discount Stack Manager is a full-stack Shopify app that enables merchants to create and manage complex discount combinations with multiple rules and conditions.

**Tech Stack:**
- Backend: Node.js + Express.js, MongoDB (Mongoose), Redis, Shopify API v8
- Frontend: React.js + Shopify Polaris UI, React Query, Axios
- Authentication: JWT + Shopify OAuth
- Testing: Jest (no tests implemented yet)

## Essential Commands

### Development
```bash
# Install all dependencies (run after cloning)
npm run install:all

# Start both backend and frontend concurrently
npm run dev

# Start backend only (port 3000)
npm run backend:dev

# Start frontend only (port 3001)
npm run frontend:dev
```

### Building & Production
```bash
# Build frontend for production
npm run build

# Start production server (backend only)
npm start
```

### Testing
```bash
# Run all tests (currently no tests implemented)
npm test

# Run backend tests only
npm run backend:test

# Run frontend tests only
npm run frontend:test
```

### Shopify CLI
```bash
# Run Shopify CLI commands
npm run shopify
```

## Project Architecture

### Backend Structure (`/backend/src/`)
- **app.js**: Main Express server with middleware setup (CORS, Helmet, rate limiting)
- **config/**: Database (MongoDB) and Shopify API configuration
- **controllers/**: Route handlers for discounts and webhooks
- **middleware/**: Authentication and webhook verification
- **models/**: MongoDB schemas (DiscountStack model)
- **routes/**: API endpoints for auth, discounts, and webhooks
- **services/**: Business logic layer (currently empty)
- **utils/**: Utility functions (currently empty)

### Frontend Structure (`/frontend/src/`)
- **App.js**: Main React app with routing and Shopify providers
- **components/**: Reusable UI components (DiscountRuleForm)
- **pages/**: Page components (Dashboard, DiscountStacks, CreateDiscountStack)
- **hooks/**: Custom React hooks (useDiscountStacks)
- **services/**: API service layer for backend communication
- **contexts/**: React contexts (currently empty)
- **utils/**: Utility functions (currently empty)

### Key API Endpoints
- Authentication: `/api/auth/install`, `/api/auth/callback`
- Discount Stacks: `/api/discounts` (CRUD operations)
- Test Mode: `/api/discounts/:id/test`
- Webhooks: `/api/webhooks/app/uninstalled`, `/api/webhooks/orders/*`

## Environment Configuration

### Backend (.env)
```
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_APP_URL=https://your-app-domain.com
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
MONGODB_URI=mongodb://localhost:27017/smart-discount-stack-manager
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
PORT=3000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_SHOPIFY_API_KEY=your_shopify_api_key_here
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_APP_NAME=Smart Discount Stack Manager
```

## Important Technical Details

1. **Shopify API Version**: Uses Shopify API v8 (July 2023 version) with proper Node.js adapter
2. **Security**: Implements Helmet.js, rate limiting (100 req/15min), JWT auth, webhook verification
3. **Session Management**: Redis for session storage and caching
4. **Database**: MongoDB with Mongoose ODM for discount stack persistence
5. **Frontend State**: React Query for data fetching and caching
6. **UI Framework**: Shopify Polaris for consistent merchant-facing UI

## Key Features to Understand

1. **Discount Stacking**: Core feature allowing combination of multiple discount types
2. **Rule Conditions**: Minimum amounts, quantities, product/collection targeting
3. **Priority System**: Controls order of discount application
4. **Test Mode**: Preview calculations before going live
5. **Usage Tracking**: Monitor discount performance (model defined, not fully implemented)

## Development Considerations

1. **No TypeScript**: Project uses JavaScript throughout
2. **No Custom Linting**: Frontend uses CRA defaults, backend has no linting
3. **No Tests**: Testing infrastructure installed but no tests written
4. **Empty Service Layers**: Service directories exist but aren't utilized yet
5. **Environment URLs**: Recent refactor replaced hardcoded ngrok URLs with env vars

## Shopify App Configuration

The `shopify.app.toml` file defines:
- API scopes: read/write for products, orders, discounts, customers
- Webhook configurations for app lifecycle and order events
- App URL and redirect settings
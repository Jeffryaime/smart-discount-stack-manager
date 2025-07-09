# Smart Discount Stack Manager

A Shopify app that allows merchants to create and manage complex discount combinations (stacks) with multiple rules and conditions.

## Features

- **Discount Stacking**: Combine multiple discount types (percentage, fixed amount, BOGO, free shipping)
- **Advanced Conditions**: Set minimum amounts, quantities, product/collection targeting
- **Priority Management**: Control the order of discount application
- **Usage Tracking**: Monitor discount performance and usage
- **Date Range Control**: Schedule discount stacks with start/end dates
- **Test Mode**: Preview discount calculations before going live

## Project Structure

```
smart-discount-stack-manager/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, validation middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   ├── config/          # Configuration files
│   │   └── app.js           # Main application file
│   └── package.json
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── contexts/        # React contexts
│   ├── public/
│   └── package.json
├── shopify.app.toml         # Shopify app configuration
├── package.json             # Root package.json
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis (optional, for session storage)
- Shopify CLI
- Shopify Partner account

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd smart-discount-stack-manager
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Configure your environment variables in both `.env` files

5. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

### Backend Environment Variables

- `SHOPIFY_API_KEY`: Your Shopify app's API key
- `SHOPIFY_API_SECRET`: Your Shopify app's API secret
- `SHOPIFY_APP_URL`: Your app's public URL
- `SHOPIFY_WEBHOOK_SECRET`: Webhook verification secret
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string (optional)
- `JWT_SECRET`: Secret for JWT token signing

### Frontend Environment Variables

- `REACT_APP_SHOPIFY_API_KEY`: Your Shopify app's API key
- `REACT_APP_API_URL`: Backend API URL

## Development

### Starting the App

```bash
# Start both backend and frontend
npm run dev

# Start backend only
npm run backend:dev

# Start frontend only
npm run frontend:dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run backend:test

# Run frontend tests only
npm run frontend:test
```

### Building for Production

```bash
npm run build
```

## API Endpoints

### Authentication
- `GET /api/auth/install` - Initiate app installation
- `GET /api/auth/callback` - OAuth callback

### Discount Stacks
- `GET /api/discounts` - Get all discount stacks
- `POST /api/discounts` - Create new discount stack
- `GET /api/discounts/:id` - Get specific discount stack
- `PUT /api/discounts/:id` - Update discount stack
- `DELETE /api/discounts/:id` - Delete discount stack
- `POST /api/discounts/:id/test` - Test discount stack

### Webhooks
- `POST /api/webhooks/app/uninstalled` - App uninstall webhook
- `POST /api/webhooks/orders/created` - Order created webhook
- `POST /api/webhooks/orders/updated` - Order updated webhook

## Deployment

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Deploy to your hosting platform (Heroku, AWS, etc.)

3. Update your Shopify app configuration with the production URL

4. Set up webhooks in your Shopify Partner dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
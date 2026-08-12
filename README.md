# Invoice Generator

A full-stack application for generating invoices with PDF export capabilities.

## Tech Stack

**Frontend:** React 19, Vite, Tailwind CSS, React Router DOM

**Backend:** Node.js, Express, Puppeteer, ExcelJS, Zod (validation)

## Project Structure

```
invoice-generator/
├── client/              # React frontend
│   ├── src/             # Source code
│   ├── package.json
│   └── vite.config.js
├── server/              # Node.js backend
│   ├── src/             # Source code
│   ├── package.json
│   └── templates/
├── docs/                # Documentation
└── vercel.json          # Vercel configuration
```

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm or yarn

### Installation

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd server && npm install
```

### Development

```bash
# Start both frontend and server (root package.json has concurrent scripts)
npm run dev

# Or start individually:
# Frontend (http://localhost://5173)
cd client && npm run dev

# Backend (http://localhost:3001)
cd server && npm run dev
```

### Build

```bash
# Build frontend
cd client && npm run build

# Build backend (includes Puppeteer installation)
cd server && npm run build
```

## API Endpoints

### POST /api/generate
Generates an invoice PDF from provided data.

**Request body:**
- `eventName` (string) - Name of the event
- `clientDetails` (object) - Client information
- `sections` (array) - Invoice line item sections
- `taxRate` (number) - Tax percentage
- Other invoice-specific fields

**Response:** PDF file or generation status

### GET /api/history
Retrieves invoice generation history.

**Response:** Array of previous invoice records

### GET /health
Health check endpoint.

**Response:** `{ status: 'ok', timestamp: '...' }`

## Key Features

- **Invoice generation** - Create invoices with dynamic sections and line items
- **PDF export** - Generate professional PDF invoices using Puppeteer
- **Excel integration** - Manage invoice data with ExcelJS
- **History tracking** - Store and retrieve previous invoice generations
- **Responsive design** - Works on mobile and desktop

## Scripts

### Root `package.json`
- `npm run dev` - Start both frontend and server with concurrently
- `npm run build` - Build both frontend and server

### Client `package.json`
- `npm run dev` - Start Vite dev server
- `npm run build` - Build Vite production build
- `npm run test` - Run Vitest tests

### Server `package.json`
- `npm run start` - Start production server
- `npm run dev` - Start development server with watch mode
- `npm run test` - Run Jest tests
- `npm run create-template` - Create invoice template

## Deployment

This project is configured for Vercel deployment. See `vercel.json` for configuration details.

The server must be deployed as a Node.js serverless function or traditional Node server. The client can be deployed as static assets.
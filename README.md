# UmaDB Inspector

A modern web interface for exploring events in UmaDB - a distributed event sourcing database built in Rust.

## Features

- **Event Search** - Search and filter events by type, tags, and position  
- **Interactive Visualizations** - Timeline, flow analysis, heatmaps, and statistics
- **Event Lookup** - Search for specific events by UUID
- **Projection Runner** - Execute JavaScript projections against event data
- **Real-time Connection Status** - Monitor UmaDB connectivity
- **Responsive Design** - Modern UI built with React and Tailwind CSS

## Screenshots

### Partition Explorer
Browse and explore events across partitions with a condensed table view:

![Partition Explorer - Event List](docs/partition-explorer-1.png)

![Partition Explorer - Event Details](docs/partition-explorer-2.png)

### Projection Runner
Execute custom JavaScript projections to analyze event data:

![Projection Runner](docs/projection.png)

## Architecture

This is a monorepo containing:

- **`client/`** - React frontend with TypeScript, Vite, and Tailwind CSS
- **`server/`** - Express.js backend with gRPC client for UmaDB protocol
- **`shared/`** - Common TypeScript types and utilities

## Prerequisites

- Node.js 18+ 
- UmaDB instance running on gRPC protocol (default: `localhost:50051`)

## Quick Start

### Option 1: Using Docker (Recommended)

```bash
docker run -p 3001:3001 -e UMADB_URL=your-umadb-host:50051 tqwewe/umadb-inspector
```

Access the application at http://localhost:3001

### Option 2: Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development servers**
   ```bash
   # Start both client and server in development mode
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Environment Configuration

Create a `.env` file in the server directory to configure UmaDB connection:

```env
UMADB_URL=localhost:50051
PORT=3001
```

## UmaDB Overview

UmaDB organizes data around:
- **Single global event stream** with position-based ordering
- **Event types and tags** for flexible categorization and filtering  
- **Events** with unique UUIDs and sequential positions
- **gRPC protocol** for communication

## API Endpoints

- `GET /api/ping` - Test UmaDB connectivity
- `GET /api/events/:event_id` - Get event by UUID
- `GET /api/events/search` - Search events by filters
- `GET /api/events/scan` - Scan events by position range

## Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

This project is built for exploring UmaDB event data in a simple and intuitive way.

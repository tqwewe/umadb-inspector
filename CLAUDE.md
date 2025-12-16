# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the umadb-inspector project. It is a web interface for exploring events in UmaDB.

It should provide functionality for exploring events by type and tags in a simple and intuitive way using modern React.

A Node.js server will need to be running to communicate with UmaDB via gRPC, which will then return the data back to the
web client.

## UmaDB Overview

UmaDB is an event store database built in Rust that implements the Dynamic Consistency Boundaries (DCB) specification 
created by Bastian Waidelich, Sara Pellegrini, and Paul Grimshaw. The system stores events in a single global stream 
with monotonic position numbers. Events are categorized by event types and can have zero or more tags for flexible 
filtering. The database uses gRPC for communication and protobuf for message serialization.

## UmaDB gRPC API Reference

UmaDB uses gRPC for communication with protobuf messages.

### DCB Service

The main service for event operations.

#### Read

Stream events from the event store based on query criteria.

```protobuf
rpc Read(ReadRequest) returns (stream ReadResponse);
```

**ReadRequest:**
- `query` (optional): Query criteria with event types and tags
- `start` (optional): Starting position in the global stream
- `backwards` (optional): Read direction (false = forward, true = backwards)  
- `limit` (optional): Maximum number of events to return
- `subscribe` (optional): Keep connection open for new events
- `batch_size` (optional): Number of events to return in each response

**ReadResponse:**
- `events`: Array of SequencedEvent objects
- `head` (optional): Current head position of the stream

#### Append

Write events to the event store.

```protobuf
rpc Append(AppendRequest) returns (AppendResponse);
```

**AppendRequest:**
- `events`: Array of Event objects to append
- `condition` (optional): Conditional append criteria

**AppendResponse:**
- `position`: Position where the events were written

#### Head

Get the current head position of the event store.

```protobuf
rpc Head(HeadRequest) returns (HeadResponse);
```

**HeadResponse:**
- `position` (optional): Current head position

### Data Types

#### Event
- `event_type` (string): Logical event type (e.g., "UserCreated", "OrderPlaced")
- `tags` (repeated string): Tags for filtering/indexing
- `data` (bytes): Binary event payload
- `uuid` (string): Unique event identifier

#### SequencedEvent
- `position` (uint64): Position in the global event stream
- `event` (Event): The event data

#### Query
- `items` (repeated QueryItem): Query criteria (OR logic between items)

#### QueryItem
- `types` (repeated string): Event types to match (empty = all types)
- `tags` (repeated string): Tags that events must have (AND logic within item)

## Build and Development Commands

### Installation
First, install dependencies for all packages:
```bash
npm install
cd client && npm install
cd ../server && npm install
cd ../shared && npm install
cd ..
```

### Development
- `npm run dev` - Start both client and server in development mode
- `npm run client:dev` - Start only the React frontend development server
- `npm run server:dev` - Start only the Node.js backend development server

### Building
- `npm run build` - Build both client and server for production
- `npm run client:build` - Build only the React frontend
- `npm run server:build` - Build only the Node.js backend

### Production
- `npm start` - Start the production server (backend only, serves API)

### Code Quality
- `npm run lint` - Run ESLint and fix issues automatically
- `npm run type-check` - Run TypeScript type checking

### Environment Variables
The server accepts these environment variables:
- `PORT` - Server port (default: 3001)
- `UMADB_URL` - gRPC endpoint for UmaDB (default: localhost:50051)

### Project Structure
- `client/` - React frontend application with Vite build system
- `server/` - Node.js/Express backend API with gRPC client for UmaDB  
- `shared/` - Shared TypeScript types and Zod schemas for API communication

### Features Implemented
- **Event Type Explorer**: Browse events by their event type in the global stream
- **Tag Explorer**: Filter events using tags and event types with flexible query interface
- **Event Lookup**: Search for specific events by UUID with detailed inspection
- **Modern UI**: Tailwind CSS with shadcn/ui components, responsive design
- **Type Safety**: Full TypeScript coverage with runtime validation using Zod

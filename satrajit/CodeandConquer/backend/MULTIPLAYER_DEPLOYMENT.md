# Multiplayer System Deployment Guide

## Overview

The multiplayer system is designed to be robust, scalable, and deployment-ready. It includes:

- **State Synchronization**: 60 FPS game state updates
- **Reconnection Handling**: Automatic reconnection with timeout
- **Action Validation**: Server-side validation of all player actions
- **Error Recovery**: Graceful handling of disconnections and errors
- **Match Management**: Complete lifecycle management from matchmaking to completion

## Architecture

### Components

1. **MultiplayerService** (`backend/src/services/multiplayerService.js`)
   - Central service managing all active matches
   - Handles state synchronization
   - Validates and processes player actions
   - Manages player connections/disconnections

2. **MatchmakingService** (`backend/src/services/matchmakingService.js`)
   - Handles player queue and match creation
   - Manages match data structure

3. **EnhancedGameService** (`backend/src/services/enhancedGameService.js`)
   - Game logic and state updates
   - Tower/unit combat calculations

4. **Socket.IO Handlers** (`backend/src/index.js`)
   - Real-time communication
   - Event routing to services

## Deployment Considerations

### 1. Environment Variables

Add to your `.env` file:

```env
# Multiplayer Configuration
MULTIPLAYER_UPDATE_RATE=60
MULTIPLAYER_MAX_RECONNECT_TIME=30000
MULTIPLAYER_MAX_MATCHES=1000

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
SOCKET_MAX_CONNECTIONS=10000
```

### 2. Scaling Options

#### Option A: Single Server (Development/Small Scale)
- Works out of the box
- All matches in memory
- Good for < 100 concurrent matches

#### Option B: Redis for State (Medium Scale)
- Use Redis for match state storage
- Enables horizontal scaling
- Good for 100-1000 concurrent matches

```javascript
// Example Redis integration
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Store match state
await redis.set(`match:${matchId}`, JSON.stringify(matchState), 'EX', 3600);

// Retrieve match state
const state = await redis.get(`match:${matchId}`);
```

#### Option C: Load Balancer + Multiple Servers (Large Scale)
- Use sticky sessions for Socket.IO
- Shared Redis for match state
- Good for 1000+ concurrent matches

### 3. Database Integration

Matches are automatically saved to the database via `matchHistoryService`. Ensure your database can handle:

- High write frequency (match updates)
- Indexed queries on `match_id`, `player_id`, `status`
- Connection pooling for concurrent writes

### 4. Monitoring

Add monitoring for:

```javascript
// Match health metrics
- Active matches count
- Average match duration
- Disconnection rate
- Action processing latency
- State sync frequency
```

### 5. Error Handling

The system includes:

- **Automatic reconnection**: Players have 30 seconds to reconnect
- **Match timeout**: Matches end if player doesn't reconnect
- **Action validation**: Invalid actions are rejected
- **State recovery**: Clients can request state sync

## Socket.IO Events

### Client → Server

- `join_queue` - Join matchmaking queue
- `leave_queue` - Leave matchmaking queue
- `join_match` - Join a match room
- `player_action` - Send player action (tower placement, unit deployment, etc.)
- `sync_state` - Request state synchronization
- `ping` - Connection keepalive

### Server → Client

- `match_found` - Match found notification
- `match_briefing` - Match briefing phase
- `match_started` - Match started
- `game_state_update` - Game state update
- `state_sync` - State synchronization response
- `action_confirmed` - Action confirmed with sequence number
- `action_error` - Action rejected
- `pong` - Ping response

## Client Integration

### Example: Connecting to Multiplayer

```javascript
import { io } from 'socket.io-client';

const socket = io(API_URL, {
  auth: {
    userId: currentUser.id
  },
  transports: ['websocket', 'polling']
});

// Join queue
socket.emit('join_queue', {
  id: currentUser.id,
  username: currentUser.username,
  level: currentUser.level
});

// Listen for match
socket.on('match_found', (data) => {
  const { matchId, opponent } = data;
  socket.emit('join_match', matchId);
});

// Send actions
socket.emit('player_action', {
  matchId: currentMatchId,
  playerId: currentUser.id,
  action: {
    type: 'place_tower',
    data: { position: { x: 10, z: 5 }, towerType: 'gattling' }
  }
});

// Sync state periodically
setInterval(() => {
  socket.emit('sync_state', {
    matchId: currentMatchId,
    playerId: currentUser.id,
    lastSequence: lastReceivedSequence
  });
}, 1000); // Every second

// Handle reconnection
socket.on('connect', () => {
  if (currentMatchId) {
    socket.emit('join_match', currentMatchId);
    socket.emit('sync_state', {
      matchId: currentMatchId,
      playerId: currentUser.id,
      lastSequence: -1 // Request full state
    });
  }
});
```

## Performance Optimization

### 1. State Update Rate

Default: 60 FPS (16.67ms intervals)

Adjust based on:
- Server CPU capacity
- Network bandwidth
- Number of concurrent matches

```javascript
// Lower update rate for more matches
multiplayerService.updateRate = 30; // 30 FPS
```

### 2. Action Batching

Batch multiple actions to reduce network overhead:

```javascript
// Client-side batching
const actionQueue = [];
setInterval(() => {
  if (actionQueue.length > 0) {
    socket.emit('batch_actions', {
      matchId,
      playerId,
      actions: actionQueue.splice(0)
    });
  }
}, 100); // Every 100ms
```

### 3. State Compression

Compress large state updates:

```javascript
import pako from 'pako';

// Server-side
const compressed = pako.deflate(JSON.stringify(matchState));
socket.emit('game_state_update', compressed);

// Client-side
const decompressed = JSON.parse(pako.inflate(compressed, { to: 'string' }));
```

## Testing

### Local Testing

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test with multiple clients
node test-multiplayer.js
```

### Load Testing

Use tools like:
- **Artillery.io**: WebSocket load testing
- **k6**: Performance testing
- **Socket.IO load test**: Built-in testing

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run load-test.yml
```

## Troubleshooting

### Common Issues

1. **Matches not starting**
   - Check matchmaking service queue
   - Verify both players connected
   - Check match initialization logs

2. **State desync**
   - Increase sync frequency
   - Check network latency
   - Verify action sequence numbers

3. **High memory usage**
   - Implement match cleanup for finished matches
   - Add memory limits
   - Consider Redis for state storage

4. **Connection drops**
   - Increase ping timeout
   - Check firewall settings
   - Verify WebSocket support

## Security Considerations

1. **Action Validation**: All actions validated server-side
2. **Rate Limiting**: Prevent action spam
3. **Authentication**: Verify player identity
4. **Input Sanitization**: Validate all input data
5. **DDoS Protection**: Use rate limiting and connection limits

## Future Enhancements

- [ ] Redis adapter for horizontal scaling
- [ ] Match replay system
- [ ] Spectator mode
- [ ] Tournament brackets
- [ ] Regional matchmaking
- [ ] Anti-cheat system


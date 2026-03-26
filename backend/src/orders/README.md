# Orders Module

Blood order management with state machine, event sourcing, real-time WebSocket updates, and inventory integration.

## Architecture

### Core Components

- **OrdersService**: Order lifecycle management and state transitions
- **OrderStateMachine**: Enforces valid status transitions
- **OrderEventStoreService**: Immutable audit log (event sourcing)
- **OrdersGateway**: WebSocket real-time updates
- **OrdersController**: REST API for order operations

### State Machine

Valid transitions:
```
PENDING → CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED
   ↓                                    ↓
CANCELLED                           DISPUTED → RESOLVED → DELIVERED/CANCELLED
```

Invalid transitions throw `OrderTransitionException`.

### Event Sourcing

Every state change is recorded as an immutable event in `order_events` table:
- `ORDER_CREATED`
- `ORDER_CONFIRMED`
- `ORDER_DISPATCHED`
- `ORDER_IN_TRANSIT`
- `ORDER_DELIVERED`
- `ORDER_CANCELLED`
- `ORDER_DISPUTED`
- `ORDER_RESOLVED`

Benefits:
- Complete audit trail
- State replay capability
- Debugging and compliance
- Analytics and reporting

## Public API

### Endpoints

#### GET /orders
List orders with advanced filtering and pagination.

**Query Params:**
- `hospitalId`: Filter by hospital
- `startDate`: ISO date (e.g., 2024-01-01)
- `endDate`: ISO date
- `bloodTypes`: Comma-separated (e.g., "A+,O-")
- `statuses`: Comma-separated (e.g., "pending,confirmed")
- `bloodBank`: Partial name match
- `sortBy`: Field to sort by (default: placedAt)
- `sortOrder`: asc or desc (default: desc)
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 25)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "hospitalId": "uuid",
      "bloodBankId": "uuid",
      "bloodType": "A+",
      "quantity": 5,
      "status": "confirmed",
      "deliveryAddress": "123 Main St, Nairobi",
      "riderId": "uuid",
      "placedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 25,
    "totalCount": 100,
    "totalPages": 4
  }
}
```

#### GET /orders/:id
Get single order details.

**Response:** `200 OK`

#### GET /orders/:id/history
Get complete audit log for an order.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "orderId": "uuid",
    "eventType": "ORDER_CREATED",
    "payload": { "bloodType": "A+", "quantity": 5 },
    "actorId": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  {
    "eventType": "ORDER_CONFIRMED",
    "timestamp": "2024-01-01T00:05:00Z"
  }
]
```

#### GET /orders/:id/track
Get order status with event replay verification.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "in_transit",
  "replayedStatus": "in_transit"
}
```

#### POST /orders
Create a new order.

**Permissions:** `CREATE_ORDER`

**Request:**
```json
{
  "hospitalId": "uuid",
  "bloodBankId": "uuid",
  "bloodType": "A+",
  "quantity": 5,
  "deliveryAddress": "123 Main St, Nairobi"
}
```

**Response:** `201 Created`

**Behavior:**
- Reserves inventory automatically
- Creates order in PENDING status
- Records ORDER_CREATED event

#### PATCH /orders/:id
Update order details (non-status fields).

**Permissions:** `UPDATE_ORDER`

**Request:**
```json
{
  "deliveryAddress": "456 New St, Nairobi"
}
```

**Response:** `200 OK`

#### PATCH /orders/:id/status
Transition order to new status.

**Permissions:** `UPDATE_ORDER`

**Request:**
```json
{
  "status": "confirmed"
}
```

**Response:** `200 OK`

**Errors:**
- `400 Bad Request`: Invalid transition (e.g., DELIVERED → PENDING)

#### PATCH /orders/:id/assign-rider
Assign a dispatch rider to an order.

**Permissions:** `MANAGE_RIDERS`

**Request:**
```json
{
  "riderId": "uuid"
}
```

**Response:** `200 OK`

#### PATCH /orders/:id/raise-dispute
Raise a dispute for an order.

**Permissions:** `UPDATE_ORDER`

**Request:**
```json
{
  "reason": "Damaged units received",
  "disputeId": "uuid"
}
```

**Response:** `200 OK`

#### PATCH /orders/:id/resolve-dispute
Resolve a disputed order.

**Permissions:** `UPDATE_ORDER`

**Request:**
```json
{
  "resolution": "REFUND"  // or "DELIVERED"
}
```

**Response:** `200 OK`

**Behavior:**
- `REFUND`: Transitions to CANCELLED
- `DELIVERED`: Transitions to DELIVERED

#### DELETE /orders/:id
Cancel an order.

**Permissions:** `DELETE_ORDER`

**Response:** `204 No Content`

**Behavior:**
- Transitions order to CANCELLED
- Releases reserved inventory
- Cannot cancel delivered orders

## WebSocket Events

### Connection

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'jwt-access-token' }
});
```

### order.status.updated

Emitted when any order status changes.

**Payload:**
```json
{
  "orderId": "uuid",
  "previousStatus": "confirmed",
  "newStatus": "dispatched",
  "eventType": "ORDER_DISPATCHED",
  "actorId": "uuid",
  "timestamp": "2024-01-01T00:10:00Z"
}
```

**Client Usage:**
```javascript
socket.on('order.status.updated', (data) => {
  console.log(`Order ${data.orderId}: ${data.previousStatus} → ${data.newStatus}`);
  // Update UI
});
```

## Domain Events

Internal NestJS events for cross-module communication:

- `order.confirmed`: Triggers blockchain recording
- `order.dispatched`: Notifies dispatch service
- `order.in_transit`: Updates tracking service
- `order.delivered`: Releases inventory, updates metrics
- `order.cancelled`: Releases reserved inventory
- `order.disputed`: Creates dispute record
- `order.resolved`: Closes dispute
- `order.rider.assigned`: Notifies rider

## Usage

### Creating an Order

```typescript
import { OrdersService } from './orders/orders.service';

@Injectable()
export class HospitalService {
  constructor(private ordersService: OrdersService) {}

  async placeOrder(hospitalId: string, orderData: any) {
    // Inventory is automatically reserved
    const result = await this.ordersService.create(
      {
        hospitalId,
        bloodBankId: orderData.bloodBankId,
        bloodType: orderData.bloodType,
        quantity: orderData.quantity,
        deliveryAddress: orderData.address,
      },
      hospitalId, // actorId
    );

    return result.data;
  }
}
```

### Transitioning Order Status

```typescript
// Confirm order
await ordersService.updateStatus(orderId, 'confirmed', adminId);

// Dispatch order
await ordersService.updateStatus(orderId, 'dispatched', dispatcherId);

// Mark in transit
await ordersService.updateStatus(orderId, 'in_transit', riderId);

// Complete delivery
await ordersService.updateStatus(orderId, 'delivered', riderId);
```

### Listening to Order Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { OrderConfirmedEvent } from './events';

@Injectable()
export class BlockchainListener {
  @OnEvent('order.confirmed')
  async handleOrderConfirmed(event: OrderConfirmedEvent) {
    // Record on blockchain
    await this.sorobanService.submitTransaction({
      contractMethod: 'record_order',
      args: {
        orderId: event.orderId,
        bloodType: event.bloodType,
        quantity: event.quantity,
      },
      idempotencyKey: `order-${event.orderId}`,
    });
  }
}
```

## Data Models

### OrderEntity
- `id`: UUID
- `hospitalId`: Requesting hospital
- `bloodBankId`: Supplying blood bank
- `bloodType`: Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)
- `quantity`: Number of units
- `status`: Current status (enum)
- `deliveryAddress`: Delivery location
- `riderId`: Assigned dispatch rider
- `disputeId`: Dispute reference (if any)
- `disputeReason`: Dispute description
- `placedAt`: Order creation timestamp
- `deliveredAt`: Delivery completion timestamp

### OrderEventEntity
- `id`: UUID
- `orderId`: Order reference
- `eventType`: Event type (enum)
- `payload`: Event data (JSON)
- `actorId`: User who triggered the event
- `timestamp`: Event timestamp

## State Machine Rules

- PENDING can transition to: CONFIRMED, CANCELLED
- CONFIRMED can transition to: DISPATCHED, CANCELLED
- DISPATCHED can transition to: IN_TRANSIT, DISPUTED
- IN_TRANSIT can transition to: DELIVERED, DISPUTED
- DISPUTED can transition to: RESOLVED
- RESOLVED can transition to: DELIVERED, CANCELLED
- DELIVERED and CANCELLED are terminal states

## Testing

```bash
# Unit tests
npm test -- orders

# Integration tests
npm test -- orders.service.spec

# Contract tests
npm run test:contracts
```

## Best Practices

- Always use `updateStatus()` for state changes (never update status directly)
- Check inventory availability before creating orders
- Assign riders before dispatching
- Use event history for debugging and compliance
- Monitor WebSocket connections for real-time updates
- Handle `OrderTransitionException` gracefully in UI
- Log all state transitions with actorId for audit trail

## Performance Considerations

- Index on `hospitalId`, `bloodBankId`, `status`, `placedAt`
- Paginate large result sets (default: 25 items)
- Cache aggregation queries
- Use WebSocket for real-time updates (avoid polling)
- Archive old orders to separate table after 1 year

## Security

- All endpoints require authentication
- Permission-based access control per operation
- Actor ID tracked for all state changes
- WebSocket connections require JWT authentication
- Validate state transitions server-side (never trust client)

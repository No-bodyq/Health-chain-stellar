# Inventory Module

Blood bank inventory management with stock tracking, forecasting, and automated low-stock alerts.

## Architecture

### Core Components

- **InventoryService**: CRUD operations, stock management, and aggregations
- **InventoryForecastingService**: Demand forecasting and predictive alerts
- **InventoryEventListener**: Handles low inventory events and notifications
- **InventoryController**: REST API for inventory operations

### Features

- Real-time stock tracking (available, reserved, total)
- Low stock and critical stock monitoring
- Demand forecasting based on historical orders
- Automated alerts via events and notifications
- Stock reservation system for pending orders
- Multi-region and multi-blood-type support
- Configurable thresholds per blood type/region

## Public API

### Endpoints

#### GET /inventory
List all inventory items, optionally filtered by hospital.

**Query Params:**
- `hospitalId` (optional): Filter by hospital

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "bloodType": "A+",
    "quantity": 50,
    "reserved": 10,
    "available": 40,
    "region": "Nairobi",
    "hospitalId": "uuid",
    "reorderLevel": 20,
    "reorderQuantity": 30
  }
]
```

#### GET /inventory/low-stock
Get items below threshold.

**Query Params:**
- `threshold` (optional, default: 10): Quantity threshold

**Response:** `200 OK`

#### GET /inventory/critical-stock
Get items at or below reorder level.

**Response:** `200 OK`

#### GET /inventory/aggregation
Get stock aggregated by blood type across all regions.

**Response:** `200 OK`
```json
{
  "A+": { "total": 150, "available": 120, "reserved": 30 },
  "O-": { "total": 80, "available": 60, "reserved": 20 }
}
```

#### GET /inventory/stats
Get inventory statistics.

**Query Params:**
- `hospitalId` (optional): Filter by hospital

**Response:** `200 OK`
```json
{
  "totalUnits": 500,
  "availableUnits": 400,
  "reservedUnits": 100,
  "lowStockItems": 5,
  "criticalStockItems": 2
}
```

#### GET /inventory/reorder-summary
Get items that need reordering.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "bloodType": "O-",
    "currentQuantity": 15,
    "reorderLevel": 20,
    "reorderQuantity": 30,
    "region": "Mombasa"
  }
]
```

#### GET /inventory/:id
Get single inventory item.

**Response:** `200 OK`

#### POST /inventory
Create new inventory item.

**Permissions:** `CREATE_INVENTORY`

**Request:**
```json
{
  "bloodType": "A+",
  "quantity": 50,
  "region": "Nairobi",
  "hospitalId": "uuid",
  "reorderLevel": 20,
  "reorderQuantity": 30
}
```

**Response:** `201 Created`

#### PATCH /inventory/:id
Update inventory item.

**Permissions:** `UPDATE_INVENTORY`

**Request:**
```json
{
  "reorderLevel": 25,
  "reorderQuantity": 40
}
```

**Response:** `200 OK`

#### PATCH /inventory/:id/stock
Update stock quantity (add or remove units).

**Permissions:** `UPDATE_INVENTORY`

**Request:**
```json
{
  "quantity": 10  // Positive to add, negative to remove
}
```

**Response:** `200 OK`

#### PATCH /inventory/:id/reserve
Reserve stock for an order.

**Permissions:** `UPDATE_INVENTORY`

**Request:**
```json
{
  "quantity": 5
}
```

**Response:** `200 OK`

#### PATCH /inventory/:id/release
Release reserved stock (order cancelled/completed).

**Permissions:** `UPDATE_INVENTORY`

**Request:**
```json
{
  "quantity": 5
}
```

**Response:** `200 OK`

#### DELETE /inventory/:id
Delete inventory item.

**Permissions:** `DELETE_INVENTORY`

**Response:** `204 No Content`

## Demand Forecasting

### How It Works

1. **Historical Analysis**: Analyzes orders from last 30 days (configurable)
2. **Daily Demand Calculation**: `totalQuantity / historyDays`
3. **Supply Projection**: `currentStock / averageDailyDemand`
4. **Alert Trigger**: If projected days < threshold, emit event

### Configuration

```env
# Cron schedule for forecasting (default: every 6 hours)
INVENTORY_FORECAST_CRON=0 */6 * * *

# Default threshold in days (default: 3)
INVENTORY_FORECAST_THRESHOLD_DAYS=3

# Historical data window in days (default: 30)
INVENTORY_FORECAST_HISTORY_DAYS=30

# Custom thresholds per blood type/region (JSON array)
INVENTORY_FORECAST_THRESHOLDS=[
  {"bloodType":"A+","region":"Nairobi","daysThreshold":5},
  {"bloodType":"O-","region":"Mombasa","daysThreshold":7}
]
```

### Forecast Output

```typescript
{
  bloodType: "O-",
  region: "Mombasa",
  currentStock: 15,
  averageDailyDemand: 5.2,
  projectedDaysOfSupply: 2.88  // 15 / 5.2
}
```

If `projectedDaysOfSupply < threshold`:
- Emits `inventory.low` event
- Queues donor outreach job
- Logs warning

## Events

### inventory.low

Emitted when forecasted supply falls below threshold.

**Payload:**
```typescript
{
  bloodType: string;
  region: string;
  currentStock: number;
  projectedDaysOfSupply: number;
  averageDailyDemand: number;
  threshold: number;
}
```

**Listeners:**
- `InventoryEventListener`: Sends notifications to admins
- `DonorOutreachService`: Triggers donor campaigns

## Usage

### Reserving Stock for Orders

```typescript
import { InventoryService } from './inventory/inventory.service';

@Injectable()
export class OrderService {
  constructor(private inventoryService: InventoryService) {}

  async createOrder(orderDto: CreateOrderDto) {
    // Find inventory for blood type and region
    const inventory = await this.inventoryService.findByBloodTypeAndRegion(
      orderDto.bloodType,
      orderDto.region,
    );

    // Reserve stock
    await this.inventoryService.reserveStock(
      inventory.id,
      orderDto.quantity,
    );

    // Create order
    const order = await this.orderRepository.save(orderDto);

    return order;
  }

  async cancelOrder(orderId: string) {
    const order = await this.orderRepository.findOne(orderId);

    // Release reserved stock
    await this.inventoryService.releaseStock(
      order.inventoryId,
      order.quantity,
    );

    // Cancel order
    order.status = 'cancelled';
    await this.orderRepository.save(order);
  }
}
```

### Manual Forecast Trigger

```typescript
import { InventoryForecastingService } from './inventory/inventory-forecasting.service';

@Injectable()
export class AdminService {
  constructor(
    private forecastingService: InventoryForecastingService,
  ) {}

  async triggerForecast() {
    await this.forecastingService.runForecast();
    return { message: 'Forecast triggered' };
  }
}
```

## Data Models

### InventoryEntity
- `id`: UUID
- `bloodType`: Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)
- `quantity`: Total units in stock
- `reserved`: Units reserved for pending orders
- `available`: Computed (quantity - reserved)
- `region`: Geographic region
- `hospitalId`: Associated hospital
- `reorderLevel`: Threshold for reorder alerts
- `reorderQuantity`: Suggested reorder amount

### InventoryStockEntity
- Historical stock level snapshots
- Used for trend analysis

## Queue Jobs

### donor-outreach

Queued when low inventory detected.

**Job Data:**
```json
{
  "bloodType": "O-",
  "region": "Mombasa",
  "urgency": "critical",
  "projectedDaysOfSupply": 0.8,
  "requiredUnits": 25
}
```

## Testing

```bash
# Unit tests
npm test -- inventory

# Integration tests (forecasting)
npm test -- inventory-forecasting.integration

# Contract tests
npm run test:contracts -- blood-requests-inventory
```

## Best Practices

- Always reserve stock before creating orders
- Release stock when orders are cancelled or completed
- Monitor forecast logs for accuracy
- Adjust thresholds based on regional demand patterns
- Set reorder levels to 2-3x average daily demand
- Review DLQ for failed outreach jobs
- Use aggregation endpoints for dashboards

## Performance Considerations

- Forecasting runs every 6 hours by default
- Historical query limited to 30 days
- Index on `bloodType` and `region` for fast lookups
- Cache aggregation results for dashboards
- Use pagination for large inventory lists

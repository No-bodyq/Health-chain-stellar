# LifeBank Soroban Unified Error Registry

This document defines the unique numeric error code ranges assigned to each smart contract in the LifeBank protocol to prevent collisions and simplify client integration.

## Error Code Base Ranges

| Contract | Base Range | Description |
| :--- | :--- | :--- |
| **Inventory** | `100 - 199` | Blood unit lifecycle, registration, and validation. |
| **Identity** | `200 - 299` | Organization registration and role management. |
| **Requests** | `300 - 399` | Blood request creation and management. |
| **Reputation** | `400 - 499` | Reputation calculation, penalties, and appeals. |
| **Payments** | `500 - 599` | Financial transactions and ledger entries. |
| **Temperature** | `600 - 699` | Cold chain monitoring and threshold management. |

## Detailed Mapping

### Inventory (100)
- `AlreadyInitialized` = 100
- `NotInitialized` = 101
- `Unauthorized` = 102
- `InvalidAmount` = 110
- `InvalidAddress` = 111
- `InvalidInput` = 112
- `InvalidBloodType` = 113
- `InvalidStatus` = 114
- `InvalidTimestamp` = 115
- `InvalidQuantity` = 116
- `InvalidExpiration` = 117
- `AlreadyExists` = 120
- `NotFound` = 121
- `Expired` = 122
- `BloodUnitExpired` = 123
- `DuplicateBloodUnit` = 124
- `InsufficientBalance` = 130
- `InsufficientPermissions` = 131
- `NotAuthorizedBloodBank` = 132
- `BloodUnitNotAvailable` = 140
- `InvalidStatusTransition` = 141

### Identity (200)
- `InvalidInput` = 200
- `LicenseAlreadyRegistered` = 201
- `InvalidOrgType` = 202
- `AlreadyInitialized` = 203
- `Unauthorized` = 204

### Requests (300)
- `AlreadyInitialized` = 300
- `NotInitialized` = 301
- `Unauthorized` = 302
- `InvalidTimestamp` = 303
- `InvalidQuantity` = 304
- `NotAuthorizedHospital` = 305
- `RequestNotFound` = 306

### Reputation (400)
- `InvalidRating` = 400
- `InvalidInput` = 401
- `EntityNotFound` = 402
- `NotAuthorized` = 403
- `PenaltyNotFound` = 404

### Payments (500)
- `PaymentNotFound` = 500
- `InvalidAmount` = 501
- `SamePayerPayee` = 502
- `InvalidPage` = 503

### Temperature (600)
- `Unauthorized` = 600
- `UnitNotFound` = 601
- `ThresholdNotFound` = 602
- `InvalidThreshold` = 603
- `AlreadyInitialized` = 604

## Backward Compatibility Impact

This change is **breaking** for clients that depend on previous numeric error values.

- Previous behavior: multiple contracts reused low integer codes (for example `0..` and `1..`) and some values overlapped.
- New behavior: each contract now has a dedicated non-overlapping numeric range (`100` blocks per contract).
- Client impact: any off-chain logic that pattern-matches numeric error codes must be updated to the new mapping in this file.
- Migration guidance: decode by symbolic error name where possible; if numeric decoding is required, consume this registry as the canonical mapping.

---
*Date Updated: 2026-03-26*

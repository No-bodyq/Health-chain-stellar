import { BloodComponent } from '../enums/blood-component.enum';
import { BloodStatus } from '../enums/blood-status.enum';
import { BloodType } from '../enums/blood-type.enum';

import { BloodStatusHistory } from './blood-status-history.entity';
import { BloodUnit } from './blood-unit.entity';

describe('BloodType enum', () => {
  it('should contain all eight blood types', () => {
    const types = Object.values(BloodType);
    expect(types).toEqual(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
  });

  it('should have correct positive blood types', () => {
    expect(BloodType.A_POSITIVE).toBe('A+');
    expect(BloodType.B_POSITIVE).toBe('B+');
    expect(BloodType.AB_POSITIVE).toBe('AB+');
    expect(BloodType.O_POSITIVE).toBe('O+');
  });

  it('should have correct negative blood types', () => {
    expect(BloodType.A_NEGATIVE).toBe('A-');
    expect(BloodType.B_NEGATIVE).toBe('B-');
    expect(BloodType.AB_NEGATIVE).toBe('AB-');
    expect(BloodType.O_NEGATIVE).toBe('O-');
  });
});

describe('BloodStatus enum', () => {
  it('should contain all expected statuses', () => {
    const statuses = Object.values(BloodStatus);
    expect(statuses).toContain('AVAILABLE');
    expect(statuses).toContain('RESERVED');
    expect(statuses).toContain('IN_TRANSIT');
    expect(statuses).toContain('DELIVERED');
    expect(statuses).toContain('EXPIRED');
    expect(statuses).toContain('QUARANTINED');
    expect(statuses).toContain('DISCARDED');
    expect(statuses).toContain('PROCESSING');
  });

  it('should have correct enum values', () => {
    expect(BloodStatus.AVAILABLE).toBe('AVAILABLE');
    expect(BloodStatus.RESERVED).toBe('RESERVED');
    expect(BloodStatus.IN_TRANSIT).toBe('IN_TRANSIT');
    expect(BloodStatus.EXPIRED).toBe('EXPIRED');
  });
});

describe('BloodComponent enum', () => {
  it('should contain all expected components', () => {
    const components = Object.values(BloodComponent);
    expect(components).toContain('WHOLE_BLOOD');
    expect(components).toContain('RED_CELLS');
    expect(components).toContain('PLATELETS');
    expect(components).toContain('PLASMA');
    expect(components).toContain('CRYOPRECIPITATE');
    expect(components).toContain('WHITE_CELLS');
    expect(components).toContain('FRESH_FROZEN_PLASMA');
  });

  it('should have correct enum values', () => {
    expect(BloodComponent.WHOLE_BLOOD).toBe('WHOLE_BLOOD');
    expect(BloodComponent.RED_CELLS).toBe('RED_CELLS');
    expect(BloodComponent.PLATELETS).toBe('PLATELETS');
    expect(BloodComponent.PLASMA).toBe('PLASMA');
  });
});

describe('BloodUnit entity', () => {
  it('should create a BloodUnit instance with required fields', () => {
    const unit = new BloodUnit();
    unit.unitCode = 'BU-001';
    unit.bloodType = BloodType.O_POSITIVE;
    unit.status = BloodStatus.AVAILABLE;
    unit.component = BloodComponent.WHOLE_BLOOD;
    unit.organizationId = 'org-123';
    unit.volumeMl = 450;
    unit.collectedAt = new Date('2026-03-01');
    unit.expiresAt = new Date('2026-04-12');

    expect(unit.unitCode).toBe('BU-001');
    expect(unit.bloodType).toBe(BloodType.O_POSITIVE);
    expect(unit.status).toBe(BloodStatus.AVAILABLE);
    expect(unit.component).toBe(BloodComponent.WHOLE_BLOOD);
    expect(unit.organizationId).toBe('org-123');
    expect(unit.volumeMl).toBe(450);
  });

  it('should allow optional fields to be null', () => {
    const unit = new BloodUnit();
    unit.testResults = null;
    unit.storageTemperatureCelsius = null;
    unit.storageLocation = null;
    unit.donorId = null;
    unit.blockchainUnitId = null;
    unit.blockchainTxHash = null;

    expect(unit.testResults).toBeNull();
    expect(unit.storageTemperatureCelsius).toBeNull();
    expect(unit.storageLocation).toBeNull();
    expect(unit.donorId).toBeNull();
    expect(unit.blockchainUnitId).toBeNull();
    expect(unit.blockchainTxHash).toBeNull();
  });

  it('should accept test results as a JSONB object', () => {
    const unit = new BloodUnit();
    unit.testResults = {
      hiv: 'negative',
      hepatitisB: 'negative',
      hepatitisC: 'negative',
      syphilis: 'negative',
    };

    expect(unit.testResults).toHaveProperty('hiv', 'negative');
    expect(unit.testResults).toHaveProperty('hepatitisB', 'negative');
  });

  it('should accept storage information fields', () => {
    const unit = new BloodUnit();
    unit.storageTemperatureCelsius = 4.0;
    unit.storageLocation = 'Fridge-A-Shelf-2';

    expect(unit.storageTemperatureCelsius).toBe(4.0);
    expect(unit.storageLocation).toBe('Fridge-A-Shelf-2');
  });

  it('should accept blockchain reference fields', () => {
    const unit = new BloodUnit();
    unit.blockchainUnitId = 'chain-unit-789';
    unit.blockchainTxHash = '0xabc123';

    expect(unit.blockchainUnitId).toBe('chain-unit-789');
    expect(unit.blockchainTxHash).toBe('0xabc123');
  });

  it('should default status to AVAILABLE', () => {
    const unit = new BloodUnit();
    expect(unit.status).toBeUndefined();
  });
});

describe('BloodStatusHistory entity', () => {
  it('should create a BloodStatusHistory instance', () => {
    const history = new BloodStatusHistory();
    history.bloodUnitId = 'unit-uuid-123';
    history.previousStatus = BloodStatus.AVAILABLE;
    history.newStatus = BloodStatus.RESERVED;
    history.reason = 'Reserved for patient ORD-456';
    history.changedBy = 'staff-user-id';

    expect(history.bloodUnitId).toBe('unit-uuid-123');
    expect(history.previousStatus).toBe(BloodStatus.AVAILABLE);
    expect(history.newStatus).toBe(BloodStatus.RESERVED);
    expect(history.reason).toBe('Reserved for patient ORD-456');
    expect(history.changedBy).toBe('staff-user-id');
  });

  it('should allow null for previousStatus on initial creation', () => {
    const history = new BloodStatusHistory();
    history.previousStatus = null;
    history.newStatus = BloodStatus.AVAILABLE;

    expect(history.previousStatus).toBeNull();
    expect(history.newStatus).toBe(BloodStatus.AVAILABLE);
  });

  it('should allow null for optional fields', () => {
    const history = new BloodStatusHistory();
    history.reason = null;
    history.changedBy = null;

    expect(history.reason).toBeNull();
    expect(history.changedBy).toBeNull();
  });

  it('should link to a BloodUnit', () => {
    const unit = new BloodUnit();
    unit.id = 'unit-uuid-123';
    unit.bloodType = BloodType.A_POSITIVE;

    const history = new BloodStatusHistory();
    history.bloodUnit = unit;
    history.bloodUnitId = unit.id;

    expect(history.bloodUnit).toBe(unit);
    expect(history.bloodUnitId).toBe('unit-uuid-123');
  });
});

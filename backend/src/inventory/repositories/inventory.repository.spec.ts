import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Repository, SelectQueryBuilder } from 'typeorm';

import { InventoryEntity } from '../entities/inventory.entity';

import { InventoryRepository } from './inventory.repository';

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let typeormRepo: jest.Mocked<Repository<InventoryEntity>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<InventoryEntity>>;

  beforeEach(async () => {
    // Create mock query builder
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    } as any;

    // Create mock TypeORM repository
    const mockTypeormRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRepository,
        {
          provide: getRepositoryToken(InventoryEntity),
          useValue: mockTypeormRepo,
        },
      ],
    }).compile();

    repository = module.get<InventoryRepository>(InventoryRepository);
    typeormRepo = module.get(getRepositoryToken(InventoryEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getStockAggregationByBloodType', () => {
    it('should aggregate stock by blood type using Query Builder', async () => {
      const mockData = [
        {
          bloodType: 'A+',
          totalQuantity: '100',
          totalReserved: '20',
          totalAvailable: '80',
          hospitalCount: '3',
        },
        {
          bloodType: 'O-',
          totalQuantity: '50',
          totalReserved: '10',
          totalAvailable: '40',
          hospitalCount: '2',
        },
      ];

      queryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await repository.getStockAggregationByBloodType();

      expect(typeormRepo.createQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(queryBuilder.select).toHaveBeenCalledWith(
        'inventory.bloodType',
        'bloodType',
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(inventory.quantity)',
        'totalQuantity',
      );
      expect(queryBuilder.groupBy).toHaveBeenCalledWith('inventory.bloodType');
      expect(result).toEqual([
        {
          bloodType: 'A+',
          totalQuantity: 100,
          totalReserved: 20,
          totalAvailable: 80,
          hospitalCount: 3,
        },
        {
          bloodType: 'O-',
          totalQuantity: 50,
          totalReserved: 10,
          totalAvailable: 40,
          hospitalCount: 2,
        },
      ]);
    });
  });

  describe('getLowStockItems', () => {
    it('should get items below threshold using Query Builder', async () => {
      const mockItems = [
        {
          id: '1',
          hospitalId: 'h1',
          bloodType: 'A+',
          quantity: 5,
          availableQuantity: 5,
          reorderLevel: 10,
        },
      ];

      queryBuilder.getMany.mockResolvedValue(mockItems as any);

      const result = await repository.getLowStockItems(10);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.quantity <= :threshold',
        { threshold: 10 },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalled();
      expect(result[0].deficit).toBe(5);
    });

    it('should use reorder level when no threshold provided', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await repository.getLowStockItems();

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.quantity <= inventory.reorderLevel',
      );
    });
  });

  describe('getCriticalStockItems', () => {
    it('should get items below 50% of reorder level', async () => {
      const mockItems = [{ id: '1', quantity: 2, reorderLevel: 10 }];
      queryBuilder.getMany.mockResolvedValue(mockItems as any);

      await repository.getCriticalStockItems();

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.quantity < (inventory.reorderLevel * 0.5)',
      );
    });
  });

  describe('getInventoryStats', () => {
    it('should calculate statistics using Query Builder aggregations', async () => {
      const mockStats = {
        totalItems: '10',
        totalQuantity: '500',
        totalReserved: '100',
        totalAvailable: '400',
        lowStockCount: '2',
        criticalStockCount: '1',
      };

      queryBuilder.getRawOne.mockResolvedValue(mockStats);

      const result = await repository.getInventoryStats();

      expect(queryBuilder.select).toHaveBeenCalledWith(
        'COUNT(*)',
        'totalItems',
      );
      expect(result).toEqual({
        totalItems: 10,
        totalQuantity: 500,
        totalReserved: 100,
        totalAvailable: 400,
        lowStockCount: 2,
        criticalStockCount: 1,
      });
    });

    it('should filter by hospitalId when provided', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        totalItems: '5',
        totalQuantity: '200',
        totalReserved: '50',
        totalAvailable: '150',
        lowStockCount: '1',
        criticalStockCount: '0',
      });

      await repository.getInventoryStats('hospital-123');

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.hospitalId = :hospitalId',
        { hospitalId: 'hospital-123' },
      );
    });
  });

  describe('adjustStock', () => {
    it('should update stock atomically using Query Builder', async () => {
      queryBuilder.execute.mockResolvedValue({ affected: 1 });

      await repository.adjustStock('inv-123', 10);

      expect(queryBuilder.update).toHaveBeenCalledWith(InventoryEntity);
      expect(queryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'inv-123',
      });
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock with availability check', async () => {
      queryBuilder.execute.mockResolvedValue({ affected: 1 });

      const result = await repository.reserveStock('inv-123', 5);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(quantity - reserved_quantity) >= :quantity',
        { quantity: 5 },
      );
      expect(result).toBe(true);
    });

    it('should return false when insufficient stock', async () => {
      queryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await repository.reserveStock('inv-123', 100);

      expect(result).toBe(false);
    });
  });

  describe('releaseStock', () => {
    it('should release reserved stock', async () => {
      queryBuilder.execute.mockResolvedValue({ affected: 1 });

      await repository.releaseStock('inv-123', 5);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'reserved_quantity >= :quantity',
        { quantity: 5 },
      );
    });
  });

  describe('getReorderSummary', () => {
    it('should group reorder needs by blood type', async () => {
      const mockData = [
        {
          bloodType: 'A+',
          totalDeficit: '50',
          affectedHospitals: '3',
        },
      ];

      queryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await repository.getReorderSummary();

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.quantity < inventory.reorderLevel',
      );
      expect(queryBuilder.groupBy).toHaveBeenCalledWith('inventory.bloodType');
      expect(queryBuilder.having).toHaveBeenCalled();
      expect(result[0].totalDeficit).toBe(50);
    });
  });

  describe('findByHospitalAndBloodType', () => {
    it('should find inventory by hospital and blood type', async () => {
      const mockItem = { id: '1', hospitalId: 'h1', bloodType: 'A+' };
      queryBuilder.getOne.mockResolvedValue(mockItem as any);

      await repository.findByHospitalAndBloodType('h1', 'A+');

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.hospitalId = :hospitalId',
        { hospitalId: 'h1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.bloodType = :bloodType',
        { bloodType: 'A+' },
      );
    });
  });
});

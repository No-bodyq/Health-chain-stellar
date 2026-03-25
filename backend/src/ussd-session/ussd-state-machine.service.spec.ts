import { Test, TestingModule } from '@nestjs/testing';
import {
  UssdStateMachine,
  BLOOD_TYPES,
  VALID_QUANTITIES,
  BLOOD_BANKS,
} from './ussd-state-machine.service';
import { UssdSessionStore } from './ussd-session.store';
import { UssdSession, UssdStep } from './ussd.types';

describe('UssdStateMachine', () => {
  let machine: UssdStateMachine;
  let sessionStore: jest.Mocked<UssdSessionStore>;
  const createOrder = jest.fn().mockResolvedValue(undefined);

  function makeSession(overrides: Partial<UssdSession> = {}): UssdSession {
    return {
      sessionId: 'sess-001',
      phoneNumber: '+2348012345678',
      step: UssdStep.LOGIN_PHONE,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    sessionStore = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      createInitial: jest.fn(),
    } as unknown as jest.Mocked<UssdSessionStore>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UssdStateMachine,
        { provide: UssdSessionStore, useValue: sessionStore },
      ],
    }).compile();

    machine = module.get<UssdStateMachine>(UssdStateMachine);
    createOrder.mockClear();
  });

  describe('new session', () => {
    it('creates initial session when none exists and prompts for phone', async () => {
      sessionStore.get.mockResolvedValue(null);
      sessionStore.createInitial.mockResolvedValue(makeSession());

      const result = await machine.process(
        'sess-001',
        '+234xxx',
        '',
        createOrder,
      );

      expect(sessionStore.createInitial).toHaveBeenCalledWith(
        'sess-001',
        '+234xxx',
      );
      expect(result.type).toBe('CON');
      expect(result.message).toContain('Welcome');
    });
  });

  describe('cancel (#)', () => {
    it('ends session on # input', async () => {
      sessionStore.get.mockResolvedValue(makeSession());
      // text input is full accumulated string; last part is #
      const result = await machine.process(
        'sess-001',
        '+234',
        '+2340*#',
        createOrder,
      );
      expect(result.type).toBe('END');
      expect(result.message).toContain('cancelled');
      expect(sessionStore.delete).toHaveBeenCalled();
    });
  });

  describe('back navigation (0)', () => {
    it('returns to previous step on 0 input', async () => {
      const session = makeSession({
        step: UssdStep.LOGIN_PIN,
        history: [UssdStep.LOGIN_PHONE],
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'phone*0',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(result.message).toContain('phone number');
      expect(sessionStore.set).toHaveBeenCalledWith(
        expect.objectContaining({ step: UssdStep.LOGIN_PHONE }),
      );
    });

    it('does not go back beyond first step', async () => {
      const session = makeSession({ step: UssdStep.LOGIN_PHONE, history: [] });
      sessionStore.get.mockResolvedValue(session);

      // 0 on first step should NOT navigate back (history empty → falls through to handler)
      const result = await machine.process(
        'sess-001',
        '+234',
        '0',
        createOrder,
      );
      expect(result.type).toBe('CON');
    });
  });

  describe('LOGIN_PHONE step', () => {
    it('advances to LOGIN_PIN on valid phone', async () => {
      const session = makeSession();
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        '+2348012345678',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(result.message.toLowerCase()).toContain('pin');
      expect(sessionStore.set).toHaveBeenCalledWith(
        expect.objectContaining({ step: UssdStep.LOGIN_PIN }),
      );
    });

    it('re-prompts on invalid phone', async () => {
      const session = makeSession();
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'abc',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(result.message).toContain('Invalid phone');
    });
  });

  describe('LOGIN_PIN step', () => {
    it('advances to SELECT_BLOOD_TYPE on valid PIN', async () => {
      const session = makeSession({
        step: UssdStep.LOGIN_PIN,
        history: [UssdStep.LOGIN_PHONE],
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'phone*1234',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(sessionStore.set).toHaveBeenCalledWith(
        expect.objectContaining({ step: UssdStep.SELECT_BLOOD_TYPE }),
      );
    });

    it('re-prompts on invalid PIN format', async () => {
      const session = makeSession({
        step: UssdStep.LOGIN_PIN,
        history: [UssdStep.LOGIN_PHONE],
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'phone*ab',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(result.message).toContain('Invalid PIN');
    });
  });

  describe('SELECT_BLOOD_TYPE step', () => {
    it('advances on valid blood type selection', async () => {
      const session = makeSession({
        step: UssdStep.SELECT_BLOOD_TYPE,
        userId: 'user-1',
        history: [UssdStep.LOGIN_PHONE, UssdStep.LOGIN_PIN],
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(sessionStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          step: UssdStep.SELECT_QUANTITY,
          selectedBloodType: BLOOD_TYPES[0],
        }),
      );
    });

    it('re-prompts on out-of-range selection', async () => {
      const session = makeSession({
        step: UssdStep.SELECT_BLOOD_TYPE,
        userId: 'user-1',
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*99',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(result.message).toContain('Invalid choice');
    });
  });

  describe('SELECT_QUANTITY step', () => {
    it('advances on valid quantity selection', async () => {
      const session = makeSession({
        step: UssdStep.SELECT_QUANTITY,
        userId: 'user-1',
        selectedBloodType: 'A+',
        history: [
          UssdStep.LOGIN_PHONE,
          UssdStep.LOGIN_PIN,
          UssdStep.SELECT_BLOOD_TYPE,
        ],
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1*2',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(sessionStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          step: UssdStep.SELECT_BLOOD_BANK,
          selectedQuantity: VALID_QUANTITIES[1],
        }),
      );
    });

    it('re-prompts on invalid quantity', async () => {
      const session = makeSession({
        step: UssdStep.SELECT_QUANTITY,
        userId: 'user-1',
        selectedBloodType: 'A+',
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1*abc',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(result.message).toContain('Invalid choice');
    });
  });

  describe('SELECT_BLOOD_BANK step', () => {
    it('advances to CONFIRM_ORDER on valid bank selection', async () => {
      const session = makeSession({
        step: UssdStep.SELECT_BLOOD_BANK,
        userId: 'user-1',
        selectedBloodType: 'A+',
        selectedQuantity: 2,
        history: [],
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1*2*1',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(sessionStore.set).toHaveBeenCalledWith(
        expect.objectContaining({ step: UssdStep.CONFIRM_ORDER }),
      );
    });
  });

  describe('CONFIRM_ORDER step', () => {
    const confirmedSession = () =>
      makeSession({
        step: UssdStep.CONFIRM_ORDER,
        userId: 'user-1',
        selectedBloodType: 'A+',
        selectedQuantity: 2,
        selectedBloodBankId: 'bb-001',
        selectedBloodBankName: 'Central Blood Bank',
        history: [],
      });

    it('places order and ends session on input "1"', async () => {
      sessionStore.get.mockResolvedValue(confirmedSession());

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1*2*1*1',
        createOrder,
      );

      expect(createOrder).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('END');
      expect(result.message).toContain('Order placed');
      expect(sessionStore.delete).toHaveBeenCalled();
    });

    it('returns to SELECT_BLOOD_TYPE on input "2" (change)', async () => {
      sessionStore.get.mockResolvedValue(confirmedSession());

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1*2*1*2',
        createOrder,
      );

      expect(createOrder).not.toHaveBeenCalled();
      expect(result.type).toBe('CON');
      expect(sessionStore.set).toHaveBeenCalledWith(
        expect.objectContaining({ step: UssdStep.SELECT_BLOOD_TYPE }),
      );
    });

    it('ends session with error message when order creation fails', async () => {
      sessionStore.get.mockResolvedValue(confirmedSession());
      createOrder.mockRejectedValueOnce(new Error('DB error'));

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1*2*1*1',
        createOrder,
      );

      expect(result.type).toBe('END');
      expect(result.message).toContain('failed');
    });

    it('re-prompts on invalid confirmation input', async () => {
      sessionStore.get.mockResolvedValue(confirmedSession());

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*1*2*1*9',
        createOrder,
      );

      expect(result.type).toBe('CON');
      expect(result.message).toContain('Invalid choice');
    });
  });

  describe('response length', () => {
    it('truncates messages exceeding 182 characters', async () => {
      const session = makeSession({
        step: UssdStep.SELECT_BLOOD_TYPE,
        userId: 'u1',
      });
      sessionStore.get.mockResolvedValue(session);

      const result = await machine.process(
        'sess-001',
        '+234',
        'p*pin*99',
        createOrder,
      );
      expect(result.message.length).toBeLessThanOrEqual(182);
    });
  });
});

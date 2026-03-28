#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, vec, Address, Env, String,
    Vec,
};

// ── Types ──────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PaymentStatus {
    Pending,
    Locked,
    Released,
    Refunded,
    Disputed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Payment {
    pub id: u64,
    pub request_id: u64,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub status: PaymentStatus,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PaymentStats {
    pub total_locked: i128,
    pub total_released: i128,
    pub total_refunded: i128,
    pub count_locked: u32,
    pub count_released: u32,
    pub count_refunded: u32,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PaymentPage {
    pub items: Vec<Payment>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

/// Recurring / earmarked donation pledge recorded on-chain (schedule enforced off-chain).
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DonationPledge {
    pub id: u64,
    pub donor: Address,
    /// Amount intended each period (smallest units; same convention as [`Payment::amount`])
    pub amount_per_period: i128,
    /// Seconds between executions (e.g. 2_592_000 ≈ 30 days)
    pub interval_secs: u64,
    /// Beneficiary pool or project identifier
    pub payee_pool: String,
    /// Healthcare cause / program tag
    pub cause: String,
    /// Geographic earmark
    pub region: String,
    pub emergency_pool: bool,
    pub active: bool,
    pub created_at: u64,
}

#[contracterror]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum Error {
    PaymentNotFound = 500,
    InvalidAmount = 501,
    SamePayerPayee = 502,
    InvalidPage = 503,
    NotPledgeDonor = 504,
}

// ── Storage keys ───────────────────────────────────────────────────────────────

const PAYMENT_COUNTER: soroban_sdk::Symbol = symbol_short!("PAY_CTR");
const PLEDGE_COUNTER: soroban_sdk::Symbol = symbol_short!("PLG_CTR");

/// Build a storage key for a payment by encoding its numeric id into a Symbol.
/// Uses a (u64, &str) tuple as the composite key to avoid Symbol length limits.
fn payment_key(id: u64) -> (u64, &'static str) {
    (id, "pay")
}

fn pledge_key(id: u64) -> (u64, &'static str) {
    (id, "plg")
}

fn get_counter(env: &Env) -> u64 {
    env.storage().instance().get(&PAYMENT_COUNTER).unwrap_or(0u64)
}

fn set_counter(env: &Env, val: u64) {
    env.storage().instance().set(&PAYMENT_COUNTER, &val);
}

fn get_pledge_counter(env: &Env) -> u64 {
    env.storage().instance().get(&PLEDGE_COUNTER).unwrap_or(0u64)
}

fn set_pledge_counter(env: &Env, val: u64) {
    env.storage().instance().set(&PLEDGE_COUNTER, &val);
}

fn store_payment(env: &Env, payment: &Payment) {
    let key = payment_key(payment.id);
    env.storage().persistent().set(&key, payment);
}

fn load_payment(env: &Env, id: u64) -> Option<Payment> {
    let key = payment_key(id);
    env.storage().persistent().get(&key)
}

fn store_pledge(env: &Env, pledge: &DonationPledge) {
    let key = pledge_key(pledge.id);
    env.storage().persistent().set(&key, pledge);
}

fn load_pledge(env: &Env, id: u64) -> Option<DonationPledge> {
    env.storage().persistent().get(&pledge_key(id))
}

// ── Contract ───────────────────────────────────────────────────────────────────

#[contract]
pub struct PaymentContract;

#[contractimpl]
impl PaymentContract {
    /// Create a new payment record.
    pub fn create_payment(
        env: Env,
        request_id: u64,
        payer: Address,
        payee: Address,
        amount: i128,
    ) -> Result<u64, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if payer == payee {
            return Err(Error::SamePayerPayee);
        }

        payer.require_auth();

        let counter = get_counter(&env) + 1;
        set_counter(&env, counter);

        let now = env.ledger().timestamp();
        let payment = Payment {
            id: counter,
            request_id,
            payer,
            payee,
            amount,
            status: PaymentStatus::Pending,
            created_at: now,
            updated_at: now,
        };

        store_payment(&env, &payment);

        env.events().publish(
            (symbol_short!("payment"), symbol_short!("created")),
            counter,
        );

        Ok(counter)
    }

    /// Create an escrow payment: verify the hospital has sufficient balance,
    /// then transfer funds from the hospital to this contract and record the
    /// payment as `Locked`.
    ///
    /// Returns `Error::InsufficientEscrowFunds { required, available }` if the
    /// hospital's token balance is below `amount`, so the NestJS backend can
    /// surface a meaningful error message instead of an opaque host panic.
    ///
    /// No storage entry is written if the balance check fails.
    pub fn create_escrow(
        env: Env,
        request_id: u64,
        hospital: Address,
        payee: Address,
        amount: i128,
        token: Address,
    ) -> Result<u64, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if hospital == payee {
            return Err(Error::SamePayerPayee);
        }

        hospital.require_auth();

        // Balance check BEFORE any state is written.
        let token_client = token::Client::new(&env, &token);
        let available = token_client.balance(&hospital);
        if available < amount {
            return Err(Error::InsufficientEscrowFunds);
        }

        // Transfer funds into escrow (this contract).
        token_client.transfer(&hospital, &env.current_contract_address(), &amount);

        let counter = get_counter(&env) + 1;
        set_counter(&env, counter);

        let now = env.ledger().timestamp();
        let payment = Payment {
            id: counter,
            request_id,
            payer: hospital,
            payee,
            amount,
            status: PaymentStatus::Locked,
            created_at: now,
            updated_at: now,
        };

        store_payment(&env, &payment);

        env.events().publish(
            (symbol_short!("payment"), symbol_short!("escrowed")),
            counter,
        );

        Ok(counter)
    }

    /// Update payment status (internal helper exposed for testing).
    pub fn update_status(env: Env, payment_id: u64, status: PaymentStatus) -> Result<(), Error> {
        let mut payment = load_payment(&env, payment_id).ok_or(Error::PaymentNotFound)?;
        payment.status = status;
        payment.updated_at = env.ledger().timestamp();
        store_payment(&env, &payment);
        Ok(())
    }

    // ── Query functions ────────────────────────────────────────────────────────

    /// Get a single payment by its ID.
    pub fn get_payment(env: Env, payment_id: u64) -> Result<Payment, Error> {
        load_payment(&env, payment_id).ok_or(Error::PaymentNotFound)
    }

    /// Find the first payment associated with a given request ID.
    pub fn get_payment_by_request(env: Env, request_id: u64) -> Result<Payment, Error> {
        let counter = get_counter(&env);
        for i in 1..=counter {
            if let Some(payment) = load_payment(&env, i) {
                if payment.request_id == request_id {
                    return Ok(payment);
                }
            }
        }
        Err(Error::PaymentNotFound)
    }

    /// Get all payments where the given address is the payer, with pagination.
    pub fn get_payments_by_payer(
        env: Env,
        payer: Address,
        page: u32,
        page_size: u32,
    ) -> PaymentPage {
        let page_size = if page_size == 0 { 20 } else { page_size };
        let counter = get_counter(&env);
        let mut all = vec![&env];

        for i in 1..=counter {
            if let Some(p) = load_payment(&env, i) {
                if p.payer == payer {
                    all.push_back(p);
                }
            }
        }

        Self::paginate(&env, all, page, page_size)
    }

    /// Get all payments where the given address is the payee, with pagination.
    pub fn get_payments_by_payee(
        env: Env,
        payee: Address,
        page: u32,
        page_size: u32,
    ) -> PaymentPage {
        let page_size = if page_size == 0 { 20 } else { page_size };
        let counter = get_counter(&env);
        let mut all = vec![&env];

        for i in 1..=counter {
            if let Some(p) = load_payment(&env, i) {
                if p.payee == payee {
                    all.push_back(p);
                }
            }
        }

        Self::paginate(&env, all, page, page_size)
    }

    /// Get all payments filtered by status, with pagination.
    pub fn get_payments_by_status(
        env: Env,
        status: PaymentStatus,
        page: u32,
        page_size: u32,
    ) -> PaymentPage {
        let page_size = if page_size == 0 { 20 } else { page_size };
        let counter = get_counter(&env);
        let mut all = vec![&env];

        for i in 1..=counter {
            if let Some(p) = load_payment(&env, i) {
                if p.status == status {
                    all.push_back(p);
                }
            }
        }

        Self::paginate(&env, all, page, page_size)
    }

    /// Get aggregate payment statistics across all payments.
    pub fn get_payment_statistics(env: Env) -> PaymentStats {
        let counter = get_counter(&env);
        let mut stats = PaymentStats {
            total_locked: 0,
            total_released: 0,
            total_refunded: 0,
            count_locked: 0,
            count_released: 0,
            count_refunded: 0,
        };

        for i in 1..=counter {
            if let Some(payment) = load_payment(&env, i) {
                match payment.status {
                    PaymentStatus::Locked => {
                        stats.total_locked += payment.amount;
                        stats.count_locked += 1;
                    }
                    PaymentStatus::Released => {
                        stats.total_released += payment.amount;
                        stats.count_released += 1;
                    }
                    PaymentStatus::Refunded => {
                        stats.total_refunded += payment.amount;
                        stats.count_refunded += 1;
                    }
                    _ => {}
                }
            }
        }

        stats
    }

    /// Get a chronological timeline of payments (ordered by created_at ascending), paginated.
    pub fn get_payment_timeline(env: Env, page: u32, page_size: u32) -> PaymentPage {
        let page_size = if page_size == 0 { 20 } else { page_size };
        let counter = get_counter(&env);

        // Collect all payments
        let mut all = vec![&env];
        for i in 1..=counter {
            if let Some(p) = load_payment(&env, i) {
                all.push_back(p);
            }
        }

        // Bubble-sort ascending by created_at
        let len = all.len();
        for i in 0..len {
            for j in 0..len.saturating_sub(i + 1) {
                let a = all.get(j).unwrap();
                let b = all.get(j + 1).unwrap();
                if a.created_at > b.created_at {
                    all.set(j, b);
                    all.set(j + 1, a);
                }
            }
        }

        Self::paginate(&env, all, page, page_size)
    }

    /// Return the total number of payments.
    pub fn get_payment_count(env: Env) -> u64 {
        get_counter(&env)
    }

    /// Register an earmarked recurring pledge. Execution / transfers are triggered off-chain
    /// according to `interval_secs`; this stores the commitment and metadata for transparency.
    pub fn create_pledge(
        env: Env,
        donor: Address,
        amount_per_period: i128,
        interval_secs: u64,
        payee_pool: String,
        cause: String,
        region: String,
        emergency_pool: bool,
    ) -> Result<u64, Error> {
        donor.require_auth();
        if amount_per_period <= 0 {
            return Err(Error::InvalidAmount);
        }
        if interval_secs == 0 {
            return Err(Error::InvalidAmount);
        }

        let id = get_pledge_counter(&env) + 1;
        set_pledge_counter(&env, id);

        let pledge = DonationPledge {
            id,
            donor: donor.clone(),
            amount_per_period,
            interval_secs,
            payee_pool,
            cause,
            region,
            emergency_pool,
            active: true,
            created_at: env.ledger().timestamp(),
        };
        store_pledge(&env, &pledge);

        env.events().publish(
            (symbol_short!("pledge"), symbol_short!("create")),
            id,
        );

        Ok(id)
    }

    pub fn get_pledge(env: Env, pledge_id: u64) -> Result<DonationPledge, Error> {
        load_pledge(&env, pledge_id).ok_or(Error::PaymentNotFound)
    }

    pub fn set_pledge_active(env: Env, pledge_id: u64, donor: Address, active: bool) -> Result<(), Error> {
        donor.require_auth();
        let mut p = load_pledge(&env, pledge_id).ok_or(Error::PaymentNotFound)?;
        if p.donor != donor {
            return Err(Error::NotPledgeDonor);
        }
        p.active = active;
        store_pledge(&env, &p);
        Ok(())
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    fn paginate(env: &Env, items: Vec<Payment>, page: u32, page_size: u32) -> PaymentPage {
        let total = items.len() as u64;
        let start = (page as u64) * (page_size as u64);
        let mut result = vec![env];

        if start < total {
            let end = (start + page_size as u64).min(total);
            for i in start..end {
                result.push_back(items.get(i as u32).unwrap());
            }
        }

        PaymentPage {
            items: result,
            total,
            page,
            page_size,
        }
    }
}

mod test;

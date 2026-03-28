use crate::types::{BloodStatus, BloodUnit, DataKey, StatusChangeHistory};
use soroban_sdk::{Address, Env, String, Vec};

pub const SECONDS_PER_DAY: u64 = 86400;

/// Standard shelf life for whole blood: 35 days.
/// Used to compute expiration_timestamp from ledger time at registration.
pub const BLOOD_SHELF_LIFE_DAYS: u64 = 35;

/// Get the admin address
pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("Admin not initialized")
}

/// Set the admin address
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

/// Check if an address is authorized as a blood bank
pub fn is_authorized_bank(env: &Env, bank: &Address) -> bool {
    let admin = get_admin(env);
    bank == &admin
}

/// Get the current blood unit counter
pub fn get_blood_unit_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::BloodUnitCounter)
        .unwrap_or(0)
}

/// Increment and return the next blood unit ID
pub fn increment_blood_unit_id(env: &Env) -> u64 {
    let current = get_blood_unit_counter(env);
    let next_id = current + 1;
    env.storage()
        .instance()
        .set(&DataKey::BloodUnitCounter, &next_id);
    next_id
}

/// Store a blood unit
pub fn set_blood_unit(env: &Env, blood_unit: &BloodUnit) {
    env.storage()
        .persistent()
        .set(&DataKey::BloodUnit(blood_unit.id), blood_unit);
}

/// Get a blood unit by ID
pub fn get_blood_unit(env: &Env, id: u64) -> Option<BloodUnit> {
    env.storage().persistent().get(&DataKey::BloodUnit(id))
}

/// Check if a blood unit exists
pub fn blood_unit_exists(env: &Env, id: u64) -> bool {
    env.storage().persistent().has(&DataKey::BloodUnit(id))
}

/// Add blood unit to blood type index
pub fn add_to_blood_type_index(env: &Env, blood_unit: &BloodUnit) {
    let key = DataKey::BloodTypeIndex(blood_unit.blood_type);
    let mut units: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    units.push_back(blood_unit.id);
    env.storage().persistent().set(&key, &units);
}

/// Add blood unit to bank index
pub fn add_to_bank_index(env: &Env, blood_unit: &BloodUnit) {
    let key = DataKey::BankIndex(blood_unit.bank_id.clone());
    let mut units: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    units.push_back(blood_unit.id);
    env.storage().persistent().set(&key, &units);
}

/// Add blood unit to status index
pub fn add_to_status_index(env: &Env, blood_unit: &BloodUnit) {
    let key = DataKey::StatusIndex(blood_unit.status);
    let mut units: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    units.push_back(blood_unit.id);
    env.storage().persistent().set(&key, &units);
}

/// Remove a blood unit ID from the status index bucket for `old_status`.
///
/// Called whenever a unit transitions to a new status so that query results
/// (e.g. "all Reserved units") remain accurate after every transition.
pub fn remove_from_status_index(env: &Env, blood_unit_id: u64, old_status: BloodStatus) {
    let key = DataKey::StatusIndex(old_status);
    let mut units: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    // Rebuild without the target ID.  Soroban Vec has no retain/remove,
    // so we iterate and push items we want to keep into a new Vec.
    let mut updated: Vec<u64> = Vec::new(env);
    for i in 0..units.len() {
        let id = units.get(i).unwrap();
        if id != blood_unit_id {
            updated.push_back(id);
        }
    }
    env.storage().persistent().set(&key, &updated);
}

/// Add blood unit to donor index (if donor_id exists)
pub fn add_to_donor_index(env: &Env, blood_unit: &BloodUnit) {
    if let Some(donor) = &blood_unit.donor_id {
        let key = DataKey::DonorIndex(donor.clone());
        let mut units: Vec<u64> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));

        units.push_back(blood_unit.id);
        env.storage().persistent().set(&key, &units);
    }
}

/// Record a status change in history
pub fn record_status_change(
    env: &Env,
    blood_unit_id: u64,
    from_status: BloodStatus,
    to_status: BloodStatus,
    authorized_by: &Address,
    reason: Option<String>,
) {
    let changed_at = env.ledger().timestamp();
    let history_id = increment_status_history_counter(env);

    let history = StatusChangeHistory {
        id: history_id,
        blood_unit_id,
        from_status,
        to_status,
        authorized_by: authorized_by.clone(),
        changed_at,
        reason,
    };

    // Get existing history for this blood unit
    let key = DataKey::StatusHistory(blood_unit_id);
    let mut histories: Vec<StatusChangeHistory> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    histories.push_back(history);
    env.storage().persistent().set(&key, &histories);

    // Increment change count for this unit
    let count_key = DataKey::BloodUnitStatusChangeCount(blood_unit_id);
    let count = get_blood_unit_status_change_count(env, blood_unit_id);
    env.storage().persistent().set(&count_key, &(count + 1));
}

/// Get status change history for a blood unit
pub fn get_status_history(env: &Env, blood_unit_id: u64) -> Vec<StatusChangeHistory> {
    let key = DataKey::StatusHistory(blood_unit_id);
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env))
}

/// Get the number of status changes for a blood unit
pub fn get_blood_unit_status_change_count(env: &Env, blood_unit_id: u64) -> u64 {
    let key = DataKey::BloodUnitStatusChangeCount(blood_unit_id);
    env.storage().persistent().get(&key).unwrap_or(0)
}

/// Get the next status history ID
fn increment_status_history_counter(env: &Env) -> u64 {
    let key = DataKey::StatusHistoryCounter;
    let current = env.storage().instance().get(&key).unwrap_or(0u64);
    let next_id = current + 1;
    env.storage().instance().set(&key, &next_id);
    next_id
}

/// Increment and return the next reservation ID
pub fn increment_reservation_id(env: &Env) -> u64 {
    let key = DataKey::ReservationCounter;
    let current: u64 = env.storage().instance().get(&key).unwrap_or(0);
    let next_id = current + 1;
    env.storage().instance().set(&key, &next_id);
    next_id
}

/// Store a reservation (temporary storage — auto-expires with ledger TTL)
pub fn set_reservation(env: &Env, id: u64, reservation: &crate::types::Reservation) {
    env.storage()
        .temporary()
        .set(&DataKey::Reservation(id), reservation);
}

/// Get a reservation by ID
pub fn get_reservation(env: &Env, id: u64) -> Option<crate::types::Reservation> {
    env.storage().temporary().get(&DataKey::Reservation(id))
}

/// Remove a reservation
pub fn remove_reservation(env: &Env, id: u64) {
    env.storage().temporary().remove(&DataKey::Reservation(id));
}

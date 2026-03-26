use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 300,
    NotInitialized = 301,
    Unauthorized = 302,
    InvalidTimestamp = 303,
    InvalidQuantity = 304,
    NotAuthorizedHospital = 305,
    RequestNotFound = 306,
}

import { Interface } from "ethers";

// All custom errors from your contract + OpenZeppelin
const ERROR_ABI = [
  // Solidity standard error
  "error Error(string)",
  "error Panic(uint256)",

  // Your contract errors
  "error InvalidManufacturer()",
  "error ManufacturerRegistryIsFull()",
  "error youAreAlreadyaManufacturer()",
  "error InvalidRetailerAddress()",
  "error QuantityOutOfRange()",
  "error InvalidProductHash()",
  "error RequestAlreadyFulfilled()",
  "error RequestDoesNotExist()",
  "error ArrayLengthMismatch()",
  "error NotOwner()",
  "error OnlyRetailer()",
  "error PhoneNumberRequired()",
  "error AlreadySold()",
  "error AlreadyShipped()",
  "error NotInTransit()",
  "error CannotSellInCurrentState()",
  "error OnlyCurrentCustodian()",
  "error PartNotSold()",
  "error AlreadyReturnedOrRecalled()",
  "error OnlyManufacturer()",
  "error RecipientNotRetailer()",
  "error PartNotTransferable()",
  "error NotInDefectiveState()",
  "error AlreadyRecalled()",
  "error PartDoesNotExist()",
  "error TransferBlocked()",

  // OpenZeppelin AccessControl
  "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
  "error AccessControlBadConfirmation()",
];

const iface = new Interface(ERROR_ABI);

const FRIENDLY_MESSAGES = {
  // Access control
  AccessControlUnauthorizedAccount:
    " Please make sure you're registered with the correct role.",

  AccessControlBadConfirmation:
    "Role confirmation failed.",

  // Roles
  OnlyRetailer:
    "Only registered retailers can perform this action.",

  OnlyManufacturer:
    "Either you are Not Manufacturer or you don't own the part",

  // Ownership
  NotOwner:
    "You don't own this part.",

  OnlyCurrentCustodian:
    "You're not the current custodian of this part.",

  // State errors
  AlreadySold:
    "This part has already been sold.",

  AlreadyShipped:
    "This part has already been shipped.",

  AlreadyRecalled:
    "This part has already been recalled.",

  AlreadyReturnedOrRecalled:
    "This part is already returned or recalled.",

  // Request errors
  RequestAlreadyFulfilled:
    "This supply request was already fulfilled.",

  RequestDoesNotExist:
    "This request doesn't exist.",

  QuantityOutOfRange:
    "Quantity must be between 1 and 100.",

  InvalidProductHash:
    "Invalid product hash.",

  ArrayLengthMismatch:
    "Data mismatch. Please refresh and try again.",

  // Part errors
  PartDoesNotExist:
    "This part doesn't exist on-chain.",

  PartNotSold:
    "This part hasn't been sold yet.",

  PartNotTransferable:
    "This part can't be transferred in its current state.",

  NotInDefectiveState:
    "This part isn't in a defective state.",

  NotInTransit:
    "This part isn't in transit.",

  CannotSellInCurrentState:
    "This part can't be sold in its current state.",

  // Manufacturer / retailer
  InvalidManufacturer:
    "Invalid manufacturer address.",

  ManufacturerRegistryIsFull:
    "Manufacturer registry is full (max 10).",

  youAreAlreadyaManufacturer:
    "You're already registered as a manufacturer.",

  InvalidRetailerAddress:
    "Invalid retailer address.",

  RecipientNotRetailer:
    "Recipient must be a registered retailer.",

  // Misc
  PhoneNumberRequired:
    "Phone number is required.",

  TransferBlocked:
    "Direct transfers are disabled. Use the proper flow.",
};


const getRevertData = (error) => {
  const possibleData = [
    error?.data,
    error?.error?.data,
    error?.info?.error?.data,
    error?.info?.data,
    error?.cause?.data,
    error?.cause?.error?.data,
  ];

  return possibleData.find(
    (data) => typeof data === "string" && data !== "0x"
  );
};


/**
 * Convert any contract error into a friendly message.
 *
 * @param {any} error - Error thrown by ethers.js
 * @returns {string}
 */
export const getFriendlyError = (error) => {
  if (!error) {
    return "Something went wrong.";
  }

  // User rejected transaction
  if (
    error.code === "ACTION_REJECTED" ||
    error.code === 4001 ||
    error?.info?.error?.code === 4001 ||
    error?.error?.code === 4001
  ) {
    return "Transaction rejected by user.";
  }

  // Try to decode Solidity revert data
  const data = getRevertData(error);

  if (data) {
    try {
      const parsed = iface.parseError(data);

      if (parsed) {
        // Standard require("...")
        if (parsed.name === "Error") {
          return parsed.args[0] || "Transaction failed.";
        }

        // Solidity panic
        if (parsed.name === "Panic") {
          return "The contract encountered an internal error.";
        }

        // Custom error
        return (
          FRIENDLY_MESSAGES[parsed.name] ||
          parsed.name
        );
      }
    } catch (decodeError) {
      console.log("Could not decode contract error:", decodeError);
    }
  }

  // Ethers reason
  if (error.reason) {
    return error.reason;
  }

  // Axios/backend errors
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Normal error message
  if (
    error.message &&
    !error.message.includes("execution reverted") &&
    !error.message.includes("missing revert data")
  ) {
    return error.message;
  }

  return "Transaction failed. Please try again.";
};
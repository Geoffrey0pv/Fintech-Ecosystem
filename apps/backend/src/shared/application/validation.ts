/**
 * Matches a strictly POSITIVE monetary amount string with up to 2 decimals.
 * Rejects "0", "0.00", negatives and >2 decimal places.
 * Examples accepted: "0.01", "0.50", "100", "1500000.99".
 */
export const POSITIVE_MONEY_REGEX = /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d*(?:\.\d{1,2})?)$/;

export const MONEY_MESSAGE = 'amount must be a positive number with up to 2 decimal places';

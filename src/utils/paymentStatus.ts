/**
 * Shared ordering for payment-bearing player lists.
 * Lower values appear first so every payment-bearing view uses one consistent order.
 * PAID, APPROVED and ACTIVE are intentionally treated as the same paid state.
 */
export const PAYMENT_STATUS_PRIORITY: Record<string, number> = {
  PAID: 0,
  UNPAID: 1,
  HANDSHAKE: 2,
  TRIAL: 3,
  TBC: 4,
  EXTRA: 5,
  // Legacy aliases are normalized before comparison, but remain here for
  // callers that inspect the priority map directly.
  OTHERS: 5,
  SUBSTITUTE: 5,
  APPROVED: 0,
  ACTIVE: 0,
  OVER_DUE: 1,
  OVERDUE: 1,
  PAYMENT_PENDING: 1,
  FAILED: 1,
  REFUNDED: 1,
};

const PAYMENT_STATUS_ALIASES: Record<string, string> = {
  "APPROVED (UNPAID)": "UNPAID",
  APPROVED_UNPAID: "UNPAID",
  APPROVED: "PAID",
  ACTIVE: "PAID",
  OVER_DUE: "UNPAID",
  OVERDUE: "UNPAID",
  "OVER-DUE": "UNPAID",
  PAYMENT_PENDING: "UNPAID",
  FAILED: "UNPAID",
  REFUNDED: "UNPAID",
  OTHERS: "EXTRA",
  SUBSTITUTE: "EXTRA",
};

export const normalizePaymentStatus = (status?: unknown): string =>
  PAYMENT_STATUS_ALIASES[String(status || "UNPAID").trim().toUpperCase()] || String(status || "UNPAID").trim().toUpperCase();

const getPlayerName = (value: any): string =>
  String(value?.name || value?.fullName || value?.playerName || value?.user?.fullName || "").trim().toLocaleLowerCase();

/** Return a new array sorted by payment status, then name, preserving stable ties. */
export const sortPlayersByPaymentStatus = <T>(
  items: T[],
  getStatus: (item: T) => unknown = (item: any) => item?.paymentStatus,
  getName: (item: T) => unknown = getPlayerName,
): T[] => {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftStatus = normalizePaymentStatus(getStatus(left.item));
      const rightStatus = normalizePaymentStatus(getStatus(right.item));
      const priorityDifference = (PAYMENT_STATUS_PRIORITY[leftStatus] ?? 99) - (PAYMENT_STATUS_PRIORITY[rightStatus] ?? 99);
      if (priorityDifference !== 0) return priorityDifference;

      const nameDifference = String(getName(left.item) || "").localeCompare(String(getName(right.item) || ""), undefined, { sensitivity: "base" });
      return nameDifference !== 0 ? nameDifference : left.index - right.index;
    })
    .map(({ item }) => item);
};

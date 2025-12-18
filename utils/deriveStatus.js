export function deriveOrderStatus(order) {
  const itemStatuses = (order.items || []).map((i) => i.status);
  const set = new Set(itemStatuses);

  if (set.has("Cancelled") || order.cancellationStatus === "Accepted")
    return "Cancelled";
  if (itemStatuses.length > 0 && itemStatuses.every((s) => s === "Completed"))
    return "Completed";
  if (
    itemStatuses.length > 0 &&
    itemStatuses.every((s) => s === "Delivered" || s === "Completed")
  )
    return "Delivered";
  if (set.has("Ship")) return "Ship";
  if (set.has("To ship")) return "To ship";
  return "For Approval";
}

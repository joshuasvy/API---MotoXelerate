import { io } from "../server.js";

/**
 * Broadcast an entity update over Socket.IO
 * @param {string} entity - The entity name (e.g. "order", "appointment", "invoice", "notification").
 * @param {object} payload - The object to send.
 * @param {string} action - e.g. "update", "delete", "create"
 */
export function broadcastEntity(entity, payload, action = "update") {
  if (!io) {
    console.warn("⚠️ Socket.IO not initialized, cannot broadcast", entity);
    return;
  }

  const eventName = `${entity}:${action}`;

  // 🔎 Normalize notification payloads so frontend hook can parse them consistently
  const normalized = payload;
  if (entity === "notification") {
    normalized = {
      id: payload._id?.toString() ?? payload.id,
      orderId: payload.orderId ?? null,
      appointmentId: payload.appointmentId?.toString() ?? null,
      customerName: payload.customerName ?? "",
      type: payload.type,
      message: payload.message,
      reason: payload.reason ?? "",
      status: payload.status ?? "",
      createdAt: payload.createdAt ?? new Date().toISOString(),
      read: payload.read ?? Boolean(payload.readAt),
    };
  }

  io.emit(eventName, normalized);
  console.log(`📡 Broadcasted ${eventName}`, normalized);
}

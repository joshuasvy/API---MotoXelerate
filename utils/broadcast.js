// utils/broadcast.js
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

  let normalized = payload;
  if (entity === "notification") {
    normalized = {
      _id: payload._id?.toString() ?? payload.id, // ✅ keep _id for consistency
      orderId: payload.orderId ?? null,
      appointmentId: payload.appointmentId?.toString() ?? null,
      customerName: payload.customerName ?? "",
      type: payload.type,
      message: payload.message,
      reason: payload.reason ?? "",
      status: payload.status ?? "",
      createdAt: payload.createdAt ?? new Date().toISOString(),
      readAt: payload.readAt ?? null, // ✅ use readAt, not read
    };
  }

  io.emit(eventName, normalized);
  console.log(`📡 Broadcasted ${eventName}`, normalized);
}

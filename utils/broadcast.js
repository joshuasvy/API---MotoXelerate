// utils/broadcast.js
import { io } from "../server.js"; // wherever you initialize Socket.IO

/**
 * Broadcast an entity update over Socket.IO
 * @param {string} entity - "appointment" or "invoice"
 * @param {object} payload - the object to send
 * @param {string} action - e.g. "update", "delete", "create"
 */
export function broadcastEntity(entity, payload, action = "update") {
  if (!io) {
    console.warn("⚠️ Socket.IO not initialized, cannot broadcast", entity);
    return;
  }

  const eventName = `${entity}:${action}`;
  io.emit(eventName, payload);

  console.log(`📡 Broadcasted ${eventName}`, {
    id: payload._id,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    status: payload.status,
  });
}

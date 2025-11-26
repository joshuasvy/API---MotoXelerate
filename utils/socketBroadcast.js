import { io } from "../server.js";

/**
 * Broadcast an entity update to all connected clients.
 * @param {string} entity - The entity name (e.g. "order", "appointment", "product").
 * @param {object} payload - The updated or new document to broadcast.
 * @param {string} action - The action type ("update" or "delete").
 */

export function broadcastEntity(entity, payload, action = "update") {
  const eventName = `${entity}:${action}`;
  console.log(`📡 Broadcasting ${eventName}`, payload);
  io.emit(eventName, payload);
}

import express from "express";
import Invoice from "../models/Invoice.js";
import Orders from "../models/Orders.js";

const router = express.Router();

// ✅ Generate invoice from an existing order
router.post("/from-order/:orderId", async (req, res) => {
  console.log("🧾 [Invoice Route] Incoming request to /from-order/:orderId");
  console.log("➡️ Params:", req.params);
  console.log("➡️ Body:", req.body);

  try {
    // Step 1: Fetch order
    console.log("🔍 Looking up order:", req.params.orderId);
    const order = await Orders.findById(req.params.orderId).populate(
      "items.product"
    );

    if (!order) {
      console.warn("⚠️ Order not found:", req.params.orderId);
      return res.status(404).json({ error: "Order not found" });
    }
    console.log("✅ Order found:", order._id, "Customer:", order.customerName);

    // Step 2: Build invoice object
    console.log("🛠️ Building invoice from order...");
    const invoice = new Invoice({
      invoiceNumber: `INV-${Date.now()}`,
      sourceType: "order",
      sourceId: order._id,
      customerName: order.customerName,
      customerAddress: order.deliveryAddress,
      paymentMethod: order.payment?.method,
      paymentStatus: order.payment?.status,
      referenceId: order.payment?.referenceId,
      paidAt: order.payment?.paidAt,
      items: order.items.map((item) => {
        console.log("📦 Item:", {
          productName: item.product?.productName,
          price: item.product?.price,
          quantity: item.quantity,
        });
        return {
          description: item.product?.productName ?? "Unknown Product",
          quantity: item.quantity,
          unitPrice: item.product?.price ?? 0,
          lineTotal: item.quantity * (item.product?.price ?? 0),
        };
      }),
      subtotal: order.totalOrder,
      total: order.totalOrder,
      status: order.payment?.status === "Succeeded" ? "paid" : "unpaid",
    });

    // Step 3: Save invoice
    console.log("💾 Saving invoice...");
    const savedInvoice = await invoice.save();
    console.log("✅ Invoice saved:", savedInvoice._id);

    // Step 4: Respond
    res.status(201).json(savedInvoice);
  } catch (err) {
    console.error("❌ Error in /from-order route:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single invoice
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

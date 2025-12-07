import express from "express";
import Invoice from "../models/Invoice.js";
import Orders from "../models/Orders.js";

const router = express.Router();

// ✅ Generate invoice from an existing order
router.post("/from-order/:orderId", async (req, res) => {
  try {
    console.log("🔍 Looking up order:", req.params.orderId);
    const order = await Orders.findById(req.params.orderId).populate(
      "items.product"
    );

    if (!order) {
      console.warn("⚠️ Order not found:", req.params.orderId);
      return res.status(404).json({ error: "Order not found" });
    }
    console.log("✅ Order found:", order._id, "Customer:", order.customerName);

    const existingInvoice = await Invoice.findOne({
      sourceId: order._id,
      referenceId: order.payment?.referenceId,
    });

    if (existingInvoice) {
      console.log("⚠️ Invoice already exists:", existingInvoice._id);
      return res.status(200).json(existingInvoice);
    }

    // ✅ Defensive payment status fallback
    const paymentStatus =
      order.payment?.status ||
      order.paymentStatus ||
      order.orderRequest ||
      "Pending";

    console.log("💳 Payment status detected:", paymentStatus);

    // ✅ Build invoice object
    const invoice = new Invoice({
      invoiceNumber: `INV-${Date.now()}`,
      sourceType: "order",
      sourceId: order._id,
      customerName: order.customerName,
      customerAddress: order.deliveryAddress,
      paymentMethod: order.payment?.method,
      paymentStatus,
      referenceId: order.payment?.referenceId,
      paidAt: order.payment?.paidAt,
      items: order.items.map((item) => ({
        description: item.product?.productName ?? "Unknown Product",
        quantity: item.quantity,
        unitPrice: item.product?.price ?? 0,
        lineTotal: item.quantity * (item.product?.price ?? 0),
      })),
      subtotal: order.totalOrder,
      total: order.totalOrder,
      status: paymentStatus?.toUpperCase() === "SUCCEEDED" ? "paid" : "unpaid",
    });

    console.log("💾 Saving invoice...");
    const savedInvoice = await invoice.save();
    console.log("✅ Invoice saved:", savedInvoice._id);

    // ✅ Link invoice back to order
    order.invoiceId = savedInvoice._id;
    await order.save();

    res.status(201).json(savedInvoice);
  } catch (err) {
    console.error("❌ Error in /from-order route:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all invoices
// ✅ Get all invoices
router.get("/", async (req, res) => {
  console.log("📥 [GET] /api/invoice → Fetching all invoices...");

  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });

    console.log("✅ Invoices fetched:", invoices.length);
    res.json(invoices);
  } catch (err) {
    console.error("❌ Error fetching invoices:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single invoice by ID
router.get("/:id", async (req, res) => {
  console.log("📥 [GET] /api/invoice/:id → Fetching invoice:", req.params.id);

  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      console.warn("⚠️ Invoice not found:", req.params.id);
      return res.status(404).json({ error: "Invoice not found" });
    }

    console.log(
      "✅ Invoice fetched:",
      invoice._id,
      "InvoiceNumber:",
      invoice.invoiceNumber
    );
    res.json(invoice);
  } catch (err) {
    console.error("❌ Error fetching invoice:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;

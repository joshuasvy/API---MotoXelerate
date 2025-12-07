import express from "express";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";

const router = express.Router();

// ✅ Generate invoice from an existing order
router.post("/from-order/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "items.product"
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    const invoice = new Invoice({
      invoiceNumber: `INV-${Date.now()}`,
      sourceType: "order",
      sourceId: order._id,
      customerName: order.customerName,
      customerAddress: order.deliveryAddress,
      paymentMethod: order.payment.method,
      paymentStatus: order.payment.status,
      referenceId: order.payment.referenceId,
      paidAt: order.payment.paidAt,
      items: order.items.map((item) => ({
        description: item.product.productName,
        quantity: item.quantity,
        unitPrice: item.product.price,
        lineTotal: item.quantity * item.product.price,
      })),
      subtotal: order.totalOrder,
      total: order.totalOrder,
      status: order.payment.status === "Succeeded" ? "paid" : "unpaid",
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
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

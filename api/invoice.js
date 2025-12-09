import express from "express";
import Invoice from "../models/Invoice.js";
import Orders from "../models/Orders.js";
import Appointments from "../models/Appointments.js";
import User from "../models/Users.js";

const router = express.Router();

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

    const user = await User.findById(order.userId);
    if (!user) {
      console.warn("⚠️ No user found for order:", order._id);
      return res.status(404).json({ error: "User not found for this order" });
    }

    const existingInvoice = await Invoice.findOne({
      sourceId: order._id,
      referenceId: order.payment?.referenceId,
    });
    if (existingInvoice) {
      console.log("⚠️ Invoice already exists:", existingInvoice._id);
      return res.status(200).json(existingInvoice);
    }

    const paymentStatus =
      order.payment?.status ||
      order.paymentStatus ||
      order.orderRequest ||
      "Pending";

    console.log("💳 Payment status detected:", paymentStatus);

    const invoice = new Invoice({
      invoiceNumber: `INV-${Date.now()}`,
      sourceType: "Order",
      sourceId: order._id,
      customerName: order.customerName,
      customerAddress: order.deliveryAddress,
      customerEmail: user.email,
      customerPhone: user.contact,
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
      status: paymentStatus?.toUpperCase() === "SUCCEEDED" ? "Paid" : "Unpaid",
    });

    console.log("💾 Saving invoice...");
    const savedInvoice = await invoice.save();
    console.log("✅ Invoice saved:", savedInvoice._id);

    order.invoiceId = savedInvoice._id;
    await order.save();

    res.status(201).json(savedInvoice);
  } catch (err) {
    console.error("❌ Error in /from-order route:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- APPOINTMENT INVOICE --------------------
router.post("/from-appointment/:appointmentId", async (req, res) => {
  try {
    console.log("🔍 Looking up appointment:", req.params.appointmentId);
    const appointment = await Appointments.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // ✅ If invoice already exists, return it (and patch missing customer info)
    let existingInvoice = await Invoice.findOne({
      sourceId: appointment._id,
      referenceId: appointment.payment?.referenceId,
    });

    if (existingInvoice) {
      if (!existingInvoice.customerEmail || !existingInvoice.customerPhone) {
        existingInvoice.customerEmail = appointment.customerEmail;
        existingInvoice.customerPhone = appointment.customerPhone;
        await existingInvoice.save();
        console.info(
          "🔄 Backfilled customer info for invoice:",
          existingInvoice.invoiceNumber
        );
      }
      return res.status(200).json(existingInvoice);
    }

    const rawStatus = appointment.payment?.status || "Pending";
    const paymentStatus =
      rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

    // ✅ Create new invoice using appointment fields directly
    const invoice = new Invoice({
      invoiceNumber: `INV-${Date.now()}`,
      sourceType: "Appointment",
      sourceId: appointment._id,
      customerName: appointment.customer_Name,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      paymentMethod: appointment.payment?.method,
      paymentStatus,
      referenceId: appointment.payment?.referenceId,
      paidAt: appointment.payment?.paidAt,
      items: [
        {
          description: appointment.service_Type,
          quantity: 1,
          unitPrice: appointment.service_Charge,
          lineTotal: appointment.service_Charge,
        },
      ],
      subtotal: appointment.service_Charge,
      total: appointment.service_Charge,
      status: paymentStatus === "Succeeded" ? "Paid" : "Unpaid",

      // Appointment summary
      appointmentId: appointment._id,
      serviceType: appointment.service_Type,
      mechanic: appointment.mechanic,
      date: appointment.date,
      time: appointment.time,
      appointmentStatus: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    });

    const savedInvoice = await invoice.save();
    appointment.invoiceId = savedInvoice._id;
    await appointment.save();

    console.info("✅ Created invoice:", savedInvoice.invoiceNumber, {
      email: savedInvoice.customerEmail,
      phone: savedInvoice.customerPhone,
    });

    res.status(201).json(savedInvoice);
  } catch (err) {
    console.error("❌ Error creating invoice:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .populate("sourceId");
    res.json(invoices);
  } catch (err) {
    console.error("❌ Error fetching invoices:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("sourceId");

    if (!invoice) {
      console.warn("⚠️ Invoice not found:", req.params.id);
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  } catch (err) {
    console.error("❌ Error fetching invoice:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;

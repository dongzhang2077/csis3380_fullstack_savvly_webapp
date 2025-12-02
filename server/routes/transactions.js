import { Router } from "express";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/transactions
router.get("/", async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(Number(limit));

    res.json(transactions);
  } catch (error) {
    console.error("List transactions failed:", error);
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const { budgetId, ...transactionData } = req.body;

    // Create transaction
    const transaction = await Transaction.create({
      ...transactionData,
      userId: req.user.id,
      budgetId: budgetId || null,
    });

    // Note: spent field removed from Budget model, now calculated from transactions

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Create transaction failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });

    // Note: spent field removed from Budget model, now calculated from transactions

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction failed:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

export default router;

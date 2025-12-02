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

    // Auto-update corresponding budget's spent field
    if (budgetId && !transactionData.isIncome) {
      await Budget.findByIdAndUpdate(budgetId, {
        $inc: { spent: transactionData.amount },
      });
    }

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

    // Recalculate budget spent if transaction was linked to a budget
    if (transaction.budgetId && !transaction.isIncome) {
      // Find all other transactions for this budget
      const otherTransactions = await Transaction.find({
        budgetId: transaction.budgetId,
        isIncome: false,
        _id: { $ne: transaction._id },
      });

      // Calculate new total spent
      const newSpent = otherTransactions.reduce(
        (sum, txn) => sum + txn.amount,
        0
      );

      // Update budget with new spent amount
      await Budget.findByIdAndUpdate(transaction.budgetId, {
        spent: newSpent,
      });
    }

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction failed:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

export default router;

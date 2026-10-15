const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// -------------------------------------------------------------
// GET /api/dashboard/stats - Inventory stats based on the 5 fields
// -------------------------------------------------------------
router.get('/stats', async (req, res, next) => {
    try {
        const summarySql = `
            SELECT 
                COUNT(*) AS total_products,
                COALESCE(SUM(product_quantity), 0) AS total_units,
                COALESCE(SUM(product_price * product_quantity), 0) AS total_inventory_value,
                COUNT(CASE WHEN product_quantity <= reorder_level AND product_quantity > 0 THEN 1 END) AS low_stock_count,
                COUNT(CASE WHEN product_quantity = 0 THEN 1 END) AS out_of_stock_count,
                COUNT(CASE WHEN product_quantity > reorder_level THEN 1 END) AS in_stock_count,
                COUNT(CASE WHEN product_quantity <= reorder_level THEN 1 END) AS total_attention_count
            FROM products
        `;
        const [summaryRows] = await pool.query(summarySql);
        const summary = summaryRows[0] || {};

        res.json({
            success: true,
            data: {
                totalProducts: parseInt(summary.total_products || 0, 10),
                totalUnits: parseInt(summary.total_units || 0, 10),
                totalInventoryValue: parseFloat(summary.total_inventory_value || 0),
                lowStockCount: parseInt(summary.low_stock_count || 0, 10),
                outOfStockCount: parseInt(summary.out_of_stock_count || 0, 10),
                inStockCount: parseInt(summary.in_stock_count || 0, 10),
                totalAttentionCount: parseInt(summary.total_attention_count || 0, 10)
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * Validation helper for exact 5 product fields:
 * 1. product_id
 * 2. product_name
 * 3. product_price
 * 4. product_quantity
 * 5. reorder_level
 */
function validateProductData(data, isUpdate = false) {
    const errors = [];

    // product_id validation
    if (!isUpdate || data.product_id !== undefined) {
        if (!data.product_id || typeof data.product_id !== 'string' || data.product_id.trim() === '') {
            errors.push('Product ID is required and cannot be blank.');
        } else if (data.product_id.trim().length > 50) {
            errors.push('Product ID cannot exceed 50 characters.');
        }
    }

    // product_name validation
    if (!isUpdate || data.product_name !== undefined) {
        if (!data.product_name || typeof data.product_name !== 'string' || data.product_name.trim() === '') {
            errors.push('Product Name is required.');
        } else if (data.product_name.trim().length > 255) {
            errors.push('Product Name cannot exceed 255 characters.');
        }
    }

    // product_price validation: non-negative decimal/number
    if (!isUpdate || data.product_price !== undefined) {
        if (data.product_price === undefined || data.product_price === null || data.product_price === '') {
            errors.push('Product Price is required.');
        } else {
            const priceNum = parseFloat(data.product_price);
            if (isNaN(priceNum) || priceNum < 0) {
                errors.push('Product Price must be a non-negative number.');
            }
        }
    }

    // product_quantity validation: non-negative integer
    if (!isUpdate || data.product_quantity !== undefined) {
        if (data.product_quantity === undefined || data.product_quantity === null || data.product_quantity === '') {
            errors.push('Product Quantity is required.');
        } else {
            const qtyNum = Number(data.product_quantity);
            if (!Number.isInteger(qtyNum) || qtyNum < 0) {
                errors.push('Product Quantity must be a non-negative integer.');
            }
        }
    }

    // reorder_level validation: non-negative integer
    if (!isUpdate || data.reorder_level !== undefined) {
        if (data.reorder_level === undefined || data.reorder_level === null || data.reorder_level === '') {
            errors.push('Reorder Level is required.');
        } else {
            const reorderNum = Number(data.reorder_level);
            if (!Number.isInteger(reorderNum) || reorderNum < 0) {
                errors.push('Reorder Level must be a non-negative integer.');
            }
        }
    }

    return errors;
}

// -------------------------------------------------------------
// GET /api/products/low-stock - Products where product_quantity <= reorder_level
// -------------------------------------------------------------
router.get('/low-stock', async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                product_id,
                product_name,
                CAST(product_price AS DECIMAL(10,2)) AS product_price,
                product_quantity,
                reorder_level,
                (reorder_level - product_quantity) AS deficit,
                CASE 
                    WHEN product_quantity = 0 THEN 'OUT_OF_STOCK'
                    ELSE 'LOW_STOCK'
                END AS stock_status
            FROM products
            WHERE product_quantity <= reorder_level
            ORDER BY product_quantity ASC, (reorder_level - product_quantity) DESC
        `;
        const [rows] = await pool.query(sql);
        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
});

// -------------------------------------------------------------
// GET /api/products - List products with optional search, status filter, sorting
// -------------------------------------------------------------
router.get('/', async (req, res, next) => {
    try {
        const {
            search = '',
            status = 'all',
            sort_by = 'product_id',
            order = 'ASC'
        } = req.query;

        const conditions = [];
        const params = [];

        // Search by product_id OR product_name
        if (search && search.trim() !== '') {
            const term = `%${search.trim()}%`;
            conditions.push('(product_id LIKE ? OR product_name LIKE ?)');
            params.push(term, term);
        }

        // Filter by Stock Status
        if (status === 'in_stock') {
            conditions.push('product_quantity > reorder_level');
        } else if (status === 'low_stock') {
            conditions.push('product_quantity <= reorder_level AND product_quantity > 0');
        } else if (status === 'out_of_stock') {
            conditions.push('product_quantity = 0');
        } else if (status === 'low_and_out') {
            conditions.push('product_quantity <= reorder_level');
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Sorting whitelist
        const allowedSortCols = {
            product_id: 'product_id',
            product_name: 'product_name',
            product_price: 'product_price',
            product_quantity: 'product_quantity',
            reorder_level: 'reorder_level'
        };

        const sortColumn = allowedSortCols[sort_by] || 'product_id';
        const sortDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const sql = `
            SELECT 
                product_id,
                product_name,
                CAST(product_price AS DECIMAL(10,2)) AS product_price,
                product_quantity,
                reorder_level,
                CASE 
                    WHEN product_quantity = 0 THEN 'OUT_OF_STOCK'
                    WHEN product_quantity <= reorder_level THEN 'LOW_STOCK'
                    ELSE 'IN_STOCK'
                END AS stock_status
            FROM products
            ${whereClause}
            ORDER BY ${sortColumn} ${sortDirection}
        `;

        const [rows] = await pool.query(sql, params);

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
});

// -------------------------------------------------------------
// GET /api/products/:id - Single product by product_id
// -------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
    try {
        const idParam = req.params.id.trim();

        const sql = `
            SELECT 
                product_id,
                product_name,
                CAST(product_price AS DECIMAL(10,2)) AS product_price,
                product_quantity,
                reorder_level,
                CASE 
                    WHEN product_quantity = 0 THEN 'OUT_OF_STOCK'
                    WHEN product_quantity <= reorder_level THEN 'LOW_STOCK'
                    ELSE 'IN_STOCK'
                END AS stock_status
            FROM products
            WHERE product_id = ?
        `;

        const [rows] = await pool.query(sql, [idParam]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Product with ID '${idParam}' was not found.`
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// -------------------------------------------------------------
// POST /api/products - Insert a new product
// -------------------------------------------------------------
router.post('/', async (req, res, next) => {
    try {
        const {
            product_id,
            product_name,
            product_price,
            product_quantity,
            reorder_level
        } = req.body;

        const validationErrors = validateProductData(req.body, false);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: validationErrors,
                message: validationErrors.join(' ')
            });
        }

        const trimmedId = product_id.trim();
        const trimmedName = product_name.trim();
        const parsedPrice = parseFloat(product_price);
        const parsedQty = parseInt(product_quantity, 10);
        const parsedReorder = parseInt(reorder_level, 10);

        // Check if product_id already exists in MySQL
        const [existing] = await pool.query(
            'SELECT product_id FROM products WHERE product_id = ?',
            [trimmedId]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Product ID '${trimmedId}' already exists in the database. Please enter a unique product_id.`
            });
        }

        const insertSql = `
            INSERT INTO products (product_id, product_name, product_price, product_quantity, reorder_level)
            VALUES (?, ?, ?, ?, ?)
        `;

        await pool.query(insertSql, [
            trimmedId,
            trimmedName,
            parsedPrice,
            parsedQty,
            parsedReorder
        ]);

        const [newProductRows] = await pool.query(
            `SELECT product_id, product_name, CAST(product_price AS DECIMAL(10,2)) AS product_price, 
                    product_quantity, reorder_level,
                    CASE 
                        WHEN product_quantity = 0 THEN 'OUT_OF_STOCK'
                        WHEN product_quantity <= reorder_level THEN 'LOW_STOCK'
                        ELSE 'IN_STOCK'
                    END AS stock_status
             FROM products WHERE product_id = ?`,
            [trimmedId]
        );

        res.status(201).json({
            success: true,
            message: `Product '${trimmedName}' (ID: ${trimmedId}) added successfully to database!`,
            data: newProductRows[0]
        });
    } catch (err) {
        next(err);
    }
});

// -------------------------------------------------------------
// PUT /api/products/:id - Update an existing product
// -------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
    try {
        const idParam = req.params.id.trim();

        // Check if product exists
        const [existing] = await pool.query(
            'SELECT * FROM products WHERE product_id = ?',
            [idParam]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Cannot update: Product with ID '${idParam}' does not exist.`
            });
        }

        const currentProduct = existing[0];
        const validationErrors = validateProductData(req.body, true);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: validationErrors,
                message: validationErrors.join(' ')
            });
        }

        const updatedId = (req.body.product_id !== undefined ? req.body.product_id.trim() : currentProduct.product_id);
        const updatedName = (req.body.product_name !== undefined ? req.body.product_name.trim() : currentProduct.product_name);
        const updatedPrice = (req.body.product_price !== undefined ? parseFloat(req.body.product_price) : parseFloat(currentProduct.product_price));
        const updatedQty = (req.body.product_quantity !== undefined ? parseInt(req.body.product_quantity, 10) : currentProduct.product_quantity);
        const updatedReorder = (req.body.reorder_level !== undefined ? parseInt(req.body.reorder_level, 10) : currentProduct.reorder_level);

        // If product_id is changing, ensure it doesn't clash with another product
        if (updatedId !== currentProduct.product_id) {
            const [clash] = await pool.query(
                'SELECT product_id FROM products WHERE product_id = ?',
                [updatedId]
            );
            if (clash.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: `Cannot change to Product ID '${updatedId}' because it is already taken by another product.`
                });
            }
        }

        const updateSql = `
            UPDATE products SET
                product_id = ?,
                product_name = ?,
                product_price = ?,
                product_quantity = ?,
                reorder_level = ?
            WHERE product_id = ?
        `;

        await pool.query(updateSql, [
            updatedId,
            updatedName,
            updatedPrice,
            updatedQty,
            updatedReorder,
            currentProduct.product_id
        ]);

        const [refetched] = await pool.query(
            `SELECT product_id, product_name, CAST(product_price AS DECIMAL(10,2)) AS product_price,
                    product_quantity, reorder_level,
                    CASE 
                        WHEN product_quantity = 0 THEN 'OUT_OF_STOCK'
                        WHEN product_quantity <= reorder_level THEN 'LOW_STOCK'
                        ELSE 'IN_STOCK'
                    END AS stock_status
             FROM products WHERE product_id = ?`,
            [updatedId]
        );

        res.json({
            success: true,
            message: `Product '${updatedName}' (${updatedId}) updated successfully!`,
            data: refetched[0]
        });
    } catch (err) {
        next(err);
    }
});

// -------------------------------------------------------------
// DELETE /api/products/:id - Delete product by product_id
// -------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
    try {
        const idParam = req.params.id.trim();

        const [existing] = await pool.query(
            'SELECT product_id, product_name FROM products WHERE product_id = ?',
            [idParam]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Cannot delete: Product with ID '${idParam}' was not found.`
            });
        }

        const product = existing[0];

        await pool.query('DELETE FROM products WHERE product_id = ?', [product.product_id]);

        res.json({
            success: true,
            message: `Product '${product.product_name}' (${product.product_id}) deleted successfully from database.`,
            deletedProductId: product.product_id
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

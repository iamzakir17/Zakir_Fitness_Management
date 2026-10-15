-- ==========================================================
-- Zakir Fitness Management - Inventory System
-- MySQL Database Schema
-- Columns: product_id, product_name, product_price, product_quantity, reorder_level
-- ==========================================================

-- 1. Create Database if it does not exist
CREATE DATABASE IF NOT EXISTS zakir_sports_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE zakir_sports_db;

-- 2. Create products table with the 5 exact fields required
CREATE TABLE IF NOT EXISTS products (
    product_id VARCHAR(50) NOT NULL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    product_quantity INT NOT NULL,
    reorder_level INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Sample fitness and sports equipment (prices in Indian Rupees)
INSERT INTO products (product_id, product_name, product_price, product_quantity, reorder_level)
VALUES
('SPT-101', 'Hex Rubber Dumbbell Set 20 kg', 2499.00, 35, 10),
('SPT-102', 'Anti-Skid Yoga Mat 6 mm', 599.00, 12, 15),
('SPT-103', 'Adjustable Weight Bench', 6999.00, 14, 5),
('SPT-104', 'English Willow Cricket Bat', 3299.00, 8, 10),
('SPT-105', 'Olympic Barbell 7 ft', 8499.00, 4, 5),
('SPT-106', 'Size 5 Training Football', 749.00, 60, 20),
('SPT-107', 'Resistance Bands Set (5 pcs)', 499.00, 28, 15),
('SPT-108', 'Folding Treadmill 2 HP', 24999.00, 3, 3),
('SPT-109', 'Badminton Racket Pair with Cover', 1299.00, 0, 10),
('SPT-110', 'Speed Skipping Rope', 249.00, 85, 25),
('SPT-111', 'Kettlebell 12 kg', 1799.00, 6, 8),
('SPT-112', 'Whey Protein Shaker Bottle 700 ml', 299.00, 0, 15),
('SPT-113', 'Gym Gloves with Wrist Support', 449.00, 22, 12),
('SPT-114', 'Tennis Racket Beginner Series', 1999.00, 16, 6)
ON DUPLICATE KEY UPDATE
    product_name = VALUES(product_name),
    product_price = VALUES(product_price),
    product_quantity = VALUES(product_quantity),
    reorder_level = VALUES(reorder_level);

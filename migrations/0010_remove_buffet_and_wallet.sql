-- Remove the combined student buffet and wallet module and all of its stored data.
-- Drop dependent sales/transaction tables before their parent tables.
DROP TABLE IF EXISTS "ShopSaleItem";
DROP TABLE IF EXISTS "ShopSale";
DROP TABLE IF EXISTS "ShopProduct";
DROP TABLE IF EXISTS "WalletTx";
DROP TABLE IF EXISTS "StudentWallet";

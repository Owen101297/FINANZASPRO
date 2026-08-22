-- One-off cleanup: elimina el esquema corrupto por la primera migración (UTF-16).
-- Se ejecuta UNA VEZ vía startCommand temporal y luego se revierte.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;

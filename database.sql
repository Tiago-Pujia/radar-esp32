/*
ARCHIVO NO UTILIZADO PARA EL PROYECTO
*/

-- =============================
-- BASE DE DATOS
-- =============================
DROP DATABASE IF EXISTS db_radar;

CREATE DATABASE IF NOT EXISTS db_radar CHARACTER SET utf8;

USE db_radar;

-- =============================
-- TABLAS
-- =============================
CREATE TABLE tbl_actividad(
    `DATE_CREATION` DATETIME NOT NULL DEFAULT now()
) ENGINE = MyISAM;

-- =============================
-- USUARIOS
-- =============================
DROP USER IF EXISTS 'user_api'@'localhost';
CREATE USER IF NOT EXISTS 'user_api'@'localhost' IDENTIFIED BY 'peluza';

GRANT select,insert,update,EXECUTE  ON db_ium.* TO 'user_api'@'localhost';
FLUSH PRIVILEGES;
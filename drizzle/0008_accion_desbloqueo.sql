INSERT INTO `acciones` (`slug`, `nombre`)
VALUES ('persona.desbloqueada', 'Cuenta desbloqueada')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

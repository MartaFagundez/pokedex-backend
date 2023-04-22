const { Router } = require('express');
// Importar todos los routers;
const pokemonsRouter = require("./pokemonsRoutes.js");
const typesRouter = require("./typesRoutes.js");

const router = Router();

// Configurar los routers
router.use("/api", pokemonsRouter);
router.use("/api", typesRouter);


module.exports = router;

/* ******** API WIKI **********
    Convenciones para los códigos de respuesta HTTP y los mensajes de error que la API puede devolver:
        200 OK: La solicitud se procesó correctamente.
        201 Created: Se creó un nuevo pokémon.
        400 Bad Request: La solicitud contiene datos incorrectos o no válidos.
        404 Not Found: El o los recursos solicitados no se encontraron.
*/ 
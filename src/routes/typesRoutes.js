const express = require("express");
const typesRouter = express.Router();
const {handleGetTypesRequest} = require("../controllers/typesController");

typesRouter.get("/types", handleGetTypesRequest);


module.exports = typesRouter;
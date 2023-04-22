const express = require("express");
const pokemonsRouter = express.Router();
const { processQueryParams, getPokemons, getPokemonById, handleCreatePokemonRequest} = require("../controllers/pokemonsController");

pokemonsRouter.get( `/pokemons`, processQueryParams, getPokemons);
pokemonsRouter.get( `/pokemons/:id`, getPokemonById);
pokemonsRouter.post( `/pokemons/create`, handleCreatePokemonRequest);

// Posibles rutas para el futuro
// pokemonsRouter.put( `/pokemons/:id`, (req, res) => {
//     res.send("Pokemon actualizado");
// });
// pokemonsRouter.delete( `/pokemons/:id`, (req, res) => {
//     res.send("Pokemon fue borrado");
// });


module.exports = pokemonsRouter;
const axios = require("axios");
const { Type } = require('../db.js');

// FUNCIONES AUXILIARES (no se exportan)


// FUNCIONES PRINCIPALES (se exportan)

// Función para obtener los tipos de datos desde la API y guardarlos en la BD
const fetchAndStorePokemonTypes = async () => {
    try {
        // Pido la info a la pokeAPI
        const response = await axios.get('https://pokeapi.co/api/v2/type');
        // De su respuesta, guardo lo que viene en la propiedad "results" (array de objetos con 2 propiedades: name y url)
        const typesAPI = response.data.results;

        // Itero a través de los objetos devueltos por la API
        for (const type of typesAPI) {
            // Hacer una inserción en la tabla Types, en caso de que el nombre del tipo no esté registrado aún
            await Type.findOrCreate({
                where: {name: type.name},
            });
        }

        console.log('Tipos de pokemones almacenados correctamente');


    } catch (error) {
        console.error('Error al obtener y almacenar los tipos de pokemones:', error.message);
    }
}


// Función para obtener los tipos de datos desde la BD
const getTypesFromBD = async (req, res) => {
    try {
      const types = await Type.findAll({
        attributes: ['name'],
      });
        
      // Mapear el array de objetos y extraer los nombres de los tipos
      const typeNames = types.map(type => type.name);
      return typeNames;

    } catch (error) {
      console.error('Error al obtener los tipos desde la base de datos:', error.message);
      throw new Error('Error al obtener los tipos desde la base de datos');
    }
};


// Función para manejar la petición GET a /types
const handleGetTypesRequest = async (req, res) => {
    try {
        const types = await getTypesFromBD();
        res.status(200).json(types);

      } catch (error) {
        console.error('Error al obtener los tipos de pokemones:', error.message);
        res.status(500).json({message: error.message});
      }
};


module.exports = {
    fetchAndStorePokemonTypes, // requerido en index.js para ejecutarlo al iniciar el servidor
    handleGetTypesRequest
};
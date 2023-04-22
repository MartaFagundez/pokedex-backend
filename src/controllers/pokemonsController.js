const axios = require("axios");
const { Pokemon, Type } = require('../db');

require ("dotenv").config();
const urlBase = process.env.API_URL;

// Variable para almacenar todos los pokemons en caché en la memoria del servidor
let pokemonsCache = null;
// Variable para almacenar el id máximo de la API en la memoria del servidor
let maxIdApi = null;


//***************************************************** */
// FUNCIONES AUXILIARES (no se exportan) ////////////////
//*************************************************** */

// Función para obtener todos los pokemons de la api y guardarlos en caché
const getPokemonsFromApi = async () => {
  // Si los datos ya están en caché, devolver directamente
  if (pokemonsCache) {
    return pokemonsCache;
  }

  // Variable para guardar los pokemons dentro de la función
  const pokemons = [];

  // Usamos el endpoint para obtener los pokemones, indicándole un paginado de 100 
  // Desde este endpoint la api nos va a devolver un array con 100 objetos del tipo "NamedAPIResource" 
  let nextUrl = `${urlBase}/pokemon?limit=100`;

  // Mientras nextUrl NO sea null...
  while (nextUrl) {
    try {
        // Pedir los siguientes 100 pokemones
        const response = await axios.get(nextUrl);
        // Guardar los 100 objetos del tipo "NamedAPIResource" y el link al endpoint de los próximos 100 pokemones
        const { results, next } = response.data;

        // Por cada NamedAPIResource generar una promesa. Cada una de estas promesas se resolverán con los detalles de cada pokemon.
        const pokemonDetailsPromises = results.map(async (pokemon) => {
            try {
            const detailsResponse = await axios.get(pokemon.url);
            return detailsResponse.data;
            } catch (error) {
            console.error(`Error al obtener detalles de ${pokemon.url}:`, error.message);
            return null;
            }
        });

        // Promise.all() toma el array de promesas generado en el paso anterior y devuelve una nueva promesa que se resuelve cuando todas las promesas del array se hayan resuelto. La nueva promesa se resuelve con un array que contiene los valores resueltos de las promesas en el mismo orden que el array original.
        const pokemonDetails = await Promise.all(pokemonDetailsPromises);
        
        // Extrae y almacena en caché solo la información necesaria de cada pokemon
        for (const details of pokemonDetails) {
            // Obtener ciertos atributos del pokemon
            const { id, name, sprites, height, weight, stats, types } = details;
    
            // Extraer los valores de image, HP, Attack, Defense y Speed
            const image = sprites.other["official-artwork"]["front_default"];
            const hp = stats.find((stat) => stat.stat.name === 'hp').base_stat;
            const attack = stats.find((stat) => stat.stat.name === 'attack').base_stat;
            const defense = stats.find((stat) => stat.stat.name === 'defense').base_stat;
            const speed = stats.find((stat) => stat.stat.name === 'speed').base_stat;
    
            // Extraer los nombres de los tipos
            const typeNames = types.map((type) => type.type.name);
    
            // Crear un objeto con la información requerida
            const pokemonData = {
            id,
            name,
            image,
            hp,
            attack,
            defense,
            speed,
            height,
            weight,
            types: typeNames,
            };
    
            pokemons.push(pokemonData);
        }

        // Actualizar la URL para la siguiente solicitud
        nextUrl = next;

    } catch (error) {
        console.error(`Error al obtener la lista de pokemons:`, error.message);
        nextUrl = null;
    }
  }

  // Almacenar los datos en caché
  pokemonsCache = pokemons;

  // Obtener el id máximo de la API
  maxIdApi = pokemons.reduce((max, pokemon) => pokemon.id > max ? pokemon.id : max, 0);

  console.log("Pokemons obtenidos de la API");
  return pokemons;
}


//---------------------------------


const getPokemonsFromDB = async () => {
  try {
    const pokemons = await Pokemon.findAll({
      attributes: ['id', 'name', 'image', 'hp', 'attack', 'defense', 'speed', 'height', 'weight'],
      include: [
        {
          model: Type,
          as: 'types',
          attributes: ['name'],
          through: { attributes: [] },
        },
      ],
    });

    return pokemons.map(pokemon => {
      const { types, ...otherAttributes } = pokemon.get();
      const typeNames = types.map(type => type.name);
      return { ...otherAttributes, types: typeNames };
    });
  } catch (error) {
    console.error('Error al obtener pokemons de la base de datos:', error.message);
    return [];
  }
};


//---------------------------------


const getAllPokemons = async () => {
  // Obtener los pokemones de la PokeAPI
  const pokemonsFromApi = await getPokemonsFromApi();

  // Obtener los pokemones de la base de datos
  const pokemonsFromDB = await getPokemonsFromDB();

  // Combinar los resultados de la PokeAPI y la base de datos
  const allPokemons = [...pokemonsFromApi, ...pokemonsFromDB];

  return allPokemons;
};


// ----------------------------------


// Función para filtrar los pokemones según el tipo y el nombre. 
const applyFilters = (pokemons, filterTypes, filterName) => {
    // Devuelve la lista de pokemones filtrada
    return pokemons.filter(pokemon => {
        // Si no se proporciona un filtro, todos los pokemones pasarán el filtro correspondiente.

        // matchType valdrá true sólo si:
            // a - no se proporcionó un filtro por tipo
            // b - dentro de los tipos del pokemon existe al menos uno de los tipos pasados por parámetro
        const matchType = !filterTypes || filterTypes.length === 0 || filterTypes.some(type => {
            return pokemon.types.some(pokemonType => pokemonType.toLowerCase() === type.toLowerCase());
        });

        // matchName valdrá true sólo si:
            // a - no se proporcionó un filtro por nombre
            // b - el nombre del pokemon incluye el string pasado por el parámetro filterName
        const matchName = !filterName || pokemon.name.toLowerCase().includes(filterName.toLowerCase());

        // El pokemon se incluye en la lista filtrada sólo si estas 2 variables tienen valor true
        return matchType && matchName;
    });
};


//--------------------------------------------------


// Función para ordenar la lista de pokemons. Ordena según "sortBy" (criterio de ordenamiento) en el sentido indicado por "sortOrder" (sentido del ordenamiento). 
const applySorting = (pokemons, sortOrder, sortBy) => {
    const sortedPokemons = [...pokemons]; // Crea una copia de la lista original para evitar efectos secundarios
  
    // Ordenar la lista de pokemons
    sortedPokemons.sort((a, b) => {
      // Guardar en valueA el valor contenido en la propiedad (indicada en "sortBy") del pokemon "a".
      // Ejs: a[name], a[id], a[attack], etc.
      const valueA = a[sortBy];
      // Guardar en valueB el valor contenido en la propiedad (indicada en "sortBy") del pokemon "b".
      // Ejs: b[name], b[id], b[attack], etc.
      const valueB = b[sortBy];

      // Aplicar el sentido del ordenamiento
      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  
    return sortedPokemons;
};


//-----------------------------------------------


// Función para paginar la lista de los pokemons
function applyPagination(pokemons, limit, offset) {
  const start = offset;
  const end = offset + limit;
  return pokemons.slice(start, end);
}


// --------------------------------------


// Función para crear un nuevo pokemon
const createPokemon = async (pokemonData) => {
  const {
    name,
    image,
    hp,
    attack,
    defense,
    speed,
    height,
    weight,
    types
  } = pokemonData;

  // Obtener la lista completa de Pokémons
  const allPokemons = await getAllPokemons();

  // Verificar si el nombre del Pokémon ingresado ya existe
  const pokemonExists = allPokemons.some(pokemon => pokemon.name.toLowerCase() === name.toLowerCase());

  if (pokemonExists) {
    throw new Error('El nombre ya está en uso.');
  }

  // Consultar el id máximo de los pokemones
  const maxId = Math.max(...allPokemons.map(pokemon => pokemon.id));
  // Aumentar el id máximo en 1 para obtener el id del nuevo Pokémon
  const id = maxId + 1;

  // Crear una instancia del modelo Pokemon y guardarla en la base de datos
  const newPokemon = await Pokemon.create({
    id,
    name,
    image,
    hp,
    attack,
    defense,
    speed,
    height,
    weight,
    createdInDB: true
  });

  // Asociar los tipos al nuevo Pokémon
  // Para cada nombre de tipo en el arreglo types...
  for (const typeName of types) {
    // Buscar un registro correspondiente en la tabla Type
    const typeInstance = await Type.findOne({ where: { name: typeName } });
    // Si se encuentra dicho registro...
    if (typeInstance) {
      // Mediante el método "addType()" de la instancia de "Pokemon", asociar el tipo al nuevo "Pokémon" (creando una nueva entrada en la tabla de intersección "pokemons_types").
      await newPokemon.addType(typeInstance);
    }
  }

  return newPokemon;
};





//**************************************************** */
// FUNCIONES PRINCIPALES (se exportan) /////////////////
//************************************************** */

// Middleware para extraer y procesar los parámetros de filtrado, ordenamiento y paginado de las consultas 
function processQueryParams(req, res, next) {
    // Filtrado
    const filterTypes = req.query.filterTypes ? req.query.filterTypes.split(',') : [];
    const filterName = req.query.filterName || '';
  
    // Ordenamiento
    const sortOrder = req.query.sortOrder || 'asc';
    const sortBy = req.query.sortBy || 'id';
  
    // Paginado
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
  
    // Almacena los valores procesados en el objeto `req`
    req.filterTypes = filterTypes;
    req.filterName = filterName;
    req.sortOrder = sortOrder;
    req.sortBy = sortBy;
    req.limit = limit;
    req.offset = offset;
  
    // Continúa con el siguiente middleware
    next();
}


//-----------------------------------------


// Función para obtener la lista completa de pokemones (los de la pokeAPI + los de la BD) y aplicar filtros y ordenamiento
const getPokemons = async (req, res) => {
  try {
    // 1. Obtener todos los pokemones (de la PokeAPI y la base de datos)
    const allPokemons = await getAllPokemons();
    
    // 2. Aplicar los filtros, ordenamiento y paginado a la lista de pokemones
    const filteredPokemons = applyFilters(allPokemons, req.filterTypes, req.filterName);
    const sortedPokemons = applySorting(filteredPokemons, req.sortOrder, req.sortBy);
    const paginatedPokemons = applyPagination(sortedPokemons, req.limit, req.offset);

    // Obtener la cantidad total de pokemones resultantes del filtrado (sin paginar)
    const numTotalFilteredPokemons = filteredPokemons.length;


    // 3. Enviar los datos procesados al cliente
    res.status(200).json({ numTotalFilteredPokemons, pokemons: paginatedPokemons });

  } catch (error) {
    console.error('Error al procesar la solicitud:', error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};


//------------------------------------------
  


// Función para obtener información detallada de un pokemon específico
const getPokemonById = async (req, res) => {
    const {id} = req.params;
    let response;

    // Si el id del pokemon es mayor al máximo id de la pokeAPI, entonces se busca en la base de datos
    if (Number(id) > maxIdApi) {
      try {
        const response = await Pokemon.findAll(
        {
          where: { id: Number(id) },
          attributes: ['id', 'name', 'image', 'hp', 'attack', 'defense', 'speed', 'height', 'weight'],
          include: [
            {
              model: Type,
              as: 'types',
              attributes: ['name'],
              through: { attributes: [] },
            },
          ],
        });
        
        // Si no se encontró el pokemon, se envía un error
        if (response.length === 0) {
          return res.status(404).json({ message: 'No existe el pokemon con el id proporcionado' });
        }

        // Si se encontró el pokemon, se envía la información
        const pokemon = response.map(pk => {
          const { types, ...otherAttributes } = pk.get();
          const typeNames = types.map(type => type.name);
          return { ...otherAttributes, types: typeNames };
        })[0];

        return res.status(200).json(pokemon);

      } catch (error) {
        console.error('Error al obtener el pokemon de la base de datos:', error.message);
        return [];
      }
    };
    
    // Si el id del pokemon es menor o igual al máximo id de la pokeAPI, entonces se busca en la pokeAPI
    try {
        response = await axios.get(`${urlBase}/pokemon/${id}`);
        
        if (response.status === 200) {
          // Obtener ciertos atributos del pokemon
          const { id, name, sprites, height, weight, stats, types } = response.data;
    
          // Extraer los valores de image, HP, Attack, Defense y Speed
          const image = sprites.other["official-artwork"]["front_default"];
          const hp = stats.find((stat) => stat.stat.name === 'hp').base_stat;
          const attack = stats.find((stat) => stat.stat.name === 'attack').base_stat;
          const defense = stats.find((stat) => stat.stat.name === 'defense').base_stat;
          const speed = stats.find((stat) => stat.stat.name === 'speed').base_stat;
  
          // Extraer los nombres de los tipos
          const typeNames = types.map((type) => type.type.name);
  
          // Crear un objeto con la información requerida
          const pokemonData = {
          id,
          name,
          image,
          hp,
          attack,
          defense,
          speed,
          height,
          weight,
          types: typeNames,
          };
  
          res.status(200).json(pokemonData);
        }

    } catch (error) {
      console.error('Error al procesar la solicitud:', error.message);
      if (error.response.status === 404) {
        res.status(404).json({ message: 'No existe el pokemon con el id proporcionado' });
      } else {  
        res.status(500).json({ message: 'Error al procesar la solicitud' });
      }
    }
};
  

//------------------------------------------


// Función para gestionar la solicitud POST para la creación de un nuevo pokemon
const handleCreatePokemonRequest = async (req, res) => {
  try {
    // Obtener los datos del Pokémon desde el cuerpo de la petición
    const pokemonData = req.body; 
    // Crear el Pokémon en la base de datos
    const createdPokemon = await createPokemon(pokemonData); 
    
    // Si se creó con éxito el Pokémon...
    if (createdPokemon) {
      // devolver una respuesta con código 201 y el Pokémon creado
      res.status(201).json(createdPokemon);

    // Si no se pudo crear el Pokémon (por ejemplo, debido a un nombre duplicado)...
    } else {
      // lanzar un error con un mensaje informativo
      throw new Error('No se pudo crear el Pokémon.');
    }
  } catch (error) {
    console.log(error.message);
    // Si ocurre algún error durante la creación del Pokémon, devuelve un código de error y un mensaje
    if(error.message.includes('El nombre ya está en uso')) {
      res.status(409).json({ message: `Error al crear el Pokémon. ${error.message}` });
    }
    else {
      res.status(500).json({ message: 'Error al crear el Pokémon.' });
    }
    
  }
};



module.exports = {
    processQueryParams,
    getPokemonsFromApi,
    getPokemons,
    getPokemonById,
    handleCreatePokemonRequest
};
//                       _oo0oo_
//                      o8888888o
//                      88" . "88
//                      (| -_- |)
//                      0\  =  /0
//                    ___/`---'\___
//                  .' \\|     |// '.
//                 / \\|||  :  |||// \
//                / _||||| -:- |||||- \
//               |   | \\\  -  /// |   |
//               | \_|  ''\---/''  |_/ |
//               \  .-\__  '-'  ___/-. /
//             ___'. .'  /--.--\  `. .'___
//          ."" '<  `.___\_<|>_/___.' >' "".
//         | | :  `- \`.;`\ _ /`;.`/ - ` : | |
//         \  \ `_.   \_ __\ /__ _/   .-` /  /
//     =====`-.____`.___ \_____/___.-`___.-'=====
//                       `=---='
//     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const server = require('./src/app.js');
const { fetchAndStorePokemonTypes } = require('./src/controllers/typesController.js');
const { getPokemonsFromApi } = require('./src/controllers/pokemonsController.js');
const { conn } = require('./src/db.js');

require ("dotenv").config();
const port = process.env.PORT || 3001;

// Sincronizar la base de datos con los modelos
conn.sync({ force: true })
.then(async () => {
  console.log('Modelos sincronizados con la base de datos');
  
  // Obtener y almacenar los tipos de pokemones al inicializar el servidor
  await fetchAndStorePokemonTypes();

  // Obtener y almacenar todos los pokemons de la api al inicializar el servidor
  await getPokemonsFromApi();
  
  server.listen(port, () => {
    console.log(`Server escuchando en el puerto http://localhost:${port}`)
  });
});

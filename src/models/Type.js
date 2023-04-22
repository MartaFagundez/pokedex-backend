const { DataTypes } = require('sequelize');

// Exportar una función que define el modelo
// Luego injectar la conexión a sequelize.
module.exports = (sequelize) => {
  // Definir el modelo
  sequelize.define('type', {
    // No es necesario especificar el campo id, al no especificar una primaryKey, sequelize lo crea automáticamente
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  // Cancelar la adición de los campos timestamps (created_at,etc) 
  }, { timestamps: false });
};

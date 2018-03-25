var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var Vendor = require('../models/vendor');
var VendorHelper = require('../helpers/vendor');
var Formula = require('../models/formula');
var FormulaHelper = require('../helpers/formula');
var mongoose = require('mongoose')
mongoose.Promise = global.Promise;

var ingredientHeaders = ['INGREDIENT', 'PACKAGE', 'TEMPERATURE', 'NATIVE UNIT', 'UNITS PER PACKAGE', 'VENDOR FREIGHT CODE', 'PRICE PER PACKAGE', 'AMOUNT (NATIVE UNITS)'];

var formulaHeaders = ['NAME', 'PRODUCT UNITS', 'DESCRIPTION', 'INGREDIENT', 'INGREDIENT UNITS'];

var intermediateHeaders = ['NAME', 'PRODUCT UNITS', 'DESCRIPTION', 'PACKAGE', 'NATIVE UNIT', 'UNITS PER PACKAGE', 'TEMPERATURE', 'INGREDIENT', 'INGREDIENT UNITS'];

var packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];

var temperatures = ['frozen', 'refrigerated', 'room temperature'];

addFormula = function(rows, intermediate) {
  return new Promise(function(resolve, reject) {
    let firstRow = rows[0];
    FormulaHelper.createFormula(firstRow['NAME'], firstRow['DESCRIPTION'], firstRow['PRODUCT UNITS'], intermediate).then(function(formula) {
      let name = formula.name;
      return Promise.all(rows.map(function(row, index) {
        return new Promise(function(resolve, reject) {
          Ingredient.getIngredient(row['INGREDIENT']).then(function(ing) {
            return FormulaHelper.addTuple(row['NAME'], index+1, mongoose.Types.ObjectId(ing['_id']), row['INGREDIENT UNITS']);
          }).then(function(formula) {
            resolve(formula);
          }).catch(function(error) {
            reject(error);
          })
        });
      }));
    }).then(function(formulas) {
      resolve(formulas[0]);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.addFormulas = function(csvData, intermediate) {
  return new Promise(function(resolve, reject) {
    if (csvData.length == 0) {
      resolve();
    } else {
      let row = 0;
      let currentFormula = csvData[row]['NAME'];
      let formulaList = [];
      let seenFormulas = [];
      let currentList = [];
      let seenIngs = [];
      while (row < csvData.length) {
        let myRow = csvData[row];
        if (myRow['NAME'] != currentFormula) {
          currentFormula = myRow['NAME'];
          seensIngs = [];

          if (seenFormulas.indexOf(currentFormula) != -1) {
            reject(new Error('Formula names must be unique (there are multiple formulas with the same name in the CSV)'));
            return;
          } else {
            seenFormulas.push(currentFormula);
          }
          if (myRow['PRODUCT UNITS'] == '' || myRow['DESCRIPTION'] == '') {
            reject(new Error('Product units or description can\'t be empty on the first appearance of the formula!'));
            return;
          }

          formulaList.push(currentList);
          currentList = [];
        }
        if (seenIngs.indexOf(myRow['INGREDIENT']) != -1) {
          reject(new Error('Formulas cannot have more than one instance of the same ingredient.'));
          return;
        } else {
          seenIngs.push(myRow['INGREDIENT']);
        }
        currentList.push(myRow);
        console.log(currentList);
        row = row+1;
      }
      formulaList.push(currentList);
      var addFormulaPromise = Promise.all(formulaList.map(function(formula) {
        return addFormula(formula, intermediate);
      }));
      resolve(addFormulaPromise);
    }
  });
}

createFormulaFromIntermediate = function(csvData) {
  let newData = [];
  for (let row of csvData) {
    let newRow = {};
    newRow['NAME'] = row['NAME'];
    newRow['DESCRIPTION'] = row['DESCRIPTION'];
    newRow['PRODUCT UNITS'] = row['PRODUCT UNITS'];
    newRow['INGREDIENT'] = row['INGREDIENT'];
    newRow['INGREDIENT UNITS'] = row['INGREDIENT UNITS'];
    newData.push(newRow);
  }
  return newData;
}

createIngredientsFromIntermediate = function(csvData) {
  return new Promise(function(resolve, reject) {
    let currentIng = '';
    let ings = [];
    for (let row of csvData) {
      if (row['NAME'] != currentIng) {
        if (row['PACKAGE'] == '' || row['TEMPERATURE'] == '' || row['NATIVE UNIT'] == '' || row['UNITS PER PACKAGE'] == '') {
          reject(new Error('Package, temperature, native unit, or units per package can\'t be empty on the first appearance of the intermediate project formula!'));
          return;
        }
        currentIng = row['NAME'];
        let ingObject = {};
        ingObject['name'] = row['NAME'];
        ingObject['package'] = row['PACKAGE'];
        ingObject['temperature'] = row['TEMPERATURE'];
        ingObject['nativeUnit'] = row['NATIVE UNIT'];
        ingObject['unitsPerPackage'] = row['UNITS PER PACKAGE'];
        ings.push(ingObject);
      }
    }
    var addIngredientsPromise = Promise.all(ings.map(function(ing) {
      return IngredientHelper.createIngredient(ing['name'], ing['package'], ing['temperature'], ing['nativeUnit'], ing['unitsPerPackage']);
    }));
    resolve(addIngredientsPromise);
  })
}

module.exports.addIntermediates = function(csvData) {
  return new Promise(function(resolve, reject) {
    if (csvData.length == 0) {
      resolve();
    } else {
      addFormulas(createFormulaFromIntermediate(csvData), true).then(function(results) {
        return createIngredientsFromIntermediate(csvData);
      }).then(function(result) {
        resolve();
      }).catch(function(error) {
        reject(error);
      });
    }
  })
}

module.exports.addToDatabase = function(index, csvRow) {
  return new Promise(function(resolve, reject) {
    console.log(csvRow.length);
    console.log(csvRow);
    console.log('-----------');

    // let validDataRowData = validDataRow(csvRow);
    // let isValid = validDataRowData['valid'];
    // let reason = validDataRowData['reason'];
    let isValid = true;
    if (!isValid) {
      let err = new Error('Error reading CSV. Row #' + index + ' contains formatting errors. ' + reason);
      err.status = 400;
      reject(err);
    } else {

      let name = csvRow['INGREDIENT'];
      let package = csvRow['PACKAGE'].toLowerCase();
      let temperature = csvRow['TEMPERATURE'].toLowerCase();
      let nativeUnit = csvRow['NATIVE UNIT'];
      let unitsPerPackage = parseFloat(csvRow['UNITS PER PACKAGE']);
      let code = csvRow['VENDOR FREIGHT CODE'];
      let price = parseFloat(csvRow['PRICE PER PACKAGE']);
      let amount = 0;

      Ingredient.getIngredient(name).then(function(ing) {
        if (ing == null) {
          return IngredientHelper.createIngredient(name, package, temperature, nativeUnit, unitsPerPackage, amount);
        } else {
          return ing;
        }
      }).then(function(ing) {
        if (code === "") {
          resolve(csvRow);
        } else {
          return VendorHelper.addIngredient(code, ing['_id'], price);
        }
      }).then(function() {
        resolve(csvRow);
      }).catch(function(error) {
        if (error.name === 'MongoError' && error.code === 11000) {
          var tryAgain = new Promise(function(resolve, reject) {
            Ingredient.getIngredient(name).then(function(ing) {
              if (code === "") {
                resolve(csvRow);
              } else {
                return VendorHelper.addIngredient(code, ing['_id'], price);
              }
            }).then(function() {
              resolve(csvRow);
            }).catch(function(error) {
              reject(error);
            });
          })
          resolve(tryAgain);
        } else {
          reject(error);
        }
      });
    }
  });
}

module.exports.checkFormulaPreexisting = function(name) {
  return new Promise(function(resolve, reject) {
    Formula.findFormulaByName(name).then(function(formula) {
      if (formula == null) {
        resolve();
      } else {
        reject(new Error('Formula ' + name + ' already exists in the database!'));
      }
    }).catch(function(error) {
      reject(error);
    })
  })
}

checkIngredientExists = function(name) {
  return new Promise(function(resolve, reject) {
    Ingredient.getIngredient(name).then(function(ing) {
      if (ing != null) {
        resolve(ing);
      } else {
        var error = new Error('Ingredient ' + name + ' doesn\'t exist');
        error.name = 'IngredientError';
        reject(error);
      }
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.checkIngredientExists = checkIngredientExists;

module.exports.checkIngredientPreexisting = function(name) {
  return new Promise(function(resolve, reject) {
    Ingredient.getIngredient(name).then(function(ing) {
      if (ing == null) {
        resolve();
      } else {
        reject(new Error('Ingredient ' + name + ' already exists in the database!'));
      }
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.checkProductUnit = function(row) {
  return new Promise(function(resolve, reject) {
    let name = row['NAME'];
    let pUnits = parseFloat(row['PRODUCT UNITS']);
    if (pUnits <= 0) {
      reject(new Error('Invalid negative product units for ' + name));
    } else if (pUnits % 1 != 0) {
      reject(new Error('Invalid non-integer product units for ' + name));
    } else {
      resolve();
    }
  })
}

module.exports.checkIngredient = function(row) {
  return new Promise(function(resolve, reject) {
    let name = row['INGREDIENT'];
    checkIngredientExists(name).then(function(ing) {
      if (ing.package !== row['PACKAGE'] || ing.temperature !== row['TEMPERATURE'] || ing.nativeUnit !== row['NATIVE UNIT'] || parseFloat(ing.unitsPerPackage) != parseFloat(row['UNITS PER PACKAGE'])) {
        reject(new Error('Ingredient ' + ing.name + ' doesn\'t match pre-existing ingredient'));
      } else {
        resolve();
      }
    }).catch(function(error) {
      if (error.name == 'IngredientError') {
        resolve();
      } else {
        reject(error);
      }
    });
  })
}

module.exports.checkVendor = function(row) {
  let vendorCode = row['VENDOR FREIGHT CODE'];
  let price = row['PRICE PER PACKAGE'];
  return new Promise(function(resolve, reject) {
    if (vendorCode == "" && price == "") {
      resolve();
    } else if (vendorCode != "" && price == "" || vendorCode == "" && price != "") {
      reject(new Error('Vendor and price must both be empty or non-empty!'));
    } else {
      Vendor.model.findOne( {code: vendorCode} ).exec().then(function(result) {
        if (result == null) {
          reject(new Error('Vendor with freight code ' + vendorCode +' doesn\'t exist!'));
        } else {
          resolve();
        }
      }).catch(function(error) {
        reject(error);
      });
    }
  })
}

module.exports.checkIngredientHeader = function(row) {
  return new Promise(function(resolve, reject) {
    for (let header of ingredientHeaders) {
      if (!row.hasOwnProperty(header)) {
        reject(new Error('Ingredient CSV is missing headers! Refer to the bulk import documentation to see the required headers.'));
        return;
      }
    }
    for (let rowHeader in row) {
      if (ingredientHeaders.indexOf(rowHeader) == -1) {
        reject(new Error('Ingredient CSV has incorrect headers! Refer to the bulk import documentation to see the correct headers.'));
        return;
      } else if (rowHeader == 'PACKAGE') {
        if (packageTypes.indexOf(row[rowHeader].toLowerCase()) == -1) {
          reject(new Error('Incorrect package type: ' + row[rowHeader]));
          return;
        }
      } else if (rowHeader == 'TEMPERATURE') {
        if (temperatures.indexOf(row[rowHeader].toLowerCase()) == -1) {
          reject(new Error('Incorrect temperature: ' + row[rowHeader]));
          return;
        }
      }
    }
    resolve();
  })
}

module.exports.checkFormulaHeader = function(row) {
  return new Promise(function(resolve, reject) {
    for (let header of formulaHeaders) {
      if (!row.hasOwnProperty(header)) {
        reject(new Error('Final Product CSV is missing headers! Refer to the bulk import documentation to see the required headers.'));
        return;
      }
    }
    for (let rowHeader in row) {
      if (formulaHeaders.indexOf(rowHeader) == -1) {
        reject(new Error('Final Product CSV has incorrect headers! Refer to the bulk import documentation to see the correct headers.'));
        return;
      }
    }
    resolve();
  })
}

module.exports.checkIntermediateHeader = function(row) {
  return new Promise(function(resolve, reject) {
    for (let header of intermediateHeaders) {
      if (!row.hasOwnProperty(header)) {
        reject(new Error('Intermediate Product CSV is missing headers! Refer to the bulk import documentation to see the required headers.'));
        return;
      }
    }
    for (let rowHeader in row) {
      if (intermediateHeaders.indexOf(rowHeader) == -1) {
        reject(new Error('Intermediate Product CSV has incorrect headers! Refer to the bulk import documentation to see the correct headers.'));
        return;
      } else if (rowHeader == 'PACKAGE') {
        if (packageTypes.indexOf(row[rowHeader].toLowerCase()) == -1) {
          reject(new Error('Incorrect package type: ' + row[rowHeader]));
          return;
        }
      } else if (rowHeader == 'TEMPERATURE') {
        if (temperatures.indexOf(row[rowHeader].toLowerCase()) == -1) {
          reject(new Error('Incorrect temperature: ' + row[rowHeader]));
          return;
        }
      }
    }
    resolve();
  })
}
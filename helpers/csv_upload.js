var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var Vendor = require('../models/vendor');
var VendorHelper = require('../helpers/vendor');
var Formula = require('../models/formula');
var FormulaHelper = require('../helpers/formula');
var mongoose = require('mongoose')
mongoose.Promise = global.Promise;

var ingredientHeaders = ['INGREDIENT', 'PACKAGE', 'TEMPERATURE', 'NATIVE UNIT', 'UNITS PER PACKAGE', 'VENDOR FREIGHT CODE', 'PRICE PER PACKAGE'];

var formulaHeaders = ['NAME', 'PRODUCT UNITS', 'DESCRIPTION', 'INGREDIENT', 'INGREDIENT UNITS'];

var intermediateHeaders = ['NAME', 'PRODUCT UNITS', 'DESCRIPTION', 'PACKAGE', 'NATIVE UNIT', 'UNITS PER PACKAGE', 'TEMPERATURE', 'INGREDIENT', 'INGREDIENT UNITS'];

var packageTypes = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];

var temperatures = ['frozen', 'refrigerated', 'room temperature'];

addFormula = function(rows, intermediate, ingInfo) {
  return new Promise(function(resolve, reject) {
    let firstRow = rows[0];
    FormulaHelper.createFormula(firstRow['NAME'], firstRow['DESCRIPTION'], firstRow['PRODUCT UNITS'], intermediate, ingInfo).then(function(formula) {
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
      let formulaList = [];
      let seenFormulas = [];
      let currentList = [];
      let seenIngs = [];
      let ingInfos = [];
      let row = 0;
      let currentFormula = csvData[row]['NAME'];
      if (intermediate) {
        let ingObject = {};
        ingObject['name'] = csvData[row]['NAME'];
        ingObject['package'] = csvData[row]['PACKAGE'];
        ingObject['temperature'] = csvData[row]['TEMPERATURE'];
        ingObject['nativeUnit'] = csvData[row]['NATIVE UNIT'];
        ingObject['unitsPerPackage'] = csvData[row]['UNITS PER PACKAGE'];
        ingInfos.push(ingObject);
      }
      while (row < csvData.length) {
        let myRow = csvData[row];
        if (myRow['NAME'] != currentFormula) {
          currentFormula = myRow['NAME'];
          seensIngs = [];

          if (intermediate) {
            let ingObject = {};
            ingObject['name'] = myRow['NAME'];
            ingObject['package'] = myRow['PACKAGE'];
            ingObject['temperature'] = myRow['TEMPERATURE'];
            ingObject['nativeUnit'] = myRow['NATIVE UNIT'];
            ingObject['unitsPerPackage'] = myRow['UNITS PER PACKAGE'];
            ingInfos.push(ingObject);
          }

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
        row = row+1;
      }
      console.log(ingInfos);
      formulaList.push(currentList);
      var addFormulaPromise = Promise.all(formulaList.map(function(formula, index) {
        return addFormula(formula, intermediate, ingInfos[index]);
      }));
      resolve(addFormulaPromise);
    }
  });
}

module.exports.addIntermediates = function(csvData) {
  return new Promise(function(resolve, reject) {
    console.log(csvData);
    if (csvData.length == 0) {
      resolve();
    } else {
      exports.addFormulas(csvData, true).then(function(results) {
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
    if (row['PRODUCT UNITS'] == '') {
      resolve();
    } else {
      let name = row['NAME'];
      let pUnits = parseFloat(row['PRODUCT UNITS']);
      if (pUnits <= 0) {
        reject(new Error('Invalid negative product units for ' + name));
      } else if (pUnits % 1 != 0) {
        reject(new Error('Invalid non-integer product units for ' + name));
      } else {
        resolve();
      }
    }
  })
}

module.exports.checkIngredient = function(row) {
  return new Promise(function(resolve, reject) {
    let name = row['INGREDIENT'];
    checkIngredientExists(name).then(function(ing) {
      if (ing.package != row['PACKAGE'] || ing.temperature != row['TEMPERATURE'] || ing.nativeUnit != row['NATIVE UNIT'] || parseFloat(ing.unitsPerPackage) != parseFloat(row['UNITS PER PACKAGE'])) {
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
      Vendor.findVendorByCode(vendorCode).then(function(result) {
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
        if (row['PACKAGE'] != '' && packageTypes.indexOf(row[rowHeader].toLowerCase()) == -1) {
          reject(new Error('Incorrect package type: ' + row[rowHeader]));
          return;
        }
      } else if (rowHeader == 'TEMPERATURE') {
        if (row['TEMPERATURE'] != '' && temperatures.indexOf(row[rowHeader].toLowerCase()) == -1) {
          reject(new Error('Incorrect temperature: ' + row[rowHeader]));
          return;
        }
      }
    }
    resolve();
  })
}
var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var Vendor = require('../models/vendor');
var VendorHelper = require('../helpers/vendor');
var Formula = require('../models/formula');
var FormulaHelper = require('../helpers/formula');

ingredientHeaders = ['INGREDIENT', 'PACKAGE', 'TEMPERATURE', 'NATIVE UNIT', 'UNITS PER PACKAGE', 'VENDOR FREIGHT CODE', 'PRICE PER PACKAGE', 'AMOUNT (NATIVE UNITS)'];

addFormula = function(rows) {
  return new Promise(function(resolve, reject) {
    let firstRow = rows[0];
    FormulaHelper.createFormula(firstRow['FORMULA'], firstRow['DESCRIPTION'], firstRow['PRODUCT UNITS']).then(function(formula) {
      let name = formula.name;
      return Promise.all(rows.map(function(row, index) {
        return FormulaHelper.addTuple(row['FORMULA'], index+1, row['INGREDIENT'], row['INGREDIENT UNITS']);
      }));
    }).then(function(formulas) {
      resolve(formulas[0]);
    }).catch(function(error) {
      reject(error);
    })
  })
}

module.exports.addFormulas = function(csvData) {
  return new Promise(function(resolve, reject) {
    if (csvData.length == 0) {
      resolve();
    } else {
      let row = 0;
      let currentFormula = csvData[row]['FORMULA'];
      let formulaList = [];
      let currentList = [];
      while (row < csvData.length) {
        let myRow = csvData[row];
        if (myRow['FORMULA'] !== currentFormula) {
          currentFormula = myRow['FORMULA'];
          formulaList.push(currentList);
          currentList = [];
        }
        currentList.push(myRow);
        console.log(currentList);
        row = row+1;
      }
      formulaList.push(currentList);
      var addFormulaPromise = Promise.all(formulaList.map(function(formula) {
        return addFormula(formula);
      }));
      resolve(addFormulaPromise);
    }
  });
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
          resolve(csvRow);
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
        reject(new Error('Ingredient ' + name + ' doesn\'t match pre-existing ingredient'));
      }
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.checkIngredientExists = checkIngredientExists;

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
      reject(error);
    });
  })
}

module.exports.checkVendor = function(vendorCode) {
  return new Promise(function(resolve, reject) {
    if (vendorCode === "") {
      resolve();
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

// module.exports.checkHeader = function(row) {
//   return new Promise(function(resolve, reject) {

//   })
// }
var express = require('express');
var router = express.Router();
// var csvparse = require('csv-parse');
var async = require('async');
var Ingredient = require('../models/ingredient');
var IngredientHelper = require('../helpers/ingredients');
var Vendor = require('../models/vendor');
var VendorHelper = require('../helpers/vendor');
var Formula = require('../models/formula');
var FormulaHelper = require('../helpers/formula');
var Upload = require('../helpers/csv_upload');
var Papa = require('papaparse');

const fs = require('fs');
const formidable = require('formidable')
const path = require('path')
const uploadDir = path.join(__dirname, '/..', '/uploads/')

var PromiseBlue = require('bluebird');
var parse = PromiseBlue.promisify(require('csv-parse'));
var logs = require(path.resolve(__dirname, "./logs.js"));

router.get('/', function(req, res) {
  res.render('uploads', { alert: null });
})


router.get('/documentation', function(req, res) {
  var filePath = "/files/BulkFormatDocumentation.pdf";

  //console.log('PDF file name: ' + __dirname + filePath);
  fs.readFile(__dirname + filePath, function(err, data) {
    res.contentType("application/pdf");
    res.send(data);
  });
});

router.post('/upload/formulas', function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.keepExtensions = true;

  console.log('Some way through uploading');

  var error = false;
  form.on('fileBegin', function(name, file) {
    var fileType = file.type.split('/').pop();
    if (fileType.toUpperCase() !== 'CSV') {
      error = true;
      let err = new Error('File must be in CSV format.');
      err.status = 400;
      return next(err);
    }
  })
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: err });
    console.log('Uploaded true!');
    var filepath = files.file.path;
    console.log('File path: ' + filepath);

    if (error) {
      return true;
    }

    var file = fs.readFileSync(filepath, 'utf8')
    var csvData;
    parseFile(file).then(function(data) {
      if (data.errors.length != 0) {
        throw data.errors;
      }
      csvData = data.data;
      return Promise.all(csvData.map(function(row, index) {
        return Promise.all([Upload.checkFormulaHeader(row), Upload.checkIngredientExists(row['INGREDIENT']), Upload.checkFormulaPreexisting(row['NAME']), Upload.checkProductUnit(row)]);
      }));
    }).then(function() {
      return Upload.addFormulas(csvData, false);
    }).then(function(results) {
      // let logResults = results.map(function(currentValue, index, arr){
      //   return currentValue['FORMULA'];
      // })
      logs.makeLog('Bulk import final product file uploaded', 'Successfully uploaded file ' + filepath, req.session.username);
      res.render('uploads', { alert: 'Successfully uploaded file' });
    }).catch(function(error) {
      if (Array.isArray(error)) {
        var message = "";
        for (i = 0; i < error.length; i++) {
          message += "Row " + error[i].row + ": " + error[i].message + ",\n";
        }
        next(new Error(message));
      } else {
        next(error);
      }
    });

  })
  form.on('fileBegin', function(name, file) {
    const [fileName, fileExt] = file.name.split('.');
    file.path = path.join(uploadDir, `${fileName}_${new Date().getTime()}.${fileExt}`);
    console.log('Uploaded file successfully: ' + fileName);

  });
})

router.post('/upload/ingredients', function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.keepExtensions = true;

  console.log('Some way through uploading');

  var error = false;
  form.on('fileBegin', function(name, file) {
    var fileType = file.type.split('/').pop();
    if (fileType.toUpperCase() !== 'CSV') {
      error = true;
      let err = new Error('File must be in CSV format.');
      err.status = 400;
      return next(err);
    }
  })
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: err });
    console.log('Uploaded true!');
    var filepath = files.file.path;
    console.log('File path: ' + filepath);

    if (error) {
      return true;
    }

    var file = fs.readFileSync(filepath, 'utf8')
    var csvData;
    parseFile(file).then(function(data) {
      if (data.errors.length != 0) {
        throw data.errors;
      }
      csvData = data.data;
      console.log(csvData);
      return Promise.all(csvData.map(function(row, index) {
        return Promise.all([Upload.checkIngredientHeader(row), Upload.checkIngredient(row), Upload.checkVendor(row)]);
      }));
    }).then(function() {
      return Promise.all(csvData.map(function(row, index) {
        return Upload.addToDatabase(index, row);
      }));
    }).then(function(results) {
      let logResults = results.map(function(currentValue, index, arr){
        return currentValue['INGREDIENT'];
      })
      logs.makeLog('Bulk import ingredients file uploaded', "Uploaded " + filepath, req.session.username);
      res.render('uploads', { alert: 'Successfully uploaded file' });
    }).catch(function(error) {
      console.log(error);
      if (Array.isArray(error)) {
        var message = "";
        for (i = 0; i < error.length; i++) {
          message += "Row " + error[i].row + ": " + error[i].message + ",\n";
        }
        next(new Error(message));
      } else {
        next(error);
      }
    });

  })
  form.on('fileBegin', function(name, file) {
    const [fileName, fileExt] = file.name.split('.');
    file.path = path.join(uploadDir, `${fileName}_${new Date().getTime()}.${fileExt}`);
    console.log('Uploaded file successfully: ' + fileName);

  });
})

router.post('/upload/intermediates', function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.keepExtensions = true;

  console.log('Some way through uploading');

  var error = false;
  form.on('fileBegin', function(name, file) {
    var fileType = file.type.split('/').pop();
    if (fileType.toUpperCase() !== 'CSV') {
      error = true;
      let err = new Error('File must be in CSV format.');
      err.status = 400;
      return next(err);
    }
  })
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: err });
    console.log('Uploaded true!');
    var filepath = files.file.path;
    console.log('File path: ' + filepath);

    if (error) {
      return true;
    }

    var file = fs.readFileSync(filepath, 'utf8')
    var csvData;
    parseFile(file).then(function(data) {
      if (data.errors.length != 0) {
        throw data.errors;
      }
      csvData = data.data;
      return Promise.all(csvData.map(function(row, index) {
        return Promise.all([Upload.checkIntermediateHeader(row), Upload.checkIngredientExists(row['INGREDIENT']), Upload.checkFormulaPreexisting(row['NAME']), Upload.checkIngredientPreexisting(row['NAME']) , Upload.checkProductUnit(row)]);
      }));
    }).then(function() {
      return Upload.addIntermediates(csvData, false);
    }).then(function(results) {
      // let logResults = results.map(function(currentValue, index, arr){
      //   return currentValue['FORMULA'];
      // })
      logs.makeLog('Bulk import intermediate product file uploaded', 'Successfully uploaded file ' + filepath, req.session.username);
      res.render('uploads', { alert: 'Successfully uploaded file' });
    }).catch(function(error) {
      if (Array.isArray(error)) {
        var message = "";
        for (i = 0; i < error.length; i++) {
          message += "Row " + error[i].row + ": " + error[i].message + ",\n";
        }
        next(new Error(message));
      } else {
        next(error);
      }
    });

  })
  form.on('fileBegin', function(name, file) {
    const [fileName, fileExt] = file.name.split('.');
    file.path = path.join(uploadDir, `${fileName}_${new Date().getTime()}.${fileExt}`);
    console.log('Uploaded file successfully: ' + fileName);

  });
})



validHeaders = function(headers) {
  let validHeaders = ['INGREDIENT', 'PACKAGE', 'AMOUNT (NATIVE UNITS)', 'NATIVE UNIT', 'UNITS PER PACKAGE', 'PRICE PER PACKAGE', 'VENDOR FREIGHT CODE', 'TEMPERATURE'];
  for (let i = 0; i < validHeaders.length; i++) {
    if (!(validHeaders.indexOf(headers[i].toUpperCase()) > -1)) {
      console.log('HEADER CULPRIT: ' + headers[i]);
      return false;
    }
  }
  return true;
}

validDataRow = function(csvRow) {
  let validPackages = ['sack', 'pail', 'drum', 'supersack', 'truckload', 'railcar'];
  let validTemperatures = ['frozen', 'refrigerated', 'room temperature'];

  let ingredientName = csvRow['INGREDIENT'];
  let packageType = csvRow['PACKAGE'];
  let temp = csvRow['TEMPERATURE'];
  let nativeUnit = csvRow['NATIVE UNIT'];
  let unitsPerPackage = csvRow['UNITS PER PACKAGE'];
  let vendorCode = csvRow['VENDOR FREIGHT CODE'];
  let price = csvRow['PRICE PER PACKAGE'];
  let amount = csvRow['AMOUNT (NATIVE UNITS)'];

  if (ingredientName == undefined | packageType == undefined | amount == undefined | price == undefined | price == undefined | vendorCode == undefined | temp == undefined | nativeUnit == undefined | unitsPerPackage == undefined) {
    return { 'valid': false, 'reason': 'Undefined values' };
  }
  let validPackageType = validPackages.indexOf(packageType.toLowerCase()) > -1;
  let validAmount = (parseInt(amount) != NaN);
  let validPrice = (parseFloat(price) != NaN) && (parseFloat(price) > 0);
  let validUnitsPerPackage = (parseFloat(unitsPerPackage) != NaN) && (parseFloat(unitsPerPackage) > 0);
  let validTemp = validTemperatures.indexOf(temp.toLowerCase()) > -1;

  let reason = (validPackageType ? '' : 'Invalid package type(' + packageType + ') for ' + ingredientName + '; ') +
    (validAmount ? '' : 'Invalid amount(' + amount + ') for ' + ingredientName + '; ') +
    (validUnitsPerPackage ? '' : 'Invalid units per package(' + unitsPerPackage + ') for ' + ingredientName + '; ') +
    (validPrice ? '' : 'Invalid price(' + price + ') for ' + ingredientName + '; ') +
    (validTemp ? '' : 'Invalid temperature(' + temp + ') for ' + ingredientName + ';');


  return { 'valid': validPackageType && validAmount && validUnitsPerPackage && validPrice && validTemp, 'reason': reason };

}

CSVtoArray = function(text) {
  var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
  var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
  // Return NULL if input string is not well formed CSV string.
  if (!re_valid.test(text)) return null;
  var a = []; // Initialize array to receive values.
  text.replace(re_value, // "Walk" the string using replace with callback.
    function(m0, m1, m2, m3) {
      // Remove backslash from \' in single quoted values.
      if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
      // Remove backslash from \" in double quoted values.
      else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
      else if (m3 !== undefined) a.push(m3);
      return ''; // Return empty string.
    });
  // Handle special case of empty last value.
  if (/,\s*$/.test(text)) a.push('');
  return a;
};

parseFile = function(file) {
  return new Promise(function(resolve, reject) {
    Papa.parsePromise(file).then(function(results) {
      console.log(results);
      resolve(results);
    }).catch(function(error) {
      reject(error);
    });
  });
}

Papa.parsePromise = function(file) {
  return new Promise(function(complete, error) {
    Papa.parse(file, { header: true, delimiter: ',', complete, error });
  });
};

module.exports = router;
var express = require('express');
var router = express.Router();
// var csvparse = require('csv-parse');
var async = require('async');
var Ingredient = require('../models/ingredient');
var vendors = require('../routes/vendors');

const fs = require('fs');
const formidable = require('formidable')
const path = require('path')
const uploadDir = path.join(__dirname, '/..', '/uploads/')

var PromiseBlue = require('bluebird');
var parse = PromiseBlue.promisify(require('csv-parse'));


router.get('/', function(req, res) {
  res.render('uploads');
})


router.get('/documentation', function (req, res) {
    var filePath = "/files/BulkFormatDocumentation.pdf";

    //console.log('PDF file name: ' + __dirname + filePath);
    fs.readFile(__dirname + filePath , function (err,data){
        res.contentType("application/pdf");
        res.send(data);
    });
});

router.post('/upload', function(req, res, next) {
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
    let filepath = files.file.path;
    console.log('File path: ' + filepath);

    if (error) {
      return true;
    }

    var file = fs.readFileSync(filepath, 'utf8')

    parseFile(file).then(function(csvData) {
      res.redirect(req.baseUrl);
    }).catch(function(error) {
      next(error);
    });

  })
  form.on('fileBegin', function(name, file) {
    const [fileName, fileExt] = file.name.split('.');
    file.path = path.join(uploadDir, `${fileName}_${new Date().getTime()}.${fileExt}`);
    console.log('Uploaded file successfully: ' + fileName);

  });
})

validHeaders = function(headers) {
  let validHeaders = ['INGREDIENT', 'PACKAGE', 'AMOUNT (LBS)', 'PRICE PER PACKAGE', 'VENDOR FREIGHT CODE', 'TEMPERATURE'];
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

  let ingredientName = csvRow[0];
  let packageType = csvRow[1];
  let amount = csvRow[2];
  let price = csvRow[3];
  let vendorCode = csvRow[4];
  let temp = csvRow[5];

  if (ingredientName == undefined | packageType == undefined | amount == undefined | price == undefined | price == undefined | vendorCode == undefined | temp == undefined) {
    return { 'valid': false, 'reason': 'Undefined values' };
  }
  let validPackageType = validPackages.indexOf(packageType.toLowerCase()) > -1;
  let validAmount = (parseInt(amount) != NaN);
  let validPrice = (parseFloat(price) != NaN) && (parseFloat(price) > 0);
  let validTemp = validTemperatures.indexOf(temp.toLowerCase()) > -1;

  let reason = (validPackageType ? '' : 'Invalid package type(' + packageType + ') for ' + ingredientName + '; ') +
    (validAmount ? '' : 'Invalid amount(' + amount + ') for ' + ingredientName + '; ') +
    (validPrice ? '' : 'Invalid price(' + price + ') for ' + ingredientName + '; ') +
    (validTemp ? '' : 'Invalid temperature(' + temp + ') for ' + ingredientName + ';');


  return { 'valid': validPackageType && validAmount && validPrice && validTemp, 'reason': reason };

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

addToDatabase = function(index, csvRow, header) {
  return new Promise(function(resolve, reject) {
    console.log(csvRow.length);
    console.log(csvRow);
    console.log('-----------');

    let ingIndex = header.indexOf('INGREDIENT');
    let packageIndex = header.indexOf('PACKAGE');
    let tempIndex = header.indexOf('TEMPERATURE');
    let amountIndex = header.indexOf('AMOUNT (LBS)');
    let codeIndex = header.indexOf('VENDOR FREIGHT CODE');
    let costIndex = header.indexOf('PRICE PER PACKAGE');

    let validDataRowData = validDataRow(csvRow);
    let isValid = validDataRowData['valid'];
    let reason = validDataRowData['reason'];
    if (!isValid) {
      let err = new Error('Error reading CSV. Row #' + index + ' contains formatting errors. ' + reason);
      err.status = 400;
      reject(err);
    }

    var ingredient = {};
    ingredient.ingredient = csvRow[ingIndex];
    ingredient.size = csvRow[packageIndex];
    ingredient.temperature = csvRow[tempIndex];
    ingredient.cost = csvRow[costIndex];
    ingredient.code = csvRow[codeIndex];
    ingredient.quantity = csvRow[amountIndex];

    var addIngredient = vendors.addIngredient(ingredient, csvRow[codeIndex]);
    var createIngredient = Ingredient.create({
      name: csvRow[ingIndex].toLowerCase(),
      package: csvRow[packageIndex].toLowerCase(),
      temperature: csvRow[tempIndex].toLowerCase(),
      amount: 0
    });

    createIngredient.then(function(ing) {
      return addIngredient;
    }).then(function(result) {
      resolve(csvRow);
    }).catch(function(error) {
      if (error.name === 'MongoError' && error.code === 11000) {
        resolve(csvRow);
      } else {
        reject(error);
      }
    });

  });
}

parseFile = function(file, next) {
  return new Promise(function(resolve, reject) {
    var headerKeys;
    var options = {
      trim: true,
      columns: function(header) {
        headerKeys = header;
        console.log('header: ', header);
        if (!validHeaders(headerKeys)) {
          let err = new Error('Error reading CSV. Headers are in invalid format.');
          err.status = 400;
          reject(err);
        }
      }
    };

    parse(file, options).then(function(rows) {
      return Promise.all(rows.map(function(row, index) {
        return addToDatabase(index, row, headerKeys);
      }))
    }).then(function(csvData) {
      resolve(csvData);
    }).catch(function(error) {
      reject(error);
    });
  });
}

module.exports = router;
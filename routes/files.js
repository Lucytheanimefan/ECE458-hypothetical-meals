var express = require('express');
var router = express.Router();
var csvparse = require('csv-parse');
var async = require('async');
var Ingredient = require('../models/ingredient');

const fs = require('fs');
const formidable = require('formidable')
const path = require('path')
const uploadDir = path.join(__dirname, '/..', '/uploads/')


router.get('/', function(req, res) {
  res.render('uploads');
})

// router.post('/:filename', function(req, res, next) {
//   let filename = req.params.filename;
//   console.log('Parse file! ' + filename);
//   parseFile(filename, function(line) {
//     console.log(line);
//   })
// })


router.post('/upload', function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.keepExtensions = true;
  //form.uploadDir = uploadDir;
  console.log('Some way through uploading');
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: err });
    console.log('Uploaded true!');
    let filepath = files.file.path;
    console.log('File path: ' + filepath);

    var ingIndex;
    var packageIndex;
    var tempIndex;
    var amountIndex;

    parseFile(filepath, async function(index, csvRow) {
      //let csvRow = CSVtoArray(line);//line[0].split(',');

      console.log(csvRow.length);
      console.log(csvRow);
      console.log('-----------');

      // Check the headers
      if (index === 0) {
        if (!validHeaders(csvRow)) {
          let err = new Error('Error reading CSV. Headers are in invalid format.');
          err.status = 400;
          return next(err);
        }
        ingIndex = csvRow.indexOf('INGREDIENT');
        packageIndex = csvRow.indexOf('PACKAGE');
        tempIndex = csvRow.indexOf('TEMPERATURE');
        amountIndex = csvRow.indexOf('AMOUNT (LBS)');
      } else {

        let validDataRowData = validDataRow(csvRow);
        let isValid = validDataRowData['valid'];
        let reason = validDataRowData['reason'];
        if (!isValid) {
          let err = new Error('Error reading CSV. Row #' + index + ' contains formatting errors. ' + reason);
          err.status = 400;
          return next(err);
        }
        // Create/Update the ingredient
        var createIngredient;
        await Ingredient.findOne({name: csvRow[ingIndex]}, function(error, ing) {
          if (error) {
            var err = new Error('Error searching for ' + csvRow[ingIndex]);
            err.status = 400;
            return next(err);
          } else {
            createIngredient = (ing == null);
          }
        });
        if (createIngredient) {
          console.log('Creating ingredient');
          Ingredient.create({
            name: csvRow[ingIndex],
            package: csvRow[packageIndex],
            temperature: csvRow[tempIndex],
            amount: parseInt(csvRow[amountIndex])
          }, function(error, result) {
            if (error) {
              var err = new Error('Error creating ingredient ' + csvRow[ingIndex]);
              err.status = 400;
              return next(err);
            }
          });
        } else {
          console.log('Updating ingredient');
          Ingredient.findOneAndUpdate({ name: csvRow[ingIndex] }, {
              $inc: {
                amount: parseInt(csvRow[amountIndex])
              }
            }, function (error, result) {
              if (error) {
                var err = new Error('Couldn\'t update that ingredient.');
                err.status = 400;
                return next(err);
              }
            });
        }
        // NOTE: Columns may not necessarily be in the same order as specified in validHeaders array below (line 79 ish).

        // TODO: Update the vendor

        console.log('All good!');
        return next();


      }
    });
    //res.status(200).json({ uploaded: true });
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

parseFile = function(filename, callback) {
  var csvData = [];
  var index = 0;
  fs.createReadStream(filename)
    .pipe(csvparse({ delimiter: ',' }))
    .on('data', function(csvrow) {
      //console.log(csvrow);
      //do something with csvrow
      callback(index, csvrow);

      csvData.push(csvrow);

      index += 1;
    })
    .on('end', function() {
      //do something wiht csvData
      console.log(csvData);
    });
}

module.exports = router;
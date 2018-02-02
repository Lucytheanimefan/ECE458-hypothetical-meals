var express = require('express');
var router = express.Router();
var csvparse = require('csv-parse');
var async = require('async');

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
    parseFile(filepath, function(line) {
      console.log('Line: ' + line);
      // TODO: do something with each row
    });
    res.status(200).json({ uploaded: true });
  })
  form.on('fileBegin', function(name, file) {
    const [fileName, fileExt] = file.name.split('.');
    file.path = path.join(uploadDir, `${fileName}_${new Date().getTime()}.${fileExt}`);
    console.log('Uploaded file successfully: ' + fileName);

  });
})



parseFile = function(filename, callback) {
  var csvData = [];
  fs.createReadStream(filename)
    .pipe(csvparse({ delimiter: ':' }))
    .on('data', function(csvrow) {
      console.log(csvrow);
      //do something with csvrow
      callback(csvrow);

      csvData.push(csvrow);
    })
    .on('end', function() {
      //do something wiht csvData
      console.log(csvData);
    });
}

module.exports = router;
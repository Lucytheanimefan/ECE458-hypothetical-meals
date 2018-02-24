var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var SpendingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['spending', 'production']
  },
  spending: [
    {
      ingredient: {
        type: mongoose.Schema.Types.ObjectId
      },
      totalSpent: Number
    }
  ]
})

var Spending = mongoose.model('Spending', SpendingSchema);

module.exports.model = Spending;

checkNewIngredient = function(ingId, report) {
  for (let record of report['spending']) {
    if (record['ingredient'].equals(ingId)) {
      console.log('im here');
      return false;
    }
  }
  return true;
}

createReports = function() {
  return new Promise(function(resolve, reject) {
    exports.getSpending.then(function(report) {
      if (report == null) {
        resolve(Promise.all([Spending.create({
          'name': 'spending',
          'spending': []
        }), Spending.create({
          'name': 'production',
          'spending': []
        })]));
      } else {
        resolve('good to go');
      }
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.updateReport = function(ingId, spent, reportType) {
  if (reportType !== 'spending' && reportType !== 'production') {
    reject('That type of report doesn\'t exist');
  } else {
    return new Promise(function(resolve, reject) {
      createReports().then(function(results) {
        return Spending.findOne({'name': reportType});
      }).then(function(report) {
        if (checkNewIngredient(ingId, report)) {
          let newEntry = {
            'ingredient': ingId,
            'totalSpent': spent
          };
          return Spending.findOneAndUpdate({'name': reportType}, {'$push': {'spending': newEntry}}).exec();
        } else {
          return Spending.update({'$and': [{'name': reportType}, {'spending': {'$elemMatch': {'ingredient': ingId}}}]},
            {'$inc': {'spending.$.totalSpent': spent}}).exec();
        }
      }).then(function(report) {
        resolve(report);
      }).catch(function(error) {
        reject(error);
      });
    });
  }
}

module.exports.getSpending = new Promise(function(resolve, reject) {
  resolve(Spending.findOne({'name': 'spending'}));
});

module.exports.getProduction = new Promise(function(resolve, reject) {
  resolve(Spending.findOne({'name': 'production'}));
});

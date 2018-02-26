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
      ingredientId: {
        type: mongoose.Schema.Types.ObjectId
      },
      ingredientName: String,
      totalSpent: Number
    }
  ]
})

var Spending = mongoose.model('Spending', SpendingSchema);

module.exports.model = Spending;

checkNewIngredient = function(ingId, report) {
  for (let record of report['spending']) {
    if (record['ingredientId'].equals(ingId)) {
      console.log('im here');
      return false;
    }
  }
  return true;
}

createReports = function() {
  return new Promise(function(resolve, reject) {
    exports.getSpending().then(function(report) {
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

module.exports.updateReport = function(ingId, ingName, spent, reportType) {
  if (reportType !== 'spending' && reportType !== 'production') {
    reject('That type of report doesn\'t exist');
  } else {
    return new Promise(function(resolve, reject) {
      createReports().then(function(results) {
        return Spending.findOne({'name': reportType}).exec();
      }).then(function(report) {
        if (checkNewIngredient(ingId, report)) {
          let newEntry = {
            'ingredientId': ingId,
            'ingredientName': ingName,
            'totalSpent': spent
          };
          return Spending.findOneAndUpdate({'name': reportType}, {'$push': {'spending': newEntry}}).exec();
        } else {
          console.log(spent);
          return Spending.update({'$and': [{'name': reportType}, {'spending': {'$elemMatch': {'ingredientId': ingId}}}]},
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

module.exports.getSpending = function() {
  return new Promise(function(resolve, reject) {
    resolve(Spending.findOne({'name': 'spending'}));
  });
}

module.exports.getProduction = function() {
  return new Promise(function(resolve, reject) {
    resolve(Spending.findOne({'name': 'production'}));
  });
}

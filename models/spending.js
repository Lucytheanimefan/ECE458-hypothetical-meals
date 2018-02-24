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

var Spending = new mongoose.Model('Spending', SpendingSchema);

module.exports.model = Spending;

checkNewIngredient = function(ingId, report) {
  for (let record of report['spending']) {
    if (record['ingredient'] == ingId) {
      return false;
    }
  }
  return true;
}

module.exports.updateReport = function(ingId, spent, reportType) {
  if (reportType !== 'spending' && reportType !== 'production') {
    reject('That type of report doesn\'t exist');
  } else {
    return new Promise(function(resolve, reject) {
      Spending.findOne({'name': reportType}).then(function(report) {
        if (checkNewIngredient(ingId, report)) {
          let newEntry = {
            'ingredient': ingId,
            'totalSpent': spent
          };
          return report.update({'$push': {'spending': newEntry}}).exec();
        } else {
          return report.update({'spending': {'$elemMatch': {'ingredient': ingId}}}, {'$inc': {'spending.$.totalSpent': spent}}).exec();
        }
      }).then(function(report) {
        resolve(report);
      }).catch(function(error) {
        reject(error);
      });
    });
  }
}

module.exports.getSpending = Spending.findOne({'name': 'spending'});

module.exports.getProduction = Spending.findOne({'name': 'production'});

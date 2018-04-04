var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var FreshnessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  freshness: [
    {
      ingredientId: {
        type: mongoose.Schema.Types.ObjectId
      },
      ingredientName: String,
      numIngs: Number,
      avgTime: Number,
      worstTime: Number
    }
  ],
  numIngs: {
    type: Number,
    required: true
  },
  avgTime: {
    type: Number,
    required: true
  },
  worstTime: {
    type: Number,
    required: true
  }
})

var Freshness = mongoose.model('Freshness', FreshnessSchema);
module.exports.model = Freshness;

checkNewFreshnessIngredient = function(ingId, report) {
  for (let record of report['freshness']) {
    if (record['ingredientId'].equals(ingId)) {
      return false;
    }
  }
  return true;
}

createReports = function() {
  return new Promise(function(resolve, reject) {
    exports.getIngredients().then(function(report) {
      if (report == null) {
        resolve(Freshness.create({
          'name': 'ingredients',
          'freshness': [],
          'numIngs': 0,
          'avgTime': 0,
          'worstTime': 0
        }));
      } else {
        resolve('good to go');
      }
    }).catch(function(error) {
      reject(error);
    })
  });
}

module.exports.updateFreshnessReport = function(ingID, ingName, numUnits, ingTime) {
  return new Promise(function(resolve, reject) {
    createReports().then(function(results) {
      return Freshness.findOne({'name': 'ingredients'}).exec();
    }).then(function(report) {
      if (checkNewFreshnessIngredient(ingID, report)) {
        let newEntry = {
          'ingredientId': ingID,
          'ingredientName': ingName,
          'numIngs': numUnits,
          'avgTime': ingTime,
          'worstTime': ingTime
        };
        return Freshness.findOneAndUpdate({'name': 'ingredients'}, {'$push': {'freshness': newEntry}}).exec();
      } else {
        return exports.addToIngredient(ingID, ingName, numUnits, ingTime);
      }
    }).then(function(ing) {
      return exports.updateOverall(numUnits, ingTime);
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.updateOverall = function(numUnits, ingTime) {
  return new Promise(function(resolve, reject) {
    Freshness.find({'name': 'ingredients'}).then(function(report) {
      var numIngs, avgTime, worstTime;
      numIngs = report[0].numIngs;
      avgTime = report[0].avgTime;
      worstTime = report[0].worstTime;
      if (ingTime > worstTime) {
        worstTime = ingTime;
      }
      var totalTime = numIngs*avgTime;
      numIngs = numIngs + numUnits;
      totalTime = totalTime + ingTime*numUnits;
      avgTime = totalTime/numIngs;
      return Freshness.findOneAndUpdate({'name': 'ingredients'}, {
        '$set': {
          'numIngs': numIngs,
          'avgTime': avgTime,
          'worstTime': worstTime
        }
      }).exec();
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.addToIngredient = function(ingID, ingName, numUnits, ingTime) {
  return new Promise(function(resolve, reject) {
    Freshness.find({'name': 'ingredients'}).then(function(report) {
      var numIngs, avgTime, worstTime;
      for (let ingredient of report[0].freshness) {
        if (ingredient.ingredientId.toString() === ingID.toString()) {
          numIngs = ingredient.numIngs;
          avgTime = ingredient.avgTime;
          worstTime = ingredient.worstTime;
          break;
        }
      }
      if (ingTime > worstTime) {
        worstTime = ingTime;
      }
      var totalTime = numIngs*avgTime;
      numIngs = numIngs + numUnits;
      totalTime = totalTime + ingTime*numUnits;
      avgTime = totalTime/numIngs;
      return exports.updateIngredient(ingID, ingName, numIngs, avgTime, worstTime);
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.addIngredient = function(ingID, ingName, numIngs, avgTime, worstTime) {
  let entry = {ingredientId:ingID, ingredientName:ingName, numIngs:numIngs, avgTime:avgTime, worstTime:worstTime};
  return Freshness.findOneAndUpdate({'name':'ingredients'},{'$push':{'freshness':entry}}).exec();
}

module.exports.removeIngredient = function(ingredientId){
  return Freshness.findOneAndUpdate({'name':'ingredients'},{'$pull':{'freshness':{'ingredientId':ingredientId}}}).exec();
}

module.exports.updateIngredient = function(ingID, ingName, numIngs, avgTime, worstTime) {
  return new Promise(function(resolve, reject) {
    exports.removeIngredient(ingID).then(function(result) {
      return exports.addIngredient(ingID, ingName, numIngs, avgTime, worstTime);
    }).then(function(ingredient) {
      resolve(ingredient);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.getIngredients = function() {
  return new Promise(function(resolve, reject) {
    resolve(Freshness.findOne({'name': 'ingredients'}));
  });
}

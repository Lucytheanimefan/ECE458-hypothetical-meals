var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var FinalProductFreshnessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  freshness: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId
      },
      productName: String,
      numProds: Number,
      avgTime: Number,
      worstTime: Number
    }
  ],
  numProds: {
    type: Number
  },
  avgTime: {
    type: Number
  },
  worstTime: {
    type: Number
  }
})

var FinalProductFreshness = mongoose.model('FinalProductFreshness', FinalProductFreshnessSchema);
module.exports.model = FinalProductFreshness;

checkNewProductFreshness = function(productId, report) {
  for (let record of report['freshness']) {
    if (record['productId'].equals(productId)) {
      return false;
    }
  }
  return true;
}

createReports = function() {
  return new Promise(function(resolve, reject) {
    exports.getFinalProducts().then(function(report) {
      if (report == null) {
        resolve(FinalProductFreshness.create({
          'name': 'products',
          'freshness': [],
          'numProds': 0,
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

module.exports.updateFreshnessReport = function(prodID, prodName, numUnits, prodTime) {
  return new Promise(function(resolve, reject) {
    createReports().then(function(results) {
      return FinalProductFreshness.findOne({'name': 'products'}).exec();
    }).then(function(report) {
      if (checkNewProductFreshness(prodID, report)) {
        let newEntry = {
          'productId': prodID,
          'productName': prodName,
          'numProds': numUnits,
          'avgTime': prodTime,
          'worstTime': prodTime
        };
        return FinalProductFreshness.findOneAndUpdate({'name': 'products'}, {'$push': {'freshness': newEntry}}).exec();
      } else {
        return exports.addToProduct(prodID, prodName, numUnits, prodTime);
      }
    }).then(function(ing) {
      return exports.updateOverall(numUnits, prodTime);
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.updateOverall = function(numUnits, prodTime) {
  return new Promise(function(resolve, reject) {
    FinalProductFreshness.find({'name': 'products'}).then(function(report) {
      var numProds, avgTime, worstTime;
      numProds = report[0].numProds;
      avgTime = report[0].avgTime;
      worstTime = report[0].worstTime;
      if (prodTime > worstTime) {
        worstTime = prodTime;
      }
      var totalTime = numProds*avgTime;
      numProds = numProds + numUnits;
      totalTime = totalTime + prodTime*numUnits;
      avgTime = totalTime/numProds;
      return FinalProductFreshness.findOneAndUpdate({'name': 'products'}, {
        '$set': {
          'numProds': numProds,
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

module.exports.addToProduct = function(prodID, prodName, numUnits, prodTime) {
  return new Promise(function(resolve, reject) {
    FinalProductFreshness.find({'name': 'products'}).then(function(report) {
      var numProds, avgTime, worstTime;
      for (let product of report[0].freshness) {
        if (product.productId.toString() === prodID.toString()) {
          numProds = product.numProds;
          avgTime = product.avgTime;
          worstTime = product.worstTime;
          break;
        }
      }
      if (prodTime > worstTime) {
        worstTime = prodTime;
      }
      var totalTime = numProds*avgTime;
      numProds = numProds + numUnits;
      totalTime = totalTime + prodTime*numUnits;
      avgTime = totalTime/numProds;
      return exports.updateProduct(prodID, prodName, numProds, avgTime, worstTime);
    }).then(function(report) {
      resolve(report);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.addProduct = function(prodID, prodName, numProds, avgTime, worstTime) {
  let entry = {productId:prodID, productName:prodName, numProds:numProds, avgTime:avgTime, worstTime:worstTime};
  return FinalProductFreshness.findOneAndUpdate({'name':'products'},{'$push':{'freshness':entry}}).exec();
}

module.exports.removeProduct = function(productId){
  return FinalProductFreshness.findOneAndUpdate({'name':'products'},{'$pull':{'freshness':{'productId':productId}}}).exec();
}

module.exports.updateProduct = function(prodID, prodName, numProds, avgTime, worstTime) {
  return new Promise(function(resolve, reject) {
    exports.removeProduct(prodID).then(function(result) {
      return exports.addProduct(prodID, prodName, numProds, avgTime, worstTime);
    }).then(function(product) {
      resolve(product);
    }).catch(function(error) {
      reject(error);
    });
  })
}

module.exports.getProducts = function() {
  return new Promise(function(resolve, reject) {
    resolve(FinalProductFreshness.findOne({'name': 'products'}));
  });
}

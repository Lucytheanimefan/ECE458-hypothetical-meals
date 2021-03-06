var express = require('express');
var router = express.Router();

var Spending = require('../models/spending');
var Production = require('../models/production');
var Formula = require('../models/formula');
var Freshness = require('../models/freshness');
var Ingredient = require('../models/ingredient');
var Recall = require('../models/recall');
var ProductionLine = require('../models/production_line');
var FinalProduct = require('../models/final_product');
var FinalProductFreshness = require('../models/final_product_freshness');
var Profit = require('../models/profitability');

var mongoose = require('mongoose')
mongoose.Promise = global.Promise;

router.get('/', function(req, res, next) {
  res.redirect('/reports/1');
})

router.get('/:page', function(req, res, next) {
  var spendingReport;
  var productionReport;
  var formulaReport;
  var ingredientReport;
  var recallReport;
  var profitReport;
  var finalProductReport;

  var spending;
  var production;
  var formula;
  var ingredient;
  var overallFreshness;
  var finalProduct;
  var overallProductFreshness;
  var overallProfit;

  Promise.all([Spending.getSpending(), Spending.getProduction(), Production.getProduction(), Freshness.getIngredients(), Recall.getRecall(), Profit.getProducts(), FinalProductFreshness.getProducts()]).then(function(results) {
    spendingReport = results[0];
    productionReport = results[1];
    formulaReport = results[2];
    ingredientReport = results[3];
    recallReport = results[4];
    profitReport = results[5];
    finalProductReport = results[6];

    spendingPromise = Promise.all(spendingReport.spending.map(function(tuple) {
      return getIngredientName(tuple);
    }));
    productionPromise = Promise.all(productionReport.spending.map(function(tuple) {
      return getIngredientName(tuple);
    }));
    formulaPromise = Promise.all(formulaReport.product.map(function(tuple) {
      return getFormulaName(tuple);
    }));
    ingredientPromise = Promise.all(ingredientReport.freshness.map(function(tuple) {
      return getIngredientFreshnessName(tuple);
    }));
    recallPromise = getVendorLots(recallReport);
    profitPromise = getAllProfitInformation(profitReport);
    overallFreshness = getOverallFreshness(ingredientReport);
    overallProfit = getOverallProfit(profitReport);
    finalProductPromise = Promise.all(finalProductReport.freshness.map(function(tuple) {
      return getFinalProductFreshnessName(tuple);
    }));
    overallProductFreshness = getOverallProductFreshness(finalProductReport);
    return Promise.all([spendingPromise, productionPromise, formulaPromise, ingredientPromise, recallPromise, profitPromise, finalProductPromise]);
  }).then(function(results) {
    res.render('report', { spending: results[0], production: results[1], formula: results[2], ingredient: results[3], freshness: overallFreshness, recall: results[4],  profit: results[5], overallProfit: overallProfit, finalProduct: results[6], productFreshness: overallProductFreshness });
  }).catch(function(error) {
    next(error);
  })
})

router.post('/recall', function(req, res, next) {
  let ingLot = JSON.parse(req.body.ingLot);
  let vendorCode = ingLot.vendorCode;
  let lotNumber = ingLot.lot;
  let ingName = ingLot.ing;

  Recall.getRecallProducts(ingName, vendorCode, lotNumber).then(function(products) {
    return Promise.all(products.map(function(tuple) {
      return addFormulaNameRecall(tuple);
    }));
  }).then(function(results) {
    res.render('recall', { ingName: ingName, vendorCode: vendorCode, lotNumber: lotNumber, products: results });
  }).catch(function(error) {
    next(error);
  })

})

router.post('/production_line_efficiency', function(req, res, next) {
  var startDate = new Date(req.body.start);
  var originalStartDate = startDate;
  var endDate = new Date(req.body.end);
  //{ "$gte": startDate, "$lte": endDate }
  var allLinesQuery = ProductionLine.getAllProductionLines();



  allLinesQuery.then(function(productionLines) {
    var overallEfficiencyReportData = {};
    var cumulativeBusy = 0;
    for (let i = 0; i < productionLines.length; i++) {
      var productionLine = productionLines[i];
      var createdAtDate = new Date(productionLine.createdAt);
      console.log('Created at: ');
      console.log(createdAtDate);
      var productionLineEfficiencyData = { 'id': productionLine._id };

      var idleTime = 0; // Time production line was idle
      var busyTime = 0; // Time production line was busy

      var previousTimeStamp;
      if (createdAtDate > startDate) {
        console.log('****Use created at date!' + createdAtDate);
        startDate = createdAtDate;
      }

      previousTimeStamp = startDate;
      var totalTime = endDate - startDate;
      //console.log('Total time: ' + totalTime);
      var plotGraphData = { 'dates': [], 'values': [] }; // For plotting if we want to do that, currently not being used

      for (let j = 0; j < productionLine.history.length; j++) {
        let history = productionLine.history[j];

        var timestamp = new Date(history.timestamp);
        console.log('--------')
        console.log(timestamp);

        console.log('start date: ' + startDate);
        console.log('end date: ' + endDate);

        console.log('After start date? ' + (timestamp >= originalStartDate));
        console.log('Before end date? ' + (timestamp <= endDate));
        if (timestamp >= originalStartDate && timestamp <= endDate) {
          plotGraphData['dates'].push(timestamp);
          // If busy, value = 1, else value = 0
          plotGraphData['values'].push((history.status == 'busy') ? 1 : 0);
          // Within the time range!
          let timeElapsed = timestamp - previousTimeStamp;
          console.log('timeElapsed: ');
          console.log(secondsToDaysHrsMinutes(timeElapsed/1000));

          console.log('Busy? ' + productionLine.busy);
          // Update the times elapsed
          if (history.status == 'busy') {
            busyTime += timeElapsed;
          } else {
            idleTime += timeElapsed;
          }
          // console.log('Busy time: ' + busyTime);
          // console.log('Idle time: ' + idleTime);

          previousTimeStamp = timestamp;
        }
      }

      productionLineEfficiencyData['busyTime'] = secondsToDaysHrsMinutes(busyTime / 1000);
      productionLineEfficiencyData['idleTime'] = secondsToDaysHrsMinutes((totalTime - busyTime) / 1000);
      productionLineEfficiencyData['totalTime'] = secondsToDaysHrsMinutes(totalTime / 1000);
      productionLineEfficiencyData['percentBusy'] = (busyTime * 100 / totalTime).toFixed(2);
      productionLineEfficiencyData['percentIdle'] = (100 - productionLineEfficiencyData['percentBusy']).toFixed(2);
      productionLineEfficiencyData['graphData'] = plotGraphData;

      overallEfficiencyReportData[productionLine.name] = productionLineEfficiencyData;

      cumulativeBusy += (busyTime * 100 / totalTime);

      // Reset stuff for next production line
      idleTime = 0;
      busyTime = 0;
      plotGraphData = { 'dates': [], 'values': [] }
    }
    // console.log('cumulativeBusy: ' + cumulativeBusy);
    // console.log('Length: ' + productionLines.length);
    var overallUsage = { 'busy': (cumulativeBusy / productionLines.length).toFixed(2) };
    console.log('Overall usage:');
    console.log(overallUsage);
    console.log(overallEfficiencyReportData);
    return res.render('production_efficiency_report', { data: overallEfficiencyReportData, overallUsage: overallUsage })
    //return res.send(overallEfficiencyReportData);
  }).catch(function(error) {
    console.log(error);
    return next(error);
  })
})

secondsToDaysHrsMinutes = function(seconds) {
  var days = Math.floor(seconds / (3600 * 24));
  seconds -= days * 3600 * 24;
  var hrs = Math.floor(seconds / 3600);
  seconds -= hrs * 3600;
  var mnts = Math.floor(seconds / 60);
  seconds -= mnts * 60;
  return days + " days, " + hrs + " Hrs, " + mnts + " Minutes, " + seconds.toFixed(2) + " Seconds";
}

addFormulaNameRecall = function(tuple) {
  return new Promise(function(resolve, reject) {
    Formula.model.findById(tuple.formulaID).then(function(formula) {
      if (formula == null) {
        tuple['current'] = false;
      } else {
        tuple['current'] = true;
      }
      tuple['timestamp'] = mongoose.Types.ObjectId(tuple['_id']).getTimestamp().toString();
      return tuple;
    }).then(function(tuple) {
      resolve(tuple);
    }).catch(function(error) {
      reject(error);
    })
  })
}

getFormulaName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    entry['totalCost'] = tuple.totalCost;
    entry['unitsProduced'] = tuple.unitsProduced;
    Formula.model.findById(mongoose.Types.ObjectId(tuple.formulaId)).then(function(formula) {
      if (formula == null) {
        entry['formula'] = tuple.formulaName;
      } else {
        entry['formula'] = formula.name;
      }
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

getIngredientName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    entry['totalSpent'] = tuple.totalSpent;
    Ingredient.getIngredientById(mongoose.Types.ObjectId(tuple.ingredientId)).then(function(ing) {
      if (ing == null) {
        entry['ingredient'] = tuple.ingredientName;
      } else {
        entry['ingredient'] = ing.name;
      }
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

getOverallFreshness = function(report) {
  console.log(report);
  var entry = {};
  var avgTime = convertTime(report.avgTime);
  var worstTime = convertTime(report.worstTime);
  entry['numIngs'] = report.numIngs;
  entry['avgTime'] = avgTime;
  entry['worstTime'] = worstTime;
  return entry;
}

getIngredientFreshnessName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    var avgTime = convertTime(tuple.avgTime);
    var worstTime = convertTime(tuple.worstTime);
    entry['numIngs'] = tuple.numIngs;
    entry['avgTime'] = avgTime;
    entry['worstTime'] = worstTime;
    Ingredient.getIngredientById(mongoose.Types.ObjectId(tuple.ingredientId)).then(function(ing) {
      if (ing == null) {
        entry['ingredients'] = tuple.ingredientName;
        entry['exists'] = false;
      } else {
        entry['ingredients'] = ing.name;
        entry['exists'] = true;
      }
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

getOverallProductFreshness = function(report) {
  var entry = {};
  var avgTime = convertTime(report.avgTime);
  var worstTime = convertTime(report.worstTime);
  entry['numProds'] = report.numProds;
  entry['avgTime'] = avgTime;
  entry['worstTime'] = worstTime;
  return entry;
}

getFinalProductFreshnessName = function(tuple) {
  return new Promise(function(resolve, reject) {
    var entry = {};
    var avgTime = convertTime(tuple.avgTime);
    var worstTime = convertTime(tuple.worstTime);
    entry['numProds'] = tuple.numProds;
    entry['avgTime'] = avgTime;
    entry['worstTime'] = worstTime;
    FinalProduct.getFinalProductById(mongoose.Types.ObjectId(tuple.productId)).then(function(prod) {
      if (prod == null) {
        entry['products'] = tuple.productName;
        entry['exists'] = false;
      } else {
        entry['products'] = prod.name;
        entry['exists'] = true;
      }
      return entry;
    }).then(function(entry) {
      resolve(entry);
    }).catch(function(error) {
      reject(error);
    });
  });
}

getVendorLots = function(report) {
  return new Promise(function(resolve, reject) {
    let lotList = [];
    for (let lot of report.vendorLots) {
      let entry = {};
      entry['ing'] = lot['ingredientName'];
      entry['vendor'] = lot['vendorName'];
      entry['lot'] = lot['lotNumber'];
      entry['vendorCode'] = lot['vendorCode'];
      lotList.push(entry);
    }
    resolve(lotList);
  })
}

getAllProfitInformation = function(report) {
  return new Promise(function(resolve, reject) {
    let productList = [];
    for (let product of report) {
      let revenue = parseFloat(product.unitsSold) * parseFloat(product.unitCost);
      let profit = revenue - parseFloat(product.ingCost);
      product['revenue'] = revenue;
      product['profit'] = profit;
      product['perUnitProfit'] = profit / parseFloat(product.unitsSold);
      product['profitMarginPercent'] = revenue*100/parseFloat(product.ingCost);
      productList.push(product);
    }
    resolve(productList);
  })
}

getOverallProfit = function(report) {
  var revenue = 0;
  var cost = 0;
  for (let product of report) {
    revenue += parseFloat(product.unitsSold) * parseFloat(product.unitCost);
    cost += parseFloat(product.ingCost);
  }
  let overall = {};
  overall['revenue'] = revenue;
  overall['cost'] = cost;
  overall['profit'] = revenue - cost;
  return overall;
}

convertTime = function(milliseconds) {
  var days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  milliseconds = milliseconds % (1000 * 60 * 60 * 24);
  var hours = Math.floor(milliseconds / (1000 * 60 * 60));
  milliseconds = milliseconds % (1000 * 60 * 60);
  var minutes = Math.floor(milliseconds / (1000 * 60));
  milliseconds = milliseconds % (1000 * 60);
  var seconds = Math.floor(milliseconds / 1000);
  milliseconds = milliseconds % (1000);

  var time = days + " days, " + hours + " hrs, " + minutes + " min, " + seconds + " sec";
  return time;
}

module.exports = router;

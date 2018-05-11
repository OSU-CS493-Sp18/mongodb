const router = module.exports = require('express').Router();

function validateUserObject(user) {
  return user && user.userID && user.name && user.email;
}

function getLodgingsByOwnerID(ownerID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM lodgings WHERE ownerid = ?', [ ownerID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

router.get('/:userID/lodgings', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const ownerID = parseInt(req.params.userID);
  getLodgingsByOwnerID(ownerID, mysqlPool)
    .then((ownerLodgings) => {
      res.status(200).json({
        lodgings: ownerLodgings
      });
    })
    .catch((err) => {
      console.log("  -- err:", err);
      res.status(500).json({
        error: `Unable to fetch lodgings for user ${ownerID}`
      });
    });

});

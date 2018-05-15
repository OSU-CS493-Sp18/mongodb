const router = require('express').Router();

function validateUserObject(user) {
  return user && user.userID && user.name && user.email;
}

function insertNewUser(user, mongoDB) {
  const userDocument = {
    userID: user.userID,
    name: user.name,
    email: user.email,
    lodgings: []
  };
  const usersCollection = mongoDB.collection('users');
  return usersCollection.insertOne(userDocument)
    .then((result) => {
      return Promise.resolve(result.insertedID);
      // return new Promise((resolve, reject) => {
      //   resolve(result.insertedId);
      // });
    });
}

router.post('/', function (req, res) {
  const mongoDB = req.app.locals.mongoDB;
  if (validateUserObject(req.body)) {
    insertNewUser(req.body, mongoDB)
      .then((id) => {
        res.status(201).json({
          _id: id,
          links: {
            user: `/users/${id}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Failed to insert new user."
        });
      });
  } else {
    res.status(400).json({
      error: "Request doesn't contain a valid user."
    })
  }
});

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

exports.router = router;

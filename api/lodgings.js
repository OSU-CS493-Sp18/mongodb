const router = module.exports = require('express').Router();

function getLodgingsCount(mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT COUNT(*) AS count FROM lodgings', function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
}

function getLodgingsPage(page, totalCount, mysqlPool) {
  return new Promise((resolve, reject) => {
    const numPerPage = 10;
    const lastPage = Math.ceil(totalCount / numPerPage);
    page = page < 1 ? 1 : page;
    page = page > lastPage ? lastPage : page;
    const offset = (page - 1) * numPerPage;
    mysqlPool.query('SELECT * FROM lodgings ORDER BY id LIMIT ?,?', [offset, numPerPage], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lodgings: results,
          pageNumber: page,
          totalPages: lastPage,
          pageSize: numPerPage,
          totalCount: totalCount
        });
      }
    });
  });
}

router.get('/', function (req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  getLodgingsCount(mysqlPool)
    .then((count) => {
      return getLodgingsPage(parseInt(req.query.page) || 1, count, mysqlPool);
    })
    .then((lodgingsPageInfo) => {
      lodgingsPageInfo.links = {};
      let { links, pageNumber, totalPages } = lodgingsPageInfo;
      if (pageNumber < totalPages) {
        links.nextPage = '/lodgings?page=' + (pageNumber + 1);
        links.lastPage = '/lodgings?page=' + totalPages;
      }
      if (pageNumber > 1) {
        links.prevPage = '/lodgings?page=' + (pageNumber - 1);
        links.firstPage = '/lodgings?page=1';
      }
      res.status(200).json(lodgingsPageInfo);
    })
    .catch((err) => {
      console.log('  -- err:', err);
      res.status(500).json({
        error: "Error fetching lodgings list.  Please try again later."
      });
    });
});

function insertNewLodging(lodging, mysqlPool) {
  return new Promise((resolve, reject) => {
    const lodgingValues = {
      id: null,
      name: lodging.name,
      description: lodging.description,
      street: lodging.street,
      city: lodging.city,
      state: lodging.state,
      zip: lodging.zip,
      price: lodging.price,
      ownerid: lodging.ownerID
    };
    mysqlPool.query(
      'INSERT INTO lodgings SET ?',
      lodgingValues,
      function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      }
    );
  });
}

router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;

  if (req.body && req.body.name && req.body.price && req.body.ownerID) {
    insertNewLodging(req.body, mysqlPool)
      .then((id) => {
        res.status(201).json({
          id: id,
          links: {
            lodging: `/lodgings/${id}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Error inserting lodging into DB.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request needs a JSON body with a name, a price, and an owner ID"
    });
  }

});

function getLodgingByID(lodgingID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM lodgings WHERE id = ?', [ lodgingID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

router.get('/:lodgingID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const lodgingID = parseInt(req.params.lodgingID);
  getLodgingByID(lodgingID, mysqlPool)
    .then((lodging) => {
      if (lodging) {
        res.status(200).json(lodging);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch lodging."
      });
    });
});

function updateLodgingByID(lodgingID, lodging, mysqlPool) {
  return new Promise((resolve, reject) => {
    const lodgingValues = {
      name: lodging.name,
      description: lodging.description,
      street: lodging.street,
      city: lodging.city,
      state: lodging.state,
      zip: lodging.zip,
      price: lodging.price,
      ownerid: lodging.ownerID
    };
    mysqlPool.query('UPDATE lodgings SET ? WHERE id = ?', [ lodgingValues, lodgingID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

router.put('/:lodgingID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;

  const lodgingID = parseInt(req.params.lodgingID);
  if (req.body && req.body.name && req.body.price && req.body.ownerID) {
    updateLodgingByID(lodgingID, req.body, mysqlPool)
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              lodging: `/lodgings/${lodgingID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to update lodging."
        });
      });
  } else {
    res.status(400).json({
      err: "Request needs a JSON body with a name, a price, and an owner ID"
    });
  }

});

function deleteLodgingByID(lodgingID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('DELETE FROM lodgings WHERE id = ?', [ lodgingID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });

}

router.delete('/:lodgingID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const lodgingID = parseInt(req.params.lodgingID);
  deleteLodgingByID(lodgingID, mysqlPool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete lodging."
      });
    });
});
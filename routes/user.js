var express = require('express');
var router = express.Router();
var storage;

// users of this module call this function to get the router. storageMan is
// expected to be an isntance of easyfeedback/storageMan
function newRouter (storageMan) {
    storage = storageMan;
    return router;
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = newRouter;

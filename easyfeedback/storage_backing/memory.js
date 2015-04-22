/*
  A simple implementation of in-memory key-value backing storage. Used in
  storageMan
*/

function MemoryStorage (cb) {
    var data = new Map();
    cb(null, {
        get: function (key, cb) {
            cb(null, data.get(key));
        },
        set: function (key, value, cb) {
            data.set(key, value);
            cb(null, true);
        },
        /*
          Find all objects stored that match a query. The query is an object
          indicating the property name and values the found objects should
          have. For example a query {a: 1} would find all objects that have a
          property "a" that maps to value 1. Values are compared using ===
        */
        find: function (query, cb) {
            var result = [];
            data.forEach(function (val) {
                for (var key in query) {
                    if (query.hasOwnProperty(key) && val[key] === query[key]) {
                        result.push(val);
                    }
                }
            });
            cb(null, result);
        }
    });
}

module.exports.MemoryStorage = MemoryStorage;
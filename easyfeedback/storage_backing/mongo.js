var MongoClient = require('mongodb').MongoClient;
var is_object = require("is-object");

function connect (url, cb) {
    MongoClient.connect(url, function (err, db) {
        if (err) {
            return cb(err);
        }
        cb(null, MongoKeyValue);

        function MongoKeyValue (collection_name, cb) {
            var col = db.collection(collection_name);
            cb(null, {
                set: function (key, value, cb) {
                    var to_store = value;
                    // can't put non-object types in a mongo document
                    if (!is_object(value)) {
                        to_store = {
                            _value: value
                        };
                    }
                    col.findOneAndReplace({
                        _id: key
                    }, to_store, {
                        upsert: true
                    }, cb);
                },
                get: function (key, cb) {
                    col.findOne({_id: key}, function (err, doc) {
                        if (err) {
                            return cb(err);
                        }
                        var result = doc;
                        if (!doc) {
                            result = {};
                        }
                        if (result._value) {
                            result = result._value;
                        }
                        return cb(null, result);
                    });
                },
                find: function (query, cb) {
                    col.find(query).toArray(cb);
                }
            });
        }
    });
}

module.exports.connect = connect;
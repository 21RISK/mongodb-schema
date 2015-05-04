var pkg = require('../package.json');
var find = require('lodash.find');
var defs = require('./definitions');
// var BSON = require('bson');
var isInteger = require('is-integer');
var sum = require('lodash.sum');
var each = require('lodash.foreach');
var pluck = require('lodash.pluck');
// var map = require('lodash.map');
// var values = require('lodash.values');
var pairs = require('lodash.pairs');
var unzip = require('lodash.unzip');
var sortby = require('lodash.sortby');

var math = require('mathjs');
// var debug = require('debug')('schema:main');
// var stream = require('stream');

// these types have a _bsontype property
var bsontypeMap = {
  'ObjectID': 7,
  'Long': 18,
  'MinKey': 255,
  'MaxKey': 127,
  'Code': 15, // no differentiation to 13
  'Binary': 5,
  'DBRef': 12,
  'Timestamp': 17
};

/**
 * return the bson type of `value`
 * @param  {any}     value    value to get the type for
 * @return {number}           bson type as decimal number
 */
function _getType(value) {
  if (typeof value === 'number') {
    // could be int (16) or float (1)
    return isInteger(value) ? 16 : 1;
  }

  if (typeof value === 'string') {
    // could be symbol (14, deprecated) or string (2), assume string
    return 2;
  }

  if (typeof value === 'boolean') {
    return 8;
  }

  if (value === null) {
    return 10;
  }

  if (typeof value === 'object') {
    // could be embedded document (3), array (4), binary (5), objectid (7),
    // datetime (9), regular expression (11), dbref (12), code (13),
    // code with scope (15), timestamp (17), minkey (255), maxkey (127).

    if (value.hasOwnProperty('_bsontype')) {
      // objectid, dbref, binary, code, code with scope, timestamp, maxkey, minkey
      return bsontypeMap[value._bsontype];
    }

    if (value instanceof Array) {
      return 4;
    }

    if (value instanceof Date) {
      return 9;
    }

    if (value instanceof RegExp) {
      return 11;
    }

    // if nothing matches, it's a nested document
    return 3;
  }

  // should not get here
  throw Error('invalid type');
}

/**
 * data helper: ensure .values array exists and push value into array
 * @param  {any} value          value to push to array
 * @param  {object} data_obj    object to update
 */
function _pushValue(value, data_obj) {
  if (!data_obj.hasOwnProperty('values')) {
    data_obj.values = [];
  }
  data_obj.values.push(value);
}

/**
 * data helper: ensure .values object exists and increase counter for value
 * @param  {any} value          value to push to array
 * @param  {object} data_obj    object to update
 */
function _countValue(value, data_obj) {
  if (!data_obj.hasOwnProperty('values')) {
    data_obj.values = {};
  }
  data_obj.values[value] = data_obj.values[value] + 1 || 1;
}

/**
 * aggregate data of a single member, different for each type
 * @param  {string} name     member name, e.g. "_id"
 * @param  {any} value       value of the member
 * @param  {integer} type    bsontype in decimal
 * @param  {object} data_obj the object to update
 */
function _aggregate(name, value, type, data_obj) {

  switch (type) {
    case 1: _pushValue(value, data_obj); break;
    case 2: _countValue(value, data_obj); break;
    case 3: break;
    // ...
  }
}

function _finalizeProbabilities(schema) {
  var rootName = defs.ESCAPE + defs.ROOT;
  var schemaName = defs.ESCAPE + defs.SCHEMA;

  var parentCount = schema[rootName] ?
    schema[rootName][defs.COUNT] :
    sum(pluck(schema[schemaName], 'count'));

  for (var name in schema) {
    if (!schema.hasOwnProperty(name)) continue;
    if (name.charAt(0) === defs.ESCAPE) continue;

    var tag = schema[name][schemaName];
    each(tag, function(t) {
      // update the probability for each type inside the tag
      t[defs.PROB] = t[defs.COUNT] / parentCount;
    });

    // update children recursively
    _finalizeProbabilities(schema[name]);
  }
}

function _finalizeTypes(name, tag) {
  each(tag, function(el) {
    var type = el[defs.TYPE];
    switch (type) {
      case 1:
        var values = el[defs.DATA].values;

        el[defs.DATA].min = math.min(values);
        el[defs.DATA].max = math.max(values);
        el[defs.DATA].avg = math.mean(values);
        // el[defs.DATA].med = math.median(values);   // bug in mathjs: changes values sort order, see https://github.com/josdejong/mathjs/issues/309
        break;

      case 2:
        var stats = unzip(sortby(pairs(el[defs.DATA].values), function(pair) {
          // sort by counts descending
          return -pair[1];
        }));
        el[defs.DATA].values = stats[0];
        el[defs.DATA].counts = stats[1];
        break;

      case 3: break;



    }
  });
}

function _walkTags(schema, func) {
  var schemaName = defs.ESCAPE + defs.SCHEMA;

  for (var name in schema) {
    if (!schema.hasOwnProperty(name)) continue;
    if (schema[name].hasOwnProperty(schemaName)) {
      func(name, schema[name][schemaName]);
    }

    // @todo: recursive
  }
}

function _finalize(schema) {
  _finalizeProbabilities(schema); // @todo use _walkTags too
  _walkTags(schema, _finalizeTypes);
}

/**
 * analyse an object and update the schema
 * @param  {object} object   single object to inspect
 * @param  {object} schema   schema object to update
 * @return {object}          resulting schema after update
 */
function _infer(obj, schema) {

  for (var name in obj) {
    if (!obj.hasOwnProperty(name)) continue;

    var value = obj[name];

    // create schema member if not present yet
    if (!(name in schema)) {
      schema[name] = {};
      schema[name][defs.ESCAPE + defs.SCHEMA] = [];
    }
    var tag = schema[name][defs.ESCAPE + defs.SCHEMA];

    // get type of `value`
    var bsontype = _getType(value);

    // find schema array element for correct type or create one
    // @review  should this be an object rather than array? at least while building the schema?
    var type_obj = find(tag, function(el) {
      return el[defs.TYPE] === bsontype;
    });

    if (!type_obj) {
      // not found, create one
      type_obj = {};
      type_obj[defs.TYPE] = bsontype;
      type_obj[defs.COUNT] = 0;
      type_obj[defs.PROB] = 0.0;
      type_obj[defs.UNIQUE] = null; // should be determined at the end
      type_obj[defs.DATA] = {};

      tag.push(type_obj);
    }

    // increase counts, add data, check uniqueness
    type_obj[defs.COUNT] += 1;
    _aggregate(name, value, bsontype, type_obj[defs.DATA]);

    // special handling for arrays (type 4)

    // recursive call for nested documents (type 3)
    if (bsontype === 3) {
      _infer(value, schema[name]);
    }
  }
}

/**
 * main schema function
 * @param  {array}   documents   array of sample documents to integrate into schema
 * @return {object}              resulting schema
 */
module.exports = function(documents) {
  var schema = {};

  // add root tag and version
  var root = defs.ESCAPE + defs.ROOT;
  schema[root] = {};
  schema[root][defs.VERSION] = pkg.version;
  schema[root][defs.COUNT] = 0;

  // ensure `documents` is array or undefined
  if (documents === undefined) {
    documents = [];
  }

  if (!(documents instanceof Array)) {
    throw new TypeError('`documents` must be an array.');
  }

  // walk all documents
  each(documents, function(doc) {
    // increase global counter
    schema[root][defs.COUNT] += 1;
    _infer(doc, schema);
  });

  _finalize(schema);
  return schema;
};

// var inherits = require('util').inherits;

// function SchemaTransformStream( /* opts */ ) {
//   SchemaTransformStream._super.call(this, {
//     objectMode: true
//   });
// }

// inherits(SchemaTransformStream, stream.Transform);

// SchemaTransformStream.prototype._transform = function(document, encoding, done) {
//   debug('_transform: %j', {
//     encoding: encoding,
//     document: document
//   });
//   done();
// };

// module.exports.stream = SchemaTransformStream;


var Type = require('./type');
var _ = require('lodash');
var ValueCollection = require('../value-collection');

// var debug = require('debug')('mongodb-schema:primitive');

/**
 * Primitive types store their values and have a .unique counter
 */
var PrimitiveType = exports.PrimitiveType = Type.extend({
  derived: {
    unique: {
      /**
       * we're not using a cache here for performance reasons: listening
       * to all add/remove/reset/sync events of PrimitiveType#values and
       * recalculating uniqueness after each document is not necessary.
       */
      cache: false,
      fn: function() {
        return _.unique(this.values.pluck('value')).length;
      }
    },
    has_duplicates: {
      cache: false,
      fn: function() {
        return this.unique < this.values.length;
      }
    }
  },
  collections: {
    values: ValueCollection
  },
  /**
   * adds the value to the value collection. Just passing it through.
   * @param {Any} value   value to be added
   */
  analyze: function(value) {
    this.values.add({
      value: value
    });
    this.count += 1;
  },
  parse: function(attrs) {
    _.each(attrs.values, function(val, i) {
      attrs.values[i] = {
        value: val
      };
    });
    return _.omit(attrs, ['modelType', 'unique', 'probability', 'has_duplicates']);
  }
});


// --- Native Javascript Types ---

exports.String = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'String'
    }
  }
});

exports.Number = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Number'
    }
  }
});

exports.Boolean = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Boolean'
    }
  }
});

exports.Date = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Date'
    }
  }
});

exports.RegExp = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'RegExp'
    }
  }
});

// --- BSON Types ---

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/Double.html
 */
exports.Double = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Double'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/Long.html
 */
exports.Long = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Long'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/Timestamp.html
 */
exports.Timestamp = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Timestamp'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/ObjectID.html
 */
exports.ObjectID = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'ObjectID'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/Binary.html
 */
exports.Binary = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Binary'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/Symbol.html
 */
exports.Symbol = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Symbol'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/Code.html
 */
exports.Code = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Code'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/DBRef.html
 */
exports.DBRef = PrimitiveType.extend({
  props: {
    name: {
      type: 'string',
      default: 'DBRef'
    }
  }
});

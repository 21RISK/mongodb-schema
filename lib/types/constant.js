var Type = require('./type');
var _ = require('lodash');

/**
 * Types that do not need to store any values
 */
var ConstantType = Type.extend({
  derived: {
    unique: {
      deps: ['count'],
      fn: function() {
        // more than 1 constant value means no longer unique
        return Math.min(this.count, 1);
      }
    },
    has_duplicates: {
      deps: ['count'],
      fn: function() {
        return this.count > 1;
      }
    }
  },
  parse: function(attrs) {
    return _.omit(attrs, ['modelType', 'unique', 'probability', 'has_duplicates']);
  }
});

module.exports.Null = ConstantType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Null'
    }
  }
});

module.exports.Undefined = ConstantType.extend({
  props: {
    name: {
      type: 'string',
      default: 'Undefined'
    }
  },
  derived: {
    unique: {
      fn: function() {
        // undefined does not count as a value
        return 0;
      }
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/MaxKey.html
 */
module.exports.MaxKey = ConstantType.extend({
  props: {
    name: {
      type: 'string',
      default: 'MaxKey'
    }
  }
});

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.0/api/MinKey.html
 */
module.exports.MinKey = ConstantType.extend({
  props: {
    name: {
      type: 'string',
      default: 'MinKey'
    }
  }
});

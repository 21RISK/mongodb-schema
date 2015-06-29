var Field = require('../lib/field');
var assert = require('assert');
var debug = require('debug')('mongodb-schema:test:type');

describe('Field', function () {
  var field;
  beforeEach(function () {
    field = new Field();
  });

  it('should be constructable', function () {
    assert.ok(field);
  });

  it('should return single type string for Field#type for one type', function () {
    field.types.addToType(16);
    field.types.addToType(5);
    field.types.addToType(-1);
    assert.equal(field.type, 'Number');
  });

  it('should return array of type strings for Field#type for multiple types', function () {
    field.types.addToType(16);
    field.types.addToType(5);
    field.types.addToType("foo");
    field.types.addToType("bar");
    assert.deepEqual(field.type, ['Number', 'String']);
  });

  it('should return undefined for Field#type if no types present', function () {
    assert.equal(field.type, undefined);
  });

  it('should trigger types.length events when adding a new type', function () {
    field.types.addToType(15);
    assert.equal(field.type, 'Number');
    field.types.addToType("sfo");
    assert.deepEqual(field.type, ['Number', 'String']);
  });

  it('should update .fields alias correctly', function () {
    assert.equal(field.fields, null);
    field.types.addToType({foo: 1});
    assert.equal(field.fields, field.types.get('Document').fields);
  });
});

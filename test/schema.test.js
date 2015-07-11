var schemaHelper = require('../');
var Schema = schemaHelper.Schema;
var assert = require('assert');
var es = require('event-stream');

describe('Schema', function() {
  var schema;
  beforeEach(function() {
    schema = new Schema();
  });

  it('should be constructable', function() {
    assert.ok(schema);
  });

  it('should parse a simple document', function() {
    schema.parse({
      foo: 1
    });
    assert.ok(schema.fields.get('foo'));
    assert.equal(schema.count, 1);
  });

  it('should parse a nested document', function() {
    schema.parse({
      foo: {
        bar: 1
      }
    });
    assert.ok(schema.fields.get('foo'));
    assert.ok(schema.fields.get('foo').types.get('Document').fields.get('bar'));
    assert.equal(schema.count, 1);
    assert.equal(schema.fields.get('foo').types.get('Document').count, 1);
  });

  it('should set up the parent tree all the way down', function() {
    schema.parse({
      foo: {
        bar: [1, 2, 3]
      }
    });
    var foo = schema.fields.get('foo');
    assert.equal(foo.parent, schema);
    var subdoc = foo.types.get('Document');
    assert.equal(subdoc.parent, foo);
    var bar = subdoc.fields.get('bar');
    assert.equal(bar.parent, subdoc);
    var arr = bar.types.get('Array');
    assert.equal(arr.parent, bar);
    var num = arr.types.get('Number');
    assert.equal(num.parent, arr);
    var val = num.values.at(0);
    assert.equal(val.parent, num);
  });

  it('should trigger an `end` event at the end of parsing a stream', function(done) {
    var docs = [{
      foo: 1
    }, {
      bar: 1,
      foo: 1
    }];
    es.readArray(docs)
      .pipe(schema.stream())
      .pipe(es.wait(function() {
        assert.equal(schema.count, 2);
        done();
      }));
  });

  it('should trigger `data` events for each doc', function(done) {
    var docs = [{
      foo: 1
    }, {
      bar: 1,
      foo: 2
    }];
    var src = es.readArray(docs);
    var count = 0;
    src.pipe(schema.stream())
      .pipe(es.map(function(doc, cb) {
        count++;
        cb(null, doc);
      }))
      .pipe(es.wait(function() {
        assert.equal(count, 2);
        done();
      }));
  });
});

describe('Schema Helper', function() {
  it('should be able to handle an array as input', function(done) {
    var docs = [{
      foo: 1
    }, {
      bar: 1,
      foo: 2
    }];
    var src = es.readArray(docs);
    var schema = schemaHelper('with.stream', src, function() {
      assert.ok(schema.fields.get('foo'));
      assert.ok(schema.fields.get('bar'));
      done();
    });
  });

  it('should be able to handle a stream as input', function(done) {
    var docs = [{
      foo: 1
    }, {
      bar: 1,
      foo: 2
    }];
    var schema = schemaHelper('with.stream', docs, function() {
      assert.ok(schema.fields.get('foo'));
      assert.ok(schema.fields.get('bar'));
      done();
    });
  });

  it('should be able to handle an object as input that exposes a .stream() method', function(done) {
    var docs = [{
      foo: 1
    }, {
      bar: 1,
      foo: 2
    }];
    var src = es.readArray(docs);
    var obj = {
      name: 'Container Object',
      stream: function() {
        return src;
      }
    };
    var schema = schemaHelper('with.stream', obj, function() {
      assert.ok(schema.fields.get('foo'));
      assert.ok(schema.fields.get('bar'));
      done();
    });
  });

  it('schema object should also trigger `data` events for each doc', function(done) {
    var docs = [{
      foo: 1
    }, {
      bar: 1,
      foo: 2
    }];

    var count = 0;
    var schema = new Schema({
      ns: 'with.stream'
    });
    es.readArray(docs)
      .pipe(schema.stream())
      .pipe(es.map(function(doc, cb) {
        count++;
        assert.ok(schema.fields.get('foo'));
        if (count === 2) {
          assert.ok(schema.fields.get('bar'));
        } else {
          assert.equal(schema.fields.get('bar'), undefined);
        }
        cb(null, doc);
      }))
      .pipe(es.wait(function() {
        assert.equal(count, 2);
        done();
      }));
  });
});

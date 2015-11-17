'use strict';

var should = require('should');
var cleaner = require('../lib/cleaner');
var async = require('async');

var dbHost = process.env.POSTGRES_HOST || 'localhost';

var pg = require('pg');

// helper functions to be used with async to help making tests easier
function createDatabase(params) {
  return function(callback, results) {
    var q = 'CREATE DATABASE ' + params.database;
    results.connectPostgres[0].query(q, callback);
  };
}

function dropDatabase(params) {
  return function(callback, results) {
    var q = 'DROP DATABASE IF EXISTS ' + params.database;
    results.connectPostgres[0].query(q, callback);
  };
}

function createTable(params) {
  return function create(callback, results) {
    var q = 'CREATE TABLE ' + params.table +
      ' (id SERIAL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id));';
    results.connect[0].query(q, callback);
  };
}

function insertValue(params) {
  return function insert(callback, results) {
    var q = 'INSERT INTO ' + params.table + ' (name) VALUES (\'lorem\');';
    results.connect[0].query(q, callback);
  };
}

function checkEmptyTable(params) {
  return function check(callback, results) {
    var q = 'SELECT * FROM ' + params.table;
    results.connect[0].query(q, callback);
  };
}

// function databaseCleanerDeprecated(callback, results) {
//   cleaner(results.connect[0], callback);
// }

function databaseCleaner(options) {
  return function(callback, results) {
    cleaner(options, results.connect[0], callback);
  }
}

function connect(params) {
  return function connection(callback) {
    var connectionString = 'postgres://postgres@' +
      dbHost  + '/' + params.database;
    pg.connect(connectionString, callback);
  };
}

describe('postgres', function() {

  beforeEach(function(done) {
    async.auto({
      connectPostgres: connect({database: 'postgres'}),
      dropDb:['connectPostgres', dropDatabase({database: 'cleaner'})]
    }, done);
  });

  beforeEach(function(done) {
    async.auto({
      connectPostgres: connect({database: 'postgres'}),
      createDb:['connectPostgres', createDatabase({database: 'cleaner'})]
    }, done);
  });

  beforeEach(function(done) {
    async.auto({
      connect: connect({database: 'cleaner'}),
      create1: ['connect', createTable({table: 'table1'})],
      create2: ['connect', createTable({table: 'table2'})],
      create3: ['connect', createTable({table: 'table3'})],
      insert1: ['create1', insertValue({table: 'table1'})],
      insert2: ['create2', insertValue({table: 'table2'})],
      insert3: ['create3', insertValue({table: 'table3'})]
    }, done);
  });

  it('should delete all tables', function(done) {
    async.auto({
      connect: connect({database: 'cleaner'}),
      clean: ['connect', databaseCleaner({type: 'delete'})],
      check1: ['clean', checkEmptyTable({table: 'table1'})],
      check2: ['clean', checkEmptyTable({table: 'table2'})],
      check3: ['clean', checkEmptyTable({table: 'table3'})]
    }, function(err, results) {
      if (err) throw(err);
      should(results.check1.rows.length).equal(0);
      results.check2.rows.length.should.equal(0);
      results.check3.rows.length.should.equal(0);
      done();
    });
  });
});

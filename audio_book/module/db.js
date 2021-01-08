var mongoClient = require('mongodb').MongoClient;
var Config = require('./config');

class Db {

  static getInstance() {
    if (!Db.instance) {
      Db.instance = new Db();
    }
    return Db.instance;
  }

  constructor() {
    this.dbClient = '';
    this.connect();
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.dbClient) {
        resolve(this.dbClient);
      } else {
        mongoClient.connect(Config.dbUrl, (err, client) => {
          if (!err) {
            var db = client.db(Config.dbName);
            this.dbClient = db;
            resolve(this.dbClient);
          } else {
            reject(err);
          }
        });
      }
    });
  }

  find(collectionName, obj) {
    console.log(obj);
    return new Promise((resolve, reject) => {
      this.connect().then((db) => {
        var res = db.collection(collectionName).find(obj);
        res.toArray((err, docs) => {
          if (!err) {
            resolve(docs);
          } else {
            reject(err);
          }
        });
      });
    });
  }

  insert(collectionName, obj) {
    return new Promise((resolve, reject) => {
      this.connect().then((db) => {
        db.collection(collectionName).insertOne(obj, function(err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      });
    });
  }

  update(collectionName, oldObj, newObj) {
    return new Promise((resolve, reject) => {
      this.connect().then((db) => {
        db.collection(collectionName).updateOne(oldObj, {
          $set: newObj
        }, (err, res) => {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        })
      });
    });
  }

  remove(collectionName, obj) {
    return new Promise((resolve, reject) => {
      this.connect().then((db) => {
        db.collection(collectionName).removeOne(obj, function(err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        })
      });
    });
  }
}

module.exports = Db.getInstance();
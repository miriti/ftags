const databaseFile = ['.ftags.db'];
const fs = require('fs');
const homedir = require('os').homedir();
const mkdirp = require('mkdirp');
const path = require('path');
const sqlite3 = require('sqlite3');

/**
 * Database class
 */
const Db = class Db {
  /**
   * Locate the database file
   *
   * Tries to find the file in all the parent directories.
   * If not found returns path to the db file in the home directory
   */
  locateDbFile() {
    if (this.dbFile) return this.dbFile;

    let cwd = process.cwd().split(path.sep);
    let currentDirDBFile = cwd.concat(databaseFile).join(path.sep);

    while (cwd.length > 0) {
      let dbPath = cwd.concat(databaseFile).join(path.sep);
      if (fs.existsSync(dbPath)) {
        return dbPath;
      }
      cwd.pop();
    }

    return homedir + path.sep + databaseFile.join(path.sep);
  }

  /**
   * Initialize the databse
   */
  initDb() {
    this.db.serialize(() => {
      // File table
      this.db.run(
        'CREATE TABLE IF NOT EXISTS file (' +
          'id INTEGER PRIMARY KEY, ' +
          'path TEXT UNIQUE, ' +
          'description TEXT' +
          ')',
      );

      // Tag table
      this.db.run(
        'CREATE TABLE IF NOT EXISTS tag (' +
          'id INTEGER PRIMARY KEY, ' +
          'tag TEXT UNIQUE' +
          ')',
      );

      // File <-> Tag connection
      this.db.run(
        'CREATE TABLE IF NOT EXISTS file_tag (' +
          'file_id INTEGER, ' +
          'tag_id INTEGER, ' +
          'PRIMARY KEY(file_id, tag_id))',
      );
    });
  }

  /**
   * Get a file from database
   */
  async getFile(path, create) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM file WHERE path = ?', path, (err, result) => {
        if (!err) {
          if (result) {
            this.getFileTags(result['id'])
              .then(tags => {
                result['tags'] = tags;
                resolve(result);
              })
              .catch(err => {
                reject(err);
              });
          } else {
            if (create) {
              this.db.run('INSERT INTO file (path) VALUES(?)', path, err => {
                if (!err) {
                  this.getFile(path, false)
                    .then(file => {
                      resolve(file);
                    })
                    .catch(err => {
                      reject(err);
                    });
                } else {
                  reject(err);
                }
              });
            } else {
              resolve(null);
            }
          }
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Get tags from database
   */
  async getTags(tags, create) {
    return new Promise((resolve, reject) => {
      if (create) {
        this.db.serialize(() => {
          tags.forEach(t => {
            this.db.run('INSERT OR IGNORE INTO tag (tag) VALUES (?)', t);
          });
        });
      }

      let where = tags ? tags.map(t => '(tag = ?)').join(' OR ') : 1;
      let params = tags ? tags : [];

      this.db.all('SELECT tag.*, COUNT(file_tag.tag_id) as count FROM tag LEFT OUTER JOIN file_tag ON file_tag.tag_id = tag.id WHERE ' + where + ' GROUP BY tag.id ORDER BY count DESC', params, (err, result) => {
        if (!err) {
          if (result) {
            resolve(result);
          } else {
            reject({error: 'something gone wrong'});
          }
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Get file tags
   */
  async getFileTags(id) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT tag.* FROM file_tag ' +
          'LEFT JOIN tag ON tag.id = file_tag.tag_id ' +
          'WHERE file_tag.file_id = ?',
        id,
        (err, result) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        },
      );
    });
  }

  /**
   * Assign tags to a file in the databse
   */
  async assignTags(path, tags) {
    return new Promise((resolve, reject) => {
      this.getTags(tags, true)
        .then(tags => {
          this.getFile(path, true)
            .then(file => {
              let values = tags
                .map(t => '(' + file['id'] + ', ' + t['id'] + ')')
                .join(', ');
              let sql =
                'INSERT OR IGNORE INTO file_tag (file_id, tag_id) VALUES ' +
                values;
              this.db.run(sql, err => {
                if (!err) {
                  this.getFile(file['path'])
                    .then(file => {
                      resolve(file);
                    })
                    .catch(err => {
                      reject(err);
                    });
                } else {
                  reject({error: err, sql: sql});
                }
              });
            })
            .catch(err => {
              reject(err);
            });
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  /**
   * Get files by tags
   */
  async getFiles(tags) {
    return new Promise((resolve, reject) => {
      this.getTags(tags)
        .then(tags => {
          let sql =
            'SELECT * FROM file ' +
            'WHERE id IN (SELECT file_id FROM file_tag WHERE tag_id IN (' +
            tags.map(t => t['id']).join(', ') +
            '))';
          this.db.all(sql, (err, result) => {
            if (!err) {
              if (result) {
                Promise.all(result.map(file => this.getFile(file['path'])))
                  .then(result => {
                    resolve(result);
                  })
                  .catch(err => {
                    reject(err);
                  });
              } else {
                reject({
                  error: 'Something went wrong',
                  sql: sql,
                  result: result,
                });
              }
            } else {
              reject({error: err, sql: sql});
            }
          });
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  /**
   * Constructor
   */
  constructor(init) {
    if (init) {
      this.dbFile = process.cwd() + path.sep + databaseFile.join(path.sep);
    } else {
      this.dbFile = this.locateDbFile();
    }

    let dbFileExists = fs.existsSync(this.dbFile);

    this.db = new sqlite3.Database(this.dbFile);

    if (!dbFileExists) {
      console.error('Db initialized at %s', this.dbFile);
      this.initDb();
    }
  }
};

module.exports = Db;

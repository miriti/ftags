const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const spawn = require('child_process').spawn;

const databaseFile = ['.ftags', 'ftags.db'];

const argv = require('yargs-parser')(process.argv.slice(2));

/**
 * Locate database file
 */
const getDbFile = () => {
  let cwd = process.cwd().split(path.sep);

  let currentDirDBFile = cwd.concat(databaseFile).join(path.sep);

  while (cwd.length > 0) {
    let dbPath = cwd.concat(databaseFile).join(path.sep);
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
    cwd.pop();
  }

  mkdirp.sync(path.dirname(currentDirDBFile));

  return currentDirDBFile;
};

const db = new sqlite3.Database(getDbFile());

db.run('CREATE TABLE IF NOT EXISTS file_tag (file TEXT, tag TEXT)');

/**
 * Get file tags
 */
const getFileTags = (filename, cb) => {
  db.all('SELECT * FROM file_tag WHERE file = ?', filename, (err, all) => {
    cb(
      all.map(item => {
        return item['tag'];
      }),
    );
  });
};

/**
 * Add tags to a file
 */
const addTags = (filename, tags, cb) => {
  db.parallelize(() => {
    tags.forEach(tag => {
      db.run(
        'INSERT OR REPLACE INTO file_tag (file, tag) VALUES (?, ?)',
        filename,
        tag,
      );
    });
  });
};

/**
 * Get files by tags
 */
const getFilesByTag = (tags, cb) => {
  db.all(
    'SELECT DISTINCT file FROM file_tag WHERE tag IN (' +
      tags.map(t => '"' + t + '"').join(',') +
      ') ORDER BY file',
    (err, all) => {
      if (err) {
        console.error(err);
      } else {
        cb(all.map(f => f.file));
      }
    },
  );
};

/**
 * Entry point
 */
module.exports = () => {
  if (argv._.length > 0) {
    let filename = argv._[0];

    filename = path.isAbsolute(filename)
      ? filename
      : path.normalize(process.cwd() + path.sep + filename);
    if (fs.existsSync(filename)) {
      let tags = argv._.slice(1);
      if (tags.length > 0) {
        addTags(filename, tags);
      } else {
        getFileTags(filename, tags => {
          console.log(tags);
        });
      }
    } else {
      let tags = argv._;
      getFilesByTag(tags, files => {
        if (argv['open']) {
          spawn('open', files, {
            detached: true,
          });
        } else if (argv['exec']) {
          spawn(argv['exec'], files, {
            detached: true,
          });
        } else {
          files.forEach(f => console.log(f));
        }
      });
    }
  } else {
    db.all(
      'SELECT tag, COUNT(*) as cnt FROM file_tag GROUP BY tag ORDER BY cnt DESC',
      (err, all) => {
        all.forEach(t => console.log('%s\t%s', t.cnt, t.tag));
      },
    );
  }
};

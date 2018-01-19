const path = require('path');
const fs = require('fs');
const spawn = require('child_process').spawn;
const argv = require('./args.js');
const Db = require('./db.js');
const package = require('../package.json');

/**
 * Entry point
 */
async function main() {
  const db = new Db(argv['init']);

  if (argv._.length > 0) {
    let filename = argv._[0];
    let fullPath = path.isAbsolute(filename)
      ? filename
      : path.normalize(process.cwd() + path.sep + filename);

    if (fs.existsSync(fullPath)) {
      let tags = argv._.slice(1);
      if (tags.length > 0) {
        let filePath = path.relative(path.dirname(db.dbFile), fullPath);
        try {
          console.log(await db.assignTags(filePath, tags));
        } catch (err) {
          console.log(err);
        }
      } else {
        console.log('TODO: no tags. show file description and tags');
      }
    } else {
      let tags = argv._;
      try {
        console.log(await db.getFiles(tags));
      } catch (err) {
        console.log('Error: %O', err);
      }
    }
  } else {
    console.log('Tags: %O', await db.getTags());
  }
}

module.exports = main;

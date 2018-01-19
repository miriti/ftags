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
    const filename = argv._[0];
    const fullPath = path.isAbsolute(filename)
      ? filename
      : path.normalize(process.cwd() + path.sep + filename);

    if (fs.existsSync(fullPath)) {
      let tags = argv._.slice(1);
      let filePath = path.relative(path.dirname(db.dbFile), fullPath);
      if (tags.length > 0) {
        try {
          console.log(await db.assignTags(filePath, tags));
        } catch (err) {
          console.log(err);
        }
      } else {
        let file = await db.getFile(filePath, true);
        if (file) {
          console.log(file);
        }
      }
    } else {
      let tags = argv._;
      try {
        let files = await db.getFiles(tags);

        console.log('%d files found:', files.length);

        files.forEach(file => {
          console.log(
            '%s ( %s )',
            file['path'],
            file['tags'].map(t => t['tag']).join(', '),
          );
        });

        if (argv['exec']) {
          spawn(argv['exec'], files.map(f => f['path']), {detached: true});
        }
      } catch (err) {
        console.log('Error: %O', err);
      }
    }
  } else {
    let tags = await db.getTags();
    tags.filter(t => t['count'] > 0).forEach(tag => {
      console.log('%s (%d)', tag['tag'], tag['count']);
    });
  }
}

module.exports = main;

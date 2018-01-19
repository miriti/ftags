# ftags

**ftags** (File Tags) is a simple command line file tagging utility that helps to organize your files by assigning tags to them.

## Instalation

Assuming that you already have [Node.js](https://nodejs.org/) and [Npm](https://www.npmjs.com/) installed:
`npm i -g ftags`

## Usage

### Initialize ftags database (optional)

**ftags** stores it's data in a single database file (`.ftags.db`). By default **ftags** searches for this file in the currect working directory. If it won't be able to locate it there it will try to find it in all the parent directories up to the root of the file system. If the file won't be found after that it will be assumed that the global database file should be used. Global database default location is the home directory of the user.

If you wan't to create a new `.ftags.db` file in the current directory and those scope it out from the global database just use the `--init` option in the command:

```
ftags --init
```

### Tag a file

```
ftags example.txt tag1 tag2 'multiple words tag'
```

### List files marked with tags

```
ftags tag1 tag2
```

### Execute a command on files marked with tags

```
ftags tag1 tag2 --exec=open
```

This command will run the specified program and pass found files as arguments e.g.:

```
open file1 file2 file3
```

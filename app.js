/*jslint node: true, nomen: true, plusplus: true, indent: 2*/
'use strict';

var express = require('express'),
  fs = require('fs'),
  path = require('path');

var uploadDir = path.resolve(__dirname, 'public/uploads');

// OK to do this synchronously, it's just on startup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Probably going overboard to do this async, but illustrates the callback pattern
function getSafeFilename(folder, orig, cb) {
  var filename = orig, i = 1;
  
  function testNextFile() {
    fs.exists(path.join(uploadDir, filename), function (exists) {
      console.log("Testing: " + filename);
      if (exists) {
        console.log("Exists, trying again");
        filename = path.basename(orig, path.extname(orig)) + "_" + i + path.extname(orig);
        i++;
        testNextFile();
      } else {
        cb(filename);
      }
    });
  }
  
  testNextFile();
}

var app = express();

app.use(express.logger('dev'));
app.use(express.limit('5mb'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
// JSLint doesn't like 'express.static' because static is a keyword.
app.use(express['static'](path.resolve(__dirname, 'public')));
app.use(express.directory(path.resolve(__dirname, 'public')));

app.post('/upload', function (req, res) {
  if (!req.files || !req.files.filesToUpload || !req.files.filesToUpload.length) {
    // No file was specified in the request.
    res.send(400, '<p>No files uploaded.</p>');
  } else {
    req.files.filesToUpload.forEach(function (file) {
      getSafeFilename(uploadDir, file.name, function (filename) {
        console.log("Uploading " + file.name + " as " + filename);
        fs.rename(file.path, path.join(uploadDir, filename));
      });
    });
    // Since the renames are async, this response will be sent before they're all complete.
    // If you want to wait, you'll need to add a callback to the rename and keep track of
    // how many have finished, then send the response when you've gotten all of them.
    res.send(200, '<p>Files uploaded. <a href="uploads">Go to uploads folder</a></p>');
  }
});

app.listen(3000);

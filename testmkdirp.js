var mkdirp = require('mkdirp');

var rep = '/tmp/' + Date.now();

mkdirp(rep, function() {
  console.log(arguments);
  mkdirp(rep, function() {
    console.log(arguments);
  })
})
var loadFile = function(file) {
  try {
    var request = new XMLHttpRequest();
    request.open('GET', file, false);
    request.send(null);

    if (request.readyState == 4) return request.responseText;
    else return request.statusText;
  } catch (e) {
    debug("File " + file + " not found");
  };
},

fixture = function(element) {
  if (!$("#fixtures").length) $('<div id="fixtures" />').appendTo("body");
  return $("#fixtures").append(element);
},

cleanFixtures = function()  { $("#fixtures").empty(); },

removeFixtures = function() { $("#fixtures").remove(); },

emptyFunction = function() { };

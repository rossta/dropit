(function() {

  var root = this;

  var WP;

  WP = root.WP = {};

  WP.Settings = {
    xhr: true,
    dragdrop: true
  };

  WP.Utils = {

    dataTransferFiles: function(jQEvent) {
      return jQEvent.originalEvent.dataTransfer.files;
    },

    base64StartIndex: function(data) {
      var length = data.length, index;
      return (length > 128) && (index = data.indexOf(',') + 1) && (length > index) && index;
    }

  };


  // WP.Events courtesy of Backbone.Events
  // -------------------------------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may `bind` or `unbind` a callback function to an event;
  // `trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.bind('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  WP.Events = {

    // Bind an event, specified by a string name, `ev`, to a `callback` function.
    // Passing `"all"` will bind the callback to all events fired.
    bind : function(eventName, callback, context) {
      var calls = this._callbacks || (this._callbacks = {});
      var list  = calls[eventName] || (calls[eventName] = []);
      list.push([callback, context]);
      return this;
    },

    // Remove one or many callbacks. If `callback` is null, removes all
    // callbacks for the event. If `ev` is null, removes all bound callbacks
    // for all events.
    unbind : function(eventName, callback) {
      var calls;
      if (!ev) {
        this._callbacks = {};
      } else if (calls = this._callbacks) {
        if (!callback) {
          calls[eventName] = [];
        } else {
          var list = calls[ev];
          if (!list) return this;
          for (var i = 0, l = list.length; i < l; i++) {
            if (list[i] && callback === list[i][0]) {
              list[i] = null;
              break;
            }
          }
        }
      }
      return this;
    },

    // Trigger an event, firing all bound callbacks. Callbacks are passed the
    // same arguments as `trigger` is, apart from the event name.
    trigger : function(eventName) {
      var list, calls, callback, args;
      if (!(calls = this._callbacks)) return this;
      if (list = calls[eventName]) {
        for (var i = 0, l = list.length; i < l; i++) {
          if (!(callback = list[i])) {
            list.splice(i, 1); i--; l--;
          } else {
            args = Array.prototype.slice.call(arguments, 1);
            callback[0].apply(callback[1] || this, args);
          }
        }
      }
      return this;
    }

  };


  WP.App = function(settings) {
    var self = this;
    self.settings = _.extend({}, WP.Settings, settings);

    self.view = new WP.View(self);
    self.initialize.apply(this, arguments);
  };

  _.extend(WP.App.prototype, WP.Events, {

    initialize: function() {
      var self = this;
      // initialize drag and drop
      self.listen();
    },

    listen: function() {
      var self = this,
          $overlay = $("#overlay");

      $('body').bind('dragenter', function() {
        $overlay.fadeIn();
        return false;
      });

      $overlay
        .bind('dragleave', function(jqEvent){
          self.onleave(jqEvent);
          return false;
        })
        .bind('dragover', function() {
          return false;
        })
        .bind('drop', function(jqEvent) {
          var files = WP.Utils.dataTransferFiles(jqEvent);
          self.ondrop(files);
          return false;
        });

      //init progressbar
    },

    onleave: function(event) {
      this.trigger("dragleave", event);
    },

    ondrop: function(files) {
      var self  = this;
    	var fileTotal = files.length;

      self.trigger('drop', files);

    	if(typeof files == "undefined" || fileTotal == 0) return;

      self.trigger('uploadstart', files);

    	// Process each of the dropped files
    	_(files).each(function(file, i) {
    	  self.uploadFile(file, fileTotal);
    	});
    },

    uploadFile: function(file, total) {
      return WP.Upload.send(file, total);
    }

  });

  WP.Upload = {
    send: function() { WP.Upload.create.apply(WP.Upload, arguments); },
    create: function(file, total) {
      var klass = _.isUndefined(FileReader) ? WP.BasicUpload : WP.FileReaderUpload;
      return new klass(file, total);
    }
  };

  WP.FileReaderUpload = function(file, total) {
    var self = this;
    self.file = file;
    self.total = total;
    self.reader = new FileReader();
    self.initialize();
  };

  WP.BasicUpload = function(file, total) {
    var self = this;
    self.file = file;
    self.total = total;
    // self.initialize();
  };

  _.extend(WP.FileReaderUpload.prototype, WP.Events, {
    initialize: function() {
      var self = this;
      _.bindAll(self);
      self.reader.onerror = self.onerror;
      self.reader.onloadend = self.onloadend;
      self.reader.readAsDataURL(self.file);
    },

    send: function() {
      var self = this;

      var data = new FormData();
      data.append("files[]", self.file);

      $.ajax({
        url: '/upload',
        type: 'POST',
        data: data,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000, // 1 min timeout
        beforeSend: self.beforeSend,
        error: function(XMLHttpRequest, textStatus, errorThrown) {
          console.log("Upload error");
          console.log.apply(console, arguments);
        },

        success: function(response) {
          console.log("Successful upload!");
          console.log.apply(console, arguments);
        }
      });
    },

    onerror: function(event) {
      this.trigger("error", this.errorMessage(event.target.error.code));
    },

    onloadend: function(event) {
      this.send(event.target.result);
    },

    beforeSend: function(xhr, settings) {
    },

    errorMessage: function(errorCode) {
      var file = this.file, klass = WP.FileReaderUpload, message;

      // REF: http://www.w3.org/TR/FileAPI/#ErrorDescriptions
      switch(errorCode) {
        case klass.NOT_FOUND_ERR:
          message = file.name + " not found";
          break;

        case klass.SECURITY_ERR:
          message = file.name + " has changed on disk, please re-try";
          break;

        case klass.ABORT_ERR:
          message = "Upload cancelled";
          break;

        case klass.NOT_READABLE_ERR:
          message = "Cannot read " + file.name;
          break;

        case klass.ENCODING_ERR:
          message = "File too large for browser to upload";
          break;
      }

      return message;
    }

  });

  _.extend(WP.FileReaderUpload, {
    NOT_FOUND_ERR     : (FileError.NOT_FOUND_ERR    || 1),
    SECURITY_ERR      : (FileError.SECURITY_ERR     || 2),
    ABORT_ERR         : (FileError.ABORT_ERR        || 3),
    NOT_READABLE_ERR  : (FileError.NOT_READABLE_ERR || 4),
    ENCODING_ERR      : (FileError.ENCODING_ERR     || 5)
  });


  WP.View = function(app) {
    var self = this;
    self.app = app;

    _.bindAll(self);

    // for (var eventName in self.events) {
    //   app.bind(eventName, self[eventName]);
    // }

    app.bind("drop", self.events['drop']);
    app.bind("dragleave", self.events['dragleave']);
    app.bind("uploadstart", self.events['uploadstart']);
  };

  _.extend(WP.View.prototype, {

    events: {
      "dragleave": function(event) {
        /*
      	 * We have to double-check the 'leave' event state because this event stupidly
      	 * gets fired by JavaScript when you mouse over the child of a parent element;
      	 */
      	if( event.pageX < 10 ||
      	    event.pageY < 10 ||
      	    $(window).width() - event.pageX < 10  ||
      	    $(window).height - event.pageY < 10) {
      		$("#overlay").fadeOut(125);
      	}
      },
      "drop": function(files) {
        // Hide overlay
      	$("#overlay").fadeOut(0);

      	// Empty status text
      	$("#upload-details").html("");

      	// Reset progress bar incase we are dropping MORE files on an existing result page
        // $("#upload-status-progressbar").progressbar({value:0});
      	// Show progressbar
        $("#upload-status-progressbar").fadeIn(0);
      },

      "uploadstart": function(files) {
        var fileTotal = files.length;
        // Update and show the upload box
      	var label = (fileTotal == 1 ? " file" : " files");
      	$("#upload-count").html(fileTotal + label);
      	$("#upload-thumbnail-list").fadeIn(125);
      }
    }
  });

  return WP;

}).call(this);
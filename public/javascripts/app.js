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
    },

    formData: function() {
      return new FormData();
    },

    fileReader: function() {
      return new FileReader();
    }

  };


  // WP.Events courtesy of Backbone.Events
  // -------------------------------------

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
      var klass = _.isUndefined(root.FileReader) ? WP.BasicUpload : WP.FileReaderUpload;
      return new klass(file, total);
    }
  };

  WP.FileReaderUpload = function(file, total) {
    var self = this;
    self.file = file;
    self.total = total;
    self.reader = WP.Utils.fileReader();
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
      var data = WP.Utils.formData();

      data.append("files[]", self.file);

      // The contentType option must be set to false, forcing jQuery not to add a Content-Type header,
      // otherwise, the boundary string will be missing from it.
      // The processData flag is also set to false,
      // otherwise, jQuery will try to convert your FormData into a string, which will fail.
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
          // {"medium":{"id":5469, "type":"KImage", "height":474, "k_entry_id":"0_rj5efqxi", "width":355}}
          // handle bad response
          // update status

          $("#upload-status-text").html(response.originalFileName + " Uploaded!");

          console.log("Successful upload!");
          console.log.apply(console, arguments);
          _(response["images"]).chain().map(function(result) { return result['medium']; }).each(function(medium) {
            var el = new WP.Thumbnail(medium).el;
            $("#upload-thumbnail-list").append(el);
          });
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

  WP.Thumbnail = function(medium) {
    this.medium = medium;

    if (!this.medium.url) this.medium.url = this.urlFor(this.medium.k_entry_id);

    var attrs = this.attributes || {};
    if (this.id) attrs.id = this.id;
    if (this.className) attrs['class'] = this.className;
    this.el = document.createElement('div');
    $(this.el).attr(attrs);
    this.template = _.template(this.html);
    this.render();
  };

  _.extend(WP.Thumbnail.prototype, WP.Events, {
    render: function() {
      $(this.el).html(this.template({ medium: this.medium }));
    },

    urlFor: function(k_entry_id) {
      return "http://cdn2.kaltura.com/p/56612/thumbnail/entry_id/"+k_entry_id+"/width/210/height/133/type/3/quality/75";
    },

    html: "<div class='resultBox'><span class='thumbnail-container'><img width='150' src='<%= medium.url %>' /></span></div>"
  });

  return WP;

}).call(this);
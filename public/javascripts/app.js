(function() {

  var root = this;
  var WP;

  var _ = root._;
  var FormData    = root.FormData;
  var FileReader  = root.FileReader;
  var FileError   = root.FileError;
  var Backbone    = root.Backbone;

  // Set up Mustache-style templating
  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
  };

  WP = root.WP = {};

  WP.Settings = {
    xhr: true,
    dragdrop: true
  };

  WP.Utils = {

    dataTransferFiles: function(event) {
      return event.dataTransfer.files;
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
    },

    domId: function(model) {
      return ("" + model.className +"_"+ model.id).toLowerCase();
    }

  };

  WP.App = function(settings) {
    var self = this;
    self.settings = _.extend({}, WP.Settings, settings);
    self.initialize.apply(this, arguments);
  };

  _.extend(WP.App.prototype, Backbone.Events, {

    initialize: function() {
      var self = this, $el = $("#main");
      _.bindAll(self);

      $el.prepend(new WP.UploadStatus({ app: self }).el);
      self.listen(new WP.Overlay({ app: self }).el);
    },

    listen: function(overlay) {
      // initialize drag and drop
      var self  = this,
          $body = $('body');
          body  = $body[0];

      body.addEventListener('dragenter', function(event) {
        self.dragenter(event);
        return self.preventDefault(event);
      }, false);

      overlay.addEventListener('dragenter', function(event){
        self.preventDefault(event);
        return false;
      });

      overlay.addEventListener('dragleave', function(event){
        self.dragleave(event);
        return self.preventDefault(event);
      }, false);

      overlay.addEventListener('dragover', function() {
        return self.preventDefault(event);
      }, false);

      overlay.addEventListener('drop', function(event) {
        var files = WP.Utils.dataTransferFiles(event);
        self.ondrop(files);
        console.log('drop');
        return self.preventDefault(event);
      }, false);

      $body.append(overlay);
    },

    preventDefault: function(event) {
      event.stopPropagation();
      event.preventDefault();
      return false;
    },

    dragenter: function(event) {
      this.trigger("dragenter", event);
    },

    dragleave: function(event) {
      this.trigger("dragleave", event);
    },

    ondrop: function(files) {
      var self  = this;
      var fileTotal = files.length;

      self.trigger('drop', files);

      if(typeof files == "undefined" || fileTotal === 0) return;

      self.trigger('uploadstart', files);

      // Process each of the dropped files
      _(files).each(function(file, i) {
        self.uploadFile(file, fileTotal);
      });
    },

    uploadFile: function(file, total) {
      var self = this, upload = WP.Upload.create(file, total, {
        uploadend: self.uploadend
      });
    },

    uploadend: function(media) {
      WP.Media.add(media);
      this.trigger('uploadend', media);
    }

  });

  WP.Upload = {
    send: function() { WP.Upload.create.apply(WP.Upload, arguments); },
    create: function(file, total, opts) {
      var klass = _.isUndefined(root.FileReader) ? WP.BasicUpload : WP.FileReaderUpload;
      return new klass(file, total, opts);
    }
  };

  WP.FileReaderUpload = function(file, total, opts) {
    opts = opts || {};
    var self = this;
    self.file = file;
    self.total = total;
    self.reader = WP.Utils.fileReader();
    self.uploadend = opts.uploadend;
    self.initialize();
  };

  WP.BasicUpload = function(file, total) {
    var self = this;
    self.file = file;
    self.total = total;
    // self.initialize();
  };

  _.extend(WP.BasicUpload.prototype, Backbone.Events);

  _.extend(WP.FileReaderUpload.prototype, Backbone.Events, {
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
      var provider = function() {
        var xhr = jQuery.ajaxSettings.xhr();
        if (xhr.upload) {
          xhr.upload.addEventListener('progress', function (event) {
            console.log("progress", event);
          }, false);
        }
        return xhr;
      };

      data.append("files[]", self.file);

      // The contentType option must be set to false, forcing jQuery not to add a Content-Type header,
      // otherwise, the boundary string will be missing from it.
      // The processData flag is also set to false,
      // otherwise, jQuery will try to convert your FormData into a string, which will fail.
      $.ajax({
        url: '/upload',
        type: 'POST',
        data: data,
        xhr: provider,
        cache: false,
        contentType: false,
        processData: false,

        timeout: 60000, // 1 min timeout

        error: function(XMLHttpRequest, textStatus, errorThrown) {
          console.log("Upload error");
          console.log.apply(console, arguments);
        },

        success: function(response) {
          // [{"id":5469, "type":"KImage", "height":474, "k_entry_id":"0_rj5efqxi", "width":355 }, ... ]
          // handle bad response

          console.log("Successful upload!");
          console.log.apply(console, arguments);
          // Flatten root 'medium' from json response
          // var media = _(response.images).map(function(result) { return result.medium; });

          if (self.uploadend) self.uploadend(response.images);
        }
      });

    },

    onerror: function(event) {
      this.trigger("error", this.errorMessage(event.target.error.code));
    },

    onloadend: function(event) {
      this.send(event.target.result);
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


  /*
    Models
  */

  WP.Medium = Backbone.Model.extend({

    src: function() {
      // return ["http://cdn2.kaltura.com/p/56612/thumbnail/entry_id", this.get('k_entry_id'),"width/210/height/133/type/3/quality/75"].join('/');
      return ["http://cdn2.kaltura.com/p/56612/thumbnail/entry_id", this.get('k_entry_id'),"width/190/type/3/quality/75"].join('/');
    },

    albumURL: function() {
      return ["http://www.weplay.com/users/ross/pics-photos", this.get("album_id")].join('/');
    },

    detailURL: function() {
      return [this.albumURL(), this.id].join("/");
    },

    className: "Medium"
  });

  WP.MediumCollection = Backbone.Collection.extend({
    model: WP.Medium
  });

  WP.Media = new WP.MediumCollection;
  // Development data
  // WP.Media.add([{"restricted":true,"created_at":"2011-09-06T14:03:23-04:00","album_id":891,"uploader_id":15,"id":5540,"type":"KImage","k_status":"2","caption":null,"height":540,"k_entry_id":"1_j64vxbq6","comments_count":0,"width":470},{"restricted":true, "created_at":"2011-09-06T14:14:20-04:00", "album_id":891, "uploader_id":15, "id":5541, "type":"KImage", "k_status":"2", "caption":null, "height":666, "k_entry_id":"0_ifjpbaok", "comments_count":0, "width":930}])

  /*
    Views
  */

  WP.UploadStatus = Backbone.View.extend({
    initialize: function(opts) {
      opts || (opts = {});

      var self = this, app = opts.app;

      self.template = _.template($("#status-template").html());

      _.bindAll(self);
      app.bind("drop", self.drop);
      app.bind("uploadstart", self.uploadstart);
      app.bind("uploadend", self.uploadend);

      WP.Media.bind("add", function(medium) {
        self.$("#upload-thumbnail-list").append(new WP.Thumbnail({ model: medium, id: WP.Utils.domId(medium) }).el);
        self.$("#upload-results").show();
        self.$("#upload-status-text").html(medium.get('filename') + " uploaded!");
      });

      self.render();
    },

    id: "upload-status",
    className: "center text-center padding",

    render: function() {
      var self = this, $el = $(this.el);
      $el.html(this.template());
      return self;
    },

    drop: function(files) {
      var self = this;
      // Empty status text
      self.$("#upload-details").html("").hide();

      // Reset progress bar incase we are dropping MORE files on an existing result page
      // $("#upload-status-progressbar").progressbar({value:0});
      // Show progressbar
      self.$("#upload-status-progressbar").fadeIn(0);
    },

    uploadstart: function(files) {
      var self = this, fileTotal = files.length, label = (fileTotal == 1 ? " file" : " files");
      self.$("#upload-status-text").html("Uploading...");
      self.$("#upload-count").html(fileTotal + label);
      self.$("#upload-results").fadeIn(125);
      self.$("#upload-animation").show();
    },

    uploadend: function() {
      var self = this;
      self.$("#upload-animation").hide();
    }
  });

  WP.Thumbnail = Backbone.View.extend({
    initialize: function(opts) {
      opts || (opts = {});
      var self = this;
      self.medium = self.model;

      self.template = _.template($("#thumbnail-template").html());
      self.render();
    },

    className: "thumbnail",

    render: function() {
      $(this.el).html(this.template({ medium: this.medium }));
    }

  });

  WP.Overlay = Backbone.View.extend({

    initialize: function(opts) {
      opts || (opts = {});

      var self = this, app = opts.app;

      _.bindAll(self);

      app.bind('teardown.wp', self.remove);
      app.bind('dragenter', self.fadeIn);
      app.bind('dragleave', self.dragleave);
      app.bind('drop', self.hide);

      self.template = _.template($("#overlay-template").html());
      self.render();
    },

    id: "overlay",

    render: function() {
      var self = this, $el = $(self.el);
      $el.html(self.template());
      return self;
    },

    fadeOut: function(num) {
      return $(this.el).fadeOut(num);
    },

    fadeIn: function(num) {
      return $(this.el).fadeIn(num);
    },

    hide: function() {
      return $(this.el).hide();
    },

    dragleave: function(event) {
      /*
       * We have to double-check the 'leave' event state because this event stupidly
       * gets fired by JavaScript when you mouse over the child of a parent element;
       */
      if( event.pageX < 10 ||
          event.pageY < 10 ||
          $(window).width() - event.pageX < 10  ||
          $(window).height - event.pageY < 10) {
          this.fadeOut(125);
      }
    }

  });

  return WP;

}).call(this);
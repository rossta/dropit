(function() {

  var root = this;
  var WP;

  var _           = root._,
      FormData    = root.FormData,
      FileReader  = root.FileReader,
      FileError   = root.FileError,
      Backbone    = root.Backbone;

  // Set up Mustache-style templating
  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
  };

  WP = root.WP = {};

  WP.Settings = {
    xhr: true,
    dragdrop: true,
    host: "http://www.weplay.com"
  };

  WP.Utils = {

    dataTransferFiles: function(event) {
      var data;
      return (data = event.dataTransfer) && data.files;
    },

    formData: function() {
      return new FormData();
    },

    fileReader: function() {
      return new FileReader();
    },

    domId: function(model) {
      return ("" + model.className +"_"+ model.cid).toLowerCase();
    }

  };

  WP.App = function(settings) {
    var self = this;

    _.extend(WP.Settings, settings);

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

      overlay.addEventListener('dragover', function(event) {
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
      self.trigger('drop', files);
      if(typeof files == "undefined" || files.length === 0) return;
      self.uploadstart(files);
    },

    uploadstart: function(files) {
      var self = this;
      // Process each of the dropped files
      _(files).each(function(file, i) { self.uploadFile(file); });
      self.trigger('uploadstart', files);
    },

    uploadFile: function(file) {
      var self  = this, medium;

      medium = WP.Media.create({
          name: file.name,
          type: file.type,
          size: file.size,
          file: file
        }, {
          error: function(model, response) {
            console.log("Upload error");
            console.log.apply(console, arguments);
          },

          success: function(model, response) {
            // [{"id":5469, "type":"KImage", "height":474, "k_entry_id":"0_rj5efqxi", "width":355 }, ... ]
            console.log("Successful upload!");
            console.log.apply(console, arguments);

            self.trigger('uploadend', model, response);
          }
        });

      WP.Media.trigger('upload', medium);
      // TODO replace with callback on WP.Media.create
      // WP.Upload.create(file, { uploadend: self.uploadend, bulk: true });
    },

    uploadend: function(media) {
      console.log("DEPRECATED: uploadend");
      WP.Media.add(media);
      this.trigger('uploadend', media);
    }

  });

  WP.Upload = {
    send: function() { WP.Upload.create.apply(WP.Upload, arguments); },
    create: function(file, opts) {
      var klass = _.isUndefined(root.FileReader) ? WP.BasicUpload : WP.FileReaderUpload;
      return new klass(file, opts);
    }
  };

  WP.FileReaderUpload = function(fileData, opts) {
    var self = this;
    self.opts = opts || (opts = {});
    self.fileData = fileData;
    self.reader = WP.Utils.fileReader();
    self.uploadend = opts.uploadend;
    self.initialize();
  };

  _.extend(WP.FileReaderUpload.prototype, Backbone.Events, {
    initialize: function() {
      var self = this;
      _.bindAll(self);
      self.reader.onerror = self.onerror;
      self.reader.onloadend = self.onloadend;

      self.reader.readAsDataURL(self.fileData); // triggers onloadend when complete
    },

    url: '/upload',

    send: function() {
      var self = this;
      var url  = self.url;
      var data = WP.Utils.formData();
      var options;

      // TODO support bulk upload
      // data.append("files[]", self.fileData);
      // url = '/bulk-upload';
      data.append("file", self.fileData);

      // The contentType option must be set to false, forcing jQuery not to add a Content-Type header,
      // otherwise, the boundary string will be missing from it.
      // The processData flag is also set to false,
      // otherwise, jQuery will try to convert your FormData into a string, which will fail.
      options = _.extend({
        url: url,
        type: 'POST',
        data: data,
        xhr: self.provider,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000 // 1 min timeout
      }, self.opts);

      $.ajax(options);
    },

    provider: function() {
      var xhr = $.ajaxSettings.xhr();
      if (xhr.upload) {
        xhr.upload.addEventListener('progress', function (event) {
          console.log("progress", event);
          if (event.lengthComputable) {
            var percentage = Math.round((event.loaded * 100) / event.total);
            console.log('Loaded : '+percentage+'%');
          }

        }, false);
      }
      return xhr;
    },

    onerror: function(event) {
      this.trigger("error", this.errorMessage(event.target.error.code));
    },

    onloadend: function(event) {
      this.send(event.target.result);
    },

    errorMessage: function(errorCode) {
      var file = this.fileData, klass = WP.FileReaderUpload, message;

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

  WP.BasicUpload = function(file) {
    var self = this;
    self.file = file;
    self.initialize();
  };

  _.extend(WP.BasicUpload.prototype, Backbone.Events, {
    initialize: function() {}
  });


  // Models
  // ------

  WP.Medium = Backbone.Model.extend({

    sync: function(method, model, options) {
      var self = this, file;
      if (self.isNew() && method == 'create' && (file = this.get("file"))) {
        WP.Upload.create(file, options);
        self.set({"file": null});
      } else {
        Backbone.sync.call(self, method, self, options);
      }
    },

    src: function() {
      // return ["http://cdn2.kaltura.com/p/56612/thumbnail/entry_id", this.get('k_entry_id'),"width/210/height/133/type/3/quality/75"].join('/');
      return ["http://cdn2.kaltura.com/p/56612/thumbnail/entry_id",
              this.get('k_entry_id'),"width/190/type/3/quality/75"].join('/');
    },

    albumURL: function() {
      return [WP.Settings.host, "albums", this.get("album_id")].join('/');
    },

    detailURL: function() {
      var self = this;
      return [WP.Settings.host,
              self.resource(), self.get("album_attachable_id"),
              'pics-photos', this.get("album_id"), self.id].join("/");
    },

    resource: function() {
      return this.get("album_attachable_type").toLowerCase() + "s";
    },

    url: function() {
      if (this.isNew()) {
        return "/upload";
      } else {
        return this.detailURL();
      }
    },

    className: "Medium"
  });

  WP.MediumCollection = Backbone.Collection.extend({
    model: WP.Medium
  });

  WP.Media = new WP.MediumCollection;
  // Development data
  // WP.Media.add([{"restricted":true,"created_at":"2011-09-06T14:03:23-04:00","album_id":891,"uploader_id":15,"id":5540,"type":"KImage","k_status":"2","caption":null,"height":540,"k_entry_id":"1_j64vxbq6","comments_count":0,"width":470},{"restricted":true, "created_at":"2011-09-06T14:14:20-04:00", "album_id":891, "uploader_id":15, "id":5541, "type":"KImage", "k_status":"2", "caption":null, "height":666, "k_entry_id":"0_ifjpbaok", "comments_count":0, "width":930}])

  // Views
  // -----

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
        var domId = WP.Utils.domId(medium);
        var thumbnail = new WP.Thumbnail({ model: medium, id: domId });
        var $placeholder = self.$("#" + domId);
        if ($placeholder.length) {
          $placeholder.replaceWith(thumbnail.el);
        } else {
          self.$("#upload-thumbnail-list").append(thumbnail.el);
        }
        self.$("#upload-results").show();
        self.$("#upload-status-text").html(medium.get('filename') + " uploaded!");
      });

      WP.Media.bind("upload", function(medium) {
        var placeholder = new WP.Placeholder({ model: medium, id: WP.Utils.domId(medium) });
        self.$("#upload-thumbnail-list").append(placeholder.el);
      });

      // WP.Files.bind("add", function(file) {
      // });
      //
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
      // self.$("#upload-status-progressbar").fadeIn(0);
    },

    uploadstart: function(files) {
      var self = this, fileTotal = files.length, label = (fileTotal == 1 ? " file" : " files");
      self.$("#upload-status-text").html("Uploading...");
      self.$("#upload-count").html(fileTotal + label);
      self.$("#upload-header").fadeIn(125);
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
      _.bindAll(self);
      self.medium = self.model;

      self.template = _.template($(self.templateId).html());
      self.render();
    },

    className: "thumbnail",

    templateId: "#thumbnail-template",

    render: function() {
      $(this.el).html(this.template({ medium: this.medium }));
    }

  });

  WP.Placeholder = WP.Thumbnail.extend({
    className: "placeholder thumbnail",
    templateId: "#placeholder-template"
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
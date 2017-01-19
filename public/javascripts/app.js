(function() {

  var root = this;
  var WP;

  var $           = root.$,
      _           = root._,
      FormData    = root.FormData,
      FileReader  = root.FileReader,
      // FileError   = root.FileError,
      Backbone    = root.Backbone,
      Queue       = root.Queue;

  // Set up Mustache-style templating
  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
  };

  WP = root.WP = {};
console.log("WP", WP);
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
      WP.Upload.reset();

      $el.prepend(new WP.UploadStatus({ app: self }).el);
      self.overlayView = new WP.Overlay({ app: self });
      self.listen(self.overlayView);

      WP.Groups.fetch();
      WP.Media.bind("uploadend", function() {
        WP.Upload.finish();
      });
    },

    listen: function(overlayView) {
      // initialize drag and drop
      var self  = this,
          $body = $('body'),
          body  = $body[0],
          overlay = overlayView.el;

      body.addEventListener('dragenter', function(event) {
        if (overlayView.isHidden()) overlayView.fadeIn();
        self.dragenter(event);
        return self.preventDefault(event);
      }, false);

      overlay.addEventListener('dragenter', function(event) {
        self.preventDefault(event);
        return false;
      });

      overlay.addEventListener('dragleave', function(event) {
        overlayView.dragleave(event);
        self.dragleave(event);
        return self.preventDefault(event);
      }, false);

      overlay.addEventListener('dragover', function(event) {
        return self.preventDefault(event);
      }, false);

      overlay.addEventListener('drop', function(event) {
        overlayView.hide();
        var files = WP.Utils.dataTransferFiles(event);
        self.ondrop(files);
        console.log('drop');
        return self.preventDefault(event);
      }, false);

      overlayView.hide();
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
      var self  = this;
      var medium = WP.Media.create({
          filename: file.name,
          type: file.type,
          size: file.size,
          file: file,
          status: 'waiting'
        }, {
          error: function(model, response) {
            console.log("Upload error");
            console.log.apply(console, arguments);
            WP.Media.trigger('uploadend', model, response);
            model.set({'status': 'error during upload: ' + response.statusText });
          },

          success: function(model, response) {
            // response {"id":5469, "type":"KImage", "height":474, "k_entry_id":"0_rj5efqxi", "width":355, ... }
            console.log("Successful upload!");
            console.log.apply(console, arguments);
            WP.Media.trigger('uploadend', model, response);
          }
        });

      WP.Media.trigger('uploadstart', medium);
    }

  });


  // Upload Management
  // -----------------

  WP.Upload = {
    send: function() { WP.Upload.create.apply(WP.Upload, arguments); },
    create: function(file, opts) {
      var klass = _.isUndefined(root.FileReader) ? WP.BasicUpload : WP.FileReaderUpload;
      return new klass(file, opts);
    },

    UPLOAD_MAX: 4,
    currentlyUploading: 0,
    queue: new Queue,

    reset: function() {
      _.bindAll(this);
      this.queue = new Queue;
      this.currentlyUploading = 0;
    },

    enqueue: function(item) {
      this.queue.enqueue(item);
      this.next();
    },

    next: function() {
      var queue = this.queue;
      if (queue.isEmpty()) return;
      if (this.currentlyUploading < this.UPLOAD_MAX) {
        this.currentlyUploading += 1;
        (queue.dequeue())();
      }
    },

    finish: function(count) {
      count || (count = 1);
      this.currentlyUploading -= count;
      for(var i = 0; i <= count; i++) {
        this.next();
      }
    }
  };

  WP.FileReaderUpload = function(fileData, opts) {
    var self = this;
    self.opts = opts || (opts = {});
    self.fileData = fileData;
    self.reader = WP.Utils.fileReader();
    self.initialize();
  };

  _.extend(WP.FileReaderUpload.prototype, Backbone.Events, {
    initialize: function() {
      var self = this, reader = self.reader;
      _.bindAll(self);
      reader.onerror = self.onerror;
      reader.onloadend = self.onloadend;
      reader.readAsDataURL(self.fileData); // triggers onloadend when complete
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
      data.append("group_id", $("select#group-id").val());

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
      var self = this, xhr = $.ajaxSettings.xhr();
      if (xhr.upload) {
        xhr.upload.addEventListener('progress', function (event) {
          console.log("progress", event);
          if (event.lengthComputable) {
            var percentage = Math.round((event.loaded * 100) / event.total);
            console.log('Loaded : '+percentage+'%');
            self.trigger("progress", percentage);
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
    NOT_FOUND_ERR     : (1),
    SECURITY_ERR      : (2),
    ABORT_ERR         : (3),
    NOT_READABLE_ERR  : (4),
    ENCODING_ERR      : (5)
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

    MAX_FILE_SIZE: 10000000,
    VALID_IMAGE_TYPES: "jpeg bmp x-png x-ms-bmp gif tiff x-pict",
    validMimeTypes: function() {
      return _(this.VALID_IMAGE_TYPES.split(" ")).map(function(mime) { return "image/" + mime; });
    },

    validate: function(attrs) {
      var size, type;
      attrs || (attrs = {});
      if ((type = attrs.type) && (!_(this.validMimeTypes()).include(type))) {
        return "error: file type "+type+" currently not supported.";
      }
      if ((size = attrs.size) && (size > this.MAX_FILE_SIZE)) {
        return "error: file size "+Math.floor(size/1000000)+"MB is too large.";
      }
      return null;
    },

    sync: function(method, model, options) {
      var self = this, file;
      if (self.isNew() && method == 'create' && (file = this.get("file"))) {
        WP.Upload.enqueue(function() {
          var upload;
          // TODO consider state machine implementation for status/percentage
          self.set({"status": "uploading", "percentage": 0 });
          upload = WP.Upload.create(file, options);
          upload.bind("progress", function(percentage) {
            var attrs = {"percentage": percentage };
            if (percentage >= 99) attrs["status"] = "processing";
            self.set(attrs);
          });
          self.set({"file": null});
        });
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
      if (self.attachableAsResource()) {
        return [WP.Settings.host,
                self.attachableAsResource(), self.get("album_attachable_id"),
                'pics-photos', this.get("album_id"), self.id].join("/");
      } else {
        return self.albumURL();
      }
    },

    attachableAsResource: function() {
      var attachable_type;
      return (attachable_type = this.get("album_attachable_type")) && attachable_type.toLowerCase() + "s";
    },

    albumDisplayName: function() {
      var title = this.get("album_title");
      return this.attachableName() +" - "+ (title ? title : this.albumURL());
    },

    attachableName: function() {
      var group = this.group(), context;
      if (group) {
        context = group.escape("name");
      } else {
        context = "Personal Gallery";
      }
      return context;
    },

    url: function() {
      return (this.isNew() ? "/upload" : this.detailURL());
    },

    group: function() {
      var group;
      return this.get("album_attachable_type") == "Group" && (group = WP.Groups.get(this.get("album_attachable_id")));
    },

    uploadStatus: function() {
      return this.escape("filename") +" "+(this.get("status")||'ready')+" ...";
    },

    uploadProgress: function() {
      return 'Loaded : '+(this.get("percentage") || 0)+'%';
    },

    className: "Medium"
  });

  WP.MediumCollection = Backbone.Collection.extend({
    model: WP.Medium
  });

  WP.Media = new WP.MediumCollection;
  // Development data
  // WP.Media.add([{"restricted":true,"created_at":"2011-09-07T14:59:35-04:00","album_id":892,"uploader_id":15,"id":5598,"type":"image/jpeg","k_status":"2","caption":null,"height":400,"k_entry_id":"1_9glubfyr","comments_count":0,"width":400,"filename":"hamburger1.jpg","size":null}])

  WP.Group = Backbone.Model.extend();

  WP.GroupCollection = Backbone.Collection.extend({
    model: WP.Group,
    url: '/groups'
  });

  WP.Groups = new WP.GroupCollection;

  // Views
  // -----

  WP.UploadStatus = Backbone.View.extend({
    initialize: function(opts) {
      opts || (opts = {});
      var self = this, app = opts.app;
      _.bindAll(self);
      self.template = _.template($("#status-template").html());
      app.bind("drop", self.drop);
      app.bind("uploadstart", self.uploadstart);

      WP.Media.bind("uploadend", self.uploadend);

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

      WP.Media.bind("uploadstart", function(medium) {
        var placeholder = new WP.Placeholder({ model: medium, id: WP.Utils.domId(medium) });
        self.$("#upload-thumbnail-list").append(placeholder.el);
      });

      WP.Groups.bind("reset", function(collection) {
        var selector = new WP.GroupSelect({ collection: collection });
        self.$("#upload-details").after(selector.el);
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
      if (WP.Upload.queue.isEmpty()) self.$("#upload-animation").hide();
    }

  });

  WP.Thumbnail = Backbone.View.extend({
    initialize: function(opts) {
      opts || (opts = {});
      var self = this;
      _.bindAll(self);
      self.medium = self.model;
      self.medium.bind("change", self.render);

      self.template = _.template($(self.templateId).html());
      self.render();
    },

    className: "thumbnail",

    templateId: "#thumbnail-template",

    render: function() {
      var self = this;
      $(self.el).html(self.template({ medium: self.medium }));
      return self;
    }

  });

  WP.Placeholder = WP.Thumbnail.extend({
    className: "placeholder thumbnail",
    templateId: "#placeholder-template"
  });

  WP.GroupSelect = Backbone.View.extend({

    initialize: function(opts) {
      var self = this;
      self.template = _.template($("#upload-group-selector-template").html());
      _.bindAll(self);
      WP.Groups.bind("reset", self.remove);
      self.render();
    },

    render: function() {
      var self = this;
      if (self.collection.isEmpty()) {
        self.el = "";
      } else {
        $(self.el).html(self.template());
        self.collection.each(function(group){
          self.$('select').addOption(group.id, group.escape("name"), false);
        });
      }
      return self;
    },

    id: "upload-group-selector"
  });

  WP.Overlay = Backbone.View.extend({

    initialize: function(opts) {
      opts || (opts = {});
      var self = this, app = opts.app;
      _.bindAll(self);
      app.bind('teardown.wp', self.remove);
      self.template = _.template($("#overlay-template").html());
      self.render();
    },

    id: "overlay",

    render: function() {
      var self = this, $el = $(self.el);
      $el.html(self.template());
      return self;
    },

    fadeOut: function(num) { return $(this.el).fadeOut(num); },

    fadeIn: function(num) { return $(this.el).fadeIn(num); },

    hide: function() { return $(this.el).hide(); },

    show: function() { return $(this.el).show(); },

    dragleave: function(event) {
      /*
       * We have to double-check the 'leave' event state because this event stupidly
       * gets fired by JavaScript when you mouse over the child of a parent element;
       */

      if( event.pageX < 50 ||
          event.pageY < 50 ||
          $(window).width() - event.pageX < 50  ||
          $(window).height() - event.pageY < 50) {
          this.fadeOut(125);
      }
    },

    isHidden: function() {
      return $(this.el).is(":hidden");
    }

  });

  return WP;

}).call(this);
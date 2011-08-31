var WP = (function(module) {

  _.extend(module, {

    Settings: {
    },

    Utils: {

    }

  });

  _.extend(module, {

    App: function(settings) {
      var self = this;
      self.settings = _.extend({}, module.Settings, settings);

      self.view = new module.View();
      self.initialize();
    }

  });

  _.extend(module.App.prototype, {

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
        .bind('dragleave', function(event){
          self.onLeave(event);
          return false;
        })
        .bind('dragover', function() {
          return false;
        })
        .bind('drop', function(event) {
          self.onDrop(event);
          return false;
        });

      //init progressbar
    },

    onLeave: function(event) {
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

    onDrop: function(event) {
      var self = this;
    	var files = event.originalEvent.dataTransfer.files;
    	var fileTotal = files.length;

      self.view.trigger('drop', fileTotal);

    	// If anything is wrong with the dropped files, exit.
    	if(typeof files == "undefined" || fileTotal == 0)
    		return;

      self.view.trigger('uploadstart', fileTotal);

    	// Process each of the dropped files individually
    	_(files).each(function(file, i) {
    	  self.uploadFile(file, fileTotal);
    	});
    },

    uploadFile: function(file, total) {
      new module.Upload(file, total).send();
    }

  });

  _.extend(module, {

    Upload: function(file, total) {
      var self = this;
      self.file = file;
      self.total = total;
    }

  });

  _.extend(module.Upload.prototype, {

    send: function() {
      console.log("sending " + this.file.name);
    }

  });

  _.extend(module, {
    View: function() {
    }
  });

  _.extend(module.View.prototype, {

    trigger: function() {
      var args = _.toArray(arguments);
      var callback = this.events[args.shift()];
      if (callback) callback.apply(this, args);
    },

    events: {
      "drop": function() {
        // Hide overlay
      	$("#overlay").fadeOut(0);

      	// Empty status text
      	$("#upload-details").html("");

      	// Reset progress bar incase we are dropping MORE files on an existing result page
        // $("#upload-status-progressbar").progressbar({value:0});

      	// Show progressbar
      	$("#upload-status-progressbar").fadeIn(0);
      },

      "uploadstart": function(fileTotal) {
        // Update and show the upload box
      	var label = (fileTotal == 1 ? " file" : " files");
      	$("#upload-count").html(fileTotal + label);
      	$("#upload-thumbnail-list").fadeIn(125);
      }
    }
  });

  return module;

})({});
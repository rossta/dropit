var WP = (function(wp) {

  _.extend(wp, {

    Settings: {
      xhr: true,
      dragdrop: true
    },

    App: function(settings) {
      var self = this;

      self.settings = _.extend({}, wp.Settings, settings);

      console.log(this.settings);

      self.initialize();
    },

    ajax: function(options) {
      options = options || {};
      $.ajax(options);
    }

  });


  _.extend(wp.App.prototype, {
    initialize: function() {
      var self = this;

      self.bind("input[name*='multi']", "change", function() {
        $ul = $('#bag>ul');
        $ul.empty();

        _(this.files).each(function(file) {
          var $li = $('<li>').text(file.name);
          $ul.append($li);
        });
      });

      setupDragAndDropZones(self.settings.dragdrop);

      setupAjaxForm(self.settings.xhr);

    },

    bind: function(selector, eventName, method) {
      return $(this.el).delegate(selector, eventName, method);
    },

    getAuthentication: function() {
      var self;
      return {
        consumerKey: self.settings.consumerKey,
        consumerSecret: self.settings.consumerSecret,
        token: getAccessToken(),
        tokenSecret: getAccessSecret()
      };
    },

    el: "#main"

  });

  var setupDragAndDropZones = function(enabled) {
    if (!enabled) {
      $(".dragdrop").hide();
      return;
    }

    $("#dropzone").bind("dragover" , function(event) {
      return false;
    }).bind("drop" , function(event) {
      console.log(event);

      var files = event.originalEvent.dataTransfer.files,
          $target = $('#loadzone');
      $target.empty();

      _(files).each(function(file) {
        $target.append($('<img>').attr('src', file.getAsDataURL()));
      });

      return false;
    });
  },

  setupAjaxForm = function(enabled) {
    if (!enabled) {
      $(".xhr-status").hide();
      return;
    }

    $("form.xhr").sexyPost({
      dataType: 'script',
      async: true,
      autoclear: false,

      start: function(event) {
        $("#onstart").text("onstart: ...");
        $("#oncomplete").text("");
      },

      progress: function(event, completed, loaded, total) {
        $("#onprogress > #text")
          .text("onprogress: " + (completed * 100).toFixed(2) + "% " + loaded.toFixed(2) + " " + total.toFixed(2));
        $("#onprogress > #graph")
          .css("width", (completed * 100) + "%");
      },

      complete: function(event, responseText) {
        $("#oncomplete").text("oncomplete: " + responseText);
      },

      error: function(event) { $("#onerror").text("onerror: error encountered"); },
      abort: function(event) { $("#onabort").text("onabort: aborted"); }
    });
  };

  return wp;

})({});

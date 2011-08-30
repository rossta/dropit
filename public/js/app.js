var WP = {};

(function(wp) {

  wp.App = function(settings) {
    var self = this;
    self.settings = _.extend({}, settings, wp.Settings);

    console.log(this.settings);

    self.initialize();
  };

  _.extend(wp.App.prototype, {
    initialize: function() {
      var self = this;
      self.bind("form#uploader", "submit", function() {
        var $form = $(this);
        wp.ajax({
          url: $form.attr('action'),
          type: "POST",
          data: $form.serialize(),
          success: function() {
            console.log("Success");
            debugger;
            console.log.apply(console, arguments);
          },
          error: function() {
            console.log("Error");
            debugger;
            console.log.apply(console, arguments);
          }
        });
      
        return false;
      });
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

  _.extend(wp, {

    Settings: {},

    ajax: function(options) {
      options = options || {};
      $.ajax(options);
    }
  });

})(WP);

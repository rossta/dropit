// Factory Girl-inspired model initialization for js tests
var Factory = {
  cache: {},

  definitions: {},

  initCache: function(method) {
    Factory.cache[method] = [];
  },

  emptyCache: function() {
    for(method in Factory.cache) {
      Factory.initCache(method);
    }
  },

  instantiate: function(model, attrs) {
    return new model(attrs);
  },

  create: function(method, attrs) {
    return Factory.definitions[method](attrs);
  },

  define: function(method, model, defaultAttrs) {
    defaultAttrs = defaultAttrs || {};
    Factory.initCache(method);
    Factory.definitions[method] = function(attrs) {
      var id          = Factory.cache[method].length + 1,
          attributes  = _.extend({ id: id }, defaultAttrs, attrs),
          instance    = Factory.instantiate(model, attributes);
      Factory.cache[method].push(instance);
      return instance;
    };
  }

};

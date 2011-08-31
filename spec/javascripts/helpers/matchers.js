if (typeof JasmineExtensions == 'undefined') JasmineExtensions = {};

JasmineExtensions.Matchers = {
  toBeVisible: function() {
    return this.actual.is(":visible");
  },
  toBeHidden: function() {
    return this.actual.is(":hidden");
  },
  toBeDisabled: function() {
    return this.actual.is(":disabled");
  },
  toHaveSelector: function(expected) {
    if (!(this.actual instanceof jQuery)) {
      throw expected.toString() + " must be an instance of jQuery to match against a selector";
    }

    return this.actual.find(expected).length > 0;
  },
  toHaveText: function(expected) {
    if (!(this.actual instanceof jQuery)) {
      throw expected.toString() + " must be an instance of jQuery to match text";
    }

    this.message = function() {
      return "Expected " + this.toString() + " text " + (this.isNot ? "not " : " ") + "to be " + expected + " but instead was " + this.actual.text();
    };

    return this.actual.text() == expected;
  },
  toHaveClass: function(expected) {
    if (!(this.actual instanceof jQuery)) {
      throw expected.toString() + " must be an instance of jQuery to match against a selector";
    }
    this.message = function() { return "Expected '" + this.actual.attr("class") + "' " + (this.isNot ? "not " : " ") + "to have class " + expected; };

    return this.actual.hasClass(expected);
  },
  toMatchSelector: function(selector) {
    if (!(this.actual instanceof jQuery)) {
      throw expected.toString() + " must be an instance of jQuery to match against a selector";
    }

    return this.actual.is(selector);
  },
  toHaveLength: function(expected) {
    this.message = function() { return "Expected length of " + this.toString() + " " + (this.isNot ? "not " : " ") + "to be " + expected + " but actual length was " + this.actual.length; };
    return this.actual.length == expected;
  },
  toHaveFocus: function(expected) {
    if (!(this.actual instanceof jQuery)) {
      throw expected.toString() + " must be an instance of jQuery to match against a selector";
    }
    return this.actual.is(":focused");
  },
  toBeChecked: function(expected) {
    if (!(this.actual instanceof jQuery)) {
      throw expected.toString() + " must be an instance of jQuery to match against a selector";
    }
    return this.actual.is(":checked");
  },
  toMatch: function(expected) {
    return this.actual.match(expected);
  },
  toBeEmpty: function() {
    return this.actual.length == 0;
  },
  toBeGreaterThan: function(threshold) {
    return this.actual > threshold;
  },
  toBeLessThan: function(threshold) {
    return this.actual < threshold;
  },
  toInclude: function(expected) {
    return this.actual.indexOf(expected) > -1;
  },
  toBeInstanceOf: function(expected) {
    return (this.actual instanceof expected);
  },
  toBeNull: function() {
    return this.actual == null;
  }

};

// jquery extension to support toHaveFocus matcher
jQuery.extend(jQuery.expr[':'], {
  focused: function(e){ return e == document.activeElement; }
});

beforeEach(function() {
  this.addMatchers(JasmineExtensions.Matchers);
});
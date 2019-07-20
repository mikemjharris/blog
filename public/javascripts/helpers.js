(function() {
    var register = function(Handlebars) {
        var helpers = {
            compare: function(lvalue, rvalue, options) {
              if (arguments.length < 3) {
                  throw new Error( 'Handlebars Helper equal needs 2 parameters' );
                }
              if ( lvalue !== rvalue ) {
                  return options.inverse(this);
              } else {
                  return options.fn(this);
              }
            },
            includes: function(lvalue, rvalue, options) {
              if (arguments.length < 3) {
                  throw new Error( 'Handlebars Helper equal needs 2 parameters' );
                }
              if ( lvalue.indexOf(rvalue) == -1) {
                  return options.inverse(this);
              } else {
                  return options.fn(this);
              }
            },
        };

        if ( Handlebars && typeof Handlebars.registerHelper === 'function' ) {
            for ( var prop in helpers ) {
                Handlebars.registerHelper(prop, helpers[prop]);
            }
        } else {
            // just return helpers object if we can't register helpers here
            return helpers;
        }
    };

    // client
    if (typeof window !== 'undefined') {
        register(Handlebars);
    } else {
        module.exports.register = register;
        module.exports.helpers = register(null);
    }

})();

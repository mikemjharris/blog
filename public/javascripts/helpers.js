(function() {
    var register = function(Handlebars) {

        /************* BEGIN HELPERS *************/
        var helpers = {
            // put all of your helpers inside this object
            compare: function(lvalue, rvalue, options) {
              if (arguments.length < 3) {
                  throw new Error("Handlebars Helper equal needs 2 parameters");
                }
              if( lvalue !== rvalue ) {
                  return options.inverse(this);
              } else {
                  return options.fn(this);
              }
            }
        };
        /************* END HELPERS *************/

        if (Handlebars && typeof Handlebars.registerHelper === "function") {
            // register helpers
            for (var prop in helpers) {
                Handlebars.registerHelper(prop, helpers[prop]);
            }
        } else {
            // just return helpers object if we can't register helpers here
            return helpers;
        }
    };

    // client
    if (typeof window !== "undefined") {
        register(Handlebars);
    }
    // server
    else {
        module.exports.register = register;
        module.exports.helpers = register(null);
    }
})();

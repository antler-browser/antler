// Intercept console methods and forward to React Native
['log', 'warn', 'error', 'info'].forEach(function(method) {
  var original = console[method];
  console[method] = function() {
    // Call original console method
    original.apply(console, arguments);

    // Forward to React Native
    try {
      var args = Array.from(arguments).map(function(arg) {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return '[Object]';
          }
        }
        return String(arg);
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'console',
        method: method,
        args: args
      }));
    } catch (e) {
      // Ignore errors in console forwarding
    }
  };
});

(function() {
  // Native WebView public key for verifying native signatures (ECDSA P-256)
  var WEBVIEW_PUBLIC_KEY = '__WEBVIEW_PUBLIC_KEY__';

  // Decode base64 to Uint8Array
  function base64ToBytes(base64) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Canonical JSON serialization (sorted keys) for signature verification
  function canonicalJSON(obj) {
    var sortedKeys = Object.keys(obj).sort();
    return JSON.stringify(obj, sortedKeys);
  }

  // Generate cryptographically random request IDs
  function generateRequestId() {
    // Use crypto.randomUUID if available (Chrome 92+, Safari 15.4+)
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback: Generate random hex string using crypto.getRandomValues
    var array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, function(byte) {
      return ('0' + byte.toString(16)).slice(-2);
    }).join('');
  }

  // Verify ECDSA P-256 signature to prevent XSS forgery
  async function verifySignature(response) {
    // Check if crypto.subtle is available
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      console.error('[IRL Browser] crypto.subtle not available - cannot verify signatures');
      return false;
    }

    // Validate signature exists
    if (!response.signature) {
      console.error('[IRL Browser] Response missing signature - possible forgery attempt');
      return false;
    }

    try {
      // Extract signature and reconstruct the message that was signed
      var signature = response.signature;
      var messageToVerify = {
        type: response.type,
        requestId: response.requestId,
        timestamp: response.timestamp
      };

      // Include jwt or result depending on response type
      if (response.jwt !== undefined) {
        messageToVerify.jwt = response.jwt;
      }
      if (response.result !== undefined) {
        messageToVerify.result = response.result;
      }

      // Convert message to bytes using canonical JSON (sorted keys)
      var messageString = canonicalJSON(messageToVerify);
      var messageBytes = new TextEncoder().encode(messageString);

      // Decode signature from base64
      var signatureBytes = base64ToBytes(signature);

      // Decode public key from base64
      var publicKeyBytes = base64ToBytes(WEBVIEW_PUBLIC_KEY);

      // Import ECDSA P-256 public key
      var publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes,
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        false,
        ['verify']
      );

      // Verify signature using ECDSA with SHA-256
      var isValid = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        publicKey,
        signatureBytes,
        messageBytes
      );

      if (!isValid) {
        console.error('[IRL Browser] Signature verification failed - possible XSS forgery attempt');
      }

      return isValid;
    } catch (error) {
      console.error('[IRL Browser] Error verifying signature:', error);
      return false;
    }
  }

  // Async function to communicate with native IRL Browser
  function callNativeApp(type, data, timeout) {
    return new Promise(function(resolve, reject) {
      var handled = false;
      var timeoutId;

      // Generate unique request ID for this call
      var requestId = generateRequestId();

      async function handleResponse(event) {
        if (!event.data) return;

        // Parse JSON if event.data is a string from React Native
        var responseData = event.data;
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
          } catch (e) {
            return; // Ignore invalid JSON
          }
        }

        // Validate request ID matches to prevent cross-talk
        if (responseData.requestId !== requestId) {
          return; // Ignore messages with wrong request ID
        }

        // Verify signature to prevent XSS forgery
        if (!(await verifySignature(responseData))) {
          if (!handled) {
            handled = true;
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleResponse);
            reject(new Error('Invalid signature - possible XSS forgery attempt'));
          }
          return;
        }

        if (responseData.type === type + ':response') {
          if (!handled) {
            handled = true;
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleResponse);
            resolve(responseData.jwt || responseData.result);
          }
        } else if (responseData.type === type + ':error') {
          if (!handled) {
            handled = true;
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleResponse);
            reject(new Error(responseData.error || 'Request failed'));
          }
        }
      }

      window.addEventListener('message', handleResponse);

      // Build message object with requestId
      var message = { type: type, requestId: requestId };
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          message[key] = data[key];
        }
      }
      window.ReactNativeWebView.postMessage(JSON.stringify(message), '*');

      timeoutId = setTimeout(function() {
        if (!handled) {
          handled = true;
          window.removeEventListener('message', handleResponse);
          reject(new Error('Request timed out'));
        }
      }, timeout || 5000);
    });
  }

  // Set up window.irlBrowser API
  window.irlBrowser = {
    // Get profile details as signed JWT (async)
    getProfileDetails: function() {
      return callNativeApp('irl:api:getProfileDetails', {});
    },
    // Return browser info synchronously
    getBrowserDetails: function() {
      return __BROWSER_INFO__;
    },
    // Request additional permissions from native
    requestPermission: function(permission) {
      return callNativeApp('irl:api:requestPermission', { permission: permission });
    },
    // Close the WebView
    close: function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'irl:api:close' }), '*');
    }
  };

  console.log('[IRL Browser] WebView API injected');
})();
true; // Required for injectedJavaScript

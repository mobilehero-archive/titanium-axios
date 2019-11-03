'use strict';

const buildURL = require('./../helpers/buildURL');
const settle = require('./../core/settle');
module.exports = function titaniumAxiosAdapter(config) {
  var validResponseTypes = ['arraybuffer', 'blob', 'json', 'text'];
  if (config.responseType && validResponseTypes.indexOf(config.responseType) === -1) {
	  throw new Error('Invalid response type ' + config.responseType + '. Valid response types are ' + validResponseTypes.join(', ') + '.');
  }
  var responseContentLength = null;
  var client = Ti.Network.createHTTPClient();
  client.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer));
  var data = config.data;
  var headers = config.headers;
  if (config.auth) {
		client.username = config.auth.username || '';
		client.password = config.auth.password || '';
		client.domain = config.auth.domain || '';

  }
  if (typeof config.timeout === 'number') {
	  client.timeout = config.timeout;
  }
  client.onreadystatechange = function() {
	  if (client.readyState === client.HEADERS_RECEIVED) {
      var contentLength = client.getResponseHeader('Content-Length');
      if (contentLength) {
		  responseContentLength = contentLength;
      }
	  }
  };
  if (typeof config.onDownloadProgress === 'function') {
	  client.ondatastream = function(e) {
      var progressEvent = {
		  lengthComputable: false,
		  loaded: 0,
		  total: 0 };

      if (e.progress !== Ti.Network.PROGRESS_UNKNOWN && responseContentLength !== null) {
		  progressEvent.lengthComputable = true;
		  progressEvent.total = responseContentLength;
		  progressEvent.loaded = responseContentLength * e.progress;
      }
      config.onDownloadProgress(progressEvent);
	  };
  }
  if (typeof config.onUploadProgress === 'function') {
	  client.onsendstream = function(e) {
      var progressEvent = {
		  lengthComputable: false,
		  loaded: 0,
		  total: 0 };

      if (e.progress !== Ti.Network.PROGRESS_UNKNOWN && data.length) {
		  progressEvent.lengthComputable = true;
		  progressEvent.total = data.length;
		  progressEvent.loaded = data.length * e.progress;
      }
      config.onUploadProgress(progressEvent);
	  };
  }
  if (headers) {
	  Object.keys(headers).forEach(function(headerName) {
      var headerValue = headers[headerName];
      if (typeof data === 'undefined' && headerName.toLowerCase() === 'content-type') {
		  delete headers[headerName];
      } else {
		  client.setRequestHeader(headerName, headerValue);
      }
	  });
  }
  return new Promise(function(resolve, reject) {
	  client.onload = function() {
      var response = {
		  status: client.status,
		  statusText: client.statusText,
		  headers: client.allResponseHeaders,
		  config: config,
		  request: client };

      if (config.responseType === 'arraybuffer') {
		  var blobStream = Ti.Stream.createStream({ source: client.responseData, mode: Ti.Stream.MODE_READ });
		  var buffer = Ti.createBuffer({ length: client.responseData.length });
		  blobStream.read(buffer);
		  response.data = buffer;
      } else if (config.responseType === 'blob') {
		  response.data = client.responseData;
      } else {
		  response.data = client.responseText;
      }
      settle(resolve, reject, response);
	  };
	  client.onerror = function(e) {
      reject(e.error);
	  };
	  if (config.cancelToken) {
      config.cancelToken.promise.then(function onCanceled(cancel) {
		  client.abort();
		  reject(cancel);
      });
	  }
	  client.send(data);
  });
};

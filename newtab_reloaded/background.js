
var languages;
chrome.i18n.getAcceptLanguages(function(data) {
  languages = data;
});

chrome.runtime.onConnect.addListener(function(port) {
  if (port.name != "newtabreloaded") {
    port.disconnect();
    return;
  }

  port.onMessage.addListener(function(request) {
    switch (request.method) {
    case "topSites":
      chrome.topSites.get(function(data) {
        port.postMessage({ method: "topSitesResult", result: data});
        console.log("Sent topSites response");
      });
      break;

    case "dominantColor":
      RGBaster.colors(request.url, function(colorResult) {
        port.postMessage({
          method: "dominantColorResult",
          result: { dominantColor: colorResult.dominant, id: request.id }
        });
        console.log("Sent dominantColor response");
      });
      break;

    case "getRecentlyClosed":
      chrome.sessions.getRecentlyClosed(function(data) {
        port.postMessage({ method: "recentlyClosedResult", result: data});
      });
      console.log("Sent recentlyClosed response");
      break;

    case "reopenTab":
    case "openForeignSession":
      chrome.sessions.restore(request.id);
      break;

    case "_getFaviconImage":
      getFaviconImage(request.url, function(data) {
        port.postMessage({
          method: "_setFaviconImage",
          result: { data: data, id: request.id }
        });
      });
      console.log("Sent _getFaviconImage response");
      break;

    case "getForeignSessions":
      chrome.sessions.getDevices(function(data) {
        port.postMessage({
          method: "foreignSessionsResult",
          result: { data: data, languages: languages }
        });
      });
      break;
    }
  });
});

function getFaviconImage(url, callback) {
  var img = new Image();
  img.src = url;
  img.crossOrigin = "Anonymous";
  img.onload = function() {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    var context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    callback(canvas.toDataURL("image/png"));
  };
}

// Merged RGBaster from: https://github.com/briangonzalez/rgbaster.js
  var getContext = function(){
    return document.createElement("canvas").getContext('2d');
  };

  var getImageData = function(img, loaded){

    var imgObj = new Image();
    var imgSrc = img.src || img;

    // Can't set cross origin to be anonymous for data url's
    // https://github.com/mrdoob/three.js/issues/1305
    if ( imgSrc.substring(0,5) !== 'data:' )
      imgObj.crossOrigin = "Anonymous";

    imgObj.onload = function(){  
      var context = getContext();
      context.drawImage(imgObj, 0, 0);

      var imageData = context.getImageData(0, 0, imgObj.width, imgObj.height);
      loaded && loaded(imageData.data);
    };
    
    imgObj.src = imgSrc;

  };

  var makeRGB = function(name){
    return ['rgb(', name, ')'].join('');
  };

  var mapPalette = function(palette){
    return palette.map(function(c){ return makeRGB(c.name) })
  }

  var BLOCKSIZE = 5; 
  var PALETTESIZE = 10; 

  var RGBaster = {};

  RGBaster.colors = function(img, success, paletteSize){
    getImageData(img, function(data){

              var length        = data.length,
                  colorCounts   = {},
                  rgbString     = '',
                  rgb           = [],
                  colors        = { 
                    dominant: { name: '', count: 0 },
                    palette:  Array.apply(null, Array(paletteSize || PALETTESIZE)).map(Boolean).map(function(a){ return { name: '0,0,0', count: 0 } }) 
                  };

              // Loop over all pixels, in BLOCKSIZE iterations.
              var i = 0;
              while ( i < length ) {
                rgb[0] = data[i];
                rgb[1] = data[i+1];
                rgb[2] = data[i+2];
                rgbString = rgb.join(",");

                // Keep track of counts.
                if ( rgbString in colorCounts ) {
                  colorCounts[rgbString] = colorCounts[rgbString] + 1; 
                } 
                else{
                  colorCounts[rgbString] = 1;
                }

                // Find dominant and palette, ignoring black/white pixels.
                if ( rgbString !== "0,0,0" && rgbString !== "255,255,255" ) {
                  var colorCount = colorCounts[rgbString]
                  if ( colorCount > colors.dominant.count ){
                    colors.dominant.name = rgbString;
                    colors.dominant.count = colorCount;
                  } else {
                    colors.palette.some(function(c){
                      if ( colorCount > c.count ) {
                        c.name = rgbString;
                        c.count = colorCount;
                        return true;
                      }
                    });
                  }
                }

                // Increment!
                i += BLOCKSIZE * 4;
              }

              success && success({
                dominant: makeRGB(colors.dominant.name),
                palette:  mapPalette(colors.palette)
              });
    });
  }
// end RGBster merge

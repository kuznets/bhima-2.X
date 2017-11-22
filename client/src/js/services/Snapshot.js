
angular.module('bhima.services')
.service('SnapshotService', SnapshotService);

SnapshotService.$inject = ['$uibModal', '$http'];

function SnapshotService($uibModal, $http) {

  var service = this;
  service.dataUriToFile = dataUriToFile;
  service.openWebcamModal = openWebcamModal;

  function openWebcamModal() { 
    return $uibModal.open({
      templateUrl: 'modules/templates/bhSnapShot.html',
      controller: snapshotController,
      backdrop     : 'static',
      animation    : false,
      size : 'lg',
    }).result;
  }

  // convert the data_url to a file object
  function dataUriToFile(dataUri, fileName, mimeType) {
    return (
      $http.get(dataUri, {responseType:'arraybuffer'})
    .then(function(res){
      return res.data;
    })
    .then(function(buf){return new File([buf], fileName, {type:mimeType});})
    );
  }


  return service;
}


// the controler for this service

angular.module('bhima.controllers').controller('snapshotController', snapshotController);

snapshotController.$inject = ['$scope', '$uibModalInstance', 'AppCache'];

function snapshotController($scope, $uibModalInstance, AppCache) {
  'use strict';
  var _video = null, patData = null;

  $scope.showDemos = false;
  $scope.mono = false;
  $scope.invert = false;
  $scope.hasDataUrl = false;
  //
  let snapshotCache = AppCache('snapshot', true);
  // help to display the saving botton

  $scope.patOpts = snapshotCache.coordonates || { x: 0, y: 0, w: 25, h: 25 };

  // Setup a channel to receive a video property
  // with a reference to the video element
  // See the HTML binding in main.html
  $scope.channel = {};

  $scope.webcamError = false;
  $scope.onError = function (err) {
    $scope.$apply(
      function () {
        $scope.webcamError = err;
      }
    );
  };

  $scope.onSuccess = function () {  
  // The video element contains the captured camera data
    _video = $scope.channel.video;
    $scope.$apply(function() {
      $scope.patOpts.w = _video.width;
      $scope.patOpts.h = _video.height;
      $scope.showDemos = true;
    });
  };

  /**
   * Make a snapshot of the camera data and show it in another canvas.
   */
  $scope.makeSnapshot = function makeSnapshot() {  
    if (_video) {
      var patCanvas = document.querySelector('#snapshot');
      if (!patCanvas) return;

        patCanvas.width = _video.width;
        patCanvas.height = _video.height;
        var ctxPat = patCanvas.getContext('2d');
        var idata = getVideoData($scope.patOpts.x, $scope.patOpts.y, $scope.patOpts.w, $scope.patOpts.h);
        ctxPat.putImageData(idata, 0, 0);
        storeImageBase64(patCanvas.toDataURL());
        patData = idata;

        // cache storing
        snapshotCache.coordonates = $scope.patOpts;
    };
    }
    /**
     * Redirect the browser to the URL given.
     * Used to download the image by passing a dataURL string
     */
    $scope.downloadSnapshot = function downloadSnapshot(dataURL) {
      window.location.href = dataURL;
    };

    var getVideoData = function getVideoData(x, y, w, h) {
      var hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.width = _video.width;
      hiddenCanvas.height = _video.height;
      var ctx = hiddenCanvas.getContext('2d');
      ctx.drawImage(_video, 0, 0, _video.width, _video.height);
      return ctx.getImageData(x, y, w, h);
    };

    /**
     * This function could be used to send the image data
     * to a backend server that expects base64 encoded images.
     *
     * In this example, we simply store it in the scope for display.
     */
    var storeImageBase64 = function storeImageBase64(imgBase64) {
      $scope.snapshotData = imgBase64;
      $scope.hasDataUrl = true;
    };

    // var getPixelData = function getPixelData(data, width, col, row, offset) {
    //     return data[((row*(width*4)) + (col*4)) + offset];
    // };

    // var setPixelData = function setPixelData(data, width, col, row, offset, value) {
    //     data[((row*(width*4)) + (col*4)) + offset] = value;
    // };

    (function() {
        var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        window.requestAnimationFrame = requestAnimationFrame;
    })();

    var start = Date.now();

  /**
   * Apply a simple edge detection filter.
   */
  function applyEffects(timestamp) {
    var progress = timestamp - start;

    if (_video) {
      var videoData = getVideoData(0, 0, _video.width, _video.height);

      var resCanvas = document.querySelector('#result');

      if (!resCanvas) return;
    
      resCanvas.width = _video.width;
      resCanvas.height = _video.height;
      var ctxRes = resCanvas.getContext('2d');
      ctxRes.putImageData(videoData, 0, 0);
      // apply edge detection to video image
      Pixastic.process(resCanvas, "edges", {mono:$scope.mono, invert : $scope.invert});
    }

    if (progress < 20000) {
      requestAnimationFrame(applyEffects);
    }
  }

  $scope.getDataUrl = function () {
    $uibModalInstance.close($scope.snapshotData);
  }

  $scope.closeModal = function () {
    $uibModalInstance.dismiss('cancel');
  };
  requestAnimationFrame(applyEffects);
}


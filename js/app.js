    (function () {
  "use strict";

  var ALBUM_ID = 'J3xFA'; //Launch Fest 2015
  // var ALBUM_ID = 'xTKPR';//#rackspacesolve #codame 
  //var ALBUM_ID = 'ekwA7';//codame geekdom 
  //var ALBUM_ID = 'P2TvN';//dev 
  var CLIENT_ID = 'e7fc5d0dc23ff0f';
  var CLIENT_SECRET = 'e11b76b04f913bde7a91ffb333a7b8d22f6e4ece';
  var REFRESH_TOKEN = '';
  var ACCESS_TOKEN = '';
  var IS_READY = true;

  Parse.initialize("qeszFlaj8HIDyhQpDjEblNyyGlZfZzfK5mUMI1u9", "KXrBpOj1CQQFRaInkaLIv91RsaEca6LH85WkdfXC");
  
  var parseToken = null;
  var Token = Parse.Object.extend("Token");
  var query = new Parse.Query(Token);
  query.get("raqIMbAb3c", {
    success: function(token) {
      parseToken = token;
      REFRESH_TOKEN = token.get('value');
      getNewAccessToken(null);
    },
    error: function(object, error) {
      console.log(error);
    }
  });


  function thisBrowserIsBad() {
    alert("dude use a different browser");
  }

  function getStream(callback, fail) {
    (navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || thisBrowserIsBad).call(navigator, {video: true}, callback, fail);
  }

  function getNewAccessToken(callback)
  {
    IS_READY = false;
    console.log('requesting new access token...');
    $.ajax({
      url: 'https://api.imgur.com/oauth2/token',
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      data: {
        refresh_token: REFRESH_TOKEN,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token'
      },
      success: function(result) {
        console.log('received new access token');
        console.log(result);
        parseToken.save({ value: result.refresh_token });
        REFRESH_TOKEN = result.refresh_token;
        ACCESS_TOKEN = result.access_token;
        IS_READY = true;
        if(callback != null){ callback(); }
      },
      error: function(result) {
        console.log('could not get new access token');
        console.log(result);
      }
    });
  }

  var facetogif = {
    settings: { w: WIDTH, h: HEIGHT, framerate: 1000/10, seconds: 2000, countdown: 4000 },
    canvas: null,
    video: null,
    stream: null,
    blobs: [],
    frames: []
  };

  var recorder = {
    gif: null,
    interval: null,
    frames: [],
    ctx: null,
    start: function () {
      this.interval = setInterval(this.record(this.ctx, this.frames, this.gif), facetogif.settings.framerate);
    },
    pause: function () {
      clearInterval(this.interval);
    },
    compile: function (callback) {
      this.gif.on('finished', function (blob) { callback(blob); });
      this.gif.render();
    },
    record: function(ctx, frames, gif) {
      return function () {
        if (facetogif.video.src) {
          ctx.drawImage(renderer.domElement, 0, 0, facetogif.settings.w, facetogif.settings.h);
          ctx.drawImage(document.getElementById('gif-logo'), facetogif.settings.w-40, facetogif.settings.h-40, 30, 34);

          var frame = ctx.getImageData(0, 0, facetogif.settings.w, facetogif.settings.h);
          frames.push(frame);
          gif.addFrame(frame, {delay: facetogif.settings.framerate});
        } else {
          clearInterval(this.interval);
        }
      }
    },
    upload: function(blob, $imageContainer) {
      console.log('uploading...');
      var self = this;

      var reader = new window.FileReader();
         
      reader.onloadend = function() {
        var base64data = reader.result;
        base64data = base64data.split('data:image/gif;base64,')[1];            

        self.sendToImgur(base64data, $imageContainer);
      }

      reader.readAsDataURL(blob);
    },
    sendToImgur: function(base64data, $imageContainer) {
      var self = this;

      $.ajax({
        url: 'https://api.imgur.com/3/image',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + ACCESS_TOKEN,
          Accept: 'application/json'
        },
        data: {
          image: base64data,
          type: 'base64',
          album: ALBUM_ID
        },
        success: function(result) {
          console.log('UPLOAD SUCCESS!');
          var id = result.data.id;
          $imageContainer.find('.post-id').html('imgur.com/'+id);
        },
        error: function(result) {
          console.log('UPLOAD ERROR...');
          console.log(result);
         
          //try again
          console.log('try upload again...');
          getNewAccessToken(function(){
            self.sendToImgur(base64data, $imageContainer);
          });
        }
      });
    }
  };

  //*
  //INIT BIZ
  //*
  $(window).load(function(){
    $('#message').fadeOut(0);
    facetogif.canvas = document.createElement('canvas');
    facetogif.canvas.width = facetogif.settings.w;
    facetogif.canvas.height = facetogif.settings.h;
    facetogif.video = document.createElement('video');
    $('#record-button').attr('disabled', true);

    getStream(function (stream) {
      facetogif.video.src = window.URL.createObjectURL(stream);
      CameraFX(facetogif.video);

      facetogif.stream = stream;
      $('#record-button').attr('disabled', false);
    }, function (fail) {
      console.log(fail);
    });

    //mouse clicks trigger count down
    //$('#record-button').click(function(){ if(IS_READY){ go(); } });

    //keyboard press trigger count down
    $(window).keypress(function(){ if(IS_READY){ go(); } });

    function go(){
      IS_READY = false;
      var $recordButton = $(this);
      $recordButton.attr('disabled', true);
      //$('#gifs-go-here').fadeOut(200);
      $('#instructions').fadeOut(200);
      $('#message').fadeIn(200);

      recorder.gif = new GIF({
        workers: 4,
        width: facetogif.settings.w,
        height: facetogif.settings.h,
        quality: 20,
        workerScript: 'js/vendor/gif.worker.js'
      });

      recorder.frames = [];
      recorder.ctx = facetogif.canvas.getContext('2d');

      //wait 4 seconds then record
      var count = facetogif.settings.countdown/1000;
      function countdown(){

        if(count > 1){ 
          $('#message-text').html('RECORDING IN <span id="count">'+(count-1)+'</span>');
          setTimeout(function(){ count--; countdown(); }, 1000); 
        }else{
          $('#message-text').html('<span id="count">GO!</span>');
        }
      }
      countdown();

      setTimeout(function(){
        $('#message').fadeOut(200);
        $('#indicator').fadeIn(200);
        $('#progress').animate({width: '100%'}, facetogif.settings.seconds);
        recorder.start();

        //todo .09
        var thresholdInterval = setInterval(function(){
          window.THRESHOLD += 0.09; 
        }, 100);
        
        //wait 3 seconds then compile
        console.log('compiling in 3...2...1');
        setTimeout(function(){
          clearInterval(thresholdInterval);

          // slow gpu like mac mini needs .4, fast gpu like mac pro needs .07
          // todo
          window.THRESHOLD = (Math.random()*.4)+0.5;
          window.USE_RGB_SHIFT = true;

          if(Math.random() > 0.5){
            window.USE_HUE_SHIFT = true;
          }else{
            window.USE_HUE_SHIFT = false;
          }

          $('#message-text').text('COMPILING!');
          $('#message').fadeIn(200);
          $('#indicator').fadeOut(200);
          
          recorder.pause();
          recorder.compile(function (blob) {
            var img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            img.dataset.blobindex = facetogif.blobs.push(blob) -1;
            img.dataset.framesindex = facetogif.frames.push(recorder.frames) -1;
            
            if($('#gifs-go-here').children('.image-container').length === 4){
              $('#gifs-go-here').children('.image-container').last().remove();
            }

            var $imageContainer = $('<div class="image-container"></div>');
            $imageContainer.append('<div class="post-id">UPLOADING...</div>');
            $imageContainer.append($(img));
            $imageContainer.prependTo('#gifs-go-here');
            $recordButton.attr('disabled', false);
            $('#progress').animate({width: '0%'}, 1000);
            $('#gifs-go-here').fadeIn(200);
            $('#message').fadeOut(200);
            $('#instructions').fadeIn(200);
            IS_READY = true;
            recorder.upload(blob, $imageContainer);
          });

        }, facetogif.settings.seconds);
      }, facetogif.settings.countdown);
    }

  });


} ());

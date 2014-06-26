(function () {
  "use strict";

  var CLIENT_ID = 'e7fc5d0dc23ff0f';
  var CLIENT_SECRET = '67a740439c88d83f96cbec52132e5eff179487ad';
  var REFRESH_TOKEN = '0c268661c830c809fc0cba712ffac091ac93917b';
  var ACCESS_TOKEN = '';
  var IS_READY = true;

  if(!localStorage['REFRESH_TOKEN']){ localStorage['REFRESH_TOKEN'] = REFRESH_TOKEN; }


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
        refresh_token: localStorage['REFRESH_TOKEN'],
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token'
      },
      success: function(result) {
        console.log('received new access token');
        console.log(result);
        localStorage['REFRESH_TOKEN'] = result.refresh_token;
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

  getNewAccessToken(null);

  var facetogif = {
    settings: { w: WIDTH, h: HEIGHT, framerate: 1000/10, seconds: 3000, countdown: 4000 },
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
          var imgData = renderer.domElement.toDataURL(); 
          var img = document.createElement("img");
          img.src = imgData;

          ctx.drawImage(img, 0, 0, facetogif.settings.w, facetogif.settings.h);
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
          type: 'base64'
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

    $('#record-button').click(function(){ if(IS_READY){ go(); } });
    $(window).keypress(function(){ if(IS_READY){ go(); } });

    function go(){
      IS_READY = false;
      var $recordButton = $(this);
      $recordButton.attr('disabled', true);
      $('#gifs-go-here').fadeOut(200);
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
        
        //wait 3 seconds then compile
        console.log('compiling in 3...2...1');
        setTimeout(function(){
          $('#message-text').text('COMPILING!');
          $('#message').fadeIn(200);
          $('#indicator').fadeOut(200);
          
          recorder.pause();
          recorder.compile(function (blob) {
            renderer.setSize(window.innerWidth, window.innerHeight);
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

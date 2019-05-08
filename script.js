let map;
let allMarkers = [];
let visibleMarkers = [];
let currentImage;

$(document).ready(function() {

  // detect if mobile device
  let md = new MobileDetect(window.navigator.userAgent);
  $('#prompt-mobile').hide();
  if (md.mobile()) {
    $('#prompt-mobile').hide();
  } else {
    $('#prompt-mobile').show();
  }

  // alert if using iOS device
  if (md.os() == "iOS") {
    alert('For iOS devices, uploading an image wipes the location data so this thing will break; Please go to Settings / Camera / Format and choose "Most Compatible". And dont forget to change it back once you are done.');
  }

  // initialize map
  mapboxgl.accessToken = 'pk.eyJ1IjoiY2FycmVmaW5obyIsImEiOiJjanV4cWYwYjUwNnhhNGVwb2RqcXMxc3V2In0.QNW2AgIDSRbGCsVPJsbATg';
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/carrefinho/cjvdw4xjz0lgi1fmx4cucsqo3',
    center: [-73.997332, 40.7308228],
    zoom: 12
  });
  map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true
  }));

  // get markers
  let initMarkerset = []
  $.ajax({
    url: '/photo-genic-fetch',
    type: 'post',
    success: async res => {
      let currentLoc;
      var getPosition = function (options) {
        return new Promise(function (resolve, reject) {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 2000,
          });
        });
      }
      getPosition()
      .then(response => {
        allMarkers = res;
        allMarkers.forEach(marker => {
          if (marker.loc != 'NO_LOC') {

            let distance = getDistanceFromLatLonInKm(response.coords.latitude, response.coords.longitude, marker.loc.lat, marker.loc.lon)
            if (distance < 1) {
              let el = document.createElement('div');
              el.id = marker.filename;
              el.className = 'marker marker-spawn';
              el.style.backgroundImage = "url('https://xl2616.itp.io/nm-final/" + marker.thumburl.substring(0) + "')";
              new mapboxgl.Marker(el)
                .setLngLat([marker.loc.lon, marker.loc.lat])
                .addTo(map);
              el.addEventListener('click', function(){
                displayImage(marker.url.substring(9), marker.filename);
              });
              visibleMarkers.push({
                element: el,
                url: marker.url,
                filename: marker.filename,
                voted: 0
              });
              if (!$('#image-view').hasClass('hidden')) {
                $('#image-view').addClass('hidden');
              }
            }
          }
        });
      });

    }
  })


  // image submission
  $('#image').on('change', function() {
    uploadImage($("#image")[0].files[0]);
  });

  function uploadImage(img) {
    let formData = new FormData();
    formData.append('imageupload', img);
    $.ajax({
      type: 'post',
      url: '/photo-genic-submit',
      data: formData,
      processData: false,
      contentType: false,
      success: function(res) {

        async function getLocation() {
          // get location of photo
          let getPosition = function (options) {
            return new Promise(function (resolve, reject) {
              navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });
          }

          let imagePos, gotLocation = false;
          if (res.loc != "NO_LOC"){
            imagePos = {
              coords: {
                latitude: res.loc.lat,
                longitude: res.loc.lon
              }
            };
            gotLocation = true;
          } else {
            if (confirm("Your image doens't have location data; use current location?")){
              imagePos = await getPosition();
              gotLocation = true;
            } else {
              gotLocation = false;
            }
          }

          if (gotLocation) {
            return Promise.resolve(imagePos);
          } else {
            return Promise.reject('no location data');
          }
        }

        getLocation()
        .then(response => {
          let el = document.createElement('div');
          el.id = res.filename;
          el.className = 'marker';
          el.style.backgroundImage = "url('https://xl2616.itp.io/nm-final/" + res.thumburl.substring(0) + "')";
          new mapboxgl.Marker(el)
            .setLngLat([response.coords.longitude, response.coords.latitude])
            .addTo(map);
          el.addEventListener('click', function(){
            displayImage(res.url.substring(9), res.filename);
          });
          visibleMarkers.push({
            element: el,
            url: res.url,
            filename: res.filename,
            voted: 0
          });
          if (!$('#image-view').hasClass('hidden')) {
            $('#image-view').addClass('hidden');
          }
        })
        .catch(err => alert(err));

      },
      error: function(err) {
        alert(err);
      }
    });
  }

  $('.vote').click(event => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    $.ajax({
      url: '/photo-genic-vote',
      type: 'post',
      data: {
        filename: currentImage,
        vote: event.target.id
      },
      success: () => {}
    });

    targetSelector = $(event.target).children();
    $(targetSelector[0]).removeClass('far').addClass('fas');
    $('button.vote').prop('disabled', true);
    if (event.target.id == 'upvote') {
      visibleMarkers.find(element => {return element.filename == currentImage}).voted = 1;
    } else {
      visibleMarkers.find(element => {return element.filename == currentImage}).voted = -1;
    }
  
  });

  $('#leaderboard-open').click(() => {
    $.ajax({
      url: '/photo-genic-fetch',
      type: 'post',
      success: res => {
          allMarkers = res;
          let sortedMarkers = allMarkers;
          for (let i = 0; i < sortedMarkers.length; i++) {
            for (let j = i+1; j < sortedMarkers.length; j++) {
              if (sortedMarkers[j].rating > sortedMarkers[i].rating) {
                let temp = sortedMarkers[i];
                sortedMarkers[i] = sortedMarkers[j];
                sortedMarkers[j] = temp;
              }
            }
          }
          let leaders = [];
          let leaderCount = 0;
          for (let i = 0; i < sortedMarkers.length; i++) {
            if (sortedMarkers[i].loc != "NO_LOC") {
              leaders.push(sortedMarkers[i]);
              leaderCount ++;
              if (leaderCount == 6) {
                break;
              }
            }
          }
          $('#leaderboard').removeClass('hidden');
          for (let i = 0; i < leaders.length; i++) {
            $("#" + i).attr("src", leaders[i].thumburl);
          }
          // $('#leaderboard-grid > img').click((event) => {
          //   displayImage(leaders[event.target.id].url.substring(9), leaders[event.target.id].filename);
          // })
          $('#leaderboard > label').click(() => {
            $('#leaderboard').addClass('hidden');
            $('#leaderboard-grid > img').attr("src", '');
          });
      }
    });
  })

});


function displayImage(url, filename) {
  $('#image-view').removeClass('hidden');
  $('#image > img').attr("src", 'https://xl2616.itp.io/nm-final/' + url);
  currentImage = filename;
  if (visibleMarkers.find(element => {return element.filename == currentImage}).voted === 1) {
    $('button.vote').prop('disabled', true);
    $('#upvote > i').removeClass('far').addClass('fas');
    $('#downvote > i').removeClass('fas').addClass('far');
  } else if (visibleMarkers.find(element => {return element.filename == currentImage}).voted === -1) {
    $('button.vote').prop('disabled', true);
    $('#upvote > i').removeClass('fas').addClass('far');
    $('#downvote > i').removeClass('far').addClass('fas');
  } else {
    $('button.vote').prop('disabled', false);
    $('#upvote > i').removeClass('fas').addClass('far');
    $('#downvote > i').removeClass('fas').addClass('far');
  }
  $('#image > img').click(() => {
    $('#image-view').addClass('hidden');
    $('#image > img').attr("src", '');
  });
}

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}





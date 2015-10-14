(function() {
  var map;
  var geocoder;
  var articleObject = {};
  var articles = {};
  var articleColors = {};
  var geojson;
  var selected = null;
  var filter = "none";
  var icon;
  var activeIcon;
  
  var resetMap = function() {
    articles = {};
    articleObject = {};
    articleColors = {};
    selected = null;
    hideArticle();
    map.remove();
    setupMap();
  }

  var resetMapZoom = function() {
    map.setView([21.505, -0.09], 3);
  }
  
  //sets up leaflet map on the page
  var setupMap = function() {
    document.getElementById('loadOverlay').style.display = 'block';
    // create a map in the "map" div, set the view to a given place and zoom
    map = L.map('map').setView([21.505, -0.09], 3);
    map.doubleClickZoom.disable();

    // add an OpenStreetMap tile layer
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    icon = L.icon({
      iconUrl: '../images/pin.png',
      iconRetinaUrl: 'pin.png',
      iconSize: [29, 39],
      iconAnchor: [14, 37],
      popupAnchor: [-3, -60]
    });
    activeIcon = L.icon({
      iconUrl: '../images/pin_active.png',
      iconRetinaUrl: 'pin_active.png',
      iconSize: [29, 39],
      iconAnchor: [14, 37],
      popupAnchor: [-3, -60]
    });

    
    function style(feature) {
        return {
            fillColor: '#d3d3d3',
            weight: 2,
            opacity: 1,
            color: 'gray',
            dashArray: '3',
            fillOpacity: 0.1
        };
    }
    
    function highlightFeature(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 3,
            fillColor: 'white',
            fillOpacity: 0.3
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
    }
    
    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }
    
    function resetHighlight(e) {
        geojson.resetStyle(e.target);
    }
    
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            // click: popupInfo,
            dblclick: zoomToFeature
        });
    }
    
    document.getElementById('loadOverlay').innerHTML = 'setting up map...';
    $.ajax({
      "type": "GET",
      "url": "./borders",
      "dataType": "json",
      "success": function(data) {
        geojson = L.geoJson(data, {style: style, onEachFeature: onEachFeature});
        geojson.addTo(map);
        grabNewsArticles(filter);
      }
    });
  };
  
  var getPopupInfo = function(country, articles) {
    var info = "<b>"+country+"</b><br>";
    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
         info += "<div class='article' id='article"+article['id']+"'>"+
                article['date'].substring(0,10)+"<br>" + "<b><a href='" + article['url'] + "' target='_blank'>" +
                article['title'] + "</a></b> <br> " + "Involved countries: " +
                article['countries'] + "<br>" +
                "Source: " + article['source'] + "</div><br>";
    }
    return info;
  }
  
  var highlightLine = function(id) {
    for (var articleID in articleObject) {
        if (articleID != id.toString()) {
            articleObject[articleID].setStyle({color:'gray', opacity:0.3});
        }
    }
    if ((id.toString() in articleObject)) {
        articleObject[id.toString()].setStyle({color:'red', weight:3, opacity:1}).bringToFront();
    }
  }
  
  var unHighlightLine = function(id) {
    for (var articleID in articleObject) {
        articleObject[articleID].setStyle({color:articleColors[articleID], weight:2,opacity:0.8});
    }
  }
  
  var showArticle = function(id) {
    document.getElementById("closepanel").style.display = "block";
    document.getElementById("contentcontainer").style.display = "block";
    if ((id.toString() in articles)) {
        document.getElementById("title").innerHTML = articles[id.toString()]['title'];
        document.getElementById("date").innerHTML = articles[id.toString()]['date'].substring(0, 10);
        document.getElementById("countries").innerHTML = "Involved countries: " + articles[id.toString()]['countries'];
        document.getElementById("content").innerHTML = articles[id.toString()]['summary'];
        document.getElementById("source").innerHTML = articles[id.toString()]['source'];    
    }
  }
  
  var hideArticle = function() {
    document.getElementById("contentcontainer").style.display = "none";
    document.getElementById("closepanel").style.display = "none";
    document.getElementById("title").innerHTML = "";
    document.getElementById("date").innerHTML = "";
    document.getElementById("countries").innerHTML = "";
    document.getElementById("content").innerHTML = "";
    document.getElementById("source").innerHTML = "";
  }
  
  var getRandomColor = function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  var putGeopyMarker = function(location, info) {
    var marker = L.marker(location).addTo(map)
        .bindPopup(info, {maxHeight: 300})
        .openPopup();

    if (icon && activeIcon) {
      marker.setIcon(icon);
      marker.on('mouseover', function(e){
        marker.setIcon(activeIcon);
      });
      marker.on('mouseout', function(e){
        marker.setIcon(icon);
      });
    }
  }
  
  //draw polyline connecting listLocs
  var makeConnections = function(listLocs, lineColor, id) {
    if (!lineColor) {
        lineColor = 'red';
    }
    if (listLocs.length > 0) {
        listLocs.push(listLocs[0]);
    }
    
    var polyline = L.polyline(listLocs, {color: lineColor, opacity: 0.8,weight:2});
    polyline.on('click', function(e){
        if (selected != null) {
          unHighlightLine(selected);
        }
        if (selected != id){
            showArticle(id);
            highlightLine(id);
            selected = id;
        } else {
            hideArticle();
            selected = null;
        }
    });
    polyline.on('mouseover', function(e){
        highlightLine(id);
    });
    polyline.on('mouseout', function(e){
        unHighlightLine(id);
        if (selected != null) {
            highlightLine(selected);
        }
    });
    
    polyline.addTo(map)
    return polyline;
  }
  
  var processNewsLocations = function(data) {
    $('loadOverlay').innerHTML = "placing markers...";
    for (var country in data) {
        var coords = data[country].shift();
        var text = getPopupInfo(country, data[country]);
        putGeopyMarker(coords, text);
        for (var i = 0; i < data[country].length; i++) {
            var article = data[country][i];
            // $('#filters').append(article['title']+" id "+article['id']);
            if (!(article['id'].toString() in articles)) {
                var color = getRandomColor();
                articles[article['id'].toString()] = article;
                articleColors[article['id'].toString()] = color;
                articleObject[article['id'].toString()] = makeConnections(article['countrycoords'], color, article['id'].toString());
            }
        }
    }
  }
  
  var grabNewsArticles = function(filter) {
    document.getElementById('loadOverlay').innerHTML = 'processing article data...';
    $.ajax({
      "type": "POST",
      "url": "./country-news",
      "data": {'filter':filter},
      "dataType": "json",
      "success": function(data) {
        processNewsLocations(data);
        document.getElementById('loadOverlay').innerHTML = '';
        document.getElementById('loadOverlay').style.display = 'none';
      }
    });
  }
  
  $(document).ready(function() { 
    setupMap();
    $(document.body).on('mouseenter', '.article' ,function(e){
        var id = e.target.getAttribute('id');
        if (id != null) {
            id = id.substring('article'.length, id.length);
            highlightLine(id);
        }
    });
    $(document.body).on('mouseleave', '.article' ,function(e){
        var id = e.target.getAttribute('id');
        if (id != null) {
            id = id.substring('article'.length, id.length);
            if (selected != id) {
              unHighlightLine(id);  
            }
            if (selected != null) {
                highlightLine(selected);
            }
        }
    });
    $(document.body).on('click', '.article' ,function(e){
        if (selected != null) {
          unHighlightLine(selected);
        }
        var id = e.target.getAttribute('id');
        id = id.substring('article'.length, id.length);
        if (selected != id){
            showArticle(id);
            highlightLine(id);
            selected = id;
        } else {
            hideArticle();
            selected = null;
        }
    });
    $("input[name=filter]:radio").change(function () {
        filter = $(this).val();
        resetMap();
    });
    $("#closepanel").on('click', function(e) {
        hideArticle();
    });
    $('#worldbutton').on('click', function(e) {
        resetMapZoom();
    });
  });
    
})();


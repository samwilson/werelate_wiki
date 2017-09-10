var map;
var markersArray = [];

function ShowMap() {

   // get map data
   var pedigreeData = getPedigreeData();
   var xmlDoc = parseXml(pedigreeData);
   var points = xmlDoc.documentElement.getElementsByTagName("p");

   // set map center and zoom level
   var pointsBounds = new google.maps.LatLngBounds(new google.maps.LatLng(points[0].getAttribute("a"), points[0].getAttribute("o")),
                                        new google.maps.LatLng(points[0].getAttribute("a"), points[0].getAttribute("o")));

   for (var i = 1; i < points.length; i++) {
   	var ll = new google.maps.LatLng(points[i].getAttribute("a"), points[i].getAttribute("o"));
   	pointsBounds.extend(ll);
   }
   var margin = 0.3;
   var ll = new google.maps.LatLng(pointsBounds.getSouthWest().lat(), pointsBounds.getSouthWest().lng() - margin);
   pointsBounds.extend(ll);
   var ll = new google.maps.LatLng(pointsBounds.getNorthEast().lat() + margin, pointsBounds.getNorthEast().lng() + margin);
   pointsBounds.extend(ll);
   var defaultZoom = 9;
    map = new google.maps.Map(document.getElementById("pedigreemap"), {
        center: pointsBounds.getCenter(),
        zoom: defaultZoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE
        }
    });
   google.maps.event.addListener(map, 'bounds_changed', function() {
        for (var i = defaultZoom-1; i >= 0; i--) {
            var bounds = map.getBounds();
            if (bounds.contains(pointsBounds.getNorthEast()) && bounds.contains(pointsBounds.getSouthWest())) {
            	break;
            }
            map.setZoom(i);
        }
        google.maps.event.clearListeners(map, 'bounds_changed');
    });

   addMapOverlays();
}

function parseXml(str) {
  if (window.ActiveXObject) {
    var doc = new ActiveXObject('Microsoft.XMLDOM');
    doc.loadXML(str);
    return doc;
  } else if (window.DOMParser) {
    return (new DOMParser).parseFromString(str, 'text/xml');
  }
}

function clearOverlays() {
    for (var i = 0; i < markersArray.length; i++ ) {
      markersArray[i].setMap(null);
    }
    markersArray.length = 0;
}

function addMapOverlays() {
   var latJitter = [0, 0, 0, 7, 7,-7,-7,  0,  0,14,14,-14,-14,  7,  7, -7, -7, 14,-14,  0,  0, 14, 14,-14,-14];
   var lngJitter = [0,-8, 8,-4, 4,-4, 4,-16, 16,-8, 8, -8,  8,-12, 12,-12, 12,  0,  0,-24, 24,-16, 16,-16, 16];
   var latJitterFactor = 0.05;
   var lngJitterFactor = 0.08;
   clearOverlays();

   // get map data
   var pedigreeData = getPedigreeData();
   var xmlDoc = new google.maps.Xml.parse(pedigreeData);
   var points = xmlDoc.documentElement.getElementsByTagName("p");
   var edges = xmlDoc.documentElement.getElementsByTagName("e");

   // setup base icons
//   var icons = {};
//   icons['b'] = {};
//   icons['m'] = {};
//   icons['d'] = {};
//   var baseBaseIcon = new google.maps.Icon();
//   baseBaseIcon.iconSize = new google.maps.Size(20, 32);
//   baseBaseIcon.iconAnchor = new google.maps.Point(10,31);
//   baseBaseIcon.infoWindowAnchor = new google.maps.Point(10, 2);
//   var baseIcon = new google.maps.Icon(baseBaseIcon);
//   baseIcon.shadow = "/w/skins/common/images/maps/lolly/shadow2.png";
//   baseIcon.shadowSize = new google.maps.Size(26,32);
//   baseIcon.transparent = "/w/skins/common/images/maps/lolly/transp.png";
//   icons['b']['base'] = baseIcon;
//   baseIcon = new google.maps.Icon(baseBaseIcon);
//   baseIcon.shadow = "/w/skins/common/images/maps/heart/shadow2.png";
//   baseIcon.shadowSize = new google.maps.Size(29,32);
//   baseIcon.transparent = "/w/skins/common/images/maps/heart/transp.png";
//   icons['m']['base'] = baseIcon;
//   baseIcon = new google.maps.Icon(baseBaseIcon);
//   baseIcon.shadow = "/w/skins/common/images/maps/grave/shadow2.png";
//   baseIcon.shadowSize = new google.maps.Size(25,32);
//   baseIcon.transparent = "/w/skins/common/images/maps/grave/transp.png";
//   icons['d']['base'] = baseIcon;

   // group points
   var groups = {};
   for (var i = 0; i < points.length; i++) {
      var point = points[i];
      var key = point.getAttribute("a") + '|' + point.getAttribute("o") + '|' + point.getAttribute("t") + '|' + point.getAttribute("c") + '|' + point.getAttribute("p");
      var event = {};
      event.name = point.getAttribute("n");
      event.url = point.getAttribute("u");
      event.date = point.getAttribute("d");
      event.dateKey = point.getAttribute("k");
      var len = (groups[key] ? groups[key].length : 0);
      if (len == 0) groups[key] = [];
      groups[key][len] = event;
   }

   var infoWindow = new google.maps.InfoWindow();

   // add points to map
   var pointCounts = [];
   for (var key in groups) {
      var events = groups[key];
      var fields = key.split('|');
      var lat = parseFloat(fields[0]);
      var lng = parseFloat(fields[1]);
   	var latLng = fields[0]+':'+fields[1];
   	var cnt = 0;
   	if (pointCounts[latLng]) {
   	   cnt = pointCounts[latLng];
   	}
   	else {
   	   pointCounts[latLng] = 0;
   	}
   	lat += latJitter[cnt] * latJitterFactor;
   	lng += lngJitter[cnt] * lngJitterFactor;
   	var type = fields[2];
   	var typeString = '';
   	if (type == 'b') {
   	   typeString = 'Births';
   	}
   	else if (type == 'm') {
   	   typeString = 'Marriages';
   	}
   	else if (type == 'd') {
   	   typeString = 'Deaths';
   	}
   	var point = new google.maps.Point(lng, lat);
   	var color = fields[3];
   	var html = '<center><b>'+typeString+' in '+fields[4]+'</b></center><br><table>';
   	events = events.sort(sortEvents);
   	for (var i = 0; i < events.length; i++) {
   	   var event = events[i];
   	   html += '<tr><td>' + event.date + '</td><td><a href="' + event.url + '">' + event.name + '</a></td></tr>';
   	}
   	html += '</table>';
//   	var icon;
//   	if (icons[type][color]) {
//   	   icon = icons[type][color];
//   	}
//   	else {
//   	   icon = createIcon(icons[type]['base'],type,color);
//   	   icons[type][color] = icon;
//   	}
    var icon = createIcon(type, color);
   	var marker = createMarker(map, html, icon);
   	if (addOverlay(marker, color)) {
     	   pointCounts[latLng]++;
   	}
   }

   // add edges to map
   for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var colors = edge.getAttribute("c").split('|');
      for (var c = 0; c < colors.length; c++) {
         var color = colors[c];
         var line = new google.maps.Polyline([new google.maps.LatLng(edge.getAttribute("a1"), edge.getAttribute("o1")),
                                   new google.maps.LatLng(edge.getAttribute("a2"), edge.getAttribute("o2"))],
                                  '#'+color, 4, 0.4);
         addOverlay(line, color);
      }
   }

   function addOverlay(overlay, color) {
      var cbId = 'checkbox'+color;
      var cb = document.getElementById(cbId);
      if (cb && cb.checked) {
          markersArray.push(overlay);
         return true;
      }
      return false;
   }

   function createMarker(map, html, icon) {
   	var marker = new google.maps.Marker({
        icon: icon,
        position: point,
        map: map
    });
   	html = '<div style="width:300px;">' + html + '</div>';
   	google.maps.event.addListener(marker, 'click', function() {
        infoWindow.setContent(html);
        infoWindow.open(map, marker);
   	});
   	return marker;
   }

	function sortEvents(a, b) {
		 var s1 = a.dateKey;
		 var s2 = b.dateKey
		 if (a.dateKey < b.dateKey) {
		    return -1;
		 }
		 else if (a.dateKey > b.dateKey) {
		    return 1;
		 }
		 return 0;
	};

	function createIcon(type, color) {
//      var icon = new google.maps.Icon(baseIcon);
   	var typeString = '';
   	if (type == 'b') {
   	   typeString = 'lolly';
   	}
   	else if (type == 'm') {
   	   typeString = 'heart';
   	}
   	else if (type == 'd') {
   	   typeString = 'grave';
   	}
//      icon.image = "/w/skins/common/images/maps/" + typeString + "/" + color + ".png";
//      icon.printImage = "/w/skins/common/images/maps/" + typeString + "/" + color + ".gif";
//      icon.mozPrintImage = "/w/skins/common/images/maps/" + typeString + "/" + color + ".gif";
      var icon = "/w/skins/common/images/maps/" + typeString + "/" + color + ".png";
      return icon;
	}
}

console.log("leafet-challenge here")

// Create a function that returns a color based on earthquake maginitue
// grabbed from https://leafletjs.com/examples/choropleth/
function getColor(mag) {
  return mag > 5  ? '#bd0026' :
         mag > 4  ? '#f03b20' :
         mag > 3  ? '#fd8d3c' :
         mag > 2  ? '#feb24c' :
         mag > 1  ? '#fed976' :
                    '#ffffb2' ;
}


// URL for All earthquakes from the Past 7 Days from the USGS
var queryURL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";


function createMap(circlesLayerGroup, polygonsLayerGroup) {

  // Create the streets tile layer
  var streetmap = L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token={accessToken}", {
    attribution: "Map data &copy; <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"http://mapbox.com\">Mapbox</a>",
    maxZoom: 18, 
    id: "mapbox.streets",
    accessToken: API_KEY
  });

    // Create the light tile layer, ignore the attribution
    var lightmap = L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/256/{z}/{x}/{y}?access_token={accessToken}", {
      attribution: "Map data &copy; <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"http://mapbox.com\">Mapbox</a>",
      maxZoom: 18,
      id: "mapbox.light",
      accessToken: API_KEY
    });
  
    // Create the dark tile layer, ignore the attribution
    var darkmap = L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}?access_token={accessToken}", {
      attribution: "Map data &copy; <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"http://mapbox.com\">Mapbox</a>",
      maxZoom: 18,
      id: "mapbox.dark",
      accessToken: API_KEY
    });
  
    // Create the satellite tile layer, ignore the attribution
    var satellitemap = L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token={accessToken}", {
      attribution: "Map data &copy; <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"http://mapbox.com\">Mapbox</a>",
      maxZoom: 18,
      id: "mapbox.satellite",
      accessToken: API_KEY
    });
  
    // Create the satellite tile layer, ignore the attribution
    var outdoorsmap = L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/256/{z}/{x}/{y}?access_token={accessToken}", {
      attribution: "Map data &copy; <a href=\"http://openstreetmap.org\">OpenStreetMap</a> contributors, <a href=\"http://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"http://mapbox.com\">Mapbox</a>",
      maxZoom: 18,
      id: "mapbox.outdoors",
      accessToken: API_KEY
    });
  
  // Create a baseMaps object to hold the lightmap layer
  var baseMaps = {
    "Street Map": streetmap,
    "Light Map": lightmap,
    "Dark Map": darkmap,
    "Satellite Map": satellitemap,
    "Outdoors Map": outdoorsmap
  };

  // Create an overlayMaps object to hold the bikeStations layer
  var overlayMaps = {
    "Earthquakes": circlesLayerGroup,
    "Techtonic Plates": polygonsLayerGroup
  };

  // Create the map object with options
  var map = L.map("map-id", {
    center: [39.8283, -98.5795],
    zoom: 3.2,
    layers: [streetmap, circlesLayerGroup, polygonsLayerGroup]
  });

  // Create a layer control, pass in the baseMaps and overlayMaps. Add the layer control to the map
  L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(map);

  // Create a control with a legend
  // grabbed from https://leafletjs.com/examples/choropleth/
  var legend = L.control({position: 'bottomright'});

  legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'info legend'),
          mags = [0, 1, 2, 3, 4, 5],
          labels = [];

      // loop through our density intervals and generate a label with a 
      // colored square for each interval
      for (var i = 0; i < mags.length; i++) {
          div.innerHTML +=
              '<i style="background:' + getColor(mags[i] + 1) + '"></i> ' +
              mags[i] + (mags[i + 1] ? '&ndash;' + mags[i + 1] + '<br>' : '+');
      }
      return div;
  };
  legend.addTo(map);
}

// A Leaflet layer group is created that consists of one layer.  This layer has circles that 
// are located at the particular latitude and longitude of an earthquake.  Circles contain 
// attibutes (size, color, popup display) that provide context for the earthquake.  
//
// This function receives an array of objects, each of which contain information for a single 
// earthquake.  Leaflet circles are built using the pertinent earthquake information from those
// earthquake objects. The layer group is built from an array of these circles.
function createCircleLayerGroup(earthquakes) {

  // Initialize an array to hold the Leaflet circles
  var earthquakeCircles = [];

  // Filter invalid earthquake data (mag > 10 or < 0)
  earthquakes = earthquakes.filter(earthquake => earthquake.properties.mag < 10)
  earthquakes = earthquakes.filter(earthquake => earthquake.properties.mag > 0)

  // Find the maximum and minimum earthquake magnitudes, which will be used for scaling
  magnitudeArray = earthquakes.map(earthquake => earthquake.properties.mag);
  maxMagnitude = Math.max.apply(Math, magnitudeArray); 
  minMagnitude = Math.min.apply(Math, magnitudeArray);

  // Loop through the earthquake array and build an array of Leaflet circles 
  earthquakes.forEach(function(earthquake){
    // USGS lists longitude before latitude -- go figure
    latlon = [earthquake.geometry.coordinates[1], earthquake.geometry.coordinates[0]];

    var properties = earthquake.properties  // focus on earthquake properties

    // USGS presents the time as a UNIX timestamp.  Convert to human readable date string.
    var date = new Date(properties.time).toLocaleDateString("en-US")

    // Build popup string
    popupString = "<h3>Place: " + properties.place +  "</h3>";
    popupString += "<h3>Date: " + date +  "</h3>";
    popupString += "<h3>Mag: " + properties.mag +  "</h3>";

    // For the current earthquake, create a circle and bind a popup with pertinent information
    var earthquakeCircle = L.circle(latlon, {
      fillOpacity: 0.75,
      color: getColor(properties.mag),
      fillcolor: "purple",
      radius: 20000 * properties.mag,
    }).bindPopup(popupString);

    // Add the circle to the earthquake circle array
    earthquakeCircles.push(earthquakeCircle);
  });

  return earthquakeCircles;
}

// A Leaflet layer group is created that consists of one layer.  This layer has polygons that 
// have corners that are located at the particular latitude and longitude along tectonic plate.
// Polygons contain a popup that displays the plate code and name.
//
// This function receives an array of objects, each of which contain information for a single 
// tectonic plate.  This information includes the coordinates of each polygon corner, the plate
// code, and the plate name. Leaflet polygons are built using coordinates from those plate objects.
function createPolygonLayerGroup(plates) {

  // Initialize an array to hold the Leaflet polygons
  var platePolygons = [];

  // Filter plate data that is neither a Polygon not MultiPolygon
  // var tmpPlates1 = plates.filter(plate => plate.geometry.type == "Polygon");
  // var tmpPlates2 = plates.filter(plate => plate.geometry.type == "MultiPolygon");
  // plates = tmpPlates1.concat(tmpPlates2);
  
  // Loop through the tectonic plate array and build an array of Leaflet polygons 
  plates.forEach(function(plate){
    // Build an array of coordinates for each plate.  
    var plateCoordinatesArray = [];
    
    // Three of the plates are multipolygons, which have multiple sets of coordinates, which will
    // be aggregated
    var plateCoordinatesSet = plate.geometry.coordinates;
    plateCoordinatesSet.forEach(function(coordinatesSet) {

      coordinatesSet.forEach(function(coordinates) {
        // The coordinates must be reversed to align wiht the Leaflet convention
        var reversedCoord = coordinates.reverse();
        plateCoordinatesArray.push(reversedCoord);  
      })
    });

    // console.log("plateCoordinatesArray");
    // console.log(plateCoordinatesArray);

    // Build the popup string
    popupString = "<h3>Plate code: " + plate.properties.Code +  "</h3>";
    popupString += "<h3>Plate name: " + plate.properties.PlateName +  "</h3>";

    // For the current techtonic plate, create a polygon and bind a popup with pertinent information
    var platePolygon = L.polygon(plateCoordinatesArray, {
      color: "orange",
      fillOpacity: 0.0
    }).bindPopup(popupString);

    // Add the polygon to the techtonic plate polygon array
    platePolygons.push(platePolygon);
  });

  return platePolygons;
}

// Start the script by fetching a JSON object from the USGS site, allowing for an error,
// and then fetch another JSON object from the local plate data, which is contained in
// the higher-level fetch block.  
//
// For each JSON object, create two separate layer groups, and then create a map using 
// those two layer groups.
//
// To insure that the map is created after both fetches are completed, the command to
// create the map is placed within the second fetch block.
d3.json(queryURL, function(error, response) {
  if (error) {
    return console.error(error);
  }

  // This response has an array of feature objects that contain earthquake data.
  var earthquakeDataArray = response.features;

  // That arrray is sent to createCircleLayerGroup(), which returns an array consisting 
  // of Leaflet circles for each feature object.
  var earthquakeCircles = createCircleLayerGroup(earthquakeDataArray);

  // Create a layer group made from the Leaflet circles. 
  var circlesLayerGroup = L.layerGroup(earthquakeCircles);

  // Fetch the plate JSON object
  d3.json("static/data/data.json", function(data) {
    // This response has an array of feature objects that contain plate data.
    var plateDataArray = data.features;

    // That arrray is sent to createPolygonLayerGroup(), which returns an array consisting
    // of Leaflet polygons for each feature object
    var platePolygons = createPolygonLayerGroup(plateDataArray);

    // Create a layer group made from the Leaflet circles. 
    var polygonsLayerGroup = L.layerGroup(platePolygons);

    // Create a map using the two layer groups
    createMap(circlesLayerGroup, polygonsLayerGroup);
  });
})
//   .catch(function(error) {
//     console.log(error);
// })
;

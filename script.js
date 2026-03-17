/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1Ijoia3RhbmRvcnkiLCJhIjoiY21rYmZhc2dqMDNqNzNlcHkwM2Z3cnAwMiJ9.GPIGSEiM53gRImZ-15RKkg'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'my-map', //Container id in HTML
    style: 'mapbox://styles/ktandory/cmmurs2ae004x01rx8zujb0kp',
    center: [-79.343, 43.721],  //Starting point, longitude/latitude
    zoom: 11 //Starting zoom level
});

/*--------------------------------------------------------------------
Steps 2 - 4: VIEW GEOJSON POINT DATA ON MAP, CREATE BOUNDING BOX AND HEXGRID, and AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//Fetch GeoJSON from URL and store response
let collisionData;

fetch('https://raw.githubusercontent.com/ktandory/Lab4/refs/heads/main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json())
    .then(response => {
        console.log(response); //Check response in console
        collisionData = response; //Store geojson as variable using URL from fetch response

        map.on('load', () => {
            let bboxresult = turf.bbox(collisionData); //Return array of bounding box coords using turf.bbox()
            console.log(bboxresult);

            let hexdata = turf.hexGrid(bboxresult, 0.5, { units: "kilometers" }); //Create hexgrid based on boudning box spatial limits
            console.log(hexdata);

            let collishex = turf.collect(hexdata, collisionData, "_id", "values"); //Collect all collisions within each hexagon using turf.collect()
            console.log(collishex);

            let maxcollisions = 0; //Initialize new variable to store max num of collisions in a given hexagon
            collishex.features.forEach((feature) => {
                feature.properties.COUNT = feature.properties.values.length; //Counts the num of collisions stored in the current hexagon using the length of the values array
                if (feature.properties.COUNT > maxcollisions) { // If the current hexagon count is greater than the current maximum, the maxcollisions variable is updated
                    maxcollisions = feature.properties.COUNT;
                }
            });
            console.log(maxcollisions);

            map.addSource('collisions', { //Adds collision point data as a GeoJSON
                type: 'geojson',
                data: collisionData
            });
            map.addLayer({ //Displays collision points as circles on the map
                id: 'collision-points',
                type: 'circle',
                source: 'collisions',
                paint: {
                    'circle-radius': 4,
                    'circle-opacity': 0.7
                }
            });

            map.addSource('collishexgrid', { //Adds a hexgrid with the aggregated collision data as a source
                type: 'geojson',
                data: collishex
            });

            map.addLayer({ //Displays hexgrid as polygons colored according to collision count
                id: 'collishexfill',
                type: 'fill',
                source: 'collishexgrid',
                paint: {
                    'fill-color': [
                        'step',
                        ['get', 'COUNT'],
                        '#ffffff', //Default color indicating no collision count
                        1, '#e9e971', //Yellow indicating low collision count 
                        5, '#e09743', //Orange indicating moderate collision count
                        10, '#cc3f14', //Red-Orange indicating moderately-high collision count
                        25,'#ff0000' // Red indicating high collision count
                    ],
                    'fill-opacity': 0.5
                },
                filter: ['!=', 'COUNT', 0] //Ensures only hexagons with at least one collision are displayed
            });

            map.addLayer({ //Adds outline to hexgrid polygons
                id: 'collishexoutline',
                type: 'line',
                source: 'collishexgrid',
                paint: {
                    'line-width': 1
                },
                filter: ['!=', 'COUNT', 0]
            });

            map.on('click', 'collishexfill', (e) => { //Click event adding pop-up window displaying collision count for a given hexagon
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML("<b>Collision count:</b> " + e.features[0].properties.COUNT)
                    .addTo(map);
            });
        });
    })
/*--------------------------------------------------------------------
Step 5: FINALIZE YOUR WEB MAP
--------------------------------------------------------------------*/
// Mapbox controls as elements -- Based on week 8 demo 2
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());
const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  countries: "ca"
});
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

// Array variables defined for labels and colors
const legend = document.getElementById('legend');
const legenditems = [
  { label: '1 - 4 collisions', colour: '#e9e971' },
  { label: '5 - 9 collisions', colour: '#e09743' },
  { label: '10 - 24 collisions', colour: '#cc3f14' },
  { label: '25+ collisions', colour: '#ff0000' }
];

//Create row to put the label and color in for each array item
legenditems.forEach(({ label, colour }) => {
  const row = document.createElement('div'); // Each item gets a 'row' as a div

  const colcircle = document.createElement('span'); // Create span for each color circle
  colcircle.className = 'legend-colcircle'; // colcircle will assume the shape and style properties defined in CSS
  colcircle.style.setProperty('--legendcolour', colour); // A custom property takes the color from the array and applies it to the CSS class

  const text = document.createElement('span'); // Create span for label text
  text.textContent = label;  // Set text variable to legend value in array

  row.append(colcircle, text); // Add circle and text to legend row
  legend.appendChild(row); // Add row to legend container
});

//Event Listener added to return map view to fullscreen on button click using flyTo method
document.getElementById('returnbutton').addEventListener('click', () => {
    map.flyTo({
        center: [-79.343, 43.721],
        zoom: 11,
        bearing: 0, //Reset rotation 
        pitch: 0, //Reset tilt
        essential: true
    });
});

//Change legend display (show/hide) based on checkbox
let legendcheck = document.getElementById('legendcheck');

legendcheck.addEventListener('click', () => {
    if (legendcheck.checked) {
        legendcheck.checked = true;
        legend.style.display = 'block';
    }
    else {
        legend.style.display = "none";
        legendcheck.checked = false;
    }
});

//Change collision point layer display (show/hide) based on checkbox using setLayoutProperty method
document.getElementById('pointscheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'collision-points',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

//Change hexagrid layer display (show/hide) based on checkbox using setLayoutProperty method
document.getElementById('hexcheck').addEventListener('change', (e) => {
    let visibility = e.target.checked ? 'visible' : 'none';
    map.setLayoutProperty('collishexfill', 'visibility', visibility);
    map.setLayoutProperty('collishexoutline', 'visibility', visibility);
});
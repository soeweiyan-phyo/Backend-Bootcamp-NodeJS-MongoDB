/* eslint-disable */

const locations = JSON.parse(document.getElementById("map").dataset.locations);
console.log(locations);

mapboxgl.accessToken =
  "pk.eyJ1Ijoic29ld2VpeWFuIiwiYSI6ImNreGtkbGk1ZzZtM2UybnJuYmZ6NGM3b3IifQ.bFYYVtclwa2Y1eh6KZbT8g";

var map = new mapboxgl.Map({
  // Will put the map on the element with the id of 'map'.
  container: "map",
  style: "mapbox://styles/soeweiyan/ckxkelv879ywh17pe2efv9qvp",
  scrollZoom: false
});

const bounds = new mapboxgl.LngLatBounds();

// Create markers and popups.
locations.forEach(loc => {
  // Create marker.
  const el = document.createElement("div");
  el.className = "marker";

  // Add marker.
  new mapboxgl.Marker({
    element: el,
    anchor: "bottom"
  })
    .setLngLat(loc.coordinates)
    .addTo(map);

  // Create and add popups.
  new mapboxgl.Popup({
    offset: 30
  })
    .setLngLat(loc.coordinates)
    .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
    .addTo(map);

  // Extend map bounds to include current location.
  bounds.extend(loc.coordinates);
});

map.fitBounds(bounds, {
  padding: {
    // in pixels.
    top: 200,
    bottom: 150,
    left: 100,
    right: 100
  }
});

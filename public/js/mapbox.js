/* eslint-disable */

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoidGFyd2luM3YiLCJhIjoiY2s1emcwbWhkMDFwZjNrbmxnamxqNnk1NSJ9.SIKUuOKp0dodcGIb2oIYCg';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/tarwin3v/ck5zg7c2q3j5n1jov172khp6l',
    scrollZoom: false
    /* center: [-118.113491, 34.111745],
  zoom: 8,
  interactive: true */
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    //TODO create marker
    const el = document.createElement('div');
    el.className = 'marker';

    //TODO add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    //TODO add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    //TODO extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: { top: 200, bottom: 200, left: 100, right: 100 }
  });
};

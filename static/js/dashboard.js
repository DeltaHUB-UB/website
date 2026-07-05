// Dashboard: measurement stations map (Leaflet + data/measurements.json)
(function () {
    var statusEl = document.getElementById('measurementsStatus');
    var mapEl = document.getElementById('measurementsMap');
    if (!mapEl || !window.L) return;

    fetch('data/measurements.json')
        .then(function (r) { return r.ok ? r.json() : { stations: [] }; })
        .then(function (payload) {
            var stations = (payload && payload.stations) || [];
            if (!stations.length) {
                if (statusEl) statusEl.textContent = 'No measurement data available.';
                return;
            }

            var map = L.map(mapEl).setView([stations[0].lat, stations[0].lon], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            stations.forEach(function (s) {
                var latest = (s.timeseries && s.timeseries.length)
                    ? s.timeseries[s.timeseries.length - 1] : null;
                var popup = '<strong>' + (s.name || s.id || 'Station') + '</strong>';
                if (latest) popup += '<br>Latest: ' + latest.level + ' ' + (s.unit || '');
                L.marker([s.lat, s.lon]).addTo(map).bindPopup(popup);
            });

            if (statusEl) {
                statusEl.textContent = stations.length + ' station' + (stations.length > 1 ? 's' : '') + ' loaded';
            }
        })
        .catch(function () {
            /* silent */
        });
})();

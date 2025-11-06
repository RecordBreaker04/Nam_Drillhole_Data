// ===== GLOBAL VARIABLES =====
let map;
let osm, satellite, terrain;
let measureControl;
let drawnItems;
let drawControl;
let isMeasureActive = false;
let isDrawActive = false;
let isSelectByPointActive = false;
let isSelectByPolygonActive = false;
let selectionLayer;
let wmsLayers = {};
let drillholeLayers = {};
let currentQueryResults = [];
let selectionDrawControl;

// Mineral groups configuration
const mineralGroups = [
    'Base Metals',
    'Base Metals & Precious Metals',
    'Base, Precious, Dimension & Industrial',
    'Fossil Fuels',
    'Industrial Minerals',
    'Nuclear Fuels',
    'Precious Stones',
    'Precious Metals'
];

// WMS layer configuration
const wmsLayerOptions = {
    format: 'image/png',
    transparent: true,
    version: '1.1.0'
};

// Namibia bounds
const namibiaBounds = [[-29.0, 11.7], [-16.9, 25.3]];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

function initializeApplication() {
    showWelcomeModal();
    initializeMap();
    initializeEventListeners();
    loadDrillholeData();
    initializeSearchToggle();
    initializeBasemapToggle();
    initializeLegendToggle();
}

// ===== MODAL FUNCTIONS =====
function showWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'flex';
}

function closeWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'none';
}

// ===== MAP INITIALIZATION =====
function initializeMap() {
    map = L.map('map', {
        zoomControl: false
    }).setView([-22.9576, 18.4904], 6);

    // Set bounds
    map.setMaxBounds(namibiaBounds);
    map.setMinZoom(5);
    map.on('drag', function() {
        map.panInsideBounds(namibiaBounds);
    });

    // Initialize base layers
    osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
    });

    // Add layer control
    L.control.layers({
        "OpenStreetMap": osm,
        "Satellite": satellite,
        "Terrain": terrain
    }).addTo(map);

    // Add map controls
    L.control.zoom({
        position: 'topright',
        zoomInText: '+',
        zoomOutText: '-'
    }).addTo(map);

    L.control.scale({position: 'bottomright', imperial: false}).addTo(map);

    // Initialize measurement control
    measureControl = L.control.measure({
        position: 'bottomleft',
        primaryLengthUnit: 'meters',
        secondaryLengthUnit: 'kilometers',
        primaryAreaUnit: 'sqmeters',
        secondaryAreaUnit: 'hectares',
        activeColor: '#4a6de5',
        completedColor: '#2d1462'
    });
    
    // Initialize draw control
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        },
        draw: {
            polygon: true,
            polyline: true,
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false
        }
    });

    // Initialize selection layer
    selectionLayer = new L.FeatureGroup();
    map.addLayer(selectionLayer);

    // Initialize WMS layers object
    wmsLayers = {
        roads: null,
        towns_villages: null,
        regions: null,
        districts: null,
        country: null,
        farms: null
    };

    // Add coordinate display
    map.on('mousemove', function(e) {
        document.getElementById('coordinatesMarker').textContent = 
            `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`;
    });
}

// ===== EVENT LISTENERS INITIALIZATION =====
function initializeEventListeners() {
    // Welcome modal
    document.getElementById('getStartedButton').addEventListener('click', closeWelcomeModal);

    // Sidebar toggle
    initializeSidebarToggle();

    // Tab functionality
    initializeTabSystem();

    // Layer toggles
    initializeLayerToggles();

    // Search functionality
    initializeSearchFunctionality();

    // Map controls
    initializeMapControls();

    // Drillhole data functionality
    initializeDrillholeDataFunctionality();

    // Map tools functionality
    initializeMapTools();

    // Modal functionality
    initializeModalFunctionality();

    // Draw events
    map.on(L.Draw.Event.CREATED, handleDrawEvent);
}

function initializeSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    let sidebarVisible = true;

    toggleBtn.addEventListener('click', function () {
        sidebarVisible = !sidebarVisible;
        if (sidebarVisible) {
            sidebar.classList.remove('collapsed');
            toggleBtn.classList.remove('collapsed');
            toggleBtn.querySelector('i').classList.remove('fa-chevron-right');
            toggleBtn.querySelector('i').classList.add('fa-chevron-left');
        } else {
            sidebar.classList.add('collapsed');
            toggleBtn.classList.add('collapsed');
            toggleBtn.querySelector('i').classList.remove('fa-chevron-left');
            toggleBtn.querySelector('i').classList.add('fa-chevron-right');
        }
    });
}

function initializeTabSystem() {
    document.querySelectorAll('.tab-bar button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-bar button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

function initializeLayerToggles() {
    // Mineral group layer toggles
    document.getElementById('toggleBaseMetals').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Base Metals', e.target.checked);
    });

    document.getElementById('toggleBaseMetalsPreciousMetals').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Base Metals & Precious Metals', e.target.checked);
    });

    document.getElementById('toggleBasePreciousDimensionIndustrial').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Base, Precious, Dimension & Industrial', e.target.checked);
    });

    document.getElementById('toggleFossilFuels').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Fossil Fuels', e.target.checked);
    });

    document.getElementById('toggleIndustrialMinerals').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Industrial Minerals', e.target.checked);
    });

    document.getElementById('toggleNuclearFuels').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Nuclear Fuels', e.target.checked);
    });

    document.getElementById('togglePreciousStones').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Precious Stones', e.target.checked);
    });

    document.getElementById('togglePreciousMetals').addEventListener('change', function(e) {
        toggleMineralGroupLayer('Precious Metals', e.target.checked);
    });

    // Boundary layer toggles
    document.getElementById('toggleRoads').addEventListener('change', function(e) {
        if (e.target.checked) {
            loadWMSLayer('roads');
        } else {
            removeWMSLayer('roads');
        }
    });

    document.getElementById('toggleTownsAndVillages').addEventListener('change', function(e) {
        if (e.target.checked) {
            loadWMSLayer('towns_villages');
        } else {
            removeWMSLayer('towns_villages');
        }
    });

    document.getElementById('toggleRegions').addEventListener('change', function(e) {
        if (e.target.checked) {
            loadWMSLayer('regions');
        } else {
            removeWMSLayer('regions');
        }
    });

    document.getElementById('toggleDistricts').addEventListener('change', function(e) {
        if (e.target.checked) {
            loadWMSLayer('districts');
        } else {
            removeWMSLayer('districts');
        }
    });

    document.getElementById('toggleCountry').addEventListener('change', function(e) {
        if (e.target.checked) {
            loadWMSLayer('country');
        } else {
            removeWMSLayer('country');
        }
    });

    document.getElementById('toggleFarms').addEventListener('change', function(e) {
        if (e.target.checked) {
            loadWMSLayer('farms');
        } else {
            removeWMSLayer('farms');
        }
    });
}

function initializeSearchFunctionality() {
    // Place search
    document.getElementById('searchButton').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Coordinate search
    document.getElementById('goToCoordinates').addEventListener('click', goToCoordinates);

    // Search tabs
    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.search-panel').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-search`).classList.add('active');
        });
    });
}

function initializeMapControls() {
    // Zoom controls
    document.getElementById('zoomIn').addEventListener('click', function() {
        map.zoomIn();
    });

    document.getElementById('zoomOut').addEventListener('click', function() {
        map.zoomOut();
    });

    document.getElementById('fullExtent').addEventListener('click', function() {
        map.fitBounds(namibiaBounds);
    });

    // Basemap switching
    document.querySelectorAll('.basemap-option').forEach(option => {
        option.addEventListener('click', function() {
            const basemap = this.getAttribute('data-basemap');
            switchBasemap(basemap);
            
            // Update UI
            document.querySelectorAll('.basemap-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Hide basemap selector after selection
            document.getElementById('basemapContent').style.display = 'none';
        });
    });
}

function initializeDrillholeDataFunctionality() {
    // Query execution
    document.getElementById('executeQuery').addEventListener('click', executeDrillholeQuery);

    // Clear query
    document.getElementById('clearQuery').addEventListener('click', function() {
        document.getElementById('queryBoreholeNumber').value = '';
        document.getElementById('queryProject').value = '';
        document.getElementById('queryEPL').value = '';
        document.getElementById('queryCompany').value = '';
        document.getElementById('queryMineralGroup').value = '';
        document.getElementById('resultsBody').innerHTML = '<tr><td colspan="15" style="text-align: center;">Execute a query to see results</td></tr>';
        currentQueryResults = [];
    });

    // Export functionality
    document.getElementById('exportExcel').addEventListener('click', function() {
        exportData('excel');
    });

    document.getElementById('exportCSV').addEventListener('click', function() {
        exportData('csv');
    });

    document.getElementById('exportMining').addEventListener('click', function() {
        exportData('mining');
    });

    document.getElementById('refreshData').addEventListener('click', function() {
        loadDrillholeData();
        document.getElementById('clearQuery').click();
    });
}

function initializeMapTools() {
    // Tool activation from map tools tab
    document.getElementById('activateMeasurement').addEventListener('click', function() {
        document.querySelector('.tab-bar button[data-tab="map"]').click();
        document.getElementById('measureTool').click();
    });

    document.getElementById('activateDrawing').addEventListener('click', function() {
        document.querySelector('.tab-bar button[data-tab="map"]').click();
        document.getElementById('drawPolygon').click();
    });

    document.getElementById('activateLayerManager').addEventListener('click', function() {
        alert('Layer management feature would open here.');
    });

    document.getElementById('activateAdvancedSearch').addEventListener('click', function() {
        alert('Advanced search feature would open here.');
    });

    document.getElementById('activateExport').addEventListener('click', function() {
        alert('Map export feature would open here.');
    });

    document.getElementById('activateBookmarks').addEventListener('click', function() {
        alert('Spatial bookmarks feature would open here.');
    });
}

function initializeModalFunctionality() {
    // Modal triggers
    document.getElementById('registerButton').addEventListener('click', function() {
        document.getElementById('registerModal').style.display = 'flex';
    });

    document.getElementById('helpButton').addEventListener('click', function() {
        document.getElementById('helpModal').style.display = 'flex';
    });

    document.getElementById('contactButton').addEventListener('click', function() {
        document.getElementById('contactModal').style.display = 'flex';
    });

    document.getElementById('loginButton').addEventListener('click', function() {
        document.getElementById('loginModal').style.display = 'flex';
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Form submissions
    document.getElementById('contactForm').addEventListener('submit', handleContactForm);
    document.getElementById('loginForm').addEventListener('submit', handleLoginForm);
    document.getElementById('registerForm').addEventListener('submit', handleRegisterForm);

    // Role selection
    document.querySelectorAll('.role-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// ===== SEARCH TOGGLE FUNCTIONALITY =====
function initializeSearchToggle() {
    const searchToggle = document.getElementById('searchToggle');
    const searchContent = document.getElementById('searchContent');
    
    searchToggle.addEventListener('click', function() {
        searchContent.style.display = searchContent.style.display === 'none' ? 'block' : 'none';
    });
    
    document.addEventListener('click', function(event) {
        const searchBox = document.getElementById('searchBox');
        if (!searchBox.contains(event.target)) {
            searchContent.style.display = 'none';
        }
    });
}

// ===== BASEMAP TOGGLE FUNCTIONALITY =====
function initializeBasemapToggle() {
    const basemapToggle = document.getElementById('basemapToggle');
    const basemapContent = document.getElementById('basemapContent');
    
    basemapToggle.addEventListener('click', function() {
        basemapContent.style.display = basemapContent.style.display === 'none' ? 'block' : 'none';
    });
    
    document.addEventListener('click', function(event) {
        const basemapSelector = document.getElementById('basemapSelector');
        if (!basemapSelector.contains(event.target)) {
            basemapContent.style.display = 'none';
        }
    });
}

// ===== LEGEND TOGGLE FUNCTIONALITY =====
function initializeLegendToggle() {
    const legendToggle = document.getElementById('legendToggle');
    const legendContent = document.getElementById('legendContent');
    
    legendToggle.addEventListener('click', function() {
        legendContent.style.display = legendContent.style.display === 'none' ? 'block' : 'none';
        legendToggle.querySelector('i').classList.toggle('fa-chevron-down');
        legendToggle.querySelector('i').classList.toggle('fa-chevron-up');
    });
}

// ===== SEARCH FUNCTIONS =====
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        alert('Please enter a location to search for.');
        return;
    }
    
    showLoading();
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Namibia')}&limit=5`)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.length > 0) {
                const result = data[0];
                map.setView([result.lat, result.lon], 12);
                
                // Clear previous markers
                if (window.searchMarker) {
                    map.removeLayer(window.searchMarker);
                }
                
                // Add marker for the search result
                window.searchMarker = L.marker([result.lat, result.lon]).addTo(map)
                    .bindPopup(`<b>${result.display_name}</b>`)
                    .openPopup();
            } else {
                alert('Location not found. Please try a different search term.');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Search error:', error);
            alert('Search failed. Please try again.');
        });
}

function goToCoordinates() {
    const lat = parseFloat(document.getElementById('latitudeInput').value);
    const lng = parseFloat(document.getElementById('longitudeInput').value);
    
    if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid numeric coordinates.');
        return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('Please enter valid coordinates: Latitude (-90 to 90), Longitude (-180 to 180).');
        return;
    }
    
    map.setView([lat, lng], 12);
    
    // Clear previous markers
    if (window.searchMarker) {
        map.removeLayer(window.searchMarker);
    }
    
    // Add marker for the coordinate
    window.searchMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>Lat:</b> ${lat}, <b>Lng:</b> ${lng}`)
        .openPopup();
}

// ===== BASEMAP FUNCTIONS =====
function switchBasemap(basemap) {
    // Remove all basemaps
    map.removeLayer(osm);
    map.removeLayer(satellite);
    map.removeLayer(terrain);
    
    // Add the selected basemap
    if (basemap === 'osm') {
        osm.addTo(map);
    } else if (basemap === 'satellite') {
        satellite.addTo(map);
    } else if (basemap === 'terrain') {
        terrain.addTo(map);
    }
}

// ===== WMS LAYER MANAGEMENT =====
function loadWMSLayer(layerName) {
    showLoading();
    
    try {
        // Remove existing layer if it exists
        if (wmsLayers[layerName]) {
            map.removeLayer(wmsLayers[layerName]);
        }
        
        // Create new WMS layer
        wmsLayers[layerName] = L.tileLayer.wms('http://localhost:8080/geoserver/drillholes/wms', {
            ...wmsLayerOptions,
            layers: `drillholes:${layerName}`
        });
        
        // Add layer to map
        wmsLayers[layerName].addTo(map);
        hideLoading();
        updateLegend();
        
        console.log(`Successfully loaded WMS layer: ${layerName}`);
    } catch (error) {
        console.error(`Error loading WMS layer ${layerName}:`, error);
        alert(`Failed to load ${layerName} data. Please check if GeoServer is running and the layer exists.`);
        hideLoading();
        
        // Uncheck the checkbox since loading failed
        const checkboxId = `toggle${layerName.charAt(0).toUpperCase() + layerName.slice(1).replace(/_([a-z])/g, (match, p1) => p1.toUpperCase())}`;
        if (document.getElementById(checkboxId)) {
            document.getElementById(checkboxId).checked = false;
        }
    }
}

function removeWMSLayer(layerName) {
    if (wmsLayers[layerName]) {
        map.removeLayer(wmsLayers[layerName]);
        wmsLayers[layerName] = null;
        updateLegend();
    }
}

// ===== DRILLHOLE DATA FUNCTIONS =====
function loadDrillholeData() {
    showLoading();
    
    const wfsUrl = 'http://localhost:8080/geoserver/drillholes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drillholes:boreholes&outputFormat=application/json';
    
    fetch(wfsUrl)
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            processDrillholeData(data);
            hideLoading();
        })
        .catch(err => {
            console.error('Error loading drillhole data:', err);
            alert('Failed to load drillhole data. Please check if GeoServer is running.');
            hideLoading();
            
            // Load sample data for demonstration
            loadSampleData();
        });
}

function processDrillholeData(data) {
    // Clear existing layers
    Object.values(drillholeLayers).forEach(layer => {
        if (layer) map.removeLayer(layer);
    });
    drillholeLayers = {};

    // Create empty layers for all mineral groups first
    mineralGroups.forEach(group => {
        drillholeLayers[group] = L.layerGroup();
    });

    // Counter to track how many features are assigned to each group
    const groupCounts = {};
    mineralGroups.forEach(group => groupCounts[group] = 0);

    // Process features and add them to appropriate layers
    if (data && data.features) {
        console.log(`Processing ${data.features.length} features from GeoServer`);
        
        data.features.forEach(feature => {
            const rawMineralGroup = feature.properties.mineral_groups;
            const standardGroup = getStandardMineralGroupName(rawMineralGroup);
            
            if (standardGroup && drillholeLayers[standardGroup]) {
                const marker = L.circleMarker(
                    [feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 
                    {
                        radius: 4,
                        fillColor: getColorForMineralGroup(standardGroup),
                        color: '#000',
                        weight: 0.5,
                        opacity: 0.8,
                        fillOpacity: 0.7
                    }
                );
                
                const props = feature.properties;
                marker.bindPopup(`
                    <b>Borehole:</b> ${props.borehole_number || 'N/A'}<br>
                    <b>Project:</b> ${props.project || 'N/A'}<br>
                    <b>Mineral Group:</b> ${props.mineral_groups || 'N/A'}<br>
                    <b>Company:</b> ${props.company || 'N/A'}<br>
                    <b>EPL:</b> ${props.epl || 'N/A'}
                `);
                
                drillholeLayers[standardGroup].addLayer(marker);
                groupCounts[standardGroup]++;
            }
        });

        console.log('Mineral group feature counts:', groupCounts);
    }

    // Add layers to map if the corresponding checkbox is checked
    mineralGroups.forEach(group => {
        const checkboxId = getCheckboxIdForMineralGroup(group);
        if (document.getElementById(checkboxId) && document.getElementById(checkboxId).checked) {
            map.addLayer(drillholeLayers[group]);
        }
    });
    
    updateLegend();
}

function loadSampleData() {
    const sampleData = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {
                    borehole_number: 'DH-001',
                    project: 'Otjihase Project',
                    mineral_groups: 'Base Metals',
                    company: 'Namibian Mines Ltd',
                    epl: 'EPL-1234',
                    location_accuracy: 'High',
                    map_sheet: '2316',
                    commodity: 'Copper',
                    exploration_target: 'Porphyry copper',
                    purpose: 'Exploration',
                    coreshed_availability: 'Yes',
                    project_region: 'Central',
                    type: 'Diamond'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [17.0678, -22.5600]
                }
            },
            {
                type: 'Feature',
                properties: {
                    borehole_number: 'DH-002',
                    project: 'Navachab Mine',
                    mineral_groups: 'Precious Metals',
                    company: 'AngloGold',
                    epl: 'EPL-5678',
                    location_accuracy: 'Medium',
                    map_sheet: '2317',
                    commodity: 'Gold',
                    exploration_target: 'Shear zone',
                    purpose: 'Resource definition',
                    coreshed_availability: 'No',
                    project_region: 'Erongo',
                    type: 'RC'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [17.1234, -21.5678]
                }
            }
        ]
    };
    
    processDrillholeData(sampleData);
}

// ===== MINERAL GROUP HELPER FUNCTIONS =====
function normalizeMineralGroupName(name) {
    if (!name) return '';
    return name.toString().trim().toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*&\s*/g, ' & ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s*-\s*/g, '-');
}

function getStandardMineralGroupName(inputName) {
    if (!inputName) return null;
    
    const normalizedInput = normalizeMineralGroupName(inputName);
    
    // Try exact match first
    for (const group of mineralGroups) {
        if (normalizeMineralGroupName(group) === normalizedInput) {
            return group;
        }
    }
    
    // Try partial matches for common variations
    for (const group of mineralGroups) {
        const normalizedGroup = normalizeMineralGroupName(group);
        
        if (normalizedInput.includes(normalizedGroup) || normalizedGroup.includes(normalizedInput)) {
            console.log(`Matched "${inputName}" to standard group "${group}"`);
            return group;
        }
    }
    
    console.warn(`Could not match mineral group: "${inputName}"`);
    return null;
}

function getCheckboxIdForMineralGroup(group) {
    const groupMap = {
        'Base Metals': 'toggleBaseMetals',
        'Base Metals & Precious Metals': 'toggleBaseMetalsPreciousMetals',
        'Base, Precious, Dimension & Industrial': 'toggleBasePreciousDimensionIndustrial',
        'Fossil Fuels': 'toggleFossilFuels',
        'Industrial Minerals': 'toggleIndustrialMinerals',
        'Nuclear Fuels': 'toggleNuclearFuels',
        'Precious Stones': 'togglePreciousStones',
        'Precious Metals': 'togglePreciousMetals'
    };
    
    return groupMap[group] || '';
}

function getColorForMineralGroup(group) {
    const colors = {
        'Base Metals': '#1f78b4',
        'Base Metals & Precious Metals': '#a6cee3',
        'Base, Precious, Dimension & Industrial': '#b2df8a',
        'Fossil Fuels': '#000000',
        'Industrial Minerals': '#ffb200',
        'Nuclear Fuels': '#f45b1d',
        'Precious Stones': '#e31a1c',
        'Precious Metals': '#fdbf6f',
        'Unknown': '#888888'
    };
    
    return colors[group] || '#888888';
}

function toggleMineralGroupLayer(groupName, isChecked) {
    if (drillholeLayers[groupName]) {
        if (isChecked) {
            map.addLayer(drillholeLayers[groupName]);
        } else {
            map.removeLayer(drillholeLayers[groupName]);
        }
        updateLegend();
    }
}

// ===== LEGEND FUNCTIONS =====
function updateLegend() {
    const legend = document.getElementById('legend');
    const legendContent = document.getElementById('legendContent');
    let content = '';
    
    let hasVisibleLayers = false;

    // Add mineral groups to legend
    mineralGroups.forEach(group => {
        if (drillholeLayers[group] && map.hasLayer(drillholeLayers[group])) {
            content += `<div class="legend-item">
                <div class="legend-color" style="background-color: ${getColorForMineralGroup(group)}"></div>
                <span>${group}</span>
            </div>`;
            hasVisibleLayers = true;
        }
    });

    // Add WMS layers to legend
    const wmsLayerNames = {
        'roads': 'Roads',
        'towns_villages': 'Towns and Villages', 
        'regions': 'Regions',
        'districts': 'Districts',
        'country': 'Country Border',
        'farms': 'Farms'
    };

    Object.entries(wmsLayers).forEach(([layerName, layer]) => {
        if (layer && map.hasLayer(layer)) {
            const displayName = wmsLayerNames[layerName] || layerName;
            const color = getWMSLayerColor(layerName);
            
            content += `<div class="legend-item">
                <div class="legend-color" style="background-color: ${color}"></div>
                <span>${displayName}</span>
            </div>`;
            hasVisibleLayers = true;
        }
    });

    if (hasVisibleLayers) {
        legend.style.display = 'block';
        legendContent.innerHTML = content;
    } else {
        legend.style.display = 'none';
    }
}

function getWMSLayerColor(layerName) {
    const colors = {
        'roads': '#ff0000',
        'towns_villages': '#00ff00',
        'regions': '#888888', 
        'districts': '#666666',
        'country': '#000000',
        'farms': '#8B4513'
    };
    return colors[layerName] || '#888888';
}

// ===== DRILLHOLE QUERY FUNCTIONS =====
function executeDrillholeQuery() {
    const boreholeNumber = document.getElementById('queryBoreholeNumber').value.trim();
    const project = document.getElementById('queryProject').value.trim();
    const epl = document.getElementById('queryEPL').value.trim();
    const company = document.getElementById('queryCompany').value.trim();
    const mineralGroup = document.getElementById('queryMineralGroup').value;
    
    if (!boreholeNumber && !project && !epl && !company && !mineralGroup) {
        alert('Please specify at least one search criteria to query drillhole data.');
        return;
    }
    
    showLoading();
    
    let wfsUrl = 'http://localhost:8080/geoserver/drillholes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drillholes:boreholes&outputFormat=application/json';
    
    let filters = [];
    if (boreholeNumber) filters.push(`borehole_number LIKE '%${boreholeNumber}%'`);
    if (project) filters.push(`project LIKE '%${project}%'`);
    if (epl) filters.push(`epl LIKE '%${epl}%'`);
    if (company) filters.push(`company LIKE '%${company}%'`);
    if (mineralGroup) {
        filters.push(`mineral_groups LIKE '%${mineralGroup}%'`);
    }
    
    if (filters.length > 0) {
        wfsUrl += `&CQL_FILTER=${encodeURIComponent(filters.join(' AND '))}`;
    }
    
    fetch(wfsUrl)
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            const formattedData = data.features.map(feature => {
                const props = feature.properties;
                return {
                    boreholeNumber: props.borehole_number || 'N/A',
                    project: props.project || 'N/A',
                    epl: props.epl || 'N/A',
                    longitude: feature.geometry?.coordinates[0] || 'N/A',
                    latitude: feature.geometry?.coordinates[1] || 'N/A',
                    locationAccuracy: props.location_accuracy || 'N/A',
                    mapSheet: props.map_sheet || 'N/A',
                    company: props.company || 'N/A',
                    mineralGroups: props.mineral_groups || 'N/A',
                    commodity: props.commodity || 'N/A',
                    explorationTarget: props.exploration_target || 'N/A',
                    purpose: props.purpose || 'N/A',
                    coreshedAvailability: props.coreshed_availability || 'N/A',
                    projectRegion: props.project_region || 'N/A',
                    type: props.type || 'N/A'
                };
            });
            
            currentQueryResults = formattedData;
            displayQueryResults(formattedData);
            hideLoading();
        })
        .catch(err => {
            console.error('Error querying drillhole data:', err);
            alert('Failed to query drillhole data. Using demo data instead.');
            
            const demoData = [
                { 
                    boreholeNumber: "DH-001", 
                    project: "Otjihase", 
                    epl: "EPL-1234",
                    longitude: 17.5678,
                    latitude: -22.1234,
                    locationAccuracy: "High",
                    mapSheet: "2316",
                    company: "Namibian Mines",
                    mineralGroups: "Base Metals",
                    commodity: "Copper",
                    explorationTarget: "Porphyry copper",
                    purpose: "Exploration",
                    coreshedAvailability: "Yes",
                    projectRegion: "Central",
                    type: "Diamond"
                }
            ];
            
            currentQueryResults = demoData;
            displayQueryResults(demoData);
            hideLoading();
        });
}

function displayQueryResults(data) {
    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';
    
    if (data.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="15" style="text-align: center;">No results found</td></tr>';
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.boreholeNumber}</td>
            <td>${item.project}</td>
            <td>${item.epl}</td>
            <td>${item.longitude}</td>
            <td>${item.latitude}</td>
            <td>${item.locationAccuracy}</td>
            <td>${item.mapSheet}</td>
            <td>${item.company}</td>
            <td>${item.mineralGroups}</td>
            <td>${item.commodity}</td>
            <td>${item.explorationTarget}</td>
            <td>${item.purpose}</td>
            <td>${item.coreshedAvailability}</td>
            <td>${item.projectRegion}</td>
            <td>${item.type}</td>
        `;
        resultsBody.appendChild(row);
    });
}

// ===== EXPORT FUNCTIONS =====
function exportData(format) {
    if (currentQueryResults.length === 0) {
        alert('No data to export. Please execute a query first.');
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        let fileContent, mimeType, fileName;
        
        if (format === 'csv') {
            fileContent = convertToCSV(currentQueryResults);
            mimeType = 'text/csv';
            fileName = 'drillhole_data.csv';
        } else if (format === 'excel') {
            fileContent = convertToExcel(currentQueryResults);
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            fileName = 'drillhole_data.xlsx';
        } else if (format === 'mining') {
            fileContent = convertToMiningFormat(currentQueryResults);
            mimeType = 'text/plain';
            fileName = 'drillhole_data.txt';
        }
        
        downloadFile(fileContent, fileName, mimeType);
        alert(`Data exported successfully in ${format.toUpperCase()} format.`);
        hideLoading();
    }, 1000);
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

function convertToExcel(data) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Drillhole Data");
    return XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
}

function convertToMiningFormat(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    let output = headers.join(' | ') + '\n';
    output += '-'.repeat(output.length) + '\n';
    
    for (const row of data) {
        const values = headers.map(header => row[header]);
        output += values.join(' | ') + '\n';
    }
    
    return output;
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== MAP TOOLS FUNCTIONS =====
function deactivateAllTools() {
    // Remove measure control
    if (isMeasureActive) {
        map.removeControl(measureControl);
        isMeasureActive = false;
        document.getElementById('measureTool').classList.remove('active');
    }
    
    // Remove draw control
    if (isDrawActive) {
        map.removeControl(drawControl);
        isDrawActive = false;
        document.getElementById('drawPolygon').classList.remove('active');
        document.getElementById('drawPolyline').classList.remove('active');
    }
    
    // Deactivate selection tools
    if (isSelectByPointActive || isSelectByPolygonActive) {
        map.off('click', handlePointSelection);
        if (selectionDrawControl) {
            map.removeControl(selectionDrawControl);
            selectionDrawControl = null;
        }
        isSelectByPointActive = false;
        isSelectByPolygonActive = false;
        document.getElementById('selectByPoint').classList.remove('active');
        document.getElementById('selectByPolygon').classList.remove('active');
    }
}

// Measure tool
document.getElementById('measureTool').addEventListener('click', function() {
    if (isMeasureActive) {
        deactivateAllTools();
    } else {
        deactivateAllTools();
        measureControl.addTo(map);
        isMeasureActive = true;
        this.classList.add('active');
    }
});

// Drawing tools
document.getElementById('drawPolygon').addEventListener('click', function() {
    if (isDrawActive) {
        deactivateAllTools();
    } else {
        deactivateAllTools();
        drawControl.options.draw.polygon = true;
        drawControl.options.draw.polyline = false;
        drawControl.addTo(map);
        isDrawActive = true;
        this.classList.add('active');
    }
});

document.getElementById('drawPolyline').addEventListener('click', function() {
    if (isDrawActive) {
        deactivateAllTools();
    } else {
        deactivateAllTools();
        drawControl.options.draw.polygon = false;
        drawControl.options.draw.polyline = true;
        drawControl.addTo(map);
        isDrawActive = true;
        this.classList.add('active');
    }
});

// Location finder
document.getElementById('findMyLocation').addEventListener('click', function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (lat >= -29.0 && lat <= -16.9 && lng >= 11.7 && lng <= 25.3) {
                map.setView([lat, lng], 12);
                
                if (window.locationMarker) {
                    map.removeLayer(window.locationMarker);
                }
                
                window.locationMarker = L.marker([lat, lng]).addTo(map)
                    .bindPopup('<b>Your Current Location</b>')
                    .openPopup();
            } else {
                alert('Your location is outside Namibia. Centering on Windhoek instead.');
                map.setView([-22.5609, 17.0658], 12);
            }
        }, function(error) {
            console.error('Error getting location:', error);
            alert('Unable to retrieve your location. Please ensure location services are enabled.');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
});

// Selection tools
document.getElementById('selectByPoint').addEventListener('click', function() {
    if (isSelectByPointActive) {
        deactivateAllTools();
    } else {
        deactivateAllTools();
        isSelectByPointActive = true;
        this.classList.add('active');
        
        map.on('click', handlePointSelection);
    }
});

function handlePointSelection(e) {
    const point = e.latlng;
    
    queryFeaturesByGeometry({
        type: 'Point',
        coordinates: [point.lng, point.lat]
    });
}

document.getElementById('selectByPolygon').addEventListener('click', function() {
    if (isSelectByPolygonActive) {
        deactivateAllTools();
    } else {
        deactivateAllTools();
        isSelectByPolygonActive = true;
        this.classList.add('active');
        
        selectionDrawControl = new L.Control.Draw({
            draw: {
                polygon: {
                    shapeOptions: {
                        color: '#3388ff',
                        fillColor: '#3388ff',
                        fillOpacity: 0.2
                    }
                },
                polyline: false,
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false
            },
            edit: false
        });
        
        map.addControl(selectionDrawControl);
        
        map.on(L.Draw.Event.CREATED, function (e) {
            const layer = e.layer;
            const polygon = layer.toGeoJSON();
            
            queryFeaturesByGeometry(polygon.geometry);
            
            map.removeControl(selectionDrawControl);
            selectionDrawControl = null;
            isSelectByPolygonActive = false;
            document.getElementById('selectByPolygon').classList.remove('active');
        });
    }
});

function queryFeaturesByGeometry(geometry) {
    showLoading();
    
    const wfsUrl = 'http://localhost:8080/geoserver/drillholes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drillholes:boreholes&outputFormat=application.json';
    
    const bbox = getBoundingBox(geometry);
    const bboxFilter = `&bbox=${bbox.join(',')}`;
    
    fetch(wfsUrl + bboxFilter)
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            selectionLayer.clearLayers();
            
            data.features.forEach(feature => {
                const layer = L.geoJSON(feature, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 8,
                            fillColor: '#ff0000',
                            color: '#000',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    }
                });
                
                selectionLayer.addLayer(layer);
            });
            
            alert(`Found ${data.features.length} features in the selected area.`);
            hideLoading();
        })
        .catch(err => {
            console.error('Error querying features:', err);
            alert('Failed to query features. Please check if GeoServer is running.');
            hideLoading();
        });
}

function getBoundingBox(geometry) {
    if (geometry.type === 'Point') {
        const buffer = 0.01;
        return [
            geometry.coordinates[0] - buffer,
            geometry.coordinates[1] - buffer,
            geometry.coordinates[0] + buffer,
            geometry.coordinates[1] + buffer
        ];
    } else if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates[0];
        let minLng = coords[0][0], maxLng = coords[0][0];
        let minLat = coords[0][1], maxLat = coords[0][1];
        
        coords.forEach(coord => {
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
        });
        
        return [minLng, minLat, maxLng, maxLat];
    }
    
    return [11.7, -29.0, 25.3, -16.9];
}

// Clear map
document.getElementById('clearMap').addEventListener('click', function() {
    drawnItems.clearLayers();
    selectionLayer.clearLayers();
    
    if (window.searchMarker) {
        map.removeLayer(window.searchMarker);
        window.searchMarker = null;
    }
    
    if (window.locationMarker) {
        map.removeLayer(window.locationMarker);
        window.locationMarker = null;
    }
    
    document.getElementById('measurementResult').style.display = 'none';
    map.fitBounds(namibiaBounds);
});

// Draw event handler
function handleDrawEvent(e) {
    const type = e.layerType;
    const layer = e.layer;
    
    drawnItems.addLayer(layer);
    
    if (type === 'polygon') {
        const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        const areaKm = area / 1000000;
        document.getElementById('measurementResult').textContent = `Area: ${areaKm.toFixed(2)} km²`;
        document.getElementById('measurementResult').style.display = 'block';
    } else if (type === 'polyline') {
        const length = layer.getLatLngs().reduce((total, latLng, index, array) => {
            if (index > 0) {
                return total + latLng.distanceTo(array[index - 1]);
            }
            return total;
        }, 0);
        const lengthKm = length / 1000;
        document.getElementById('measurementResult').textContent = `Distance: ${lengthKm.toFixed(2)} km`;
        document.getElementById('measurementResult').style.display = 'block';
    }
}

// ===== MODAL FORM HANDLERS =====
function handleContactForm(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };
    
    console.log('Contact form submitted:', formData);
    
    alert('Thank you for your message. We will contact you soon.');
    
    document.getElementById('contactForm').reset();
    document.getElementById('contactModal').style.display = 'none';
}

function handleLoginForm(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.querySelector('.role-btn.active').getAttribute('data-role');
    
    showLoading();
    setTimeout(() => {
        alert(`Logged in as ${username} with ${role} privileges.`);
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('loginButton').innerHTML = `<i class="fas fa-user"></i> ${username} (${role})`;
        hideLoading();
        
        updateUserPermissions(role);
    }, 1500);
}

function handleRegisterForm(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const organization = document.getElementById('regOrganization').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }
    
    showLoading();
    setTimeout(() => {
        alert(`Registration successful for ${name}. An email has been sent to ${email} for verification.`);
        document.getElementById('registerModal').style.display = 'none';
        document.getElementById('registerForm').reset();
        hideLoading();
    }, 1500);
}

function updateUserPermissions(role) {
    const exportButtons = document.querySelectorAll('#exportExcel, #exportCSV, #exportMining');
    const queryButton = document.getElementById('executeQuery');
    const toolButtons = document.querySelectorAll('.tool-button');
    
    switch(role) {
        case 'viewer':
            exportButtons.forEach(btn => btn.disabled = true);
            queryButton.disabled = false;
            toolButtons.forEach(btn => btn.disabled = true);
            break;
        case 'analyst':
            exportButtons.forEach(btn => btn.disabled = false);
            queryButton.disabled = false;
            toolButtons.forEach(btn => btn.disabled = false);
            break;
        case 'dataentry':
            exportButtons.forEach(btn => btn.disabled = true);
            queryButton.disabled = false;
            toolButtons.forEach(btn => btn.disabled = true);
            break;
        case 'admin':
            exportButtons.forEach(btn => btn.disabled = false);
            queryButton.disabled = false;
            toolButtons.forEach(btn => btn.disabled = false);
            break;
    }
}

// ===== UTILITY FUNCTIONS =====
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Initial legend update
updateLegend();
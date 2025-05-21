document.addEventListener('DOMContentLoaded', () => {
    const solarSystemDiv = document.getElementById('solar-system');
    const sunElement = document.getElementById('sun');
    const speedSlider = document.getElementById('speed-slider');
    const speedValueSpan = document.getElementById('speed-value');
    const earthTimeSpan = document.getElementById('earth-time');
    const simTimeSpan = document.getElementById('sim-time');
    const togglePathsButton = document.getElementById('toggle-paths');
    const tooltip = document.getElementById('tooltip');

    // Constants
    const AU_TO_PX = 18; // Astronomical Unit to Pixels scale
    const SUN_DIAMETER_KM = 1392700;
    const EARTH_DIAMETER_KM = 12742;
    
    const SUN_PX = 60; // Visual size of the Sun in pixels
    const EARTH_PX_AT_SCALE = 6; // Visual size of Earth if it were the only scaling factor
    const MIN_PLANET_PX = 3; // Minimum visual size for any planet/dwarf planet

    let simulationSpeed = parseFloat(speedSlider.value); // Days per second at 1x (will be multiplied by slider)
    let totalSimulatedTimeDays = 0;
    let lastTimestamp = 0;
    let pathsVisible = true;

    const solarSystemData = [
        // Planets
        { name: "Mercury", diameter_km: 4879,  color: "#B0AFA2", semiMajorAxis_au: 0.387, orbitalPeriod_days: 87.97, eccentricity: 0.2056 },
        { name: "Venus",   diameter_km: 12104, color: "#E6E2D4", semiMajorAxis_au: 0.723, orbitalPeriod_days: 224.70, eccentricity: 0.0068 },
        { name: "Earth",   diameter_km: 12742, color: "#6B93D6", semiMajorAxis_au: 1.000, orbitalPeriod_days: 365.25, eccentricity: 0.0167 },
        { name: "Mars",    diameter_km: 6779,  color: "#C1440E", semiMajorAxis_au: 1.524, orbitalPeriod_days: 686.98, eccentricity: 0.0934 },
        // Dwarf Planets
        { name: "Ceres",   diameter_km: 940,   color: "#8C8C8C", semiMajorAxis_au: 2.766, orbitalPeriod_days: 1680.5, eccentricity: 0.0785 },
        // Planets
        { name: "Jupiter", diameter_km: 139820,color: "#D8CA9D", semiMajorAxis_au: 5.204, orbitalPeriod_days: 4332.59, eccentricity: 0.0489 },
        { name: "Saturn",  diameter_km: 116460,color: "#F4D0A0", semiMajorAxis_au: 9.582, orbitalPeriod_days: 10759.22, eccentricity: 0.0565 },
        { name: "Uranus",  diameter_km: 50724, color: "#ACE5EE", semiMajorAxis_au: 19.218, orbitalPeriod_days: 30688.5, eccentricity: 0.0463 },
        { name: "Neptune", diameter_km: 49244, color: "#5B5DDF", semiMajorAxis_au: 30.110, orbitalPeriod_days: 60182, eccentricity: 0.0094 },
        // Dwarf Planets
        { name: "Pluto",   diameter_km: 2376,  color: "#BFB5A7", semiMajorAxis_au: 39.482, orbitalPeriod_days: 90560, eccentricity: 0.2488 },
        { name: "Haumea",  diameter_km: 1632,  color: "#D1EAF5", semiMajorAxis_au: 43.13, orbitalPeriod_days: 103770, eccentricity: 0.1912 }, // mean diameter
        { name: "Makemake",diameter_km: 1430,  color: "#F4A460", semiMajorAxis_au: 45.79, orbitalPeriod_days: 111800, eccentricity: 0.1559 },
        { name: "Eris",    diameter_km: 2326,  color: "#C0C0C0", semiMajorAxis_au: 67.67, orbitalPeriod_days: 203830, eccentricity: 0.4410 }
    ];

    function init() {
        // Set Sun size and position
        sunElement.style.width = `${SUN_PX}px`;
        sunElement.style.height = `${SUN_PX}px`;
        sunElement.style.backgroundColor = '#FFD700'; // Sun's color
        
        // Calculate max orbit radius to size the solar system div
        let maxOrbitRadiusPx = 0;
        solarSystemData.forEach(body => {
            const apoapsis_au = body.semiMajorAxis_au * (1 + body.eccentricity);
            maxOrbitRadiusPx = Math.max(maxOrbitRadiusPx, apoapsis_au * AU_TO_PX);
        });

        const solarSystemSize = (maxOrbitRadiusPx + SUN_PX / 2) * 2.2; // Add some padding
        solarSystemDiv.style.width = `${solarSystemSize}px`;
        solarSystemDiv.style.height = `${solarSystemSize}px`;

        // Center Sun in the #solar-system div
        sunElement.style.left = `calc(50% - ${SUN_PX / 2}px)`;
        sunElement.style.top = `calc(50% - ${SUN_PX / 2}px)`;

        solarSystemData.forEach(body => {
            // Create orbit path
            const a_px = body.semiMajorAxis_au * AU_TO_PX; // Semi-major axis in pixels
            const b_px = a_px * Math.sqrt(1 - body.eccentricity ** 2); // Semi-minor axis in pixels
            const c_px = a_px * body.eccentricity; // Distance from center to focus

            const orbitPath = document.createElement('div');
            orbitPath.classList.add('orbit-path');
            orbitPath.id = `orbit-${body.name.toLowerCase()}`;
            orbitPath.style.width = `${2 * a_px}px`;
            orbitPath.style.height = `${2 * b_px}px`;
            // Position the orbit ellipse so one focus is at the Sun's center
            // The Sun is at (0,0) of the solarSystemDiv's logical center.
            // Ellipse center is (offsetX, 0) relative to Sun.
            // translateX needs to shift the ellipse's geometric center by -c_px
            // so its left focus aligns with the Sun if perihelion is on the right.
            orbitPath.style.left = '50%';
            orbitPath.style.top = '50%';
            orbitPath.style.transform = `translate(calc(-50% - ${c_px}px), -50%)`;
            solarSystemDiv.appendChild(orbitPath);

            // Create planet element
            const planetElement = document.createElement('div');
            planetElement.classList.add('celestial-body', 'planet');
            planetElement.id = body.name.toLowerCase();
            planetElement.dataset.name = body.name; // For tooltip

            const planetSize = Math.max(MIN_PLANET_PX, (body.diameter_km / EARTH_DIAMETER_KM) * EARTH_PX_AT_SCALE);
            planetElement.style.width = `${planetSize}px`;
            planetElement.style.height = `${planetSize}px`;
            planetElement.style.backgroundColor = body.color;
            
            // Initial position (will be updated in animation loop)
            // Positioned relative to solarSystemDiv center (where Sun is)
            planetElement.style.left = '50%'; // This is relative to parent's padding box
            planetElement.style.top = '50%';  // We adjust with transform translate

            body.element = planetElement; // Store element reference
            body.orbitPathElement = orbitPath;
            solarSystemDiv.appendChild(planetElement);

            // Tooltip events
            planetElement.addEventListener('mouseenter', (e) => showTooltip(e, body));
            planetElement.addEventListener('mousemove', (e) => updateTooltipPosition(e));
            planetElement.addEventListener('mouseleave', () => hideTooltip());
        });
        sunElement.addEventListener('mouseenter', (e) => showTooltip(e, {name: "Sun", diameter_km: SUN_DIAMETER_KM, orbitalPeriod_days: "N/A"}));
        sunElement.addEventListener('mousemove', (e) => updateTooltipPosition(e));
        sunElement.addEventListener('mouseleave', () => hideTooltip());


        speedSlider.addEventListener('input', (e) => {
            simulationSpeed = parseFloat(e.target.value);
            speedValueSpan.textContent = `${simulationSpeed.toFixed(1)}x`;
        });

        togglePathsButton.addEventListener('click', () => {
            pathsVisible = !pathsVisible;
            solarSystemData.forEach(body => {
                if (body.orbitPathElement) {
                    body.orbitPathElement.classList.toggle('hidden', !pathsVisible);
                }
            });
            togglePathsButton.textContent = pathsVisible ? "Hide Orbit Paths" : "Show Orbit Paths";
        });

        requestAnimationFrame(animate);
    }

    function solveKepler(M, e, maxIter = 10, tolerance = 1e-7) {
        let E = M; // Initial guess for eccentric anomaly
        if (e > 0.8) E = Math.PI; // Better initial guess for high eccentricity

        for (let i = 0; i < maxIter; i++) {
            const E_prev = E;
            const f_E = E_prev - e * Math.sin(E_prev) - M;
            const df_E = 1 - e * Math.cos(E_prev);
            E = E_prev - f_E / df_E;
            if (Math.abs(E - E_prev) < tolerance) {
                break;
            }
        }
        return E;
    }

    function updatePlanetPosition(body, time_days) {
        if (!body.orbitalPeriod_days || body.orbitalPeriod_days === 0) return; // Sun or static body

        const a_au = body.semiMajorAxis_au;
        const e = body.eccentricity;
        const T_days = body.orbitalPeriod_days;

        // 1. Mean Anomaly (M)
        // (2 * PI / T) is mean motion 'n'
        const M = ((2 * Math.PI / T_days) * time_days) % (2 * Math.PI);

        // 2. Eccentric Anomaly (E) - solve M = E - e * sin(E)
        const E = solveKepler(M, e);

        // 3. True Anomaly (nu)
        // Using atan2 for quadrant correctness
        const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

        // 4. Distance from Sun (r)
        const r_au = a_au * (1 - e * Math.cos(E));
        const r_px = r_au * AU_TO_PX;

        // 5. Cartesian coordinates (x, y) relative to Sun (focus)
        // Sun is at (0,0). Perihelion is along positive x-axis.
        const x_px = r_px * Math.cos(nu);
        const y_px = r_px * Math.sin(nu);

        // Apply transform. translate(-50%, -50%) centers the planet div on its calculated (x,y) point.
        // The (x_px, y_px) are offsets from the center of solarSystemDiv (where Sun is)
        const planetSize = parseFloat(body.element.style.width);
        body.element.style.transform = `translate(calc(-50% + ${x_px}px), calc(-50% + ${y_px}px))`;
    }
    
    function animate(timestamp) {
        const now = new Date();
        earthTimeSpan.textContent = now.toLocaleString();

        if (lastTimestamp === 0) lastTimestamp = timestamp;
        const deltaTimeMs = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        // Assuming simulationSpeed is "simulated days per REAL second"
        const simulatedDaysThisFrame = (simulationSpeed * (deltaTimeMs / 1000));
        totalSimulatedTimeDays += simulatedDaysThisFrame;

        // Update simulated time display
        const years = Math.floor(totalSimulatedTimeDays / 365.25);
        const days = Math.floor(totalSimulatedTimeDays % 365.25);
        simTimeSpan.textContent = `${years} years, ${days} days`;

        solarSystemData.forEach(body => {
            updatePlanetPosition(body, totalSimulatedTimeDays);
        });

        requestAnimationFrame(animate);
    }

    function showTooltip(event, bodyData) {
        let content = `<strong>${bodyData.name}</strong><br>`;
        content += `Diameter: ${bodyData.diameter_km.toLocaleString()} km<br>`;
        if (bodyData.orbitalPeriod_days && bodyData.orbitalPeriod_days !== "N/A") {
            content += `Orbital Period: ${parseFloat(bodyData.orbitalPeriod_days).toFixed(2)} Earth days<br>`;
            content += `Semi-Major Axis: ${bodyData.semiMajorAxis_au} AU<br>`;
            content += `Eccentricity: ${bodyData.eccentricity}`;
        }
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        updateTooltipPosition(event);
    }

    function updateTooltipPosition(event) {
        tooltip.style.left = `${event.clientX + 15}px`;
        tooltip.style.top = `${event.clientY + 15}px`;
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
    }

    init();
});
document.addEventListener('DOMContentLoaded', () => {
    const solarSystemDiv = document.getElementById('solar-system');
    const sunElement = document.getElementById('sun');
    const speedSlider = document.getElementById('speed-slider');
    const speedValueSpan = document.getElementById('speed-value');
    const earthTimeSpan = document.getElementById('earth-time');
    const simTimeSpan = document.getElementById('sim-time');
    const togglePathsButton = document.getElementById('toggle-paths');
    const tooltip = document.getElementById('tooltip');
    const speedTextInput = document.getElementById('speed-text-input');
    const setSpeedButton = document.getElementById('set-speed-button');
    const infoPanel = document.getElementById('info-panel');
    const infoPanelTitle = document.getElementById('info-panel-title');
    const infoPanelContent = document.getElementById('info-panel-content');

    // Time control elements
    const timeInput = document.getElementById('time-input');
    const setTimeButton = document.getElementById('set-time-button');
    const rewindYearButton = document.getElementById('rewind-year-button');
    const rewindMonthButton = document.getElementById('rewind-month-button');
    const advanceMonthButton = document.getElementById('advance-month-button');
    const advanceYearButton = document.getElementById('advance-year-button');

    // Constants
    const AU_TO_PX = 750; 
    const SUN_DIAMETER_KM = 1392700;
    const EARTH_DIAMETER_KM = 12742;
    const KM_TO_PX_DIAMETER = 0.00001; 
    const MIN_PLANET_PX = 3; 

    let simulationSpeed = parseFloat(speedSlider.value); 
    let totalSimulatedTimeDays = 0;
    let lastTimestamp = 0;
    let pathsVisible = true;

    // Zoom variables
    let currentScale = 1.0;
    const ZOOM_SPEED = 0.1; // Represents a 10% change factor
    const MIN_ZOOM = 0.005; 
    const MAX_ZOOM = 20;

    // Panning state variables
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;
    let panX = 0; 
    let panY = 0; 

    // Follow state variable
    let focusedBody = null; 

    const solarSystemData = [
        { name: "Mercury", diameter_km: 4879,  color: "#B0AFA2", semiMajorAxis_au: 0.387, orbitalPeriod_days: 87.97, eccentricity: 0.2056 },
        { name: "Venus",   diameter_km: 12104, color: "#E6E2D4", semiMajorAxis_au: 0.723, orbitalPeriod_days: 224.70, eccentricity: 0.0068 },
        { name: "Earth",   diameter_km: 12742, color: "#6B93D6", semiMajorAxis_au: 1.000, orbitalPeriod_days: 365.25, eccentricity: 0.0167 },
        { name: "Mars",    diameter_km: 6779,  color: "#C1440E", semiMajorAxis_au: 1.524, orbitalPeriod_days: 686.98, eccentricity: 0.0934 },
        { name: "Ceres",   diameter_km: 940,   color: "#8C8C8C", semiMajorAxis_au: 2.766, orbitalPeriod_days: 1680.5, eccentricity: 0.0785 },
        { name: "Jupiter", diameter_km: 139820,color: "#D8CA9D", semiMajorAxis_au: 5.204, orbitalPeriod_days: 4332.59, eccentricity: 0.0489 },
        { name: "Saturn",  diameter_km: 116460,color: "#F4D0A0", semiMajorAxis_au: 9.582, orbitalPeriod_days: 10759.22, eccentricity: 0.0565 },
        { name: "Uranus",  diameter_km: 50724, color: "#ACE5EE", semiMajorAxis_au: 19.218, orbitalPeriod_days: 30688.5, eccentricity: 0.0463 },
        { name: "Neptune", diameter_km: 49244, color: "#5B5DDF", semiMajorAxis_au: 30.110, orbitalPeriod_days: 60182, eccentricity: 0.0094 },
        { name: "Pluto",   diameter_km: 2376,  color: "#BFB5A7", semiMajorAxis_au: 39.482, orbitalPeriod_days: 90560, eccentricity: 0.2488 },
        { name: "Haumea",  diameter_km: 1632,  color: "#D1EAF5", semiMajorAxis_au: 43.13, orbitalPeriod_days: 103770, eccentricity: 0.1912 }, 
        { name: "Makemake",diameter_km: 1430,  color: "#F4A460", semiMajorAxis_au: 45.79, orbitalPeriod_days: 111800, eccentricity: 0.1559 },
        { name: "Eris",    diameter_km: 2326,  color: "#C0C0C0", semiMajorAxis_au: 67.67, orbitalPeriod_days: 203830, eccentricity: 0.4410 }
    ];

    function init() {
        if (infoPanel) { 
            infoPanel.style.display = 'none';
        }

        if (speedTextInput && speedSlider) {
            speedTextInput.value = parseFloat(speedSlider.value).toFixed(1);
        }
        if (timeInput) {
            timeInput.value = totalSimulatedTimeDays.toFixed(0);
        }

        const solarSystemContainerDiv = document.getElementById('solar-system-container');
        if (solarSystemContainerDiv) {
            solarSystemContainerDiv.style.cursor = 'grab';
        }

        const sunDiameterPx = SUN_DIAMETER_KM * KM_TO_PX_DIAMETER;
        sunElement.style.width = `${sunDiameterPx}px`;
        sunElement.style.height = `${sunDiameterPx}px`;
        sunElement.style.background = '#FFD700';
        
        let maxOrbitRadiusPx = 0;
        solarSystemData.forEach(body => {
            const apoapsis_au = body.semiMajorAxis_au * (1 + body.eccentricity);
            maxOrbitRadiusPx = Math.max(maxOrbitRadiusPx, apoapsis_au * AU_TO_PX);
        });

        const solarSystemSize = (maxOrbitRadiusPx + sunDiameterPx / 2) * 2.2; 
        solarSystemDiv.style.width = `${solarSystemSize}px`;
        solarSystemDiv.style.height = `${solarSystemSize}px`;

        sunElement.style.left = `calc(50% - ${sunDiameterPx / 2}px)`;
        sunElement.style.top = `calc(50% - ${sunDiameterPx / 2}px)`;

        const planetListUl = document.getElementById('planet-list');
        if (planetListUl) {
            const sunLi = document.createElement('li');
            const sunButton = document.createElement('button');
            sunButton.textContent = "Sun";
            sunButton.addEventListener('click', () => focusOnBody({ 
                name: "Sun", 
                element: sunElement, 
                current_x_px: 0, 
                current_y_px: 0 
            }));
            sunLi.appendChild(sunButton);
            planetListUl.appendChild(sunLi);
        }

        solarSystemData.forEach(body => {
            const a_px = body.semiMajorAxis_au * AU_TO_PX; 
            const b_px = a_px * Math.sqrt(1 - body.eccentricity ** 2); 
            const c_px = a_px * body.eccentricity; 

            const orbitPath = document.createElement('div');
            orbitPath.classList.add('orbit-path');
            orbitPath.id = `orbit-${body.name.toLowerCase()}`;
            orbitPath.style.width = `${2 * a_px}px`;
            orbitPath.style.height = `${2 * b_px}px`;
            orbitPath.style.left = '50%';
            orbitPath.style.top = '50%';
            orbitPath.style.transform = `translate(calc(-50% - ${c_px}px), -50%)`;
            solarSystemDiv.appendChild(orbitPath);

            const planetElement = document.createElement('div');
            planetElement.classList.add('celestial-body', 'planet');
            planetElement.id = body.name.toLowerCase();
            planetElement.dataset.name = body.name; 

            const planetSize = Math.max(MIN_PLANET_PX, body.diameter_km * KM_TO_PX_DIAMETER);
            planetElement.style.width = `${planetSize}px`;
            planetElement.style.height = `${planetSize}px`;
            
            switch (body.name) {
                case "Jupiter":
                    planetElement.style.background = `radial-gradient(circle at 60% 70%, #d8ca9d 10%, #a58855 30%, #c9a16f 60%)`;
                    break;
                case "Mars":
                    planetElement.style.background = `radial-gradient(circle, #C1440E, #e86100)`;
                    break;
                case "Earth":
                    planetElement.style.background = `radial-gradient(circle at 35% 35%, #ffffff 2%, #6B93D6 30%, #4682B4 60%, #3A5F0B 80%, #2E4D09 100%)`;
                    break;
                case "Venus":
                    planetElement.style.background = `radial-gradient(circle, #E6E2D4, #d4c8a0)`;
                    break;
                case "Neptune":
                    planetElement.style.background = `radial-gradient(circle, #5B5DDF, #3E409A)`;
                    break;
                case "Uranus":
                    planetElement.style.background = `radial-gradient(circle, #ACE5EE, #87B2C0)`;
                    break;
                default:
                    planetElement.style.backgroundColor = body.color; 
            }

            if (body.name === "Saturn") {
                const ringsElement = document.createElement('div');
                ringsElement.classList.add('saturn-rings');
                const ringBorderThickness = Math.min(2, Math.max(1, Math.round(planetSize * 0.1)));
                ringsElement.style.borderWidth = `${ringBorderThickness}px`;
                planetElement.appendChild(ringsElement);
                body.ringsElement = ringsElement; 
            }
            
            planetElement.style.left = '50%'; 
            planetElement.style.top = '50%';  

            body.element = planetElement; 
            body.orbitPathElement = orbitPath;
            solarSystemDiv.appendChild(planetElement);

            planetElement.addEventListener('mouseenter', (e) => showTooltip(e, body));
            planetElement.addEventListener('mousemove', (e) => updateTooltipPosition(e));
            planetElement.addEventListener('mouseleave', () => hideTooltip());
            planetElement.addEventListener('click', () => focusOnBody(body)); 

            if (planetListUl) {
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.textContent = body.name;
                button.addEventListener('click', () => focusOnBody(body));
                li.appendChild(button);
                planetListUl.appendChild(li);
            }
        });
        sunElement.addEventListener('mouseenter', (e) => showTooltip(e, {name: "Sun", diameter_km: SUN_DIAMETER_KM, orbitalPeriod_days: "N/A"}));
        sunElement.addEventListener('mousemove', (e) => updateTooltipPosition(e));
        sunElement.addEventListener('mouseleave', () => hideTooltip());
        sunElement.addEventListener('click', () => focusOnBody({ name: "Sun", element: sunElement, current_x_px: 0, current_y_px: 0 }));


        speedSlider.addEventListener('input', (e) => {
            simulationSpeed = parseFloat(e.target.value);
            speedValueSpan.textContent = `${simulationSpeed.toFixed(1)}x`;
            if (speedTextInput) {
                speedTextInput.value = simulationSpeed.toFixed(1);
            }
        });

        if (speedTextInput && speedSlider && speedValueSpan) {
            speedTextInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    applySpeedFromTextInput();
                    event.preventDefault(); 
                }
            });
            speedTextInput.addEventListener('blur', applySpeedFromTextInput);
        }

        if (setSpeedButton) {
            setSpeedButton.addEventListener('click', applySpeedFromTextInput);
        }
        
        if (setTimeButton && timeInput) {
            setTimeButton.addEventListener('click', applyCustomTime);
            timeInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') {
                    applyCustomTime();
                    e.preventDefault();
                } 
            });
            timeInput.addEventListener('blur', applyCustomTime);
        }
        if (advanceYearButton) advanceYearButton.addEventListener('click', () => adjustTime(365.25));
        if (advanceMonthButton) advanceMonthButton.addEventListener('click', () => adjustTime(30)); 
        if (rewindMonthButton) rewindMonthButton.addEventListener('click', () => adjustTime(-30));
        if (rewindYearButton) rewindYearButton.addEventListener('click', () => adjustTime(-365.25));


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
        let E = M; 
        if (e > 0.8) E = Math.PI; 
        for (let i = 0; i < maxIter; i++) {
            const E_prev = E;
            const f_E = E_prev - e * Math.sin(E_prev) - M;
            const df_E = 1 - e * Math.cos(E_prev);
            E = E_prev - f_E / df_E;
            if (Math.abs(E - E_prev) < tolerance) break;
        }
        return E;
    }

    function updatePlanetPosition(body, time_days) {
        if (!body.orbitalPeriod_days || body.orbitalPeriod_days === 0) return; 
        const a_au = body.semiMajorAxis_au;
        const e = body.eccentricity;
        const T_days = body.orbitalPeriod_days;
        const M = ((2 * Math.PI / T_days) * time_days) % (2 * Math.PI);
        const E = solveKepler(M, e);
        const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
        const r_au = a_au * (1 - e * Math.cos(E));
        const r_px = r_au * AU_TO_PX;
        const x_px = r_px * Math.cos(nu);
        const y_px = r_px * Math.sin(nu);
        body.current_x_px = x_px;
        body.current_y_px = y_px;
        body.element.style.transform = `translate(calc(-50% + ${x_px}px), calc(-50% + ${y_px}px))`;
    }
    
    function animate(timestamp) {
        const now = new Date();
        earthTimeSpan.textContent = now.toLocaleString();
        if (lastTimestamp === 0) lastTimestamp = timestamp;
        const deltaTimeMs = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        const simulatedDaysThisFrame = (simulationSpeed * (deltaTimeMs / 1000));
        totalSimulatedTimeDays += simulatedDaysThisFrame;
        const years = Math.floor(totalSimulatedTimeDays / 365.25);
        const days = Math.floor(totalSimulatedTimeDays % 365.25);
        simTimeSpan.textContent = `${years} years, ${days} days`;
        if (timeInput && document.activeElement !== timeInput) { 
            timeInput.value = totalSimulatedTimeDays.toFixed(0);
        }
        solarSystemData.forEach(body => updatePlanetPosition(body, totalSimulatedTimeDays));
        if (focusedBody) {
            if (focusedBody.name === "Sun") {
                panX = 0;
                panY = 0;
            } else if (focusedBody.current_x_px !== undefined && focusedBody.current_y_px !== undefined) {
                panX = -focusedBody.current_x_px * currentScale;
                panY = -focusedBody.current_y_px * currentScale;
            }
            solarSystemDiv.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
        }
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

    function focusOnBody(bodyToFocus) {
        if (!bodyToFocus) return;
        const targetX = typeof bodyToFocus.current_x_px === 'number' ? bodyToFocus.current_x_px : 0;
        const targetY = typeof bodyToFocus.current_y_px === 'number' ? bodyToFocus.current_y_px : 0;
        panX = -targetX * currentScale;
        panY = -targetY * currentScale;
        solarSystemDiv.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
        focusedBody = bodyToFocus; 
        if (infoPanel && infoPanelTitle && infoPanelContent) {
            if (bodyToFocus && bodyToFocus.name !== "Sun") { 
                infoPanelTitle.textContent = bodyToFocus.name;
                let htmlContent = `<p><strong>Diameter:</strong> ${bodyToFocus.diameter_km.toLocaleString()} km</p>`;
                if (bodyToFocus.orbitalPeriod_days) { 
                    htmlContent += `<p><strong>Orbital Period:</strong> ${parseFloat(bodyToFocus.orbitalPeriod_days).toFixed(2)} Earth days</p>`;
                    htmlContent += `<p><strong>Semi-Major Axis:</strong> ${bodyToFocus.semiMajorAxis_au} AU</p>`;
                    htmlContent += `<p><strong>Eccentricity:</strong> ${bodyToFocus.eccentricity}</p>`;
                }
                infoPanelContent.innerHTML = htmlContent;
                infoPanel.style.display = 'block';
            } else {
                infoPanel.style.display = 'none'; 
            }
        }
    }

    function applySpeedFromTextInput() {
        if (!speedTextInput || !speedSlider || !speedValueSpan) return;
        let newSpeed = parseFloat(speedTextInput.value);
        const minSpeed = parseFloat(speedSlider.min);
        const maxSpeed = parseFloat(speedSlider.max);
        if (!isNaN(newSpeed)) {
            if (newSpeed < minSpeed) {
                newSpeed = minSpeed;
                speedTextInput.value = newSpeed.toFixed(1);
            } else if (newSpeed > maxSpeed) {
                newSpeed = maxSpeed;
                speedTextInput.value = newSpeed.toFixed(1);
            }
            speedSlider.value = newSpeed; 
            simulationSpeed = newSpeed;   
            speedValueSpan.textContent = `${newSpeed.toFixed(1)}x`; 
        } else {
            speedTextInput.value = simulationSpeed.toFixed(1);
        }
    }
    
    function applyCustomTime() {
        if (!timeInput) return;
        const newTimeDays = parseFloat(timeInput.value);
        if (!isNaN(newTimeDays)) {
            totalSimulatedTimeDays = Math.max(0, newTimeDays); 
        } else {
            timeInput.value = totalSimulatedTimeDays.toFixed(0);
        }
    }

    function adjustTime(days) {
        totalSimulatedTimeDays += days;
        if (totalSimulatedTimeDays < 0) totalSimulatedTimeDays = 0; 
        if (timeInput && document.activeElement !== timeInput) {
            timeInput.value = totalSimulatedTimeDays.toFixed(0);
        }
    }

    init();

    const solarSystemContainerDiv = document.getElementById('solar-system-container');

    function unfocusBody() {
        focusedBody = null;
        if (infoPanel) {
            infoPanel.style.display = 'none';
        }
    }

    if (solarSystemContainerDiv) {
        solarSystemContainerDiv.addEventListener('click', (event) => {
            if (event.target === solarSystemContainerDiv) {
                unfocusBody();
            }
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            unfocusBody();
        }
    });

    solarSystemContainerDiv.addEventListener('wheel', (event) => {
        event.preventDefault();

        // Calculate new scale (common for both modes)
        // ZOOM_SPEED (e.g., 0.1) results in a 10% change per step.
        const zoomMultiplier = event.deltaY > 0 ? 1 / (1 + ZOOM_SPEED) : (1 + ZOOM_SPEED);
        let newScale = currentScale * zoomMultiplier;
        newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

        const solarSystemRect = solarSystemDiv.getBoundingClientRect();

        if (focusedBody && focusedBody.name !== "Sun") {
            // Mode 1: A planet is being followed. Zoom should keep this planet (which is at viewport center) centered.
            const viewportCenterX = solarSystemContainerDiv.clientWidth / 2;
            const viewportCenterY = solarSystemContainerDiv.clientHeight / 2;

            const pointToKeepStationaryX_viewport = viewportCenterX - solarSystemRect.left;
            const pointToKeepStationaryY_viewport = viewportCenterY - solarSystemRect.top;
            
            const pointToKeepStationaryX_unscaled = (pointToKeepStationaryX_viewport - panX) / currentScale; // Use currentScale before update
            const pointToKeepStationaryY_unscaled = (pointToKeepStationaryY_viewport - panY) / currentScale; // Use currentScale before update

            panX = pointToKeepStationaryX_viewport - pointToKeepStationaryX_unscaled * newScale;
            panY = pointToKeepStationaryY_viewport - pointToKeepStationaryY_unscaled * newScale;

        } else {
            // Mode 2: No specific planet followed (or Sun is focused) - Use Zoom to Mouse Pointer logic
            const mouseX_relativeToDivOrigin_viewport = event.clientX - solarSystemRect.left;
            const mouseY_relativeToDivOrigin_viewport = event.clientY - solarSystemRect.top;

            const mouseX_unscaled = (mouseX_relativeToDivOrigin_viewport - panX) / currentScale; // Use currentScale before update
            const mouseY_unscaled = (mouseY_relativeToDivOrigin_viewport - panY) / currentScale; // Use currentScale before update
            
            panX = mouseX_relativeToDivOrigin_viewport - mouseX_unscaled * newScale;
            panY = mouseY_relativeToDivOrigin_viewport - mouseY_unscaled * newScale;
        }

        currentScale = newScale; // Update currentScale globally

        // Apply the transform (common for both modes)
        solarSystemDiv.style.transformOrigin = '0 0'; // Pan calculations assume origin 0,0
        solarSystemDiv.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
    });

    solarSystemContainerDiv.addEventListener('mousedown', (event) => {
        event.preventDefault(); 
        isPanning = true;
        lastPanX = event.clientX;
        lastPanY = event.clientY;
        solarSystemContainerDiv.style.cursor = 'grabbing';
    });

    solarSystemContainerDiv.addEventListener('mousemove', (event) => {
        if (isPanning) {
            const dX = event.clientX - lastPanX;
            const dY = event.clientY - lastPanY;
            panX += dX;
            panY += dY;
            lastPanX = event.clientX;
            lastPanY = event.clientY;
            solarSystemDiv.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
        }
    });

    solarSystemContainerDiv.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            solarSystemContainerDiv.style.cursor = 'grab';
        }
    });

    solarSystemContainerDiv.addEventListener('mouseleave', () => {
        if (isPanning) {
            isPanning = false;
            solarSystemContainerDiv.style.cursor = 'grab';
        }
    });
});
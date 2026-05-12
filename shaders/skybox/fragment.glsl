/**
 * @brief Skybox fragment shader with dynamic lighting modes
 * @details Renders procedural sky with sunset, night, and dark sunset modes
 */

precision mediump float;
varying vec3 vDirection;
uniform float uLightingMode;

void main() {
    vec3 rayDirection = normalize(vDirection);
    
    float verticalHeight = rayDirection.y;
    vec3 skyColor;

    // SUNSET MODE
    if (uLightingMode < 0.5) {
        vec3 zenithColor = vec3(0.5529, 0.7098, 1.0); 
        vec3 midSkyColor = vec3(0.8627, 0.6157, 0.7647); 
        vec3 horizonColor = vec3(0.8471, 0.4471, 0.2314);
        vec3 sunGlowColor = vec3(1.0, 0.75, 0.2); 
        vec3 groundColor = vec3(0.8471, 0.4471, 0.2314);

        if (verticalHeight > 0.3) {
            float blendFactor = (verticalHeight - 0.3) / 0.7;
            skyColor = mix(midSkyColor, zenithColor, blendFactor);
        } else if (verticalHeight > 0.0) {
            float blendFactor = verticalHeight / 0.3;
            skyColor = mix(horizonColor, midSkyColor, blendFactor);
        } else if (verticalHeight > -0.5) {
            float blendFactor = (verticalHeight + 0.5) / 0.5;
            blendFactor = blendFactor * blendFactor * (3.0 - 2.0 * blendFactor);
            skyColor = mix(groundColor, horizonColor, blendFactor);
        } else {
            skyColor = groundColor;
        }

        vec3 sunDirection = normalize(vec3(1.0, 0.1, 0.0));
        float sunAlignment = dot(rayDirection, sunDirection);
        float sunDisc = smoothstep(0.997, 1.0, sunAlignment);
        float sunHalo = smoothstep(0.95, 0.997, sunAlignment) * 0.4;
        skyColor = mix(skyColor, vec3(1.0, 0.75, 0.2), sunHalo);
        skyColor = mix(skyColor, vec3(1.0, 0.95, 0.8), sunDisc);
    }

    // NIGHT MODE
    else if (uLightingMode < 1.5) {
        vec3 zenithColor = vec3(0.0, 0.0, 0.1);
        vec3 horizonColor = vec3(0.05, 0.05, 0.2);
        vec3 groundColor = vec3(0.02, 0.02, 0.05);

        if (verticalHeight > 0.0) {
            float blendFactor = verticalHeight;
            skyColor = mix(horizonColor, zenithColor, blendFactor);
        } else {
            float blendFactor = (verticalHeight + 0.5) / 0.5;
            skyColor = mix(groundColor, horizonColor, blendFactor);
        }

        vec3 moonDirection = normalize(vec3(-1.0, 0.5, 0.2));
        float moonAlignment = dot(rayDirection, moonDirection);
        float moonDisc = smoothstep(0.98, 1.0, moonAlignment);
        float moonHalo = smoothstep(0.93, 0.98, moonAlignment) * 0.3;
        
        vec3 moonGlowColor = vec3(0.8, 0.9, 1.0);
        skyColor = mix(skyColor, moonGlowColor, moonHalo);
        skyColor = mix(skyColor, vec3(0.95, 0.95, 1.0), moonDisc);
    }
    
    // DARK SUNSET
    else if (uLightingMode < 2.5) {
        vec3 zenithColor = vec3(0.25, 0.35, 0.5);
        vec3 midSkyColor = vec3(0.8627, 0.6157, 0.7647); 
        vec3 horizonColor = vec3(0.8471, 0.4471, 0.2314); 
        vec3 fogColor = vec3(0.65, 0.6, 0.7); 
        vec3 sunGlowColor = vec3(1.0, 0.75, 0.2); 
        vec3 groundColor = vec3(0.8471, 0.4471, 0.2314);

        if (verticalHeight > 0.3) {
            float blendFactor = (verticalHeight - 0.3) / 0.7;
            skyColor = mix(midSkyColor, zenithColor, blendFactor);
        } else if (verticalHeight > 0.0) {
            float blendFactor = verticalHeight / 0.3;
            skyColor = mix(horizonColor, midSkyColor, blendFactor);
        } else if (verticalHeight > -0.5) {
            float blendFactor = (verticalHeight + 0.5) / 0.5;
            blendFactor = blendFactor * blendFactor * (3.0 - 2.0 * blendFactor);
            skyColor = mix(groundColor, horizonColor, blendFactor);
        } else {
            skyColor = groundColor;
        }

        float fogIntensity = 0.6; 
        skyColor = mix(skyColor, fogColor, fogIntensity);

        vec3 sunDirection = normalize(vec3(1.0, 0.1, 0.0));
        float sunAlignment = dot(rayDirection, sunDirection);
        float sunDisc = smoothstep(0.997, 1.0, sunAlignment);
        float sunHalo = smoothstep(0.95, 0.997, sunAlignment) * 0.3;
        skyColor = mix(skyColor, sunGlowColor, sunHalo);
        skyColor = mix(skyColor, vec3(1.0, 0.85, 0.6), sunDisc);
    }

    gl_FragColor = vec4(skyColor, 1.0);
}
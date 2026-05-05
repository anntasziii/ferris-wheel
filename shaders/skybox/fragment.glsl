precision mediump float;
varying vec3 vDirection;

void main() {
    vec3 rayDirection = normalize(vDirection);
    
    float verticalHeight = rayDirection.y;

    // SKY COLOR PALETTE
    vec3 zenithColor = vec3(0.3451, 0.5725, 0.9961); 
    vec3 midSkyColor = vec3(0.65, 0.4, 0.55); 
    vec3 horizonColor = vec3(0.6667, 0.251, 0.0235);
    vec3 sunGlowColor = vec3(1.0, 0.75, 0.2); 
    vec3 groundColor = vec3(0.75, 0.35, 0.1);

    // BLEND SKY COLORS BASED ON VIEW HEIGHT
    vec3 skyColor;

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

    // SUN RENDERING
    vec3 sunDirection = normalize(vec3(1.0, 0.1, 0.0));
    float sunAlignment = dot(rayDirection, sunDirection);
    float sunDisc = smoothstep(0.997, 1.0, sunAlignment);
    float sunHalo = smoothstep(0.95, 0.997, sunAlignment) * 0.4;

    // COMPOSITE SUN WITH SKY
    skyColor = mix(skyColor, sunGlowColor, sunHalo);
    skyColor = mix(skyColor, vec3(1.0, 0.95, 0.8), sunDisc);

    gl_FragColor = vec4(skyColor, 1.0);
}
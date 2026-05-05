precision mediump float;

varying vec3 vNormal;        // Surface normal vector in world space
varying vec3 vPosition;       // Fragment position in world space
varying vec2 vTexCoord;       // Texture coordinates [0-1]
varying float vTime;          // Time value from vertex shader

uniform vec3 uLightPos;       // Light source position for Phong shading
uniform vec3 uViewPos;        // Camera position for Phong shading
uniform vec3 uObjectColor;    // Base object color when no texture used (RGB)
uniform sampler2D uTexture;   // 2D texture sampler
uniform bool uUseTexture;     // Enable/disable texture mapping
uniform float uTime;          // Animation time in seconds
uniform bool uIsWater;        // Flag: render as water surface
uniform bool uIsFlower;       // Flag: render as flower with gradient
uniform bool uIsCloud;        // Flag: render as cloud with soft edges

/**
 * @brief Applies exponential fog to color based on distance from camera
 * @param {vec3} color - Input color to apply fog to
 * @return {vec3} Color blended with fog
 */
vec3 applyFog(vec3 color) {
    float fogDensity = 0.012;                  
    vec3 fogColor = vec3(0.65, 0.4, 0.22);

    float distanceFromCamera = length(vPosition - uViewPos);
    
    float fogFactor = exp(-fogDensity * distanceFromCamera);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    return mix(fogColor, color, fogFactor);
}

/**
 * @brief Main fragment shader entry point
 */
void main() {
    vec3 normalizedNormal = normalize(vNormal); 
    vec3 lightDirection = normalize(uLightPos - vPosition);
    vec3 viewDirection = normalize(uViewPos - vPosition); 

    // WATER SURFACE SHADER
    if (uIsWater) {
        vec2 textureUV = vTexCoord * 0.15;
        float waterFlow = uTime * 0.15;
        vec2 animatedUV = textureUV + vec2(waterFlow, waterFlow * 0.3);

        vec3 waterTextureSample = texture2D(uTexture, animatedUV).rgb;
        waterTextureSample = (waterTextureSample - 0.5) * 1.8 + 0.5;
        waterTextureSample = clamp(waterTextureSample, 0.0, 1.0);

        vec3 darkBlueWater = vec3(0.02, 0.1, 0.35);
        vec3 waterBaseColor = mix(darkBlueWater, waterTextureSample, 0.65);
        waterBaseColor.b = min(waterBaseColor.b * 1.15, 1.0); 

        float ambientIntensity = 0.4;
        vec3 ambientLight = ambientIntensity * waterBaseColor;
        
        float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);
        vec3 diffuseLight = diffuseIntensity * waterBaseColor;
        
        vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
        float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 64.0);
        vec3 specularLight = specularIntensity * vec3(1.0) * 0.6;

        vec3 finalWaterColor = ambientLight + diffuseLight + specularLight;
        
        gl_FragColor = vec4(applyFog(finalWaterColor), 0.9);
        return;
    }

    // FLOWER SHADER
    if (uIsFlower) {
        float petalGradient = clamp(vTexCoord.x, 0.0, 1.0);

        vec3 petalCenterColor = uObjectColor * 0.55;
        vec3 petalEdgeColor = min(uObjectColor * 1.2, vec3(1.0));
        vec3 petalBaseColor = mix(petalCenterColor, petalEdgeColor, petalGradient);

        float ambientIntensity = 0.25;
        vec3 ambientLight = ambientIntensity * petalBaseColor;
        
        float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);
        vec3 diffuseLight = diffuseIntensity * petalBaseColor;
        
        vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
        float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 16.0);
        vec3 specularLight = specularIntensity * vec3(1.0) * 0.15;

        vec3 finalFlowerColor = ambientLight + diffuseLight + specularLight;
        
        gl_FragColor = vec4(applyFog(finalFlowerColor), 1.0);
        return;
    }

    // CLOUD SHADER
    if (uIsCloud) {
        vec2 cloudUV = vTexCoord;
        float cloudFlow = uTime * 0.02;
        cloudUV.x += cloudFlow; 

        float noiseSample1 = sin(cloudUV.x * 4.0 + cloudUV.y * 2.0) * 0.5 + 0.5;
        float noiseSample2 = sin(cloudUV.x * 7.0 - cloudUV.y * 3.0 + 1.5) * 0.5 + 0.5;
        float noiseSample3 = sin(cloudUV.x * 2.0 + cloudUV.y * 5.0 + 3.0) * 0.5 + 0.5;
        float cloudDensity = noiseSample1 * 0.5 + noiseSample2 * 0.3 + noiseSample3 * 0.2;

        float edgeFactorX = 1.0 - abs(vTexCoord.x - 0.5) * 2.0;
        float edgeFactorY = 1.0 - abs(vTexCoord.y - 0.5) * 2.0;
        edgeFactorX = max(0.0, edgeFactorX);
        edgeFactorY = max(0.0, edgeFactorY);

        float edgeFalloff = pow(edgeFactorX, 1.5) * pow(edgeFactorY, 1.5);

        float cloudOpacity = cloudDensity * edgeFalloff * 0.55;

        vec3 warmCloudColor = vec3(0.80, 0.72, 0.62);
        vec3 brightCloudColor = vec3(1.0, 0.95, 0.9);
        vec3 finalCloudColor = mix(warmCloudColor, brightCloudColor, cloudDensity);

        gl_FragColor = vec4(finalCloudColor, cloudOpacity);
        return;
    }

    vec3 baseColor = uUseTexture ? texture2D(uTexture, vTexCoord).rgb : uObjectColor;

    float ambientIntensity = 0.2;
    vec3 ambientLight = ambientIntensity * baseColor;
    
    float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);
    vec3 diffuseLight = diffuseIntensity * baseColor;
    
    float specularStrength = uUseTexture ? 0.1 : 0.5;
    vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
    float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 32.0);
    vec3 specularLight = specularStrength * specularIntensity * vec3(1.0);

    vec3 finalLitColor = ambientLight + diffuseLight + specularLight;

    float finalAlpha = 1.0;
    bool isCabinGlass = (uObjectColor.b > 0.85 && uObjectColor.r < 0.8 && uObjectColor.g > 0.8);
    if (isCabinGlass) {
        finalAlpha = 0.35; 
    }
    
    gl_FragColor = vec4(applyFog(finalLitColor), finalAlpha);
}

precision mediump float;

// VARYING INPUTS
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying float vTime;

// UNIFORM INPUTS
uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform vec3 uObjectColor;
uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform float uTime;
uniform bool uIsWater;
uniform bool uIsFlower;
uniform bool uIsCloud;

// SPOTLIGHT PARAMETERS
uniform vec3 uSpotlightPos;
uniform vec3 uSpotlightDir;
uniform vec3 uSpotlightColor;
uniform float uSpotlightIntensity;
uniform float uSpotlightAngle;

// POINT LIGHT PARAMETERS
uniform vec3 uPointLightPos;
uniform vec3 uPointLightColor;
uniform float uPointLightIntensity;
uniform float uPointLightRadius;

// LANTERN MULTITEXTURING
uniform sampler2D uBlikiTexture;
uniform sampler2D uPaperTexture;
uniform bool uUseLanternMultitex;
uniform bool uIsLantern;

// BIRD TEXTURE TRANSFORMATION
uniform bool uIsBird;

// GRASS ANIMATION
uniform sampler2D uGrassAnimationSheet;
uniform int uGrassGridX;
uniform int uGrassGridY;
uniform int uGrassCurrentFrame;
uniform bool uUseGrassAnimation;

// FOG PARAMETERS
uniform int uFogMode;
uniform vec3 uFogColor;
uniform float uFogDensity;

// DYNAMIC LIGHT PARAMETERS
uniform vec3 uLightColor;
uniform float uLightIntensity;

// SPECULAR MAP PARAMETERS
uniform sampler2D uSpecularMap;
uniform bool uIsPebble;

// SPRITE SHEET ANIMATION FUNCTION
vec2 getAnimationFrameUV(vec2 baseUV, int frameIndex, int gridX, int gridY) {
    int col = frameIndex - (frameIndex / gridX) * gridX; 
    int row = frameIndex / gridX;
    
    float frameWidth = 1.0 / float(gridX);
    float frameHeight = 1.0 / float(gridY);
    
    float offsetX = float(col) * frameWidth;
    float offsetY = float(row) * frameHeight;
    
    vec2 scaledUV = baseUV * vec2(frameWidth, frameHeight);
    
    return scaledUV + vec2(offsetX, offsetY);
}

// TEXTURE TRANSFORMATION MATRIX
mat2 rotationMatrix(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

vec2 transformTextureWithMatrix(vec2 uv, float time) {
    vec2 centered = uv - 0.5;
    
    float scale = 0.7 + 0.4 * sin(time * 1.5);
    vec2 scaled = centered * scale;
    
    mat2 rotation = rotationMatrix(time * 0.8);
    vec2 rotated = rotation * scaled;
    
    vec2 translated = rotated + 0.5;
    translated += vec2(sin(time * 0.5) * 0.25, cos(time * 0.5) * 0.25);
    
    return translated;
}

// LANTERN MULTITEXTURING - Bliki + Paper
vec3 blendLanternTextures(vec3 baseColor, vec2 texCoord, float uvPattern) {
    vec3 blikiColor = texture2D(uBlikiTexture, texCoord).rgb;
    vec3 paperColor = texture2D(uPaperTexture, texCoord).rgb;
    
    float blend = sin(uvPattern * 6.28) * 0.5 + 0.5; 
    
    vec3 blendedTexture = mix(paperColor, blikiColor, blend);
    
    return baseColor * blendedTexture;
}

vec3 applyLinearFog(vec3 color) {
    float minDistance = 10.0;
    float maxDistance = 90.0;
    vec3 fogColor = uFogColor;
    
    float distanceFromCamera = length(vPosition - uViewPos);
    float fogFactor = (maxDistance - distanceFromCamera) / (maxDistance - minDistance);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    
    return mix(fogColor, color, fogFactor);
}
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
 * @brief Calculates spotlight (рефлектор) contribution
 * @param {vec3} normal - Surface normal
 * @return {vec3} Spotlight color contribution
 */
vec3 calculateSpotlight(vec3 normal) {
    vec3 spotlightLight = vec3(0.0);
    
    if (uSpotlightIntensity > 0.0) {
        vec3 spotlightDir = normalize(uSpotlightDir);
        vec3 toFragment = normalize(vPosition - uSpotlightPos);
        float spotFactor = dot(toFragment, spotlightDir);
        
        if (spotFactor > uSpotlightAngle) {
            float spotCone = (spotFactor - uSpotlightAngle) / (1.0 - uSpotlightAngle);
            spotCone = smoothstep(0.0, 1.0, spotCone);
            
            float distance = length(vPosition - uSpotlightPos);
            float attenuation = 1.0 / (1.0 + 0.01 * distance * distance);
            
            float spotDiffuse = max(dot(normal, -toFragment), 0.0);
            spotlightLight = spotCone * attenuation * uSpotlightIntensity * uSpotlightColor * spotDiffuse;
        }
    }
    
    return spotlightLight;
}

/**
 * @brief Calculates point light (маяк) contribution with attenuation
 * @param {vec3} normal - Surface normal
 * @return {vec3} Point light color contribution
 */
vec3 calculatePointLight(vec3 normal) {
    vec3 pointLight = vec3(0.0);
    
    if (uPointLightIntensity > 0.0) {
        vec3 toLight = uPointLightPos - vPosition;
        float distance = length(toLight);
        
        if (distance < uPointLightRadius) {
            vec3 lightDir = normalize(toLight);
            float attenuation = 1.0 - (distance / uPointLightRadius);
            attenuation *= attenuation;
            float diffuse = max(dot(normal, lightDir), 0.0);
            pointLight = attenuation * uPointLightIntensity * uPointLightColor * diffuse;
        }
    }
    
    return pointLight;
}

/**
 * @brief Main fragment shader entry point
 * @details Routes to specialized shaders based on uIsWater/uIsFlower/uIsCloud flags.
 *          Falls back to standard Phong lighting for regular geometry.
 */
void main() {
    vec3 normalizedNormal = normalize(vNormal);
    vec3 lightDirection = normalize(uLightPos - vPosition);
    vec3 viewDirection = normalize(uViewPos - vPosition);

    vec3 baseColor = uObjectColor; 
    float alpha = 1.0;

    // WATER SURFACE SHADER
    if (uIsWater) {
        // Scale and animate texture coordinates for flowing water effect
        vec2 textureUV = vTexCoord * 0.15;
        float waterFlow = uTime * 0.15;
        vec2 animatedUV = textureUV + vec2(waterFlow, waterFlow * 0.3);

        // Sample texture and enhance contrast for more visible water patterns
        vec3 waterTextureSample = texture2D(uTexture, animatedUV).rgb;
        waterTextureSample = (waterTextureSample - 0.5) * 1.8 + 0.5; 
        waterTextureSample = clamp(waterTextureSample, 0.0, 1.0);

        // Blend texture with dark blue for realistic water appearance
        vec3 darkBlueWater = vec3(0.02, 0.1, 0.35);
        vec3 waterBaseColor = mix(darkBlueWater, waterTextureSample, 0.65);
        waterBaseColor.b = min(waterBaseColor.b * 1.15, 1.0); 

        // Phong lighting: ambient component
        float ambientIntensity = 0.4;
        vec3 ambientLight = ambientIntensity * waterBaseColor;
        
        // Phong lighting: diffuse component
        float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);

        vec3 diffuseLight = diffuseIntensity * baseColor * uLightColor * uLightIntensity; 
        
        // Phong lighting: specular component
        vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
        float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 64.0);
        vec3 specularLight = specularIntensity * vec3(1.0) * 0.6;

        // Combine all lighting components
        vec3 finalWaterColor = ambientLight + diffuseLight + specularLight;
        
        vec3 waterWithFog = finalWaterColor;
        if (uFogMode == 1) waterWithFog = applyFog(waterWithFog);
        else if (uFogMode == 2) waterWithFog = applyLinearFog(waterWithFog);

        vec3 balancedColor = mix(finalWaterColor, waterWithFog, 0.5);

        gl_FragColor = vec4(balancedColor, 0.9);
        return;
    }

    // FLOWER SHADER
    if (uIsFlower) {
        // Use texCoord.x to create center-to-edge color gradient on petals
        float petalGradient = clamp(vTexCoord.x, 0.0, 1.0);

        // Darker color at petal center, brighter color at edges
        vec3 petalCenterColor = uObjectColor * 0.55;
        vec3 petalEdgeColor = min(uObjectColor * 1.2, vec3(1.0));
        vec3 petalBaseColor = mix(petalCenterColor, petalEdgeColor, petalGradient);

        // Phong lighting: ambient component (subtle for soft appearance)
        float ambientIntensity = 0.25;
        vec3 ambientLight = ambientIntensity * petalBaseColor;
        
        // Phong lighting: diffuse component
        float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);
        vec3 diffuseLight = diffuseIntensity * petalBaseColor;
        
        // Phong lighting: subtle specular (soft petals don't have sharp reflections)
        vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
        float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 16.0);
        vec3 specularLight = specularIntensity * vec3(1.0) * 0.15;

        // Combine all lighting components
        vec3 finalFlowerColor = ambientLight + diffuseLight + specularLight;
        
        // Apply fog and render as fully opaque
        gl_FragColor = vec4(applyFog(finalFlowerColor), 1.0);
        return;
    }

    // CLOUD SHADER
    if (uIsCloud) {
        // Procedural cloud texture from multiple sine wave frequencies
        vec2 cloudUV = vTexCoord;
        float cloudFlow = uTime * 0.02;
        cloudUV.x += cloudFlow;

        // Combine multiple octaves of sine noise for natural cloud pattern
        float noiseSample1 = sin(cloudUV.x * 4.0 + cloudUV.y * 2.0) * 0.5 + 0.5;
        float noiseSample2 = sin(cloudUV.x * 7.0 - cloudUV.y * 3.0 + 1.5) * 0.5 + 0.5;
        float noiseSample3 = sin(cloudUV.x * 2.0 + cloudUV.y * 5.0 + 3.0) * 0.5 + 0.5;
        float cloudDensity = noiseSample1 * 0.5 + noiseSample2 * 0.3 + noiseSample3 * 0.2;

        // Calculate soft edges - fade to transparent at cloud boundaries
        float edgeFactorX = 1.0 - abs(vTexCoord.x - 0.5) * 2.0;
        float edgeFactorY = 1.0 - abs(vTexCoord.y - 0.5) * 2.0;
        edgeFactorX = max(0.0, edgeFactorX);
        edgeFactorY = max(0.0, edgeFactorY);

        // Power function creates smooth soft edge falloff
        // Higher power = sharper transition, lower power = softer fade
        float edgeFalloff = pow(edgeFactorX, 1.5) * pow(edgeFactorY, 1.5);

        // Final opacity with combined density and edge softness
        float cloudOpacity = cloudDensity * edgeFalloff * 0.55;

        // Cloud color: blend from warm gray to bright white based on density
        vec3 warmCloudColor = vec3(0.80, 0.72, 0.62);
        vec3 brightCloudColor = vec3(1.0, 0.95, 0.9);
        vec3 finalCloudColor = mix(warmCloudColor, brightCloudColor, cloudDensity);

        // Render as semi-transparent cloud
        gl_FragColor = vec4(finalCloudColor, cloudOpacity);
        return;
    }

    // STANDARD PHONG LIGHTING
    float ambientIntensity = 0.2;
    vec3 ambientLight = ambientIntensity * baseColor;

    // LANTERN MULTITEXTURING
    if (uUseLanternMultitex && uIsLantern) {
        float uvPattern = vTexCoord.x + vTexCoord.y;
        baseColor = blendLanternTextures(baseColor, vTexCoord, uvPattern);
        ambientLight = ambientIntensity * baseColor; 
    }
    
    // BIRD TEXTURE TRANSFORMATION
    if (uIsBird && uUseTexture) {
        vec2 transformedUV = transformTextureWithMatrix(vTexCoord, uTime);
        baseColor = texture2D(uTexture, transformedUV).rgb;
        ambientLight = ambientIntensity * baseColor;
    }

    // GRASS ANIMATION
    if (uUseGrassAnimation && !uIsWater) {
        vec2 animatedUV = getAnimationFrameUV(vTexCoord, uGrassCurrentFrame, uGrassGridX, uGrassGridY);
        baseColor = texture2D(uGrassAnimationSheet, animatedUV).rgb;
        ambientLight = ambientIntensity * baseColor;
    }

    float specularStrength = uUseTexture ? 0.1 : 0.5;

    // PEBBLE TEXTURE TRANSFORMATION
    if (uIsPebble && uUseTexture) {
        vec3 pebbleColor = texture2D(uTexture, vTexCoord).rgb;
        vec3 specularColor = texture2D(uSpecularMap, vTexCoord).rgb;
        
        baseColor = pebbleColor;
        specularStrength = length(specularColor) * 0.8; 
        
        ambientLight = ambientIntensity * baseColor;
    }

    // Phong lighting: diffuse component
    float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);

    vec3 diffuseLight = diffuseIntensity * baseColor;
    
    // Phong lighting: specular component
    vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
    float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 32.0);
    vec3 specularLight = specularStrength * specularIntensity * vec3(1.0);

    // SPOTLIGHT
    vec3 spotlightLight = vec3(0.0);
    if (uSpotlightIntensity > 0.0) {
        vec3 spotlightDir = normalize(uSpotlightDir);
        vec3 toFragment = normalize(vPosition - uSpotlightPos);
        float spotFactor = dot(toFragment, spotlightDir);
        
        if (spotFactor > uSpotlightAngle) {
            float spotCone = (spotFactor - uSpotlightAngle) / (1.0 - uSpotlightAngle);
            spotCone = smoothstep(0.0, 1.0, spotCone);
            
            float distance = length(vPosition - uSpotlightPos);
            float attenuation = 1.0 / (1.0 + 0.01 * distance * distance);
            
            float spotDiffuse = max(dot(normalizedNormal, -toFragment), 0.0);
            spotlightLight = spotCone * attenuation * uSpotlightIntensity * uSpotlightColor * spotDiffuse;
        }
    }

    // Combine all lighting components
    vec3 pointLight = calculatePointLight(normalizedNormal);
    vec3 finalLitColor = ambientLight + diffuseLight + specularLight + spotlightLight + pointLight;

    // Detect cabin glass windows
    float finalAlpha = 1.0;
    bool isCabinGlass = (uObjectColor.b > 0.85 && uObjectColor.r < 0.8 && uObjectColor.g > 0.8);
    if (isCabinGlass) {
        finalAlpha = 0.35;
    }
    
    // Apply fog and render with calculated alpha
    vec3 litWithFog = finalLitColor;
    if (uFogMode == 1) litWithFog = applyFog(litWithFog);
    else if (uFogMode == 2) litWithFog = applyLinearFog(litWithFog);
    gl_FragColor = vec4(litWithFog, finalAlpha);
}

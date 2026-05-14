precision mediump float;

// ── VARYING INPUTS (interpolated from vertex shader) ──────────────────────
varying vec3 vNormal;        // Surface normal vector in world space
varying vec3 vPosition;       // Fragment position in world space
varying vec2 vTexCoord;       // Texture coordinates [0-1]
varying float vTime;          // Time value from vertex shader

// ── UNIFORM INPUTS (constant for all fragments in draw call) ──────────────
uniform vec3 uLightPos;       // Light source position for Phong shading
uniform vec3 uViewPos;        // Camera position for Phong shading
uniform vec3 uObjectColor;    // Base object color when no texture used (RGB)
uniform sampler2D uTexture;   // 2D texture sampler
uniform bool uUseTexture;     // Enable/disable texture mapping
uniform float uTime;          // Animation time in seconds
uniform bool uIsWater;        // Flag: render as water surface
uniform bool uIsFlower;       // Flag: render as flower with gradient
uniform bool uIsCloud;        // Flag: render as cloud with soft edges

// ── SPOTLIGHT PARAMETERS (рефлектор) ──────────────────────────────────────
uniform vec3 uSpotlightPos;      // Позиція рефлектора (слідує за камерою)
uniform vec3 uSpotlightDir;      // Напрямок рефлектора (напрямок погляду камери)
uniform vec3 uSpotlightColor;    // Колір рефлектора (RGB)
uniform float uSpotlightIntensity; // Інтенсивність рефлектора (0-1)
uniform float uSpotlightAngle;   // Кут рефлектора в радіанах (cosine of half-angle)

// ── POINT LIGHT PARAMETERS (маяк у центрі колеса) ────────────────────────
uniform vec3 uPointLightPos;      // Позиція point light (центр колеса)
uniform vec3 uPointLightColor;    // Колір point light (RGB)
uniform float uPointLightIntensity; // Інтенсивність point light (0-1)
uniform float uPointLightRadius;  // Радіус впливу point light

// ── LANTERN MULTITEXTURING (punkt 12b) ──────────────────────────────────────
uniform sampler2D uBlikiTexture;    // Блики (світлові лучі)
uniform sampler2D uPaperTexture;    // Папір текстура
uniform bool uUseLanternMultitex;   // Флаг для ліхтаря multitexturing
uniform bool uIsLantern;            // Флаг "це ліхтарик"

// ── BIRD TEXTURE TRANSFORMATION (punkt 14b) ─────────────────────────────────
uniform bool uIsBird;               // Флаг "це птиця"

// ── GRASS ANIMATION (punkt 15b) ──────────────────────────────────────────────
uniform sampler2D uGrassAnimationSheet;   // Велика текстура з кадрами трави
uniform int uGrassGridX;                  // Кількість кадрів по X (4)
uniform int uGrassGridY;                  // Кількість кадрів по Y (4)
uniform int uGrassCurrentFrame;           // Поточний кадр (0-15)
uniform bool uUseGrassAnimation;          // Флаг: використовувати анімацію трави

uniform int uFogMode;  // 0=off, 1=exponential, 2=linear

// ✅ PUNKT 18a: ДИНАМІЧНІ СВІТЛА ──────────────────────────────────────────
uniform vec3 uLightColor;         // Колір основного світла (денне→нічне)
uniform float uLightIntensity;    // Інтенсивність основного світла (0.3→1.0)

// ✅ PUNKT 18b: ДИНАМІЧНА ТУМАНЕНЬ ────────────────────────────────────────
uniform vec3 uFogColor;           // Колір туманю (денний→нічний)
uniform float uFogDensity;        // Щільність туманю (змінюється по часу)

// ── SPECULAR MAP (punkt 12c) ──────────────────────────────────────────────
uniform sampler2D uSpecularMap;    // Specular map для каменів
uniform bool uIsPebble;            // Флаг "це камінь"

// ════════════════════════════════════════════════════════════════════════════
// ✨ SPRITE SHEET ANIMATION FUNCTION (punkt 15b) ✨
// ════════════════════════════════════════════════════════════════════════════

vec2 getAnimationFrameUV(vec2 baseUV, int frameIndex, int gridX, int gridY) {
    // Конвертуємо frameIndex у координати сітки (col, row)
    int col = frameIndex - (frameIndex / gridX) * gridX; 
    int row = frameIndex / gridX;
    
    // Розмір одного кадру у нормалізованих координатах
    float frameWidth = 1.0 / float(gridX);
    float frameHeight = 1.0 / float(gridY);
    
    // Offset для поточного кадру
    float offsetX = float(col) * frameWidth;
    float offsetY = float(row) * frameHeight;
    
    // Масштабування UV у межах одного кадру
    vec2 scaledUV = baseUV * vec2(frameWidth, frameHeight);
    
    // Додаємо offset кадру
    return scaledUV + vec2(offsetX, offsetY);
}

// ════════════════════════════════════════════════════════════════════════════
// ✨ TEXTURE TRANSFORMATION MATRIX (для птиці - punkt 14b) ✨
// ════════════════════════════════════════════════════════════════════════════

mat2 rotationMatrix(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

vec2 transformTextureWithMatrix(vec2 uv, float time) {
    // Центрирование координат [0.5, 0.5]
    vec2 centered = uv - 0.5;
    
    // 1️⃣ МАСШТАБУВАННЯ (пульсує, період ~2 сек)
    float scale = 0.7 + 0.4 * sin(time * 1.5);
    vec2 scaled = centered * scale;
    
    // 2️⃣ ПОВОРОТ (обертается, період ~4 сек)
    mat2 rotation = rotationMatrix(time * 0.8);
    vec2 rotated = rotation * scaled;
    
    // 3️⃣ ПОСУН (рухається по хвилі)
    vec2 translated = rotated + 0.5;
    translated += vec2(sin(time * 0.5) * 0.25, cos(time * 0.5) * 0.25);
    
    return translated;
}

// ════════════════════════════════════════════════════════════════════════════
// ✨ LANTERN MULTITEXTURING - Bliki + Paper (punkt 12b) ✨
// ════════════════════════════════════════════════════════════════════════════


vec3 blendLanternTextures(vec3 baseColor, vec2 texCoord, float uvPattern) {
    // Завантажь обидві текстури
    vec3 blikiColor = texture2D(uBlikiTexture, texCoord).rgb;
    vec3 paperColor = texture2D(uPaperTexture, texCoord).rgb;
    
    // Плавне змішування на основі UV координат
    float blend = sin(uvPattern * 6.28) * 0.5 + 0.5;  // Хвилі паттерну
    
    // Комбіна: папір + блики
    vec3 blendedTexture = mix(paperColor, blikiColor, blend);
    
    // Модулюй з базовим кольором
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
// ────────────────────────────────────────────────────────────────────────────
/**
 * @brief Applies exponential fog to color based on distance from camera
 * @param {vec3} color - Input color to apply fog to
 * @return {vec3} Color blended with fog
 */
vec3 applyFog(vec3 color) {
    float fogDensity = 0.012;                      // Fog intensity control
    vec3 fogColor = vec3(0.65, 0.4, 0.22);        // Warm brownish fog color

    // Calculate distance from camera to fragment
    float distanceFromCamera = length(vPosition - uViewPos);
    
    // Exponential fog formula: visibility = e^(-density * distance)
    float fogFactor = exp(-fogDensity * distanceFromCamera);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    // Interpolate between fog color and original color
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
        
        // Перевіримо чи фрагмент в межах рефлектора
        if (spotFactor > uSpotlightAngle) {
            float spotCone = (spotFactor - uSpotlightAngle) / (1.0 - uSpotlightAngle);
            spotCone = smoothstep(0.0, 1.0, spotCone);
            
            // Розраховуємо освітленість від рефлектора
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

// ────────────────────────────────────────────────────────────────────────────
/**
 * @brief Main fragment shader entry point
 * @details Routes to specialized shaders based on uIsWater/uIsFlower/uIsCloud flags.
 *          Falls back to standard Phong lighting for regular geometry.
 */
void main() {
    // 1. Загальні вектори
    vec3 normalizedNormal = normalize(vNormal);
    vec3 lightDirection = normalize(uLightPos - vPosition);
    vec3 viewDirection = normalize(uViewPos - vPosition);

    // 2. Ініціалізація базового кольору
    vec3 baseColor = uObjectColor; 
    float alpha = 1.0;

    // ────────────────────────────────────────────────────────────────────────
    // WATER SURFACE SHADER
    // ────────────────────────────────────────────────────────────────────────
    if (uIsWater) {
        // Scale and animate texture coordinates for flowing water effect
        vec2 textureUV = vTexCoord * 0.15;
        float waterFlow = uTime * 0.15;
        vec2 animatedUV = textureUV + vec2(waterFlow, waterFlow * 0.3);

        // Sample texture and enhance contrast for more visible water patterns
        vec3 waterTextureSample = texture2D(uTexture, animatedUV).rgb;
        waterTextureSample = (waterTextureSample - 0.5) * 1.8 + 0.5;  // Increase contrast
        waterTextureSample = clamp(waterTextureSample, 0.0, 1.0);

        // Blend texture with dark blue for realistic water appearance
        vec3 darkBlueWater = vec3(0.02, 0.1, 0.35);
        vec3 waterBaseColor = mix(darkBlueWater, waterTextureSample, 0.65);
        waterBaseColor.b = min(waterBaseColor.b * 1.15, 1.0);  // Enhance blue channel

        // Phong lighting: ambient component
        float ambientIntensity = 0.4;
        vec3 ambientLight = ambientIntensity * waterBaseColor;
        
        // Phong lighting: diffuse component...
        float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);

        vec3 diffuseLight = diffuseIntensity * baseColor * uLightColor * uLightIntensity; 
        
        // Phong lighting: specular component (sparkles on water)
        vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
        float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 64.0);
        vec3 specularLight = specularIntensity * vec3(1.0) * 0.6;

        // Combine all lighting components
// 1. Обчислюємо освітлену воду (як у попередньому кроці)
        vec3 finalWaterColor = ambientLight + diffuseLight + specularLight;
        
        // 2. Обчислюємо туман
        vec3 waterWithFog = finalWaterColor;
        if (uFogMode == 1) waterWithFog = applyFog(waterWithFog);
        else if (uFogMode == 2) waterWithFog = applyLinearFog(waterWithFog);

        // 3. СЕКРЕТ: Змішуємо результат із туманом та без нього.
        // Коефіцієнт 0.5 означає, що вода ніколи не стане блідішою, ніж на 50%.
        // Це збереже синій колір, але «впише» береги в загальну атмосферу.
        vec3 balancedColor = mix(finalWaterColor, waterWithFog, 0.5);

        gl_FragColor = vec4(balancedColor, 0.9);
        return;
    }

    // ────────────────────────────────────────────────────────────────────────
    // FLOWER SHADER
    // ────────────────────────────────────────────────────────────────────────
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

    // ────────────────────────────────────────────────────────────────────────
    // CLOUD SHADER
    // ────────────────────────────────────────────────────────────────────────
    if (uIsCloud) {
        // Procedural cloud texture from multiple sine wave frequencies
        vec2 cloudUV = vTexCoord;
        float cloudFlow = uTime * 0.02;
        cloudUV.x += cloudFlow;  // Horizontal animation

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
// ПЕРШЕ ОГОЛОШЕННЯ (залишаємо лише це)
    float ambientIntensity = 0.2;
    vec3 ambientLight = ambientIntensity * baseColor;

    // ✅ ЛІХТАРИК з multitexturing (punkt 12b)
    if (uUseLanternMultitex && uIsLantern) {
        float uvPattern = vTexCoord.x + vTexCoord.y;
        baseColor = blendLanternTextures(baseColor, vTexCoord, uvPattern);
        ambientLight = ambientIntensity * baseColor; 
    }
    
    // ✅ ПТИЦЯ з матричною трансформацією (punkt 14b)
    if (uIsBird && uUseTexture) {
        vec2 transformedUV = transformTextureWithMatrix(vTexCoord, uTime);
        baseColor = texture2D(uTexture, transformedUV).rgb;
        ambientLight = ambientIntensity * baseColor;
    }

    // ✅ ТРАВА з sprite sheet анімацією (punkt 15b)
    if (uUseGrassAnimation && !uIsWater) {
        vec2 animatedUV = getAnimationFrameUV(vTexCoord, uGrassCurrentFrame, uGrassGridX, uGrassGridY);
        baseColor = texture2D(uGrassAnimationSheet, animatedUV).rgb;
        ambientLight = ambientIntensity * baseColor;
    }

    float specularStrength = uUseTexture ? 0.1 : 0.5;

    // ✅ КАМЕНІ з specular map (punkt 12c) - ПІСЛЯ оголошення!
    if (uIsPebble && uUseTexture) {
        vec3 pebbleColor = texture2D(uTexture, vTexCoord).rgb;
        vec3 specularColor = texture2D(uSpecularMap, vTexCoord).rgb;
        
        baseColor = pebbleColor;
        specularStrength = length(specularColor) * 0.8;  // ← ТЕПЕР OK!
        
        ambientLight = ambientIntensity * baseColor;
    }

    // Phong lighting: diffuse component...
    float diffuseIntensity = max(dot(normalizedNormal, lightDirection), 0.0);

    vec3 diffuseLight = diffuseIntensity * baseColor;
    
    // Phong lighting: specular component (shiny reflections)
    // Strength varies: higher for non-textured objects (smoother surfaces)
    vec3 reflectionDirection = reflect(-lightDirection, normalizedNormal);
    float specularIntensity = pow(max(dot(viewDirection, reflectionDirection), 0.0), 32.0);
    vec3 specularLight = specularStrength * specularIntensity * vec3(1.0);

    // ── SPOTLIGHT (РЕФЛЕКТОР) ──
    vec3 spotlightLight = vec3(0.0);
    if (uSpotlightIntensity > 0.0) {
        vec3 spotlightDir = normalize(uSpotlightDir);
        vec3 toFragment = normalize(vPosition - uSpotlightPos);
        float spotFactor = dot(toFragment, spotlightDir);
        
        // Перевіримо чи фрагмент в межах рефлектора
        if (spotFactor > uSpotlightAngle) {
            float spotCone = (spotFactor - uSpotlightAngle) / (1.0 - uSpotlightAngle);
            spotCone = smoothstep(0.0, 1.0, spotCone);
            
            // Розраховуємо освітленість від рефлектора
            float distance = length(vPosition - uSpotlightPos);
            float attenuation = 1.0 / (1.0 + 0.01 * distance * distance);
            
            float spotDiffuse = max(dot(normalizedNormal, -toFragment), 0.0);
            spotlightLight = spotCone * attenuation * uSpotlightIntensity * uSpotlightColor * spotDiffuse;
        }
    }

    // Combine all lighting components
    vec3 pointLight = calculatePointLight(normalizedNormal);
    vec3 finalLitColor = ambientLight + diffuseLight + specularLight + spotlightLight + pointLight;

    // Detect cabin glass windows (cyan-ish color) and make semi-transparent
    float finalAlpha = 1.0;
    bool isCabinGlass = (uObjectColor.b > 0.85 && uObjectColor.r < 0.8 && uObjectColor.g > 0.8);
    if (isCabinGlass) {
        finalAlpha = 0.35;  // Semi-transparent for realistic window appearance
    }
    
    // Apply fog and render with calculated alpha
    vec3 litWithFog = finalLitColor;
    if (uFogMode == 1) litWithFog = applyFog(litWithFog);
    else if (uFogMode == 2) litWithFog = applyLinearFog(litWithFog);
    gl_FragColor = vec4(litWithFog, finalAlpha);
}

/**
 * @file configLoader.js
 * @brief Dynamically loads and manages application configuration
 * @details Supports loading from JSON file, hot-reloading with keyboard shortcuts,
 *          and provides unified access to all scene parameters
 */

let globalConfig = null;
let configReloadCallback = null;

/**
 * @brief Loads configuration from config.json file
 * @param {string} configPath - Path to config file (default: './config.json')
 * @return {Promise<Object>} Parsed configuration object
 */
export async function loadConfig(configPath = './config.json') {
    try {
        const response = await fetch(configPath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        globalConfig = await response.json();
        console.log('Configuration loaded successfully:', globalConfig);
        return globalConfig;
    } catch (error) {
        console.error('Failed to load configuration:', error);
        console.log('Using hardcoded defaults');
        return getDefaultConfig();
    }
}

/**
 * @brief Retrieves configuration section
 * @param {string} section - Configuration section name (e.g., 'ferrisWheel', 'birds')
 * @return {Object} Configuration object for the section
 */
export function getConfig(section = null) {
    if (!globalConfig) {
        console.warn('Configuration not loaded, using defaults');
        globalConfig = getDefaultConfig();
    }

    if (section) {
        return globalConfig[section] || {};
    }
    return globalConfig;
}

/**
 * @brief Gets specific configuration value
 * @param {string} path - Dot-notation path to value (e.g., 'ferrisWheel.radius')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @return {*} Configuration value
 */
export function getConfigValue(path, defaultValue = null) {
    const parts = path.split('.');
    let current = globalConfig || getDefaultConfig();

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return defaultValue;
        }
    }
    return current;
}

/**
 * @brief Updates configuration in memory
 * @param {string} path - Dot-notation path (e.g., 'ferrisWheel.radius')
 * @param {*} value - New value
 */
export function updateConfig(path, value) {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = globalConfig;

    for (const part of parts) {
        if (!(part in current)) {
            current[part] = {};
        }
        current = current[part];
    }

    current[lastPart] = value;
    console.log(`Config updated: ${path} = ${value}`);
}

/**
 * @brief Registers callback function for config reload events
 * @param {Function} callback - Function called when config is reloaded
 */
export function onConfigReload(callback) {
    configReloadCallback = callback;
}

/**
 * @brief Reloads configuration from file
 * @return {Promise<Object>} Updated configuration
 */
export async function reloadConfig(configPath = './config.json') {
    console.log('Reloading configuration');
    const config = await loadConfig(configPath);
    
    if (configReloadCallback) {
        configReloadCallback(config);
    }
    
    console.log('Configuration reloaded and applied');
    return config;
}

/**
 * @brief Returns default hardcoded configuration
 * @return {Object} Default configuration values
 */
function getDefaultConfig() {
    return {
        scene: {
            backgroundColor: [0.45, 0.25, 0.1],
            fogDensity: 0.012,
            fogColor: [0.65, 0.4, 0.22]
        },
        ferrisWheel: {
            radius: 16.0,
            cabinCount: 16,
            spokeCount: 16,
            position: [10, 0, -12],
            rotationSpeed: 0.4
        },
        terrain: {
            gridSize: 120,
            gridStep: 1,
            riverWidth: 3.0,
            bankElevationHeight: 1.5
        },
        flowers: {
            count: 300,
            terrainSize: 120
        },
        birds: {
            count: 6,
            flightSpeed: 0.4,
            flightRadius: 15
        },
        clouds: {
            count: 15,
            moveSpeed: 0.7,
            altitude: 45
        },
        lights: {
            lanternCount: 4,
            lanternDistance: 20.0,
            lanternHeight: 5.0
        },
        camera: {
            initialPosition: [0, 2, 6],
            fieldOfView: 1.047,
            nearPlane: 0.1,
            farPlane: 200.0
        }
    };
}

/**
 * @brief Sets up keyboard shortcuts for config reload
 * @param {string} reloadKey - Key to trigger reload (default: 'r')
 * @param {string} configPath - Path to config file
 */
export function setupConfigReloadHotkey(reloadKey = 'r', configPath = './config.json') {
    window.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === reloadKey) {
            event.preventDefault();
            reloadConfig(configPath);
        }
    });

    console.log(`Config reload hotkey registered: Ctrl+${reloadKey.toUpperCase()}`);
}

/**
 * @brief Validates configuration structure
 * @param {Object} config - Configuration object to validate
 * @return {boolean} True if configuration is valid
 */
export function validateConfig(config) {
    const requiredSections = ['scene', 'ferrisWheel', 'terrain', 'camera'];
    
    for (const section of requiredSections) {
        if (!(section in config)) {
            console.error(`Missing required configuration section: ${section}`);
            return false;
        }
    }

    // Validate numeric values
    if (typeof config.ferrisWheel.radius !== 'number' || config.ferrisWheel.radius <= 0) {
        console.error('ferrisWheel.radius must be positive number');
        return false;
    }

    if (typeof config.ferrisWheel.cabinCount !== 'number' || config.ferrisWheel.cabinCount < 4) {
        console.error('ferrisWheel.cabinCount must be at least 4');
        return false;
    }

    if (typeof config.terrain.gridSize !== 'number' || config.terrain.gridSize < 32) {
        console.error('terrain.gridSize must be at least 32');
        return false;
    }

    console.log('Configuration validation passed');
    return true;
}

/**
 * @brief Exports current configuration as JSON (for backup/sharing)
 * @return {string} JSON string of current configuration
 */
export function exportConfig() {
    return JSON.stringify(globalConfig || getDefaultConfig(), null, 2);
}

/**
 * @brief Imports configuration from JSON string
 * @param {string} jsonString - JSON configuration string
 * @return {boolean} True if import was successful
 */
export function importConfig(jsonString) {
    try {
        const config = JSON.parse(jsonString);
        if (validateConfig(config)) {
            globalConfig = config;
            if (configReloadCallback) {
                configReloadCallback(config);
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to import configuration:', error);
        return false;
    }
}
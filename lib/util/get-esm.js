/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
"use strict"

const DEFAULT_VALUE = false

/**
 * Gets `esm` property from a given option object.
 *
 * @param {object|undefined} option - An option object to get.
 * @returns {string[]|null} The `tryExtensions` value, or `null`.
 */
function get(option) {
    return option && option.esm === true
}

/**
 * Gets "tryExtensions" setting.
 *
 * 1. This checks `options` property, then returns it if exists.
 * 2. This checks `settings.node` property, then returns it if exists.
 * 3. This returns `[".js", ".json", ".node"]`.
 *
 * @param {RuleContext} context - The rule context.
 * @returns {string[]} A list of extensions.
 */
module.exports = function getEsm(context, optionIndex = 1) {
    return (
        get(context.options && context.options[optionIndex]) ||
        get(context.settings && context.settings.node) ||
        DEFAULT_VALUE
    )
}

module.exports.schema = {
    type: "boolean",
}

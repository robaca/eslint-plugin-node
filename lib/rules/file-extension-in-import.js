/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
"use strict"

const path = require("path")
const fs = require("fs")
const getTryExtensions = require("../util/get-try-extensions")
const getEsm = require("../util/get-esm")
const visitImport = require("../util/visit-import")
const packageNamePattern = /^(?:@[^/\\]+[/\\])?[^/\\]+$/u
const corePackageOverridePattern = /^(?:assert|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|http2|https|inspector|module|net|os|path|perf_hooks|process|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|trace_events|tty|url|util|v8|vm|worker_threads|zlib)[/\\]$/u

const TYPESCRIPT_EXTS = [".ts", ".tsx", ".d.ts"]

/**
 * Get all file extensions of the files which have the same basename.
 * @param {string} filePath The path to the original file to check.
 * @returns {string[]} File extensions.
 */
function getExistingExtensions(filePath, tryExtensions) {
    const basename = path.basename(filePath, path.extname(filePath))
    try {
        return fs
            .readdirSync(path.dirname(filePath))
            .filter(filename => filename.startsWith(`${basename}.`))
            .map(filename => filename.substring(basename.length))
    } catch (_error) {
        return []
    }
}

module.exports = {
    meta: {
        docs: {
            description:
                "enforce the style of file extensions in `import` declarations",
            category: "Stylistic Issues",
            recommended: false,
            url:
                "https://github.com/mysticatea/eslint-plugin-node/blob/v11.1.0/docs/rules/file-extension-in-import.md",
        },
        fixable: "code",
        messages: {
            requireExt: "require file extension '{{ext}}'.",
            forbidExt: "forbid file extension '{{ext}}'.",
        },
        schema: [
            {
                enum: ["always", "never"],
            },
            {
                type: "object",
                properties: {
                    tryExtensions: getTryExtensions.schema,
                    esm: getEsm.schema,
                },
                additionalProperties: {
                    enum: ["always", "never"],
                },
            },
        ],
        type: "suggestion",
    },
    create(context) {
        if (context.getFilename().startsWith("<")) {
            return {}
        }
        const defaultStyle = context.options[0] || "always"
        const overrideStyle = context.options[1] || {}
        const tryExtensions = getTryExtensions(context)
        const esm = getEsm(context)

        function verify({ filePath, name, node }) {
            // Ignore if it's not resolved to a file or it's a bare module.
            if (
                !filePath ||
                packageNamePattern.test(name) ||
                corePackageOverridePattern.test(name)
            ) {
                return
            }

            // Get extension.
            const originalExt = path.extname(name)
            const resolvedExt = path.extname(filePath)
            const existingExts = getExistingExtensions(filePath, tryExtensions)
            const typescriptExts = existingExts.filter(ext =>
                TYPESCRIPT_EXTS.includes(ext)
            )
            if (
                !resolvedExt &&
                existingExts.length !== 1 &&
                typescriptExts.length !== 1
            ) {
                // Ignore if the file extension could not be determined one.
                return
            }
            const foundExt = resolvedExt || typescriptExts[0] || existingExts[0]
            const ext =
                esm && TYPESCRIPT_EXTS.includes(foundExt) ? ".js" : foundExt
            const style = overrideStyle[ext] || defaultStyle

            // Verify.
            if (style === "always" && ext !== originalExt) {
                context.report({
                    node,
                    messageId: "requireExt",
                    data: { ext },
                    fix(fixer) {
                        if (
                            existingExts.length !== 1 &&
                            typescriptExts.length !== 1
                        ) {
                            return null
                        }
                        const index = node.range[1] - 1
                        return fixer.insertTextBeforeRange([index, index], ext)
                    },
                })
            } else if (style === "never" && ext === originalExt) {
                context.report({
                    node,
                    messageId: "forbidExt",
                    data: { ext },
                    fix(fixer) {
                        if (existingExts.length !== 1) {
                            return null
                        }
                        const index = name.lastIndexOf(ext)
                        const start = node.range[0] + 1 + index
                        const end = start + ext.length
                        return fixer.removeRange([start, end])
                    },
                })
            }
        }

        return visitImport(context, { optionIndex: 1 }, targets => {
            targets.forEach(verify)
        })
    },
}

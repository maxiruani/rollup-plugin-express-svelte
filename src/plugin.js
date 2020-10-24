import fastGlob from 'fast-glob';
import path from 'path';
import fromPairs from 'lodash/fromPairs';
import isString from 'lodash/isString';
import partition from 'lodash/partition';
import { name as pluginName } from '../package.json';

const DEFAULT_RELATIVE = 'src/';
const DEFAULT_HYDRATION = 'complete';

/**
 * @param {String} filePath
 * @return {String}
 */
function outputFileName(filePath) {
    return filePath.replace(/\.[^/.]+$/, '');
}

/**
 * Callback for transforming output file path
 *
 * @callback TransformOutputPathFn
 * @param {string} output target file name
 * @param {string} input source file name
 */

/**
 * @param {Object=}                options
 * @param {"complete"|"partial"}   options.hydration            Hydration mode
 * @param {FastGlob.Options=}      options.glob                 The fast-glob configuration object
 * @param {String=}                options.relative             The base path to remove in the dist folder
 * @param {?TransformOutputPathFn} options.transformOutputPath  Callback function to transform the destination file name before generation
 * @return {Plugin} The rollup plugin config for enable support of multi-entry glob inputs with express svelte views
 */
export default function expressSvelte(options) {
    const hydration = options.hydration || DEFAULT_HYDRATION;
    const globOptions = options.glob;
    const relative = options.relative != null ? options.relative : DEFAULT_RELATIVE;
    const transformOutputPath = options.transformOutputPath;

    return {
        pluginName,
        options: async function options(conf) {

            // Flat to enable input to be a string or an array.
            // Separate globs inputs string from others to enable input to be a mixed array too.
            const [globs, others] = partition([conf.input].flat(), isString);

            // Resolve filenames from glob inputs
            const globEntries = await fastGlob(globs, globOptions);
            const globInputs = globEntries.map(name => {
                const filepath = path.relative(relative, name);
                const isRelative = !filepath.startsWith('../');
                const relativeFilepath = (isRelative ? filepath : path.relative('./', name));

                if (transformOutputPath) {
                    return [outputFileName(transformOutputPath(relativeFilepath, name)), name];
                }
                return [outputFileName(relativeFilepath), name];
            });

            // Merge glob resolved and other inputs
            const input = Object.assign({}, fromPairs(globInputs), ...others);

            // Wrap every input depending on partial or complete hydration
            for (const [key, value] of Object.entries(input)) {

            }



            // Return the new configuration with the resolved inputs
            return {
                ...conf,
                input
            };
        }
    };
}
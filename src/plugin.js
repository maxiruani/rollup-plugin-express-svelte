import path from 'path';
import _ from 'lodash';
import { name as pluginName } from '../package.json';
import ViewFactory from "./view-factory";

const DEFAULT_HYDRATABLE = 'complete';

/**
 * @param {Object=}                options
 * @param {"complete"|"partial"}   options.hydratable    Hydration mode
 * @return {Plugin}
 */
export default function expressSvelte(options) {
    const hydratable = options.hydratable || DEFAULT_HYDRATABLE;

    return {
        pluginName,
        options: async function options(conf) {

            // Flat to enable input to be a string or an array
            const inputs = Array.isArray(conf.input) ? conf.input : [conf.input];
            const result = {};
            const promises = [];

            await ViewFactory.clear();

            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];

                if (_.isString(input) === true) {
                    const filename = path.resolve(path.join(process.cwd(), input));
                    const promise = ViewFactory.create(filename, hydratable);
                    promise.then(viewFilename => { result[input] = viewFilename });
                    promises.push(promise);
                }
                else {
                    for (const [entryOutput, entryInput] of Object.entries(input)) {
                        const filename = path.resolve(path.join(process.cwd(), entryInput));
                        const promise = ViewFactory.create(filename, hydratable );
                        promise.then(viewFilename => { result[entryOutput] = viewFilename });
                        promises.push(promise);
                    }
                }
            }

            // Wait all views to be wrapped and created
            await Promise.all(promises);

            // Return the new configuration with the new wrapped inputs
            return {
                ...conf,
                input: result
            };
        }
    };
}
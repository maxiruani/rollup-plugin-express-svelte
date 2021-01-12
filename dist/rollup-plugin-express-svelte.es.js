import path from 'path';
import _ from 'lodash';
import fs from 'fs-extra';
import svelte from 'svelte/compiler';

var name = "rollup-plugin-express-svelte";

class ViewFactory {

    static HydratableMode = {
        COMPLETE: 'complete',
        PARTIAL: 'partial'
    };

    /**
     * @return {Promise<void>}
     */
    static async clear() {
        const tmpDirname = process.cwd() + '/.rollup-plugin-express-svelte';
        await fs.remove(tmpDirname);
        await fs.ensureDir(tmpDirname);
    }

    /**
     * @param {String} rawRelativeFilename
     * @return {Promise.<String>}
     */
    static async generateCompleteSource(rawRelativeFilename) {

        return `
import { writable } from 'svelte/store';
import ViewGlobals from 'rollup-plugin-express-svelte';
import ViewComponent from '${rawRelativeFilename}';
const [ target = document.body ] = document.getElementsByClassName('view-target');
const [ anchor = null ] = document.getElementsByClassName('view-anchor');

const globalProps = window._GLOBAL_PROPS_ || {};
const globalStore = writable(window._GLOBAL_STORE_ || {});
const props = window._PROPS_ || {};

new ViewGlobals({
    target,
    anchor,
    hydrate: true,
    props: {
        globalProps,
        globalStore,
        component: ViewComponent,
        props
    }
});`;
    }

    /**
     * @param {String} rawAbsoluteFilename
     * @param {String} rawRelativeFilename
     * @return {Promise.<String>}
     */
    static async generatePartialSource(rawAbsoluteFilename, rawRelativeFilename) {

        const componentFilenames = await this.getHydratedComponents(rawFilename);

        // If there is no hydrated component, just return null
        if (componentFilenames.length === 0) {
            return '';
        }

        let str = `
import { writable } from 'svelte/store';
import ViewGlobals from 'rollup-plugin-express-svelte';
import { HydrateFragment } from 'express-svelte';

const viewComponents = [];
`;

        for (let i = 0; i < componentFilenames.length; i++) {
            const componentFilename = componentFilenames[i];
            str += `import ViewComponent${i} from '${componentFilename}';\n`;
            str += `viewComponents.push(ViewComponent${i});\n`;
        }

        str += `
const startScripts = document.querySelectorAll('script[data-type="hydrate-start"]');
const endScripts = document.querySelectorAll('script[data-type="hydrate-end"]');

if (startScripts.length !== endScripts.length) {
    console.error('Hydrate.svelte mismatch between hydrate fragments script boundaries. start.length:%s end.length:%s', startScripts.length, endScripts.length);
    return;
}

const globalProps = window._GLOBAL_PROPS_ || {};
const globalStore = writable(window._GLOBAL_STORE_ || {});
const fragmentsProps = window._PROPS_ || [];

for (let i = 0; i < startScripts.length; i++) {
    const startScript = startScripts[i];
    const endScript = endScripts[i];
    const component = viewsComponents[i];
    const props = fragmentsProps[i] != null ? fragmentsProps[i] : {};
    const target = HydrateFragment.fromBoundaries(startScript, endScript);

    new ViewGlobals({
        target,
        hydrate: true,
        props: {
            globalProps,
            globalStore,
            component,
            props
        }
    });
}`;
        return str;
    }

    /**
     * @param {String} rawFilename
     * @return {Promise.<String[]>}
     */
    static async getHydratedComponents(rawFilename) {
        // TODO: Parse rawFilename and detect components wrapped with <Hydrate /> "express-svelte" component

        const opts = { generate: false };
        const { ast, vars } = svelte.compile(rawFilename, opts);
        
        return [];
    }

    /**
     * @param {String} input
     * @param {"complete"|"partial"} [hydratableMode = "complete"]
     * @return {Promise.<String>}
     */
    static async create(input, hydratableMode) {
        const extname = path.extname(input) || null;
        const tmpDirname = process.cwd() + '/.rollup-plugin-express-svelte';
        const tmpFilename = path.join(tmpDirname, extname ? input.replace(extname, '.js') : `${input}.js`);
        const inputRelative = path.relative(path.dirname(tmpFilename), path.dirname(input)) + path.basename(input);

        let source = null;

        if (hydratableMode === this.HydratableMode.PARTIAL) {
            source = await this.generatePartialSource(input, inputRelative);
        }
        else {
            source = await this.generateCompleteSource(inputRelative);
        }

        await fs.ensureFile(tmpFilename);
        await fs.writeFile(tmpFilename, source, { enconding: 'utf-8' });
        return tmpFilename;
    }
}

const DEFAULT_HYDRATABLE = 'complete';

/**
 * @param {Object=}                options
 * @param {"complete"|"partial"}   options.hydratableMode
 * @return {Plugin}
 */
function expressSvelte(options) {
    const hydratableMode = options.hydratableMode || DEFAULT_HYDRATABLE;

    return {
        pluginName: name,
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
                    const promise = ViewFactory.create(filename, hydratableMode);
                    promise.then(viewFilename => { result[input] = viewFilename; });
                    promises.push(promise);
                }
                else {
                    for (const [entryOutput, entryInput] of Object.entries(input)) {
                        const filename = path.resolve(path.join(process.cwd(), entryInput));
                        const promise = ViewFactory.create(filename, hydratableMode);
                        promise.then(viewFilename => { result[entryOutput] = viewFilename; });
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

export default expressSvelte;

'use strict';

var path = require('path');
var _ = require('lodash');
var fs = require('fs-extra');
var svelte = require('svelte/compiler');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var ___default = /*#__PURE__*/_interopDefaultLegacy(_);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var svelte__default = /*#__PURE__*/_interopDefaultLegacy(svelte);

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
        await fs__default['default'].remove(tmpDirname);
        await fs__default['default'].ensureDir(tmpDirname);
    }

    /**
     * @param {String} rawFilename
     * @return {Promise.<String>}
     */
    static async generateCompleteSource(rawFilename) {

        return `
import { writable } from 'svelte/store';
import ViewGlobals from 'rollup-plugin-express-svelte';
import ViewComponent from '${rawFilename}';
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
     * @param {String} rawFilename
     * @return {Promise.<String>}
     */
    static async generatePartialSource(rawFilename) {

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
        const { ast, vars } = svelte__default['default'].compile(rawFilename, opts);
        
        return [];
    }

    /**
     * @param {String} input
     * @param {"complete"|"partial"} [hydratableMode = "complete"]
     * @return {Promise.<String>}
     */
    static async create(input, hydratableMode) {
        const extname = path__default['default'].extname(input) || null;
        const tmpDirname = process.cwd() + '/.rollup-plugin-express-svelte';
        const tmpFilename = path__default['default'].join(tmpDirname, extname ? input.replace(extname, '.js') : `${input}.js`);

        let source = null;

        if (hydratableMode === this.HydratableMode.PARTIAL) {
            source = await this.generatePartialSource(input);
        }
        else {
            source = await this.generateCompleteSource(input);
        }

        await fs__default['default'].ensureFile(tmpFilename);
        await fs__default['default'].writeFile(tmpFilename, source, { enconding: 'utf-8' });
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

                if (___default['default'].isString(input) === true) {
                    const filename = path__default['default'].resolve(path__default['default'].join(process.cwd(), input));
                    const promise = ViewFactory.create(filename, hydratableMode);
                    promise.then(viewFilename => { result[input] = viewFilename; });
                    promises.push(promise);
                }
                else {
                    for (const [entryOutput, entryInput] of Object.entries(input)) {
                        const filename = path__default['default'].resolve(path__default['default'].join(process.cwd(), entryInput));
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

module.exports = expressSvelte;

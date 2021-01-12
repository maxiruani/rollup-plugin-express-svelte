import path from 'path';
import fs from 'fs-extra';
import svelte from 'svelte/compiler';

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
     * @param {String} output
     * @param {"complete"|"partial"} [hydratableMode = "complete"]
     * @return {Promise.<String>}
     */
    static async create(input, output, hydratableMode) {
        const tmpDirname = process.cwd() + '/.rollup-plugin-express-svelte';
        const tmpFilename = path.join(tmpDirname, `${output}.js`);
        const inputRelative = path.relative(path.dirname(tmpFilename), path.dirname(input)) + '/' + path.basename(input);

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

export default ViewFactory;
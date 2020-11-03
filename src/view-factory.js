import path from 'path';
import fs from 'fs-extra';

const TMP_DIRNAME = __dirname + '/.tmp';
const VIEW_GLOBALS_COMPONENT_FILENAME = __dirname + '/components/ViewGlobals.svelte';

class ViewFactory {

    static Hydratable = {
        COMPLETE: 'complete',
        PARTIAL: 'partial'
    };

    /**
     * @return {Promise<void>}
     */
    static async clear() {
        await fs.remove(TMP_DIRNAME);
        await fs.ensureDir(TMP_DIRNAME);
    }

    /**
     * @param {String} rawFilename
     * @return {String}
     */
    static async generateCompleteSource(rawFilename) {
        const nl = '\n';
        let str = ``;

        str += `import { writable } from 'svelte/store';${nl}`;
        str += `import ViewComponent from '${rawFilename}';${nl}`;
        str += `import ViewGlobals from '${VIEW_GLOBALS_COMPONENT_FILENAME}';${nl}`;
        str += `const [ target = document.body ] = document.getElementsByClassName('view-target');${nl}`;
        str += `const [ anchor = null ] = document.getElementsByClassName('view-anchor');${nl}`;

        str += `
const globalProps = window._GLOBAL_PROPS_ || {};
const globalStore = writable(window._GLOBAL_STORE_ || {});
const componentProps = window._PROPS_ || {};

const app = new ViewGlobals({
    target,
    anchor,
    hydrate: true,
    props: {
        globalProps,
        globalStore,
        component: ViewComponent,
        componentProps
    }
});`;
        return str;
    }

    /**
     * @return {String}
     */
    static async generatePartialSource() {

    }

    /**
     * @param {String} input
     * @param {"complete"|"partial"} [hydratable = "complete"]
     * @return {String}
     */
    static async create(input, hydratable) {
        const tmpFilename = path.join(TMP_DIRNAME, input);

        let source = null;

        if (hydratable === this.Hydratable.PARTIAL) {
            source = await this.generatePartialSource(input);
        }
        else {
            source = await this.generateCompleteSource(input);
        }

        await fs.ensureFile(tmpFilename);
        await fs.writeFile(tmpFilename, source, { enconding: 'utf-8' });
        return tmpFilename;
    }
}

export default ViewFactory;
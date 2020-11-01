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
     * @param {String} input
     * @param {"complete"|"partial"} [hydratable = "complete"]
     * @return {String}
     */
    static async create(input, hydratable) {
        const rawFilename = path.join(process.cwd(), input);
        const tmpFilename = path.join(TMP_DIRNAME, input);

        let str = `const views = [];`;

        str += `import { writable } from 'svelte/store';`;
        str += `import ViewComponent from '${rawFilename}';`;
        str += `import ViewGlobals from '${VIEW_GLOBALS_COMPONENT_FILENAME}';`;
        str += `const [ target = document.body ] = document.getElementsByClassName('view-target');`;
        str += `const [ anchor = null ] = document.getElementsByClassName('view-anchor');`;

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

        await fs.ensureFile(tmpFilename);
        await fs.writeFile(tmpFilename, str, { enconding: 'utf-8' });
        return tmpFilename;
    }
}

export default ViewFactory;
<script>
    import { setContext } from 'svelte';

    export let component;
    export let componentProps = {};

    export let globalAssets = {};
    export let globalProps = {};
    export let globalStore = {};

    globalAssets.host = globalAssets.host || '';
    globalAssets.scripts = globalAssets.scripts || new Map();
    globalAssets.styles = globalAssets.styles || new Map();

    setContext('global.assets', globalAssets);
    setContext('global.props', globalProps);
    setContext('global.store', globalStore);
</script>

<svelte:component this={component} {...componentProps} />
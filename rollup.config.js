import json from '@rollup/plugin-json';
import pkg from './package.json';

const external = [
    ...Object.keys(pkg.dependencies),
    'svelte/compiler',
    'path'
];

export default {
    input: 'src/plugin.js',
    plugins: [json()],
    external,
    output: [
        { file: pkg.main, format: 'cjs', exports: 'auto' },
        { file: pkg.module, format: 'es' }
    ]
};
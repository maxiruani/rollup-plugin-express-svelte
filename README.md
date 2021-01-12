# rollup-plugin-express-svelte

A rollup plugin to bundle views with complete or partial hydration from [express-svelte](https://github.com/maxiruani/express-svelte) package.

*Work in progress* - Partial hydration is not working yet.

## Install
Install via npm.
```bash
npm install rollup-plugin-express-svelte --save
```

## Options

### `hydratableMode`

Type: `String`<br>
Values: `"complete"|"partial"`
Default: `"complete"`

Specifies the hydration approach to be made. `complete` will hydrate the whole view while `partial` will only hydrate components wrapped by `<Hydrate />` component.

For `complete` approach, by default the `target` value is `document.body` and the `anchor` is `null`.
If you want to customize these values, add a class `view-target` and `view-anchor` to desired elements within the [root template](https://github.com/maxiruani/express-svelte#template).
<div align = center>
  <h1>es-toolkit-webpack-plugin</h1>
  <img alt="NPM License" src="https://img.shields.io/npm/l/es-toolkit-webpack-plugin">
  <img alt="NPM Version" src="https://img.shields.io/npm/v/es-toolkit-webpack-plugin">

  Webpack 5 plugin for replacing lodash with [es-toolkit](https://github.com/toss/es-toolkit), inspired by <a href="https://github.com/wojtekmaj/vite-plugin-es-toolkit">vite-plugin-es-toolkit</a>.
</div>

> [!NOTE]
> Most of the time, using this plugin can reduce the size of the bundle (especially when using ES modules). However, it may also increase the size of the bundle in some cases. Please test it in your project before using it in production.

## Usage

```bash
npm install es-toolkit
npm install es-toolkit-webpack-plugin --save-dev
```

```javascript
// webpack.config.js
const WebpackEsToolkitPlugin = require("es-toolkit-webpack-plugin");

module.exports = {
  // ...
  plugins: [new WebpackEsToolkitPlugin.default()],
  // ...
};
```

### Supported situations

```ts
// lodash
import _ from "lodash"; // supported
import { debounce, isEqual } from "lodash"; // supported
import { debounce as _debounce } from "lodash"; // supported
import lodashIsEqual from "lodash/isEqual.js"; // supported
import _, { debounce, isEqual } from "lodash"; // supported
const _ = require("lodash"); // supported
const isEqual = require("lodash/isEqual.js"); // supported

// lodash-es
import _ from "lodash-es"; // supported
import { debounce, isEqual } from "lodash-es"; // supported
import { debounce as _debounce } from "lodash-es"; // supported
import lodashIsEqual from "lodash-es/isEqual.js"; // supported
import _, { debounce, isEqual } from "lodash-es"; // supported
const _ = require("lodash-es"); // supported
const isEqual = require("lodash-es/isEqual.js"); // supported

// lodash.*
import lodashIsEqual from "lodash.isequal"; // supported
const lodashIsEqual = require("lodash.isequal"); // supported
```

## License

MIT

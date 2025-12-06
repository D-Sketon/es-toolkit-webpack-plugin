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
  plugins: [new WebpackEsToolkitPlugin.default({
    excludes: ["isEqual"],
  })],
};


// webpack.config.mjs
import WebpackEsToolkitPlugin from "es-toolkit-webpack-plugin";
export default {
  plugins: [new WebpackEsToolkitPlugin({
    excludes: ["isEqual"],
  })],
};
```

### Options (Optional)

- `excludes`: An array of lodash methods that should not be replaced. Default: `[]`.

### Supported situations

```ts
// lodash
import _ from "lodash";
// -> import * as _ from "es-toolkit/compat";

import { debounce, isEqual } from "lodash";
// -> import { debounce, isEqual } from "es-toolkit/compat";

import { debounce as _debounce } from "lodash";
// -> import { debounce as _debounce } from "es-toolkit/compat";

import lodashIsEqual from "lodash/isEqual.js";
// -> import { isEqual as lodashIsEqual } from "es-toolkit/compat";

import _, { debounce, isEqual } from "lodash";
// -> import { debounce, isEqual } from "es-toolkit/compat";
//    import * as _ from "es-toolkit/compat";

const _ = require("lodash");
// -> const _ = require("es-toolkit/compat");

const isEqual = require("lodash/isEqual.js");
// -> const isEqual = require("es-toolkit/compat").isEqual; (< 1.39.3)
// -> const isEqual = require("es-toolkit/compat/isEqual"); (>= 1.39.3)

// lodash-es
import _ from "lodash-es";
// -> import * as _ from "es-toolkit/compat";

import { debounce, isEqual } from "lodash-es";
// -> import { debounce, isEqual } from "es-toolkit/compat";

import { debounce as _debounce } from "lodash-es";
// -> import { debounce as _debounce } from "es-toolkit/compat";

import lodashIsEqual from "lodash-es/isEqual.js";
// -> import { isEqual as lodashIsEqual } from "es-toolkit/compat";

import _, { debounce, isEqual } from "lodash-es";
// -> import { debounce, isEqual } from "es-toolkit/compat";
//    import * as _ from "es-toolkit/compat";

const _ = require("lodash-es");
// -> const _ = require("es-toolkit/compat");

const isEqual = require("lodash-es/isEqual.js");
// -> const isEqual = require("es-toolkit/compat").isEqual; (< 1.39.3)
// -> const isEqual = require("es-toolkit/compat/isEqual"); (>= 1.39.3)

// lodash.*
import lodashIsEqual from "lodash.isequal";
// -> import { isEqual as lodashIsEqual } from "es-toolkit/compat";

const lodashIsEqual = require("lodash.isequal");
// -> const lodashIsEqual = require("es-toolkit/compat").isEqual; (< 1.39.3)
// -> const lodashIsEqual = require("es-toolkit/compat/isEqual"); (>= 1.39.3);
```

## License

MIT

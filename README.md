# es-toolkit-webpack-plugin

Webpack5 plugin for replacing Lodash with es-toolkit, inspired by [vite-plugin-es-toolkit](https://github.com/wojtekmaj/vite-plugin-es-toolkit).

## Usage

```javascript
// webpack.config.js
import WebpackEsToolkitPlugin from "es-toolkit-webpack-plugin";

module.exports = {
  // ...
  plugins: [new WebpackEsToolkitPlugin()],
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
import _, { debounce, isEqual } from "lodash"; // unsupported

// lodash-es
import _ from "lodash-es"; // supported
import { debounce, isEqual } from "lodash-es"; // supported
import { debounce as _debounce } from "lodash-es"; // supported
import lodashIsEqual from "lodash-es/isEqual.js"; // supported
import _, { debounce, isEqual } from "lodash-es"; // unsupported

// lodash.*
import lodashIsEqual from 'lodash.isequal' // supported
```

## License

MIT

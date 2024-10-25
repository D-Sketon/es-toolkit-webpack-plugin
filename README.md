# es-toolkit-webpack-plugin

Webpack5 plugin for replacing Lodash with es-toolkit, inspired by [vite-plugin-es-toolkit](https://github.com/wojtekmaj/vite-plugin-es-toolkit).

## Usage

```bash
npm install es-toolkit
npm install es-toolkit-webpack-plugin
```

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
import _, { debounce, isEqual } from "lodash"; // supported

// lodash-es
import _ from "lodash-es"; // supported
import { debounce, isEqual } from "lodash-es"; // supported
import { debounce as _debounce } from "lodash-es"; // supported
import lodashIsEqual from "lodash-es/isEqual.js"; // supported
import _, { debounce, isEqual } from "lodash-es"; // supported

// lodash.*
import lodashIsEqual from "lodash.isequal"; // supported
```

## License

MIT

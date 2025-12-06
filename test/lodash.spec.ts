import { afterEach, describe, expect, it } from "vitest";
import webpack from "webpack";
import fs from "fs";
import path from "path";
import WebpackEsToolkitPlugin from "../src";

const ENTRY = path.resolve(__dirname, "test.js");
const OUTPUT = path.resolve(__dirname, "dist/main.js");

const defaultConfig: any = {
  entry: ENTRY,
  mode: "production",
  optimization: {
    minimize: false,
  },
  devtool: false,
  plugins: [new WebpackEsToolkitPlugin()],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
};

const webpackBuilder = (
  src: string,
  contains: string[],
  notContains: string[],
  done: (value?: any | PromiseLike<any>) => void,
  options?: any
) => {
  fs.writeFileSync(ENTRY, src);
  webpack({ ...defaultConfig, ...options }, (err, stats) => {
    if (err) {
      return done(Promise.reject(err));
    }
    if (stats?.hasErrors()) {
      return done(Promise.reject(new Error(stats.toString())));
    }

    try {
      const output = fs.readFileSync(OUTPUT, "utf-8");
      contains.forEach((c) => expect(output).toContain(c));
      notContains.forEach((c) => expect(output).not.toContain(c));
      done();
    } catch (error) {
      done(Promise.reject(error));
    }
  });
};

describe.sequential("lodash", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  describe("default import", () => {
    it("should replace default import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash';_.isEqual({}, {});_.isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep default import from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash';_.sortedUniq([1, 1, 2]);_.isFunction(() => {});`,
          ["Lodash <https://lodash.com/>"],
          ["/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs"],
          done
        );
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodash from 'lodash';totallynotlodash.sortedUniq([1, 1, 2]);lodash.isEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });
  });

  describe("named import", () => {
    it("should replace named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual } from 'lodash';isEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq } from 'lodash';sortedUniq([1, 1, 2])`,
          ["Lodash <https://lodash.com/>"],
          [],
          done
        );
      });
    });

    it("should replace multiple named imports from lodash with named imports from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual, isFunction } from 'lodash';isEqual({}, {});isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should replace renamed named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual } from 'lodash';lodashIsEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should replace multiple renamed named imports from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash';lodashIsEqual({}, {});lodashIsFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should replace named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq, isEqual } from 'lodash';isEqual({}, {});sortedUniq([1, 1, 2])`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "Lodash <https://lodash.com/>",
          ],
          [],
          done
        );
      });
    });
  });

  describe("import from lodash/*.js", () => {
    it("should replace default import from lodash/*.js with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import isEqual from 'lodash/isEqual.js';isEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should replace renamed default import from lodash/*.js with renamed named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodashIsEqual from 'lodash/isEqual.js';lodashIsEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep unsupported default imports from lodash/*.js", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import sortedUniq from 'lodash/sortedUniq.js';sortedUniq([1, 1, 2])`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done
        );
      });
    });
  });

  describe("default and named import", () => {
    it("should replace default and named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual } from 'lodash';_.isFunction(() => {});isEqual({}, {});`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should replace default and renamed named import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual as lodashIsEqual } from 'lodash';_.isFunction(() => {});lodashIsEqual({}, {});`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should keep unsupported default and named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq } from 'lodash';_.isFunction(() => {});sortedUniq([1, 1, 2]);`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "Lodash <https://lodash.com/>",
          ],
          [],
          done
        );
      });
    });

    it("should replace default and named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq, isEqual } from 'lodash';_.isFunction(() => {});isEqual({}, {});sortedUniq([1, 1, 2]);`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "Lodash <https://lodash.com/>",
          ],
          [],
          done
        );
      });
    });
  });

  describe("require", () => {
    it("should replace require from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash');_.isEqual({}, {});`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep require from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash');_.sortedUniq([1, 1, 2]);`,
          ["Lodash <https://lodash.com/>"],
          [],
          done
        );
      });
    });

    it("should replace require lodash/*.js from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const isEqual = require('lodash/isEqual.js');isEqual({}, {});`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep require lodash/*.js from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const sortedUniq = require('lodash/sortedUniq.js');sortedUniq([1, 1, 2]);`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done
        );
      });
    });
  });
});

describe.sequential("lodash-es", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  describe("default import", () => {
    it("should replace default import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash-es';_.isEqual({}, {});_.isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should keep default import from lodash-es if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash-es';_.sortedUniq([1, 1, 2]);_.isFunction(() => {});`,
          ["/node_modules/lodash-es/sortedUniq.js"],
          ["/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs"],
          done
        );
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodash from 'lodash-es';totallynotlodash.sortedUniq([1, 1, 2]);lodash.isEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["/node_modules/lodash-es/sortedUniq.js"],
          done
        );
      });
    });
  });

  describe("named import", () => {
    it("should replace named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual } from 'lodash-es';isEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done
        );
      });
    });

    it("should keep unsupported named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq } from 'lodash-es';sortedUniq([1, 1, 2])`,
          ["/node_modules/lodash-es/sortedUniq.js"],
          [],
          done
        );
      });
    });

    it("should replace multiple named imports from lodash-es with named imports from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual, isFunction } from 'lodash-es';isEqual({}, {});isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should replace renamed named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual } from 'lodash-es';lodashIsEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done
        );
      });
    });

    it("should replace multiple renamed named imports from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash-es';lodashIsEqual({}, {});lodashIsFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should replace named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedUniq, isEqual } from 'lodash-es';isEqual({}, {});sortedUniq([1, 1, 2])`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/lodash-es/sortedUniq.js",
          ],
          [],
          done
        );
      });
    });
  });

  describe("import from lodash-es/*.js", () => {
    it("should replace default import from lodash-es/*.js with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import isEqual from 'lodash-es/isEqual.js';isEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done
        );
      });
    });

    it("should replace renamed default import from lodash-es/*.js with renamed named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodashIsEqual from 'lodash-es/isEqual.js';lodashIsEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          [],
          done
        );
      });
    });

    it("should keep unsupported default imports from lodash-es/*.js", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import sortedUniq from 'lodash-es/sortedUniq.js';sortedUniq([1, 1, 2])`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done
        );
      });
    });
  });

  describe("default and named import", () => {
    it("should replace default and named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual } from 'lodash-es';_.isFunction(() => {});isEqual({}, {});`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done
        );
      });
    });
    it("should replace default and renamed named import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { isEqual as lodashIsEqual } from 'lodash-es';_.isFunction(() => {});lodashIsEqual({}, {});`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should keep unsupported default and named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq } from 'lodash-es';_.isFunction(() => {});sortedUniq([1, 1, 2]);`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "/node_modules/lodash-es/sortedUniq.js",
          ],
          [],
          done
        );
      });
    });

    it("should replace default and named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedUniq, isEqual } from 'lodash-es';_.isFunction(() => {});isEqual({}, {});sortedUniq([1, 1, 2]);`,
          [
            "/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs",
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/lodash-es/sortedUniq.js",
          ],
          [],
          done
        );
      });
    });
  });

  describe("require", () => {
    it("should replace require from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash-es');_.isEqual({}, {});`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          [`Lodash <https://lodash.com/>`],
          done
        );
      });
    });

    it("should keep require from lodash-es if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash-es');_.sortedUniq([1, 1, 2]);`,
          [`lodash_es_sortedUniq`],
          [],
          done
        );
      });
    });

    it("should replace require lodash-es/*.js from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const isEqual = require('lodash-es/isEqual.js');isEqual({}, {});`,
          [
            `function isEqual(a, b) {`,
            `return isEqualWith.isEqualWith(a, b, noop.noop);`,
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep require lodash-es/*.js from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const sortedUniq = require('lodash-es/sortedUniq.js');sortedUniq([1, 1, 2]);`,
          [
            "This method is like `_.uniq` except that it's designed and optimized",
          ],
          [],
          done
        );
      });
    });
  });
});

describe.sequential("lodash-separate", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  it("support function", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `import lodashIsEqual from 'lodash.isequal';lodashIsEqual({}, {});`,
        ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
        [],
        done
      );
    });
  });

  it("unsupported function", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `import lodashSortedUniq from 'lodash.sorteduniq';sortedUniq([1, 1, 2]);`,
        [
          "This method is like `_.uniq` except that it's designed and optimized",
        ],
        [],
        done
      );
    });
  });

  it("should replace require from lodash with named import from es-toolkit/compat", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `const lodashIsEqual = require('lodash.isequal');lodashIsEqual({}, {});`,
        [
          `function isEqual(a, b) {`,
          `return isEqualWith.isEqualWith(a, b, noop.noop);`,
        ],
        [`Lodash <https://lodash.com/>`],
        done
      );
    });
  });

  it("should keep require from lodash if an unsupported function is imported", () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `const lodashSortedUniq = require('lodash.sorteduniq');sortedUniq([1, 1, 2]);`,
        [
          "This method is like `_.uniq` except that it's designed and optimized",
        ],
        [],
        done
      );
    });
  });
});

describe.sequential("options", () => {
  afterEach(() => {
    try {
      fs.unlinkSync(ENTRY);
      fs.unlinkSync(OUTPUT);
    } catch {}
  });

  it('should exclude functions from "excludes" option', () => {
    return new Promise<void>((done) => {
      webpackBuilder(
        `import { isEqual, isFunction } from 'lodash';isEqual({}, {});isFunction(() => {});`,
        ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
        ["/node_modules/es-toolkit/dist/compat/predicate/isFunction.mjs"],
        done,
        {
          plugins: [new WebpackEsToolkitPlugin({ excludes: ["isFunction"] })],
        }
      );
    });
  });
});

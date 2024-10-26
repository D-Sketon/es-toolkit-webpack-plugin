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
  done: (value: void | PromiseLike<void>) => void
) => {
  fs.writeFileSync(ENTRY, src);
  webpack(defaultConfig, (err, stats) => {
    const output = fs.readFileSync(OUTPUT, "utf-8");
    contains.forEach((c) => expect(output).toContain(c));
    notContains.forEach((c) => expect(output).not.toContain(c));
    done();
  });
};

describe.sequential("lodash", () => {
  afterEach(() => {
    fs.unlinkSync(ENTRY);
    fs.unlinkSync(OUTPUT);
  });

  describe("default import", () => {
    it("should replace default import from lodash with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash';_.isEqual({}, {});_.isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep default import from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash';_.sortedIndex([30, 50], 40);_.isFunction(() => {});`,
          ["Lodash <https://lodash.com/>"],
          ["/node_modules/es-toolkit/dist/predicate/isFunction.mjs"],
          done
        );
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodash from 'lodash';totallynotlodash.sortedIndex([30, 50], 40);lodash.isEqual({}, {});`,
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
          `import { sortedIndex } from 'lodash';sortedIndex([30, 50], 40)`,
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
          ],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should replace named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedIndex, isEqual } from 'lodash';isEqual({}, {});sortedIndex([30, 50], 40)`,
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
          `import sortedIndex from 'lodash/sortedIndex.js';sortedIndex([30, 50], 40)`,
          [
            "Uses a binary search to determine the lowest index at which `value`",
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
          `import _, { sortedIndex } from 'lodash';_.isFunction(() => {});sortedIndex([30, 50], 40);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
          `import _, { sortedIndex, isEqual } from 'lodash';_.isFunction(() => {});isEqual({}, {});sortedIndex([30, 50], 40);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
          [`function isEqual(a, b) {`, `return isEqualWith(a, b, noop.noop);`],
          ["Lodash <https://lodash.com/>"],
          done
        );
      });
    });

    it("should keep require from lodash if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash');_.sortedIndex([30, 50], 40);`,
          ["Lodash <https://lodash.com/>"],
          [],
          done
        );
      });
    });

    // it("should keep require from lodash if an unsupported function is imported", () => {
    //   return new Promise<void>((done) => {
    //     const src = `const _ = require('es-toolkit/compat').isEqual;_.sortedIndex([30, 50], 40);`;

    //     fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
    //     webpack(defaultConfig, (err, stats) => {
    //       const output = fs.readFileSync(
    //         path.resolve(__dirname, "dist/main.js"),
    //         "utf-8"
    //       );
    //       // expect(output).toContain(`Lodash <https://lodash.com/>`);
    //       done();
    //     });
    //   });
    // });
  });
});

describe.sequential("lodash-es", () => {
  afterEach(() => {
    fs.unlinkSync(ENTRY);
    fs.unlinkSync(OUTPUT);
  });

  describe("default import", () => {
    it("should replace default import from lodash-es with named import from es-toolkit/compat", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash-es';_.isEqual({}, {});_.isFunction(() => {});`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should keep default import from lodash-es if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _ from 'lodash-es';_.sortedIndex([30, 50], 40);_.isFunction(() => {});`,
          ["/node_modules/lodash-es/sortedIndex.js"],
          ["/node_modules/es-toolkit/dist/predicate/isFunction.mjs"],
          done
        );
      });
    });

    it("should not raise false positives for unsupported functions", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import lodash from 'lodash-es';totallynotlodash.sortedIndex([30, 50], 40);lodash.isEqual({}, {});`,
          ["/node_modules/es-toolkit/dist/predicate/isEqual.mjs"],
          ["/node_modules/lodash-es/sortedIndex.js"],
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
          `import { sortedIndex } from 'lodash-es';sortedIndex([30, 50], 40)`,
          ["/node_modules/lodash-es/sortedIndex.js"],
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
          ],
          [],
          done
        );
      });
    });

    it("should replace named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import { sortedIndex, isEqual } from 'lodash-es';isEqual({}, {});sortedIndex([30, 50], 40)`,
          [
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/lodash-es/sortedIndex.js",
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
          `import sortedIndex from 'lodash-es/sortedIndex.js';sortedIndex([30, 50], 40)`,
          [
            "Uses a binary search to determine the lowest index at which `value`",
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
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
          `import _, { sortedIndex } from 'lodash-es';_.isFunction(() => {});sortedIndex([30, 50], 40);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
            "/node_modules/lodash-es/sortedIndex.js",
          ],
          [],
          done
        );
      });
    });

    it("should replace default and named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash-es", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `import _, { sortedIndex, isEqual } from 'lodash-es';_.isFunction(() => {});isEqual({}, {});sortedIndex([30, 50], 40);`,
          [
            "/node_modules/es-toolkit/dist/predicate/isFunction.mjs",
            "/node_modules/es-toolkit/dist/predicate/isEqual.mjs",
            "/node_modules/lodash-es/sortedIndex.js",
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
          [`function isEqual(a, b) {`, `return isEqualWith(a, b, noop.noop);`],
          [`Lodash <https://lodash.com/>`],
          done
        );
      });
    });

    it("should keep require from lodash-es if an unsupported function is imported", () => {
      return new Promise<void>((done) => {
        webpackBuilder(
          `const _ = require('lodash-es');_.sortedIndex([30, 50], 40);`,
          [`lodash_es_sortedIndex`],
          [],
          done
        );
      });
    });
  });
});

describe.sequential("lodash-separate", () => {
  afterEach(() => {
    fs.unlinkSync(ENTRY);
    fs.unlinkSync(OUTPUT);
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
        `import lodashSortedIndex from 'lodash.sortedindex';sortedIndex([30, 50], 40);`,
        ["Uses a binary search to determine the lowest index at which `value`"],
        [],
        done
      );
    });
  });
});

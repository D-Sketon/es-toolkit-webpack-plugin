import { describe, expect, it } from "vitest";
import webpack from "webpack";
import fs from "fs";
import path from "path";
import WebpackEsToolkitPlugin from "../src";
import { VueLoaderPlugin } from "vue-loader";

const defaultConfig: any = {
  mode: "production",
  optimization: {
    minimize: false,
  },
  devtool: false,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
};

describe("loader", () => {
  it("vue-loader", () => {
    return new Promise<void>((done) => {
      const vueSrc = `<template>
  <div>{{ value }}</div>
</template>

<script setup>
import _ from 'lodash';
import { ref } from 'vue';

const value = ref(_.isEqual({}, {}));
</script>`;

      fs.writeFileSync(path.resolve(__dirname, "test.vue"), vueSrc);

      const src = `import { createApp } from 'vue';
import App from './test.vue';

createApp(App).mount('#app');`;
      fs.writeFileSync(path.resolve(__dirname, "test.js"), src);
      webpack(
        {
          ...defaultConfig,
          plugins: [new VueLoaderPlugin(), new WebpackEsToolkitPlugin()],
          entry: path.resolve(__dirname, "test.js"),
          module: {
            rules: [
              {
                test: /\.vue$/,
                loader: "vue-loader",
              },
            ],
          },
        },
        (err, stats) => {
          const output = fs.readFileSync(
            path.resolve(__dirname, "dist/main.js"),
            "utf-8"
          );
          expect(output).toContain(
            `./node_modules/es-toolkit/dist/predicate/isEqual.mjs`
          );
          expect(output).not.toContain(`Lodash <https://lodash.com/>`);
          done();

          fs.unlinkSync(path.resolve(__dirname, "test.js"));
          fs.unlinkSync(path.resolve(__dirname, "test.vue"));
          fs.unlinkSync(path.resolve(__dirname, "dist/main.js"));
        }
      );
    });
  });
});

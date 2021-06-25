import { babel } from "@rollup/plugin-babel"
import { terser } from "rollup-plugin-terser"

export default {
  input: "src/index.js",

  output: [
    {
      file: "dist/index.js",
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "Taproot",
      sourcemap: true,
    }
  ],

  plugins: [
    babel({ babelHelpers: "bundled" }),
    terser(),
  ],
}

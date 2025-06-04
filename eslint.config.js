import js from '@eslint/js';
import globals from 'globals';
import pluginSecurity from 'eslint-plugin-security';
import nodePlugin from 'eslint-plugin-n';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      security: pluginSecurity,
      n: nodePlugin,
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      ...pluginSecurity.configs.recommended.rules,
      ...nodePlugin.configs.recommended.rules,

      //* Best Practices
      eqeqeq: 'warn',
      'no-invalid-this': 'error',
      'no-return-assign': 'error',
      'no-unused-expressions': ['error', { allowTernary: true }],
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'no-constant-condition': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: 'req|res|next|__' }],
      //* Enhance Readability
      indent: ['error', 2, { SwitchCase: 1 }],
      'no-mixed-spaces-and-tabs': 'warn',
      'space-before-blocks': 'error',
      'space-in-parens': 'error',
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      // "quotes": ["error", "single"],
      //
      'max-len': ['error', { code: 200 }],
      'max-lines': ['error', { max: 500 }],
      'keyword-spacing': 'error',
      'multiline-ternary': ['error', 'never'],
      'no-mixed-operators': 'error',
      //
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-whitespace-before-property': 'error',
      'nonblock-statement-body-position': 'error',
      'object-property-newline': [
        'error',
        { allowAllPropertiesOnSameLine: true },
      ],

      'prettier/prettier': [
        'warn',
        {
          singleQuote: true,
          trailingComma: 'es5',
        },
      ],
    },
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    ignores: ['eslint.config.js'],
  },
];

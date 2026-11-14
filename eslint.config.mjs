// ioBroker eslint template configuration file for js and ts files
// Please note that esm or react based modules need additional modules loaded.
import config from '@iobroker/eslint-config';

export default [
	...config,
	{
		// specify files to exclude from linting here
		ignores: [
			'.dev-server/',
			'.vscode/',
			'*.test.js',
			'test/**/*.js',
			'*.config.mjs',
			'build',
			'dist',
			'admin/words.js',
			'admin/admin.d.ts',
			'admin/blockly.js',
			'admin/vite.config.ts',
			'admin/index.js', 
			'**/adapter-config.d.ts',
			'widgets/**/*.js',
			'admin/build',
			'scripts/',
			'workflows',
			'nodes_modules'
		],
	},
	{
		// you may disable some 'jsdoc' warnings - but using jsdoc is highly recommended
		// as this improves maintainability. jsdoc warnings will not block build process.
		rules: {
			 'jsdoc/require-jsdoc': 'off',
			 'jsdoc/require-param': 'off',
			 'jsdoc/require-param-description': 'off',
			 'jsdoc/require-returns-description': 'off',
			 'jsdoc/require-returns-check': 'off',
			 "@typescript-eslint/explicit-function-return-type": 'warn' ,
			 "@typescript-eslint/no-unused-vars": "warn",
			 "@typescript-eslint/explicit-module-boundary-types": "warn",
		},
	},
];
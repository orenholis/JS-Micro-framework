import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

const projectStyle = {
	rules: {
		'object-pattern-one-line': {
			meta: {
				type: 'layout',
				fixable: 'whitespace',
				schema: [],
				messages: {
					multiline: 'Destrukturování objektu musí být na jednom řádku.',
				},
			},
			create(context) {
				return {
					ObjectPattern(node) {
						if (node.loc.start.line === node.loc.end.line) return;

						context.report({
							node,
							messageId: 'multiline',
							fix(fixer) {
								const source = context.sourceCode;
								const tokens = source.getTokens(node, { includeComments: true });
								const fixes = [];

								for (let index = 1; index < tokens.length; index += 1) {
									const previous = tokens[index - 1];
									const current = tokens[index];
									const whitespace = source.text.slice(previous.range[1], current.range[0]);

									if (/\r?\n/.test(whitespace)) {
										fixes.push(fixer.replaceTextRange(
											[previous.range[1], current.range[0]],
											' ',
										));
									}
								}

								return fixes;
							},
						});
					},
				};
			},
		},
	},
};

export default [
	{
		ignores: ['.data/**', 'dist/**', 'node_modules/**'],
	},
	js.configs.recommended,
	{
		files: ['**/*.js', '**/*.mjs'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		plugins: {
			'@stylistic': stylistic,
			project: projectStyle,
		},
		rules: {
			'@stylistic/array-bracket-spacing': ['error', 'never'],
			'@stylistic/arrow-spacing': 'error',
			'@stylistic/block-spacing': 'error',
			'@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
			'@stylistic/comma-dangle': ['error', 'always-multiline'],
			'@stylistic/comma-spacing': 'error',
			'@stylistic/comma-style': ['error', 'last'],
			'@stylistic/eol-last': 'error',
			'@stylistic/indent': ['error', 'tab', { SwitchCase: 1 }],
			'@stylistic/key-spacing': 'error',
			'@stylistic/keyword-spacing': ['error', { before: true, after: true }],
			'@stylistic/no-mixed-spaces-and-tabs': 'error',
			'@stylistic/no-multi-spaces': 'error',
			'@stylistic/no-tabs': 'off',
			'@stylistic/no-trailing-spaces': 'error',
			'@stylistic/object-curly-newline': ['error', { ObjectPattern: 'never' }],
			'@stylistic/object-curly-spacing': ['error', 'always'],
			'@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'always' }],
			'@stylistic/semi': ['error', 'always'],
			'@stylistic/space-before-blocks': 'error',
			'@stylistic/space-before-function-paren': ['error', {
				anonymous: 'never',
				asyncArrow: 'always',
				named: 'never',
			}],
			'@stylistic/space-in-parens': ['error', 'never'],
			'@stylistic/space-infix-ops': 'error',
			'@stylistic/template-curly-spacing': ['error', 'never'],
			'project/object-pattern-one-line': 'error',
		},
	},
];

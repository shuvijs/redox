module.exports = {
	preset: 'ts-jest/presets/js-with-ts',
	setupFiles: ['<rootDir>/scripts/setupJest.ts'],
	verbose: true,
	forceExit: false,
	bail: false,
	globals: {
		'ts-jest': {
			tsconfig: {
				jsx: 'react',
				allowJs: true,
				target: 'es6',
				lib: ['dom', 'esnext'],
				module: 'commonjs',
				moduleResolution: 'node',
				skipLibCheck: true,
				esModuleInterop: true,
				noUnusedLocals: false,
				noUnusedParameters: false,
			},
		},
	},
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	rootDir: __dirname,
	moduleNameMapper: {
		'^@shuvi/(.*?)$': '<rootDir>/packages/$1/src',
	},
	testMatch: ['<rootDir>/packages/**/__tests__/**/*.test.[jt]s?(x)'],
}

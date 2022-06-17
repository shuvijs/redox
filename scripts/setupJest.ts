process.on('unhandledRejection', (err) => {
	throw err
})
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

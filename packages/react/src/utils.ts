const objectToString = Object.prototype.toString

export const shadowEqual = (a: any, b: any) => {
	if (
		objectToString.call(a) !== '[object Object]' ||
		objectToString.call(b) !== '[object Object]'
	) {
		return a === b
	}

	if (Object.keys(a).length !== Object.keys(b).length) {
		return false
	}

	return Object.keys(a).every((key) => a[key] === b[key])
}

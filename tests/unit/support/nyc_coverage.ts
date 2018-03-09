export function printPath() {
	const a = process.cwd();
	if (a)
		console.log(process.cwd());
}

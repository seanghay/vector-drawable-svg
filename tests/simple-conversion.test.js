const { transform } = require('..');
const path = require('path');
const fs = require('fs');

const vectorDrawablesDir = path.join(__dirname, 'drawables');
const svgsDir = path.join(__dirname, 'svgs');

function readText(file) {
    return fs.readFileSync(file, 'utf8');
}

fs.readdirSync(vectorDrawablesDir).forEach(filename => {
    test('comparing file: ' + filename, () => {

        const vdPath = path.join(vectorDrawablesDir, filename);
        const svgPath = path.join(svgsDir, filename.split('.').reverse().pop() + '.svg');

        const svgContent = readText(svgPath);
        const vdContent = readText(vdPath);
        const outputSVG = transform(vdContent, {
					override: {
						'@color/colorPrimary': '#ed288a',
						'@dimen/size_24dp': '24dp',
						'?android:attr/textColorPrimary': '#fff',
					}
				});
        expect(svgContent).toBe(outputSVG);
    });
})

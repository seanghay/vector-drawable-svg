const { convertHexColor } = require('..');

describe('convertHexColor', () => {
	test('when passed undefined as argb and no opacity, it returns undefined and 1', () => {
		expect(convertHexColor(undefined)).toEqual([undefined, 1]);
	});

	test('when passed undefined as argb and an opacity string, it returns undefined and the opacity as float', () => {
		expect(convertHexColor(undefined, '0.2')).toEqual([undefined, 0.2]);
	});

	test('when passed a too short argb and an opacity string, it returns the argb unchanged and the opacity as float', () => {
		expect(convertHexColor('#a', '0.2')).toEqual(['#a', 0.2]);
	});

	test('when passed a four-digit argb and no opacity, it returns rgb and alpha', () => {
		expect(convertHexColor('#9ac0')).toEqual(['#ac0', 0.6]);
	});

	test('when passed a four-digit argb and opacity, it returns rgb and alpha multiplied by opacity', () => {
		expect(convertHexColor('#9ac0', 0.5)).toEqual(['#ac0', 0.3]);
	});

	test('when passed an eight-digit argb and no opacity, it returns rgb and alpha', () => {
		expect(convertHexColor('#ccabcd01')).toEqual(['#abcd01', 0.8]);
	});

	test('when passed an eight-digit argb and opacity, it returns rgb and alpha multiplied by opacity', () => {
		expect(convertHexColor('#ccabcd01', 0.5)).toEqual(['#abcd01', 0.4]);
	});

	test('when passed opacity equal to 0, it returns alpha equal to 0', () => {
		expect(convertHexColor('#9ac0', 0)).toEqual(['#ac0', 0]);
		expect(convertHexColor('#ccabcd01', 0)).toEqual(['#abcd01', 0]);
	});

	test('when passed opacity equal to 1, it returns alpha from argb unchanged ', () => {
		expect(convertHexColor('#9ac0', 1)).toEqual(['#ac0', 0.6]);
		expect(convertHexColor('#ccabcd01', 1)).toEqual(['#abcd01', 0.8]);
	});

	test('when passed argb with alpha equal to 0xff, it returns alpha equal to 1', () => {
		expect(convertHexColor('#fac0', 1)).toEqual(['#ac0', 1]);
		expect(convertHexColor('#ffabcd01', 1)).toEqual(['#abcd01', 1]);
	});

	test('when passed transparent black, it returns transparent black', () => {
		expect(convertHexColor('#0000')).toEqual(['#000', 0]);
		expect(convertHexColor('#00000000')).toEqual(['#000000', 0]);
	});

	test('when passed an argb with invalid rgb digits and valid alpha digits, it returns the invalid rgb and the valid opacity', () => {
		expect(convertHexColor('#9xyz')).toEqual(['#xyz', 0.6]);
		expect(convertHexColor('#ccuvwxyz')).toEqual(['#uvwxyz', 0.8]);
	});

	test('when passed an argb with invalid rgb digits and invalid alpha digits, it returns the invalid rgb and opacity unchanged', () => {
		expect(convertHexColor('#wxyz')).toEqual(['#xyz', 1]);
		expect(convertHexColor('#stuvwxyz')).toEqual(['#uvwxyz', 1]);
		expect(convertHexColor('#wxyz', 0.1)).toEqual(['#xyz', 0.1]);
		expect(convertHexColor('#stuvwxyz', 0.2)).toEqual(['#uvwxyz', 0.2]);
	});
});

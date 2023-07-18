const { parseAndroidResource } = require('../src/vector-drawable-svg.js')

describe("transform android resources to map", () => {
	it("should transform xml to map", () => {
		const input = `
		<?xml version="1.0" encoding="utf-8"?>
		<resources>
				<color name="colorPrimary">#CE3168</color>
				<color name="colorPrimaryDark">#b9275a</color>
				<color name="colorAccent">#CE3168</color>
				<color name="ucrop_color_toolbar">@color/colorPrimary</color>
				<color name="ucrop_color_statusbar">@color/colorPrimaryDark</color>
				<color name="ucrop_color_widget_active">@color/colorPrimary</color>
		</resources>
		`

		const result = parseAndroidResource(input)
		expect(result).toMatchObject({
			"@color/colorAccent": "#CE3168",
			"@color/colorPrimary": "#CE3168",
			"@color/colorPrimaryDark": "#b9275a",
			"@color/ucrop_color_statusbar": "#b9275a",
			"@color/ucrop_color_toolbar": "#CE3168",
			"@color/ucrop_color_widget_active": "#CE3168",
		})
	})
})

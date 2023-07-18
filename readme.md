## Installation & Usage

Install

```sh
npm install vector-drawable-svg
```

```js
const { transform } = require('vector-drawable-svg');

const svgContent = transform(vectorDrawbleContent, {
	pretty: true,
	override: {
		'@color/colorPrimary': '#00ff00',
		'@color/colorSecondary': '#00ff00',
		'?android:attr/textColorPrimary': 'white',
	});
```

Using on Bash

```sh
npm install -g vector-drawable-svg
```



```sh
vd2svg my-drawable.xml file.svg
```


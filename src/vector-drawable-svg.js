const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const pathTransformers = [
	vdAttrs => {
		return { d: vdAttrs['android:pathData'] };
	},
	vdAttrs => {
		const [hex, alpha] = convertHexColor(
			vdAttrs['android:fillColor'],
			vdAttrs['android:fillAlpha']
		);
		return { fill: hex, 'fill-opacity': alpha !== 1 ? alpha : null };
	},
	vdAttrs => {
		return { 'stroke-linejoin': vdAttrs['android:strokeLineJoin'] };
	},
	vdAttrs => {
		return { 'stroke-linecap': vdAttrs['android:strokeLineCap'] };
	},
	vdAttrs => {
		return { 'stroke-miterlimit': vdAttrs['android:strokeMiterLimit'] };
	},
	vdAttrs => {
		const [hex, alpha] = convertHexColor(
			vdAttrs['android:strokeColor'],
			vdAttrs['android:strokeAlpha']
		);
		return { stroke: hex, 'stroke-opacity': alpha !== 1 ? alpha : null };
	},
	vdAttrs => {
		return { 'stroke-width': vdAttrs['android:strokeWidth'] };
	},
	vdAttrs => {
		return {
			'fill-rule':
				vdAttrs['android:fillType'] &&
				vdAttrs['android:fillType'].toLowerCase(),
		};
	},
];

const groupTransformers = [
	vdAttrs => {
		return { id: vdAttrs['android:name'] };
	},
	vdAttrs => {
		const t = [];

		const translateX = vdAttrs['android:translateX'] || 0;
		const translateY = vdAttrs['android:translateY'] || 0;
		if (translateX !== 0 || translateY !== 0) {
			t.push(`translate(${translateX}, ${translateY})`);
		}

		const rotation = vdAttrs['android:rotation'] || 0;
		if (rotation !== 0) {
			t.push(`rotate(${rotation})`);
		}

		const scaleX = vdAttrs['android:scaleX'] || 1;
		const scaleY = vdAttrs['android:scaleY'] || 1;
		if (scaleX !== 1 || scaleY !== 1) {
			t.push(`scale(${scaleX}, ${scaleY})`);
		}

		const pivotX = vdAttrs['android:pivotX'] || 0;
		const pivotY = vdAttrs['android:pivotY'] || 0;
		if (pivotX !== 0 || pivotY !== 0) {
			// TODO: Have no idea for now :(
		}

		return { transform: t.join(' ') || null };
	},
];

const gradientTransformers = [
	vdAttrs => {
		return { x1: vdAttrs['android:startX'] };
	},
	vdAttrs => {
		return { y1: vdAttrs['android:startY'] };
	},
	vdAttrs => {
		return { x2: vdAttrs['android:endX'] };
	},
	vdAttrs => {
		return { y2: vdAttrs['android:endY'] };
	},
	vdAttrs => {
		return { cx: vdAttrs['android:centerX'] };
	},
	vdAttrs => {
		return { cy: vdAttrs['android:centerY'] };
	},
	vdAttrs => {
		return { r: vdAttrs['android:gradientRadius'] };
	},
];

const gradientItemTransformers = [
	vdAttrs => {
		const [hex, alpha] = convertHexColor(vdAttrs['android:color']);
		return { 'stop-color': hex, 'stop-opacity': alpha !== 1 ? alpha : null };
	},
	vdAttrs => {
		return { offset: vdAttrs['android:offset'] };
	},
];

/**
 * Parse Android XML Resources and returns an object.
 * @param {string | undefined} value
 * @returns {Object.<string, string>}
 */
exports.parseAndroidResource = function (value) {
	if (typeof value !== 'string') return;
	const parser = new DOMParser()
	const doc = parser.parseFromString(value)
	const resourcesNode = doc.getElementsByTagName("resources")[0]
	if (!resourcesNode) return;
	const map = new Map()

	for (let i = 0; i < resourcesNode.childNodes.length; i++) {
		const node = resourcesNode.childNodes[i];
		if (node.nodeType !== 1) continue // if the current node is not Element, continue
		if (node.firstChild.nodeType !== 3) continue; // if the first child is not TextNode, continue
		const key = `@${node.tagName}/${node.getAttribute("name")}`
		const value = node.textContent
		map.set(key, value)
	}

	// resolve references
	for (const [key, value] of map.entries()) {
		if (/\@\w+\/\w+/g.test(value)) {
			if (map.has(value)) {
				map.set(key, map.get(value))
			}
		}
	}

	return Object.fromEntries(map.entries())
}

function transformAttributes(vdNode, svgNode, transformers) {
	const vdAttrs = Object.fromEntries(
		Array.from(vdNode.attributes).map(attr => [attr.name, attr.value])
	);
	transformers.forEach(transformer => {
		const svgAttrs = transformer(vdAttrs);
		Object.entries(svgAttrs).forEach(([name, value]) => {
			if (value !== undefined && value !== null) {
				svgNode.setAttribute(name, value);
			}
		});
	});
}

function parsePath(root, pathNode) {
	const svgPath = root.createElement("path");
	svgPath.setAttribute("fill", "none");

	transformAttributes(pathNode, svgPath, pathTransformers);

	return svgPath;
}

function parseGradient(root, gradientNode) {
	const type = gradientNode.getAttribute('android:type');

	const svgGradient = function (type) {
		switch (type) {
			case 'linear':
				return root.createElement("linearGradient");
			case 'radial':
				return root.createElement("radialGradient");
			case 'sweep':
				throw new Error("Sweep gradient is not compatible by SVG");
			default:
				throw new Error("invalid gradient type");
		}
	}(type);

	svgGradient.setAttribute('gradientUnits', 'userSpaceOnUse');

	transformAttributes(gradientNode, svgGradient, gradientTransformers);

	Array.from(gradientNode.childNodes).forEach(it => {
		if (it.tagName === 'item') {
			const svgGradientStop = root.createElement('stop');

			transformAttributes(it, svgGradientStop, gradientItemTransformers);

			svgGradient.appendChild(svgGradientStop);
		}
	});

	return svgGradient;
}

function transformNode(node, parent, root, defs) {

	if (node.tagName === 'path') {
		const svgPath = parsePath(root, node);

		Array.from(node.childNodes).forEach(it => {
			if (it.tagName === 'aapt:attr') {
				const attrName = it.getAttribute('name');
				switch (attrName) {
					case 'android:fillColor':
					case 'android:strokeColor':

						Array.from(it.childNodes).forEach(childNode => {
							if (childNode.tagName === 'gradient') {
								const svgGradient = parseGradient(root, childNode);

								if (svgGradient) {
									const size = defs.childNodes.length;
									const gradientId = `gradient_${size}`;

									svgGradient.setAttribute('id', gradientId);
									defs.appendChild(svgGradient);

									const svgAttrName =
										attrName == 'android:fillColor' ? 'fill' : 'stroke';
									svgPath.setAttribute(svgAttrName, `url(#${gradientId})`);
								}
							}
						});

						break;
					default:
						break;
				}
			}
		});

		return svgPath;
	}

	if (node.tagName === 'group') {
		const groupNode = root.createElement('g');

		transformAttributes(node, groupNode, groupTransformers);

		let prevClipPathId = null;

		Array.from(node.childNodes).forEach(it => {
			const childPath = transformNode(it, node, root, defs);

			if (childPath) {
				const clipPathNode = childPath.clipPathNode
				if (clipPathNode) {
					if (defs) {
						const size = defs.childNodes.length
						prevClipPathId = `clip_path_${size}`
						clipPathNode.setAttribute('id', prevClipPathId);
						defs.appendChild(clipPathNode);
					}
					return;
				}

				if (prevClipPathId) {
					childPath.setAttribute('clip-path', `url(#${prevClipPathId})`);
					prevClipPathId = null;
				}

				groupNode.appendChild(childPath);
			}
		});

		return groupNode;
	}

	if (node.tagName === 'clip-path') {
		const pathData = node.getAttribute('android:pathData');
		const svgClipPathNode = root.createElement('clipPath');
		const path = root.createElement('path');

		path.setAttribute('d', pathData);
		svgClipPathNode.appendChild(path);

		const n = new XMLSerializer().serializeToString(svgClipPathNode);
		return { clipPathNode: svgClipPathNode }
	}

	return null;
}

function removeDimenSuffix(dimen) {
	dimen = dimen.trim();

	if (!dimen) {
		return dimen;
	}

	if (!isNaN(+dimen)) {
		return dimen;
	}

	if (typeof dimen === 'string') {
		return dimen.substring(0, dimen.length - 2);
	}

	return dimen;
}

function convertHexColor(argb, opacityStr = '1') {
	const digits = argb && argb.replace(/^#/, '');
	const opacity = parseFloat(opacityStr);

	if (!digits || (digits.length !== 4 && digits.length !== 8)) {
		return [argb, opacity];
	}

	let red, green, blue, alpha;
	if (digits.length === 4) {
		alpha = parseInt(digits[0].repeat(2), 16) / 255;
		red = digits[1];
		green = digits[2];
		blue = digits[3];
	} else {
		alpha = parseInt(digits.substr(0, 2), 16) / 255;
		red = digits.substr(2, 2);
		green = digits.substr(4, 2);
		blue = digits.substr(6, 2);
	}
	return [
		'#' + red + green + blue,
		(Number.isFinite(alpha) ? alpha : 1) * opacity,
	];
}

exports.convertHexColor = convertHexColor;

exports.transform = function (content, options = {}) {
	const override = options.override
	const parser = new DOMParser();
	const doc = parser.parseFromString(content);

	if (override && typeof override === 'object') {

		function traverse(node, callback) {
			callback(node)

			if (node.childNodes) {
				const children = node.childNodes;
				for (let i = 0; i < children.length; i++) {
					traverse(children[i], callback)
				}
			}
		}

		traverse(doc, node => {
			if (!node.attributes) return
			for (const attr of Array.from(node.attributes)) {
				const attrValue = node.getAttribute(attr.name)
				if (attrValue in override) {
					node.setAttribute(attr.name, override[attrValue])
				}
			}
		})
	}

	const vectorDrawables = doc.getElementsByTagName("vector");
	if (vectorDrawables.length !== 1) {
		throw new Error("VectorDrawable is invalid");
	}

	const vectorDrawable = vectorDrawables[0];

	const viewportWidth = vectorDrawable.getAttribute("android:viewportWidth");
	const viewportHeight = vectorDrawable.getAttribute("android:viewportHeight");

	const outputWidth = removeDimenSuffix(vectorDrawable.getAttribute('android:width'))
	const outputHeight = removeDimenSuffix(vectorDrawable.getAttribute('android:height'));

	const svgNode = doc.createElement("svg");

	svgNode.setAttribute('id', 'vector')
	svgNode.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	svgNode.setAttribute("width", outputWidth || viewportWidth);
	svgNode.setAttribute("height", outputHeight || viewportHeight);
	svgNode.setAttribute("viewBox", `0 0 ${viewportWidth} ${viewportHeight}`);

	const childrenNodes = Array.from(doc.documentElement.childNodes).filter(it => it.tagName);

	const defsNode = doc.createElement('defs');
	const nodes = childrenNodes.map(it => transformNode(it, doc.documentElement, doc, defsNode));

	if (defsNode.childNodes.length) {
		svgNode.appendChild(defsNode);
	}

	const nodeIndices = {
		g: 0,
		path: 0,
	}

	nodes.forEach(node => {
		const id = node.getAttribute('id');

		const currentId = nodeIndices[node.tagName];

		if (typeof currentId === 'number') {
			nodeIndices[node.tagName] = currentId + 1;
		}

		node.setAttribute('id', id || `${node.tagName}_${currentId}`);
		svgNode.appendChild(node);

	});

	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(svgNode);

	if (options) {
		if (options.pretty) {
			return require('xml-formatter')(svgString);
		}
	}

	return svgString;
}

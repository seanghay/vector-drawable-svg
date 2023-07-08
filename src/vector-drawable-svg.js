const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const attributesMap = {
    "android:pathData": "d",
    "android:fillColor": "fill",
    "android:strokeLineJoin": "stroke-linejoin",
    "android:strokeLineCap": "stroke-linecap",
    "android:strokeMiterLimit": "stroke-miterlimit",
    "android:strokeWidth": "stroke-width",
    "android:strokeColor": "stroke",
    "android:fillType": "fill-rule",
    "android:fillAlpha": "fill-opacity",
    "android:strokeAlpha": "stroke-opacity"
};

const attributeTransforms = {
    'android:fillType': (value) => value && value.toLowerCase(),
    'android:fillColor': convertHexColor,
    'android:strokeColor': convertHexColor,
}

const groupAttrsMap = {
    'android:name': 'id',
    'android:pivotX': { transform: 'pivotX' },
    'android:pivotY': { transform: 'pivotX' },
    'android:rotation': { transform: 'rotation' },
    'android:scaleX': { transform: 'scaleX' },
    'android:scaleY': { transform: 'scaleY' },
    'android:translateX': { transform: 'translateX' },
    'android:translateY': { transform: 'translateY' },
}

const gradientAttrsMap = {
    "android:startX": "x1",
    "android:startY": "y1",
    "android:endX": "x2",
    "android:endY": "y2",
    "android:centerX": "cx",
    "android:centerY": "cy",
    "android:gradientRadius": "r",
}

const gradientItemAttrsMap = {
    "android:color": "stop-color",
    "android:offset": "offset",
}

const gradientItemAttrsTransforms = {
    'android:color': convertHexColor,
}

function parsePath(root, pathNode) {
    const svgPath = root.createElement("path");
    svgPath.setAttribute("fill", "none");

    Array.from(pathNode.attributes).forEach((attr) => {
        const svgAttrName = attributesMap[attr.name];
        const transformer = attributeTransforms[attr.name];
        if (svgAttrName) {
            const svgAttrValue = transformer ? transformer(attr.value) : attr.value;
            svgPath.setAttribute(svgAttrName, svgAttrValue);
        }
    });

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

    Array.from(gradientNode.attributes).forEach((attr) => {
        const svgAttrName = gradientAttrsMap[attr.name];
        if (svgAttrName) {
            const svgAttrValue = attr.value;
            svgGradient.setAttribute(svgAttrName, svgAttrValue);
        }
    });

    Array.from(gradientNode.childNodes).forEach(it => {
        if (it.tagName === 'item') {
            const svgGradientStop = root.createElement('stop');

            Array.from(it.attributes).forEach((attr) => {
                const svgAttrName = gradientItemAttrsMap[attr.name];
                const transformer = gradientItemAttrsTransforms[attr.name];
                if (svgAttrName) {
                    const svgAttrValue = transformer ? transformer(attr.value) : attr.value;
                    svgGradientStop.setAttribute(svgAttrName, svgAttrValue);
                }
            });

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

                                    const svgAttrName = attributesMap[attrName];
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

        const attrs = new Map();
        Array.from(node.attributes).forEach(attr => {
            const svgAttr = groupAttrsMap[attr.name];
            if (svgAttr.transform) {
                const prevTransform = attrs['transform'] || {};
                prevTransform[svgAttr.transform] = attr.value;
                attrs.set('transform', prevTransform);

            } else {
                attrs.set(svgAttr, attr.value);
            }
        });

        if (attrs.size > 0) {
            const transforms = attrs.get('transform');
            if (transforms) {
                const scaleX = transforms.scaleX || 0;
                const scaleY = transforms.scaleY || 0;
                const hasScale = scaleX !== 0 || scaleY !== 0


                const pivotX = transforms.pivotX || 0;
                const pivotY = transforms.pivotY || 0;
                const hasPivot = pivotX !== 0 || pivotY !== 0


                const translateX = transforms.translateX || 0;
                const translateY = transforms.translateY || 0;
                const hasTranslation = translateX !== 0 || translateY !== 0

                const rotation = transforms.pivotY || 0;
                const hasRotation = rotation !== 0;

                const t = [];

                if (hasScale) {
                    t.push(`scale(${scaleX}, ${scaleY})`);
                }

                if (hasRotation) {
                    t.push(`rotation(${rotation})`);
                }

                if (hasTranslation) {
                    t.push(`translation(${translateX}, ${translateY})`);
                }

                if (hasPivot) {
                    // TODO: Have no idea for now :(
                }

                if (t.length) {
                    groupNode.setAttribute('transform', t.join(' '));
                }
                attrs.delete('transform');
            }

            attrs.forEach((value, key) => {
                groupNode.setAttribute(key, value);
            })
        }

        let prevClipPathId = null;

        Array.from(node.childNodes).forEach(it => {
            const childPath = transformNode(it, node, root);

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

function convertHexColor(argb) {
    const digits = argb.replace(/^#/, '');

    if (digits.length !== 4 && digits.length !== 8) {
        return argb;
    }

    let red, green, blue, alpha;
    if (digits.length === 4) {
        alpha = digits[0];
        red = digits[1];
        green = digits[2];
        blue = digits[3];
    } else {
        alpha = digits.substr(0, 2);
        red = digits.substr(2, 2);
        green = digits.substr(4, 2);
        blue = digits.substr(6, 2);
    }
    return '#' + red + green + blue + alpha;
}


exports.transform = function (content, options) {

    const parser = new DOMParser();
    const doc = parser.parseFromString(content);

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

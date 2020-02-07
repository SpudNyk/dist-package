const jp = require('fs-jetpack');
const path = require('path');

const isParent = (parent, child) =>
    jp.path(child).startsWith(jp.path(parent) + path.sep);
exports.isParent = isParent;

const cwdSubPath = subPath => {
    const rel = path.relative(jp.path(), subPath);
    return rel.startsWith('..') ? subPath : rel ? '.' + path.sep + rel : '.';
};
exports.cwdSubPath = cwdSubPath;

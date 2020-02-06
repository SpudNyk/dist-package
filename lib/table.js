const { isPlainObject } = require('is-what');
const cliui = require('cliui');

const COLUMN_KEYS = ['title', 'min', 'max', 'display'];

class Table {
    constructor({ trueText = 'yes', falseText = 'no', ...defaults } = {}) {
        this._headers = [];
        this._columns = [];
        this._defaults = defaults || {};
        this._rows = [];
        this._true = trueText;
        this._false = falseText;
        this._defaults = { data: {}, header: {} };
        this.defaults(defaults);
    }

    defaults({ data, header, ...defaults }) {
        const main = {};
        const extra = {};
        for (const [key, value] of Object.entries(defaults)) {
            if (COLUMN_KEYS.includes(key)) {
                main[key] = value;
            } else {
                extra[key] = value;
            }
        }
        this._defaults = {
            ...main,
            data: {
                ...extra,
                ...data
            },
            header: {
                ...extra,
                ...header
            }
        };
    }

    _string(what) {
        switch (typeof what) {
            case 'string':
                return what;
            case 'undefined':
                return '';
            case 'bigint':
            case 'number':
                return String(what);
            case 'boolean':
                return what ? this._true : this._false;
            case 'object': {
                if (what === null) {
                    return '';
                }
                if (what instanceof Date) {
                    return what.toLocaleDateString();
                }
                return '?';
            }
            default:
                return '?';
        }
    }

    _addColumn({ title, min, max, display = true, header, data, ...options }) {
        const text = this._string(title);
        const {
            header: headerDefaults,
            data: dataDefaults,
            ...defaults
        } = this._defaults;
        const column = {
            ...defaults,
            title,
            display,
            min,
            max,
            size: text.length,
            header: {
                ...headerDefaults,
                ...options,
                ...header
            },
            data: {
                ...dataDefaults,
                ...options,
                ...data
            }
        };
        this._columns.push(column);
    }

    column(...columns) {
        for (const column of columns) {
            if (isPlainObject(column)) {
                this._addColumn(column);
            } else {
                this._addColumn({
                    title: this._string(column)
                });
            }
        }
    }

    // add a row
    data(...data) {
        const cols = this._columns;
        const row = [];
        for (let i = 0; i < cols.length; i++) {
            const column = cols[i];
            const text = this._string(data[i]);
            column.size = Math.max(column.size, text.length);
            row.push(text);
        }
        // don't store extra data
        this._rows.push(row);
    }

    _width(column) {
        const { size, header, min, max, data } = column;

        const [, headRight = 0, , headLeft = 0] = header.padding || [];
        const [, dataRight = 0, , dataLeft = 0] = data.padding || [];
        const right = Math.max(headRight, dataRight);
        const left = Math.max(headLeft, dataLeft);
        let width = left + size + right;

        if (min !== undefined) {
            width = Math.max(width, min);
        }
        if (max !== undefined) {
            width = Math.min(width, max);
        }
        return width;
    }

    _innerWidth(width, padding = []) {
        const [, right = 0, , left = 0] = padding;
        return width - right - left;
    }

    _uiSep(screenWidth) {
        let remain = screenWidth;
        let seps = [];
        for (const column of this._columns) {
            const { display, header } = column;
            const width = this._width(column);
            const count = this._innerWidth(
                width !== undefined ? width : remain,
                header.padding
            );
            remain -= width || 0;
            if (display) {
                seps.push({
                    text: '-'.repeat(count),
                    width,
                    ...header,
                    wrap: false
                });
            }
        }
        return seps;
    }

    _uiHeaders() {
        const headers = [];
        for (const column of this._columns) {
            const { display, title, header } = column;
            if (display) {
                headers.push({
                    text: title,
                    width: this._width(column),
                    ...header
                });
            }
        }
        return headers;
    }

    _uiRow(items) {
        const row = [];
        const columns = this._columns;

        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const { display, data } = column;
            if (display) {
                row.push({
                    ...data,
                    text: this._string(items[i]),
                    width: this._width(column)
                });
            }
        }
        return row;
    }

    toString() {
        const ui = cliui();
        ui.div(...this._uiHeaders());
        ui.div(...this._uiSep(ui.width));
        for (const row of this._rows) {
            ui.div(...this._uiRow(row));
        }
        return ui.toString();
    }
}

module.exports = options => new Table(options);

import formatDistanceToNow from 'date-fns/formatDistanceToNow';

const BLOCK_INTERVAL = 15000;

export const currencyFieldOptions = unit => ({
    formatter: value => (value ? `${value}${unit}` : ''),
    parser: value => value.replace(/[\D]/g, '')
});

export const celerFieldOptions = currencyFieldOptions('CELR');

export const dayFieldOptions = {
    formatter: value => (value ? `${value}day` : ''),
    parser: value => value.replace(/[\D]/g, '')
};

export const blockFieldOptions = {
    formatter: value => {
        if (!value) {
            return '';
        }

        const timeEstimate = formatDistanceToNow(
            new Date(Date.now() + value * BLOCK_INTERVAL)
        );

        return `${value}blocks(${timeEstimate})`;
    },
    parser: value => value.replace(/\([\w\s]+\)?/, '').replace(/[\D]/g, '')
};

export const rateFieldOptions = {
    formatter: value => (value ? `${value}%` : ''),
    parser: value => value.replace(/[^\d.]/g, '')
};

export const minValueRule = minValue => ({
    validator: (rule, value, callback) => {
        if (value < minValue) {
            const msg = `value is smaller than ${minValue}`;
            callback(msg);
        }

        callback();
    }
});

export const maxValueRule = maxValue => ({
    validator: (rule, value, callback) => {
        if (value > maxValue) {
            const msg = `value is larger than ${maxValue}`;
            callback(msg);
        }

        callback();
    }
});

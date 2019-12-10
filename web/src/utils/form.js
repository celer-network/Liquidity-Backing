import formatDistanceToNow from 'date-fns/formatDistanceToNow'

const BLOCK_INTERVAL = 15;

export const currencyFieldOptions = unit => ({
    formatter: value => (value ? `${value}${unit}` : ''),
    parser: value => value.replace(/[A-Z]/g, '')
});

export const celerFieldOptions = currencyFieldOptions('CELR');

export const dayFieldOptions = {
    formatter: value => (value ? `${value}day` : ''),
    parser: value => value.replace(/[a-z]/g, '')
};

export const blockFieldOptions = {
    formatter: value => {
        if (!value) {
            return '';
        }
        
        console.log(value)
        const timeEstimate = formatDistanceToNow(new Date(Date.now() + value * BLOCK_INTERVAL))
        
        return `${value}block(${timeEstimate})`
    },
    parser: value => value.replace(/[a-z]/g, '').replace(/\([\w\s]+\)/, '')
};

export const rateFieldOptions = {
    formatter: value => (value ? `${value}%` : ''),
    parser: value => value.replace(/[%]/g, '')
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

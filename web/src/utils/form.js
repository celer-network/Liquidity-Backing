export const etherFieldOptions = {
    formatter: value => (value ? `${value}ether` : ''),
    parser: value => value.replace(/[a-z]/g, '')
};

export const currencyFieldOptions = unit => ({
    formatter: value => (value ? `${value}${unit}` : ''),
    parser: value => value.replace(/[A-Z]/g, '')
});

export const dayFieldOptions = {
    formatter: value => (value ? `${value}day` : ''),
    parser: value => value.replace(/[a-z]/g, '')
};

export const blockFieldOptions = {
    formatter: value => (value ? `${value}block` : ''),
    parser: value => value.replace(/[a-z]/g, '')
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

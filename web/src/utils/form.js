export const etherFieldOptions = {
    formatter: value => (value ? `${value}ether` : ''),
    parser: value => value.replace(/[a-z]/g, '')
};

export const dayFieldOptions = {
    formatter: value => (value ? `${value}day` : ''),
    parser: value => value.replace(/[a-z]/g, '')
};
